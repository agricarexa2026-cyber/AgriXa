
import hashlib
import logging
import re

from datetime import datetime, timedelta, timezone
from .password_service import verify_password
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken

from .firebase_service import (
    get_user_by_username,
    get_user_by_mobile,
    get_user_by_identifier,
    get_user_by_email,
    create_user,
    update_user,
    get_user_by_id,
    get_all_admins,
    create_notification,
    notify_admins_ws,
    broadcast_admin_update,
    get_position_by_id,
)

from .otp_service import (
    send_otp,
    verify_otp,
    store_pending_registration,
    get_pending_registration,
    clear_pending_registration,
    mark_otp_verified,
    is_otp_verified,
    clear_otp_verified,
    mark_registration_verified,
    mark_registration_completed,
    normalize_mobile_number,
)

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    CompleteRegistrationSerializer,
)

from .password_service import current_password_is_valid, update_password


logger = logging.getLogger(__name__)


def get_tokens(user_id, role, remember_me=False):
    now = datetime.now(timezone.utc)
    days = 7 if remember_me else 1

    refresh = RefreshToken()
    refresh['user_id'] = user_id
    refresh['role'] = role

    access = AccessToken()
    access['user_id'] = user_id
    access['role'] = role
    access.payload['exp'] = int(
        (now + timedelta(days=days)).timestamp()
    )
    access.payload['iat'] = int(now.timestamp())

    return {
        'refresh': str(refresh),
        'access': str(access),
    }


def mobile_variants(value):
    try:
        normalized = normalize_mobile_number(value)
    except (ValueError, TypeError):
        return []

    return [
        normalized,
        '0' + normalized[3:],
        normalized[1:],
    ]


def find_user_by_mobile(mobile_number):
    for variant in mobile_variants(mobile_number):
        user = get_user_by_mobile(variant)

        if user:
            return user

    return None


def find_user_by_login_identifier(identifier):
    identifier = str(identifier or '').strip()

    if not identifier:
        return None

    if mobile_variants(identifier):
        return find_user_by_mobile(identifier)

    if '@' in identifier:
        return get_user_by_email(identifier)

    return (
        get_user_by_username(identifier)
        or get_user_by_identifier(identifier)
    )


