
import hashlib
from datetime import datetime, timedelta, timezone

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


def get_tokens(user_id, role, remember_me=False):
    now = datetime.now(timezone.utc)
    days = 7 if remember_me else 1

    refresh = RefreshToken()
    refresh['user_id'] = user_id
    refresh['role'] = role

    access = AccessToken()
    access['user_id'] = user_id
    access['role'] = role
    access.payload['exp'] = int((now + timedelta(days=days)).timestamp())
    access.payload['iat'] = int(now.timestamp())

    return {
        'refresh': str(refresh),
        'access': str(access),
    }


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

        if get_user_by_mobile(mobile_number):
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
            store_pending_registration(mobile_number, pending_data)
            success = send_otp(mobile_number)

            if not success:
                clear_pending_registration(mobile_number)
                return Response(
                    {'error': 'Failed to send SMS verification code.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.exception("Registration OTP process failed")

            try:
                clear_pending_registration(mobile_number)
            except Exception:
                logger.exception("Failed to clear pending registration")

            return Response(
                {
                    'error': 'Unable to send SMS verification code. Please try again later.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                'message': 'OTP sent to your mobile number successfully.',
                'mobileNumber': mobile_number
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

        user = get_user_by_mobile(mobile_number)
        pending = get_pending_registration(mobile_number)

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
                    {'error': 'Failed to send SMS verification code.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        except Exception:
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

        if is_registration and not get_pending_registration(mobile_number):
            return Response(
                {
                    'error': 'Registration data expired. Please register again.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not verify_otp(mobile_number, otp):
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if is_registration:
            mark_registration_verified(mobile_number)
        else:
            mark_otp_verified(mobile_number)

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

        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']

        user = get_user_by_identifier(identifier)

        if not user:
            pending = get_pending_registration(identifier)

            if not pending and '@' in identifier:
                pending = get_pending_registration(email=identifier)

            if pending and pending.get('isVerified') and not pending.get('isCompleted'):
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

        if not user.get('isActive'):
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        password_hash = hashlib.sha256(
            password.encode()
        ).hexdigest()

        if password_hash != user['passwordHash']:
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
            position_name = pos['name'] if pos else ''

        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': {
                'id': user['id'],
                'firstName': user['firstName'],
                'lastName': user['lastName'],
                'role': user['role'],
                'email': user.get('email', ''),
                'mobileNumber': user['mobileNumber'],
                'profilePicture': user.get('profilePicture', ''),
                'barangay': user.get('barangay', ''),
                'positionName': position_name,
            }
        })


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')

        if not isinstance(email, str) or not email.strip():
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.strip()
        user = get_user_by_email(email)

        if not user:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        mobile_number = user.get('mobileNumber')

        if not mobile_number:
            return Response(
                {
                    'error': 'No mobile number is registered for this account.'
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
            return Response(
                {
                    'error': 'Unable to send SMS verification code. Please try again later.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                'message': 'OTP sent to your registered mobile number successfully.',
                'mobileNumber': mobile_number
            },
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('newPassword', '')

        if (
            not isinstance(email, str)
            or not isinstance(password, str)
            or not email.strip()
            or not password
        ):
            return Response(
                {
                    'error': 'Email and newPassword are required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.strip()

        if len(password) < 8:
            return Response(
                {
                    'error': 'Password must be at least 8 characters.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_user_by_email(email)

        if not user:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        mobile_number = user['mobileNumber']

        if not is_otp_verified(mobile_number):
            return Response(
                {'error': 'OTP not verified.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            update_password(user, password)

        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            return Response(
                {
                    'error': 'Unable to update your password. Please try again.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        clear_otp_verified(mobile_number)

        return Response(
            {'message': 'Password reset successfully'},
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

        if not user or not current_password_is_valid(
            user,
            current_password
        ):
            return Response(
                {
                    'error': 'Current password is incorrect.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            update_password(user, new_password)

        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            return Response(
                {
                    'error': 'Unable to update your password. Please try again.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK
        )


class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get('username', '')

        if not username:
            return Response({'available': False})

        user = get_user_by_username(username)

        return Response({
            'available': user is None
        })


class CheckMobileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mobile = request.query_params.get('mobile', '')

        if not mobile:
            return Response({'available': False})

        user = get_user_by_mobile(mobile)

        return Response({
            'available': user is None
        })


class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get('email', '')

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

        user_data = get_pending_registration(mobile_number)

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

        user_data['firstName'] = data['firstName']
        user_data['lastName'] = data['lastName']
        user_data['barangay'] = data.get('barangay', '')
        user_data['username'] = data['username']
        user_data['positionId'] = data.get('positionId', '')

        user_id = create_user(user_data)

        mark_registration_completed(mobile_number)
        clear_pending_registration(mobile_number)

        full_name = (
            f"{user_data['firstName']} "
            f"{user_data['lastName']}"
        )

        role = user_data['role']

        if role == 'farmer':
            notif_type = 'new_farmer'
            message = (
                f"{full_name} registered as a farmer."
            )
        else:
            notif_type = 'new_extension_worker'
            message = (
                f"{full_name} registered as an extension worker "
                f"and is pending approval."
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

        user_data = get_pending_registration(mobile_number)

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
            position_name = pos['name'] if pos else ''

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
