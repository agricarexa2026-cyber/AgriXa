
import hashlib
import hmac

from django.contrib.auth.hashers import check_password, make_password

from .firebase_service import update_user


def password_hash(password):
    return hashlib.sha256(
        str(password).encode('utf-8')
    ).hexdigest()


def verify_password(user, password):
    stored = str(user.get('passwordHash') or '')
    password = str(password or '')

    if not stored or not password:
        return False

    if stored.startswith(('pbkdf2_', 'argon2$', 'bcrypt$', 'scrypt$')):
        return check_password(password, stored)

    single_hash = password_hash(password)
    double_hash = password_hash(single_hash)

    return (
        hmac.compare_digest(stored, single_hash)
        or hmac.compare_digest(stored, double_hash)
    )


def current_password_is_valid(user, password):
    return verify_password(user, password)


def update_password(user, new_password):
    if not isinstance(new_password, str) or not new_password:
        raise ValueError('New password is required.')

    if len(new_password) < 8:
        raise ValueError(
            'Password must be at least 8 characters.'
        )

    if verify_password(user, new_password):
        raise ValueError(
            'Choose a password you have not used for this account.'
        )

    update_user(
        user['id'],
        {
            'passwordHash': password_hash(new_password),
            'isResetPass': False
        }
    )
