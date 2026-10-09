
import os
import re
import json
import logging
import smtplib
import requests
import redis

from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from core.firebase import db


logger = logging.getLogger(__name__)

OTP_EXPIRY = 300
PENDING_REG_EXPIRY = 900
OTP_COLLECTION = 'otps'
PENDING_REG_COLLECTION = 'pending_registrations'

SKYSMS_BASE_URL = 'https://skysms.skyio.site/api/v1'


redis_client = redis.from_url(
    os.getenv('REDIS_URL', 'redis://localhost:6379'),
    socket_connect_timeout=2,
    socket_timeout=2
)


def _redis_available():
    try:
        return bool(redis_client.ping())
    except Exception:
        return False


def normalize_mobile_number(mobile_number):
    number = re.sub(r'[\s()-]', '', str(mobile_number or ''))

    if re.fullmatch(r'09\d{9}', number):
        number = '+63' + number[1:]
    elif re.fullmatch(r'639\d{9}', number):
        number = '+' + number

    if not re.fullmatch(r'\+639\d{9}', number):
        raise ValueError('Invalid Philippine mobile number.')

    return number


def get_skysms_headers():
    api_key = os.getenv('SKYSMS_API_KEY', '').strip()

    if not api_key:
        raise RuntimeError('SKYSMS_API_KEY is not configured.')

    return {
        'X-API-Key': api_key,
        'Content-Type': 'application/json'
    }


