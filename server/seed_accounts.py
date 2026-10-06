import os
import django
import hashlib

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'core.settings'
)

django.setup()

from accounts.firebase_service import (
    create_user,
    get_user_by_username,
    update_user,
)


def hash_password(password):
    return hashlib.sha256(
        password.encode('utf-8')
    ).hexdigest()


accounts = [
    {
        'firstName': 'LGU',
        'lastName': 'Admin',
        'username': 'lgu.admin',
        'mobileNumber': '09170000001',
        'email': 'lgu.admin@agricare.local',
        'password': 'Admin123!',
        'role': 'admin',
        'barangay': '',
        'positionId': '',
        'isPending': False,
    },
    {
        'firstName': 'System',
        'lastName': 'Admin',
        'username': 'system.admin',
        'mobileNumber': '09170000002',
        'email': 'system.admin@agricare.local',
        'password': 'Admin123!',
        'role': 'admin',
        'barangay': '',
        'positionId': '',
        'isPending': False,
    },
    {
        'firstName': 'Test',
        'lastName': 'Farmer',
        'username': 'farmer.test',
        'mobileNumber': '09170000003',
        'email': 'farmer.test@agricare.local',
        'password': 'Farmer123!',
        'role': 'farmer',
        'barangay': 'Tarlac City',
        'positionId': '',
        'isPending': False,
    },
    {
        'firstName': 'Test',
        'lastName': 'Extension Worker',
        'username': 'extension.test',
        'mobileNumber': '09170000004',
        'email': 'extension.test@agricare.local',
        'password': 'Extension123!',
        'role': 'extension_worker',
        'barangay': '',
        'positionId': '',
        'isPending': False,
    },
]


print()
print('================================')
print('     AgriCare Account Seeder')
print('================================')
print()


for account in accounts:
    username = account['username']

    password_hash = hash_password(
        account['password']
    )

    user_data = {
        'firstName': account['firstName'],
        'lastName': account['lastName'],
        'username': username,
        'mobileNumber': account['mobileNumber'],
        'email': account['email'],
        'passwordHash': password_hash,
        'role': account['role'],
        'barangay': account['barangay'],
        'positionId': account['positionId'],
        'isPending': account['isPending'],
    }

    existing = get_user_by_username(
        username
    )

    if existing:
        update_user(
            existing['id'],
            {
                **user_data,
                'isActive': True,
                'isResetPass': False,
            }
        )

        print(
            f'UPDATED: {username} '
            f'[{account["role"]}]'
        )

    else:
        user_id = create_user(
            user_data
        )

        print(
            f'CREATED: {username} '
            f'[{account["role"]}] '
            f'ID={user_id}'
        )


print()
print('================================')
print('Accounts are ready.')
print('================================')
print()
print('LGU Admin')
print('Username: lgu.admin')
print('Password: Admin123!')
print()
print('System Admin')
print('Username: system.admin')
print('Password: Admin123!')
print()
print('Farmer')
print('Username: farmer.test')
print('Password: Farmer123!')
print()
print('Extension Worker')
print('Username: extension.test')
print('Password: Extension123!')
print()