def find_pending_registration(identifier):
    for mobile in mobile_variants(identifier):
        pending = get_pending_registration(mobile)

        if pending:
            return pending

    if '@' in str(identifier):
        return get_pending_registration(email=identifier)

    return None


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        mobile_number = data['mobileNumber']

        if find_user_by_mobile(mobile_number):
            return Response(
                {'error': 'Mobile number already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if get_user_by_email(data['email']):
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        password_hash = hashlib.sha256(
            data['password'].encode()
        ).hexdigest()

        pending_data = {
            'mobileNumber': mobile_number,
            'email': data['email'],
            'passwordHash': password_hash,
            'role': data['role'],
            'isPending': data['role'] == 'extension_worker',
        }

        try:
            store_pending_registration(
                mobile_number,
                pending_data
            )

            success = send_otp(mobile_number)

            if not success:
                clear_pending_registration(mobile_number)

                return Response(
                    {
                        'error': 'Failed to send SMS verification code.'
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception:
            logger.exception('Registration OTP process failed')

            try:
                clear_pending_registration(mobile_number)
            except Exception:
                logger.exception(
                    'Failed to clear pending registration'
                )

            return Response(
                {
                    'error': 'Unable to send SMS verification code. Please try again later.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                'message': 'OTP sent to your mobile number successfully.',
                'mobileNumber': mobile_number,
            },
            status=status.HTTP_200_OK
        )


class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        mobile_number = serializer.validated_data['mobileNumber']

        user = find_user_by_mobile(mobile_number)
        pending = find_pending_registration(mobile_number)

        if not user and not pending:
            return Response(
                {
                    'error': 'No account or pending registration found for this mobile number.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            success = send_otp(mobile_number)

            if not success:
                return Response(
                    {
                        'error': 'Failed to send SMS verification code.'
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception:
            logger.exception('Send OTP failed')

            return Response(
                {
                    'error': 'Unable to send SMS verification code. Please try again later.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                'message': 'OTP sent to your mobile number successfully.'
            },
            status=status.HTTP_200_OK
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        mobile_number = serializer.validated_data['mobileNumber']
        otp = serializer.validated_data['otp']
        is_registration = serializer.validated_data.get(
            'isRegistration',
            False
        )

        pending = None

        if is_registration:
            pending = find_pending_registration(mobile_number)

            if not pending:
                return Response(
                    {
                        'error': 'Registration data expired. Please register again.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            user = find_user_by_mobile(mobile_number)

            if not user:
                return Response(
                    {'error': 'Account not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        try:
            verified = verify_otp(mobile_number, otp)

        except RuntimeError:
            logger.exception('SkySMS verification failed')

            return Response(
                {
                    'error': 'OTP verification service is temporarily unavailable.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if not verified:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if is_registration:
            mark_registration_verified(
                pending['mobileNumber']
            )
        else:
            user = find_user_by_mobile(mobile_number)

            mark_otp_verified(
                user['mobileNumber']
            )

        return Response(
            {'message': 'OTP verified successfully'},
            status=status.HTTP_200_OK
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        identifier = serializer.validated_data['identifier'].strip()
        password = serializer.validated_data['password']

        user = find_user_by_login_identifier(identifier)

        if not user:
            pending = find_pending_registration(identifier)

            if (
                pending
                and pending.get('isVerified')
                and not pending.get('isCompleted')
            ):
                return Response(
                    {
                        'error': 'Registration not completed',
                        'isIncomplete': True,
                        'mobileNumber': pending.get('mobileNumber')
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.get('isActive', False):
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not verify_password(user, password):
         return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.get('isPending'):
            return Response(
                {
                    'error': 'Account is pending approval',
                    'isPending': True
                },
                status=status.HTTP_403_FORBIDDEN
            )

        tokens = get_tokens(
            user['id'],
            user['role'],
            remember_me=serializer.validated_data.get(
                'rememberMe',
                False
            )
        )

        position_name = ''

        if user.get('positionId'):
            pos = get_position_by_id(user['positionId'])
            position_name = pos.get('name', '') if pos else ''

        return Response(
            {
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': {
                    'id': user['id'],
                    'firstName': user.get('firstName', ''),
                    'lastName': user.get('lastName', ''),
                    'role': user['role'],
                    'email': user.get('email', ''),
                    'mobileNumber': user.get('mobileNumber', ''),
                    'profilePicture': user.get(
                        'profilePicture',
                        ''
                    ),
                    'barangay': user.get('barangay', ''),
                    'positionName': position_name,
                }
            },
            status=status.HTTP_200_OK
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        mobile_number = request.data.get(
            'mobileNumber',
            ''
        )

        try:
            normalized = normalize_mobile_number(
                mobile_number
            )
        except (ValueError, TypeError):
            return Response(
                {
                    'error': 'Please enter a valid Philippine mobile number.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = find_user_by_mobile(normalized)

        if not user:
            return Response(
                {
                    'error': 'No account found with this mobile number.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            success = send_otp(normalized)

            if not success:
                return Response(
                    {
                        'error': 'Failed to send SMS verification code.'
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception:
            logger.exception(
                'Password reset OTP delivery failed'
            )

            return Response(
                {
                    'error': 'Unable to send SMS verification code. Please try again later.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                'message': 'OTP sent to your registered mobile number.',
                'mobileNumber': user['mobileNumber']
            },
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        mobile_number = request.data.get(
            'mobileNumber',
            ''
        )

        new_password = request.data.get(
            'newPassword',
            ''
        )

        try:
            normalized = normalize_mobile_number(
                mobile_number
            )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid mobile number.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(new_password, str) or not new_password:
            return Response(
                {
                    'error': 'New password is required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = find_user_by_mobile(normalized)

        if not user:
            return Response(
                {'error': 'Account not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        verified_mobile = user['mobileNumber']

        if not is_otp_verified(verified_mobile):
            return Response(
                {
                    'error': 'OTP not verified or verification expired.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            update_password(
                user,
                new_password
            )

        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            logger.exception('Password reset failed')

            return Response(
                {
                    'error': 'Unable to reset password. Please try again.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        clear_otp_verified(verified_mobile)

        return Response(
            {
                'message': 'Password reset successfully.'
            },
            status=status.HTTP_200_OK
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get(
            'currentPassword',
            ''
        )

        new_password = request.data.get(
            'newPassword',
            ''
        )

        if (
            not isinstance(current_password, str)
            or not isinstance(new_password, str)
            or not current_password
            or not new_password
        ):
            return Response(
                {
                    'error': 'Current and new passwords are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {
                    'error': 'Password must be at least 8 characters.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_password == new_password:
            return Response(
                {
                    'error': 'Choose a different new password.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_user_by_id(request.user.id)

        if (
            not user
            or not current_password_is_valid(
                user,
                current_password
            )
        ):
            return Response(
                {
                    'error': 'Current password is incorrect.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            update_password(
                user,
                new_password
            )

        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            logger.exception('Change password failed')

            return Response(
                {
                    'error': 'Unable to update your password. Please try again.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                'message': 'Password changed successfully.'
            },
            status=status.HTTP_200_OK
        )


class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get(
            'username',
            ''
        )

        if not username:
            return Response({'available': False})

        user = get_user_by_username(username)

        return Response({
            'available': user is None
        })


class CheckMobileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mobile = request.query_params.get(
            'mobile',
            ''
        )

        if not mobile:
            return Response({'available': False})

        user = find_user_by_mobile(mobile)

        return Response({
            'available': user is None
        })


class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get(
            'email',
            ''
        )

        if not email:
            return Response({'available': False})

        user = get_user_by_email(email)

        return Response({
            'available': user is None
        })


class CompleteRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CompleteRegistrationSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        mobile_number = data['mobileNumber']

        user_data = find_pending_registration(
            mobile_number
        )

        if not user_data:
            return Response(
                {
                    'error': 'Registration data expired. Please register again.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user_data.get('isVerified'):
            return Response(
                {'error': 'OTP not verified.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if get_user_by_username(data['username']):
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if find_user_by_mobile(mobile_number):
            return Response(
                {'error': 'Mobile number already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_data['firstName'] = data['firstName']
        user_data['lastName'] = data['lastName']
        user_data['barangay'] = data.get('barangay', '')
        user_data['username'] = data['username']
        user_data['positionId'] = data.get(
            'positionId',
            ''
        )

        user_id = create_user(user_data)

        mark_registration_completed(
            user_data['mobileNumber']
        )

        clear_pending_registration(
            user_data['mobileNumber']
        )

        full_name = (
            f"{user_data['firstName']} "
            f"{user_data['lastName']}"
        )

        role = user_data['role']

        if role == 'farmer':
            notif_type = 'new_farmer'
            message = (
                f'{full_name} registered as a farmer.'
            )
        else:
            notif_type = 'new_extension_worker'
            message = (
                f'{full_name} registered as an extension worker '
                f'and is pending approval.'
            )

        for admin in get_all_admins():
            notif = {
                'type': notif_type,
                'message': message,
                'relatedUserId': user_id,
                'isRead': False,
                'date': datetime.utcnow().isoformat(),
            }

            create_notification(
                admin['id'],
                notif_type,
                message,
                related_user_id=user_id
            )

            notify_admins_ws(notif)

        broadcast_admin_update(notif_type)

        return Response(
            {
                'message': 'Registration completed successfully'
            },
            status=status.HTTP_201_CREATED
        )


class CheckPendingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mobile_number = request.query_params.get(
            'mobile',
            ''
        )

        if not mobile_number:
            return Response({'status': 'none'})

        user_data = find_pending_registration(
            mobile_number
        )

        if not user_data:
            return Response({'status': 'none'})

        role = user_data.get('role', '')

        if (
            user_data.get('isVerified')
            and not user_data.get('isCompleted')
        ):
            return Response({
                'status': 'verified',
                'role': role
            })

        if not user_data.get('isVerified'):
            return Response({
                'status': 'pending',
                'role': role
            })

        return Response({'status': 'none'})


class MeView(APIView):
    def get(self, request):
        user = request.user
        user_data = get_user_by_id(user.id)

        if not user_data:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        position_name = ''

        if user_data.get('positionId'):
            pos = get_position_by_id(
                user_data['positionId']
            )
            position_name = pos.get(
                'name',
                ''
            ) if pos else ''

        return Response({
            'id': user_data['id'],
            'firstName': user_data['firstName'],
            'lastName': user_data['lastName'],
            'role': user_data['role'],
            'email': user_data.get('email', ''),
            'mobileNumber': user_data['mobileNumber'],
            'profilePicture': user_data.get(
                'profilePicture',
                ''
            ),
            'barangay': user_data.get('barangay', ''),
            'positionName': position_name,
        })
