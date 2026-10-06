from datetime import datetime, timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from accounts.firebase_service import get_position_by_id
from core.firebase import db


CATEGORIES = 'ticket_categories'
SUBCATEGORIES = 'ticket_subcategories'
PRIORITIES = {'low', 'medium', 'high'}


def now():
    return datetime.now(timezone.utc).isoformat()


def clean(value):
    return ' '.join(str(value or '').strip().split())


def serialize(doc):
    return {'id': doc.id, **(doc.to_dict() or {})}


def error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'error': message}, status=code)


def exists(collection, name, category_id=None, exclude_id=None):
    name = clean(name).casefold()
    query = db.collection(collection)

    if category_id:
        query = query.where('categoryId', '==', category_id)

    for doc in query.stream():
        if doc.id == exclude_id:
            continue

        if clean(doc.to_dict().get('name')).casefold() == name:
            return True

    return False


def get_category(category_id):
    doc = db.collection(CATEGORIES).document(str(category_id)).get()
    return serialize(doc) if doc.exists else None


def get_position(position_id):
    if not position_id:
        return None

    position = get_position_by_id(str(position_id))

    if not position or not position.get('isActive', True):
        return None

    return position


def category_payload(request, current=None):
    current = current or {}

    name = clean(
        request.data.get(
            'name',
            current.get('name', '')
        )
    )

    position_id = clean(
        request.data.get(
            'positionId',
            current.get('positionId', '')
        )
    )

    if not name:
        return None, 'Category name is required.'

    if len(name) > 100:
        return None, 'Category name must not exceed 100 characters.'

    if not position_id:
        return None, 'Assigned personnel position is required.'

    position_doc = (
        db.collection('positions')
        .document(position_id)
        .get()
    )

    if not position_doc.exists:
        return None, 'Selected personnel position does not exist.'

    position = position_doc.to_dict()

    if not position.get('isActive', True):
        return None, 'Selected personnel position is inactive.'

    return {
        'name': name,
        'positionId': position_id,
        'positionName': position.get('name', ''),
        'isActive': bool(
            request.data.get(
                'isActive',
                current.get('isActive', True)
            )
        )
    }, None

def subcategory_payload(request, current=None):
    current = current or {}

    category_id = clean(
        request.data.get(
            'categoryId',
            current.get('categoryId')
        )
    )

    name = clean(
        request.data.get(
            'name',
            current.get('name')
        )
    )

    priority = clean(
        request.data.get(
            'priority',
            current.get('priority', 'low')
        )
    ).lower()

    if not category_id:
        return None, 'Category is required.'

    if not get_category(category_id):
        return None, 'Selected category does not exist.'

    if not name:
        return None, 'Subcategory name is required.'

    if len(name) > 120:
        return None, 'Subcategory name must not exceed 120 characters.'

    if priority not in PRIORITIES:
        return None, 'Priority must be low, medium, or high.'

    return {
        'categoryId': category_id,
        'name': name,
        'priority': priority,
        'isActive': bool(
            request.data.get(
                'isActive',
                current.get('isActive', True)
            )
        )
    }, None


def grouped_categories(active_only=False):
    category_query = db.collection(CATEGORIES)
    subcategory_query = db.collection(SUBCATEGORIES)

    if active_only:
        category_query = category_query.where('isActive', '==', True)
        subcategory_query = subcategory_query.where('isActive', '==', True)

    categories = [
        serialize(doc)
        for doc in category_query.stream()
    ]

    grouped = {}

    for doc in subcategory_query.stream():
        item = serialize(doc)
        category_id = item.get('categoryId')

        if category_id:
            grouped.setdefault(category_id, []).append(item)

    for category in categories:
        children = grouped.get(category['id'], [])
        children.sort(
            key=lambda item: clean(item.get('name')).casefold()
        )

        category['subcategories'] = children

    categories.sort(
        key=lambda item: clean(item.get('name')).casefold()
    )

    return categories


class TicketCategoryListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response(grouped_categories())

    def post(self, request):
        data, message = category_payload(request)

        if message:
            return error(message)

        if exists(CATEGORIES, data['name']):
            return error(
                'A category with this name already exists.'
            )

        data.update({
            'createdAt': now(),
            'updatedAt': now()
        })

        ref = db.collection(CATEGORIES).document()
        ref.set(data)

        return Response(
            {
                'id': ref.id,
                **data,
                'subcategories': []
            },
            status=status.HTTP_201_CREATED
        )

class TicketCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, category_id):
        ref = db.collection(CATEGORIES).document(category_id)
        doc = ref.get()

        if not doc.exists:
            return error(
                'Ticket category not found.',
                status.HTTP_404_NOT_FOUND
            )

        current = doc.to_dict()

        # Active / inactive toggle only
        if (
            'isActive' in request.data
            and 'name' not in request.data
            and 'positionId' not in request.data
        ):
            ref.update({
                'isActive': bool(request.data['isActive']),
                'updatedAt': now()
            })

            return Response({
                'message': 'Category status updated successfully.'
            })

        data, message = category_payload(
            request,
            current
        )

        if message:
            return error(message)

        if exists(
            CATEGORIES,
            data['name'],
            exclude_id=category_id
        ):
            return error(
                'A category with this name already exists.'
            )

        data['updatedAt'] = now()
        ref.update(data)

        return Response({
            'message': 'Ticket category updated successfully.',
            'category': {
                'id': category_id,
                **current,
                **data
            }
        })

    def delete(self, request, category_id):
        ref = db.collection(CATEGORIES).document(category_id)

        if not ref.get().exists:
            return error(
                'Ticket category not found.',
                status.HTTP_404_NOT_FOUND
            )

        children = (
            db.collection(SUBCATEGORIES)
            .where('categoryId', '==', category_id)
            .stream()
        )

        batch = db.batch()

        for child in children:
            batch.delete(child.reference)

        batch.delete(ref)
        batch.commit()

        return Response({
            'message':
                'Category and its subcategories deleted successfully.'
        })
    
class TicketSubcategoryListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        category_id = request.query_params.get('categoryId')
        query = db.collection(SUBCATEGORIES)

        if category_id:
            query = query.where(
                'categoryId',
                '==',
                category_id
            )

        items = [
            serialize(doc)
            for doc in query.stream()
        ]

        items.sort(
            key=lambda item:
                clean(item.get('name')).casefold()
        )

        return Response(items)

    def post(self, request):
        data, message = subcategory_payload(request)

        if message:
            return error(message)

        if exists(
            SUBCATEGORIES,
            data['name'],
            category_id=data['categoryId']
        ):
            return error(
                'This subcategory already exists under '
                'the selected category.'
            )

        data.update({
            'createdAt': now(),
            'updatedAt': now()
        })

        ref = db.collection(SUBCATEGORIES).document()
        ref.set(data)

        return Response(
            {'id': ref.id, **data},
            status=status.HTTP_201_CREATED
        )


class TicketSubcategoryDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, subcategory_id):
        ref = (
            db.collection(SUBCATEGORIES)
            .document(subcategory_id)
        )

        doc = ref.get()

        if not doc.exists:
            return error(
                'Ticket subcategory not found.',
                status.HTTP_404_NOT_FOUND
            )

        data, message = subcategory_payload(
            request,
            doc.to_dict()
        )

        if message:
            return error(message)

        if exists(
            SUBCATEGORIES,
            data['name'],
            category_id=data['categoryId'],
            exclude_id=subcategory_id
        ):
            return error(
                'This subcategory already exists under '
                'the selected category.'
            )

        data['updatedAt'] = now()
        ref.update(data)

        return Response({
            'message':
                'Ticket subcategory updated successfully.'
        })

    def delete(self, request, subcategory_id):
        ref = (
            db.collection(SUBCATEGORIES)
            .document(subcategory_id)
        )

        if not ref.get().exists:
            return error(
                'Ticket subcategory not found.',
                status.HTTP_404_NOT_FOUND
            )

        ref.delete()

        return Response({
            'message':
                'Ticket subcategory deleted successfully.'
        })


class PublicTicketCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = grouped_categories(active_only=True)

 
        categories = [
            category
            for category in categories
            if category.get('positionId')
        ]

        return Response(categories)