def send_otp(mobile_number, email=None):
    number = normalize_mobile_number(mobile_number)

    try:
        response = requests.post(
            f'{SKYSMS_BASE_URL}/otp/send',
            headers=get_skysms_headers(),
            json={
                'phone_number': number,
                'use_subscription': False
            },
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

    except requests.RequestException as exc:
        logger.exception('SkySMS send OTP request failed')
        raise RuntimeError(
            'Unable to send SMS verification code.'
        ) from exc

    except ValueError as exc:
        logger.exception('Invalid SkySMS send OTP response')
        raise RuntimeError(
            'Invalid SkySMS response.'
        ) from exc

    if not isinstance(result, dict) or result.get('success') is not True:
        logger.error('SkySMS rejected OTP request')
        raise RuntimeError(
            'SMS provider rejected the OTP request.'
        )

    logger.info('SkySMS OTP send request accepted')

    return True


def verify_otp(mobile_number, otp):
    number = normalize_mobile_number(mobile_number)
    code = str(otp).strip()

    if not re.fullmatch(r'\d{6}', code):
        return False

    try:
        response = requests.get(
            f'{SKYSMS_BASE_URL}/otp/verify',
            headers=get_skysms_headers(),
            params={
                'phone_number': number,
                'code': code
            },
            timeout=30
        )

        if response.status_code in (400, 404, 422):
            logger.info('SkySMS rejected OTP verification')
            return False

        response.raise_for_status()
        result = response.json()

    except requests.RequestException as exc:
        logger.exception('SkySMS verify OTP request failed')
        raise RuntimeError(
            'Unable to verify SMS code.'
        ) from exc

    except ValueError as exc:
        logger.exception('Invalid SkySMS verification response')
        raise RuntimeError(
            'Invalid SkySMS verification response.'
        ) from exc

    if not isinstance(result, dict):
        raise RuntimeError(
            'Unexpected SkySMS verification response.'
        )

    if result.get('success') is True:
        logger.info('SkySMS OTP verification successful')
        return True

    logger.info('SkySMS OTP verification unsuccessful')
    return False


def send_approval_email(email, first_name):
    if os.getenv('DEBUG', 'False').lower() == 'true':
        logger.info('Development mode: approval email skipped')
        return True

    try:
        sender = (
            os.getenv('GMAIL_USER')
            or os.getenv('EMAIL_HOST_USER')
        )

        password = (
            os.getenv('GMAIL_APP_PASSWORD')
            or os.getenv('EMAIL_HOST_PASSWORD')
        )

        if not sender or not password:
            raise RuntimeError(
                'Gmail credentials are not configured.'
            )

        html_message = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff9e9;border-radius:12px">
            <h1 style="color:#204a0e;text-align:center">AgriCare</h1>
            <p>Hello, {first_name}!</p>
            <p>Your extension worker account has been <strong>approved</strong>.</p>
            <p>You can now log in to AgriCare and start handling tickets.</p>
            <div style="background:#d4eed1;padding:20px;text-align:center;border-radius:8px">
                <strong>Account Approved</strong>
            </div>
            <p>If you did not register for this account, please ignore this email.</p>
        </div>
        """

        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'AgriCare - Your Account Has Been Approved'
        msg['From'] = sender
        msg['To'] = email

        msg.attach(MIMEText(html_message, 'html'))

        with smtplib.SMTP_SSL(
            'smtp.gmail.com',
            465,
            timeout=30
        ) as server:
            server.login(sender, password)
            server.sendmail(
                sender,
                email,
                msg.as_string()
            )

        return True

    except Exception:
        logger.exception('Approval email failed')
        return False


def store_pending_registration(mobile_number, data):
    data = dict(data)
    data['isVerified'] = False
    data['isCompleted'] = False

    if _redis_available():
        redis_client.setex(
            f'pending_reg:{mobile_number}',
            PENDING_REG_EXPIRY,
            json.dumps(data)
        )
    else:
        db.collection(
            PENDING_REG_COLLECTION
        ).document(mobile_number).set({
            'data': json.dumps(data),
            'expiresAt': (
                datetime.now(timezone.utc)
                + timedelta(seconds=PENDING_REG_EXPIRY)
            )
        })


def get_pending_registration(mobile_number=None, email=None):
    if email and not mobile_number:
        if _redis_available():
            for key in redis_client.scan_iter('pending_reg:*'):
                value = redis_client.get(key)

                if value:
                    parsed = json.loads(value)

                    if parsed.get('email') == email:
                        return parsed

            return None

        docs = db.collection(
            PENDING_REG_COLLECTION
        ).get()

        for doc in docs:
            record = doc.to_dict()
            expires_at = record.get('expiresAt')

            if (
                expires_at
                and datetime.now(timezone.utc) > expires_at
            ):
                continue

            parsed = json.loads(record['data'])

            if parsed.get('email') == email:
                return parsed

        return None

    if not mobile_number:
        return None

    if _redis_available():
        value = redis_client.get(
            f'pending_reg:{mobile_number}'
        )

        return json.loads(value) if value else None

    ref = db.collection(
        PENDING_REG_COLLECTION
    ).document(mobile_number)

    doc = ref.get()

    if not doc.exists:
        return None

    record = doc.to_dict()
    expires_at = record.get('expiresAt')

    if (
        expires_at
        and datetime.now(timezone.utc) > expires_at
    ):
        ref.delete()
        return None

    return json.loads(record['data'])


def clear_pending_registration(mobile_number):
    if _redis_available():
        redis_client.delete(
            f'pending_reg:{mobile_number}'
        )
    else:
        db.collection(
            PENDING_REG_COLLECTION
        ).document(mobile_number).delete()


def mark_otp_verified(mobile_number):
    if _redis_available():
        redis_client.setex(
            f'otp_verified:{mobile_number}',
            OTP_EXPIRY,
            '1'
        )
    else:
        db.collection(
            OTP_COLLECTION
        ).document(f'verified_{mobile_number}').set({
            'verified': True,
            'expiresAt': (
                datetime.now(timezone.utc)
                + timedelta(seconds=OTP_EXPIRY)
            )
        })


def is_otp_verified(mobile_number):
    if _redis_available():
        return (
            redis_client.get(
                f'otp_verified:{mobile_number}'
            ) is not None
        )

    ref = db.collection(
        OTP_COLLECTION
    ).document(f'verified_{mobile_number}')

    doc = ref.get()

    if not doc.exists:
        return False

    data = doc.to_dict()
    expires_at = data.get('expiresAt')

    if (
        not expires_at
        or datetime.now(timezone.utc) > expires_at
    ):
        ref.delete()
        return False

    return data.get('verified') is True


def clear_otp_verified(mobile_number):
    if _redis_available():
        redis_client.delete(
            f'otp_verified:{mobile_number}'
        )
    else:
        db.collection(
            OTP_COLLECTION
        ).document(f'verified_{mobile_number}').delete()


def mark_registration_verified(mobile_number):
    if _redis_available():
        key = f'pending_reg:{mobile_number}'
        value = redis_client.get(key)

        if value:
            parsed = json.loads(value)
            parsed['isVerified'] = True

            redis_client.setex(
                key,
                PENDING_REG_EXPIRY,
                json.dumps(parsed)
            )
    else:
        ref = db.collection(
            PENDING_REG_COLLECTION
        ).document(mobile_number)

        doc = ref.get()

        if doc.exists:
            record = doc.to_dict()
            parsed = json.loads(record['data'])
            parsed['isVerified'] = True

            ref.update({
                'data': json.dumps(parsed),
                'expiresAt': (
                    datetime.now(timezone.utc)
                    + timedelta(seconds=PENDING_REG_EXPIRY)
                )
            })


def mark_registration_completed(mobile_number):
    if _redis_available():
        key = f'pending_reg:{mobile_number}'
        value = redis_client.get(key)

        if value:
            parsed = json.loads(value)
            parsed['isCompleted'] = True

            redis_client.setex(
                key,
                PENDING_REG_EXPIRY,
                json.dumps(parsed)
            )
    else:
        ref = db.collection(
            PENDING_REG_COLLECTION
        ).document(mobile_number)

        doc = ref.get()

        if doc.exists:
            record = doc.to_dict()
            parsed = json.loads(record['data'])
            parsed['isCompleted'] = True

            ref.update({
                'data': json.dumps(parsed)
            })
