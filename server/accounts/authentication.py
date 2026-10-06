from rest_framework_simplejwt.authentication import JWTAuthentication
from .firebase_service import get_user_by_id
from types import SimpleNamespace
import os


class FirebaseUser:
    def __init__(self, user_data):
        self.id = user_data['id']
        self.role = user_data.get('role')
        self.is_authenticated = True
        self.is_active = user_data.get('isActive', True)
        self.is_pending = user_data.get('isPending', False)
        self.position_id = user_data.get('positionId', '')


class FirebaseJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except Exception:
            return None

    def get_user(self, validated_token):
        user_id = validated_token.get('user_id')

        if not user_id:
            if (
                validated_token.get('role') == 'superadmin'
                and os.getenv('SUPERADMIN_USERNAME')
                and validated_token.get('username') == os.getenv('SUPERADMIN_USERNAME')
            ):
                return SimpleNamespace(
                    id='system-admin',
                    role='superadmin',
                    is_authenticated=True,
                    is_active=True,
                    is_pending=False
                )

            return None

        user_data = get_user_by_id(user_id)

        if (
            not user_data
            or not user_data.get('isActive', True)
            or user_data.get('isPending')
        ):
            return None

        return FirebaseUser(user_data)