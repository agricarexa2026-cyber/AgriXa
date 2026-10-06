import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.firebase import db


POSITIONS_COLLECTION = 'positions'


positions = [
    {
        'name': 'Farmer',
        'role': 'farmer',
        'isActive': True,
    },
    {
        'name': 'Agricultural Technician',
        'role': 'extension_worker',
        'isActive': True,
    },
    {
        'name': 'Agricultural Extension Worker',
        'role': 'extension_worker',
        'isActive': True,
    },
    {
        'name': 'Agricultural Officer',
        'role': 'extension_worker',
        'isActive': True,
    },
    {
        'name': 'Livestock Technician',
        'role': 'extension_worker',
        'isActive': True,
    },
    {
        'name': 'Crop Technician',
        'role': 'extension_worker',
        'isActive': True,
    },
]


def position_exists(name):
    docs = (
        db.collection(POSITIONS_COLLECTION)
        .where('name', '==', name)
        .limit(1)
        .get()
    )

    return len(docs) > 0


def seed_positions():
    print('Seeding AgriCare positions...\n')

    for position in positions:
        if position_exists(position['name']):
            print(f'SKIPPED: {position["name"]}')
            continue

        doc_ref = db.collection(
            POSITIONS_COLLECTION
        ).document()

        doc_ref.set(position)

        print(
            f'CREATED: {position["name"]} '
            f'[{position["role"]}] '
            f'ID={doc_ref.id}'
        )

    print('\nPosition seeding complete.')


if __name__ == '__main__':
    seed_positions()