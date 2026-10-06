import hashlib
import hmac

from .firebase_service import update_user


def password_hash(password):
    return hashlib.sha256(
        password.encode('utf-8')
    ).hexdigest()


def current_password_is_valid(user, password):
    stored = user.get('passwordHash') or ''

    if not stored:
        return False

    return hmac.compare_digest(
        stored,
        password_hash(password)
    )


def update_password(user, new_password):
    old_hash = user.get('passwordHash') or ''
    new_hash = password_hash(new_password)

    if old_hash and hmac.compare_digest(old_hash, new_hash):
        raise ValueError(
            'Choose a password you have not used for this account.'
        )

    update_user(
        user['id'],
        {
            'passwordHash': new_hash,
            'isResetPass': False
        }
    )