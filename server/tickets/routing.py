from rest_framework.exceptions import ValidationError

from accounts.permissions import WORKER_ROLES
from accounts.firebase_service import (
    get_all_positions,
    get_all_extension_workers
)
from core.firebase import db


CATEGORIES = 'ticket_categories'
SUBCATEGORIES = 'ticket_subcategories'


def clean(value):
    return str(value or '').strip()


def get_category(category_id):
    if not category_id:
        raise ValidationError({
            'error': 'Select a valid concern category.'
        })

    doc = (
        db.collection(CATEGORIES)
        .document(str(category_id))
        .get()
    )

    if not doc.exists:
        raise ValidationError({
            'error': 'Select a valid concern category.'
        })

    data = doc.to_dict()

    if not data.get('isActive', True):
        raise ValidationError({
            'error':
                'The selected category is currently unavailable.'
        })

    return {
        'id': doc.id,
        'name': data.get('name', 'Uncategorized'),
        'positionId': clean(data.get('positionId')),
        'positionName': data.get('positionName', ''),
        'isActive': True
    }


def get_subcategory(subcategory_id, category_id=None):
    if not subcategory_id:
        raise ValidationError({
            'error': 'Select a valid subcategory.'
        })

    doc = (
        db.collection(SUBCATEGORIES)
        .document(str(subcategory_id))
        .get()
    )

    if not doc.exists:
        raise ValidationError({
            'error': 'Select a valid subcategory.'
        })

    data = doc.to_dict()

    if not data.get('isActive', True):
        raise ValidationError({
            'error':
                'The selected subcategory is currently unavailable.'
        })

    stored_category_id = clean(
        data.get('categoryId')
    )

    if (
        category_id and
        stored_category_id != str(category_id)
    ):
        raise ValidationError({
            'error':
                'The selected subcategory does not belong '
                'to the selected category.'
        })

    priority = clean(
        data.get('priority', 'low')
    ).lower()

    if priority not in {'low', 'medium', 'high'}:
        priority = 'low'

    return {
        'id': doc.id,
        'categoryId': stored_category_id,
        'name': data.get('name', 'General Inquiry'),
        'priority': priority,
        'isActive': True
    }


def eligible_personnel():
    active_positions = {
        str(position['id'])
        for position in get_all_positions()
        if position.get('isActive', True)
    }

    personnel = []

    for worker in get_all_extension_workers():
        if worker.get('role') not in WORKER_ROLES:
            continue

        if not worker.get('isActive', True):
            continue

        if worker.get('isPending'):
            continue

        position_id = clean(
            worker.get('positionId')
        )

        if not position_id:
            continue

        if position_id not in active_positions:
            continue

        personnel.append((worker, position_id))

    return personnel


def candidates_for(category, personnel):
    position_id = clean(
        category.get('positionId')
    )

    if not position_id:
        return []

    return [
        worker
        for worker, worker_position_id in personnel
        if worker_position_id == position_id
    ]


def route_concern(category):
    candidates = candidates_for(
        category,
        eligible_personnel()
    )

    if not candidates:
        return None

    return min(
        candidates,
        key=lambda worker:
            str(worker.get('id', ''))
    )


def category_directory():
    personnel = eligible_personnel()

    docs = (
        db.collection(CATEGORIES)
        .where('isActive', '==', True)
        .stream()
    )

    categories = []

    for doc in docs:
        data = doc.to_dict()

        category = {
            'id': doc.id,
            'name': data.get(
                'name',
                'Uncategorized'
            ),
            'positionId': clean(
                data.get('positionId')
            ),
            'positionName': data.get(
                'positionName',
                ''
            )
        }

        categories.append({
            **category,
            'available': bool(
                candidates_for(
                    category,
                    personnel
                )
            )
        })

    categories.sort(
        key=lambda item:
            item['name'].casefold()
    )

    return categories