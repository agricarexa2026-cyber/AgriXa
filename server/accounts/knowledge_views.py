from datetime import datetime, timezone
import re
import unicodedata

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status

from core.firebase import db
from .firebase_service import get_user_by_id


COLLECTION = 'knowledge_entries'

MANAGER_ROLES = {
    'admin',
    'extension_worker',
    'lgu_personnel'
}

VALIDATOR_ROLES = {'admin'}

VALIDATION_STATUSES = {
    'pending',
    'validated',
    'rejected'
}


def _entry(doc):
    entry = {
        'id': doc.id,
        **doc.to_dict()
    }

    # Old/imported articles must be reviewed again.
    if (
        not entry.get('validationStatus')
        or entry.get('validatedBy') == 'system:knowledge-seed'
        or entry.get('validatedByName') == 'Curated agricultural source'
    ):
        entry.update(
            validationStatus='pending',
            isPublished=False
        )

    return entry


def _is_public(entry):
    return (
        entry.get('isPublished') is True
        and entry.get('validationStatus') == 'validated'
    )


def _actor_name(user):
    data = get_user_by_id(str(user.id)) or {}

    name = ' '.join(
        part
        for part in (
            data.get('firstName'),
            data.get('lastName')
        )
        if part
    )

    return name or str(user.id)


_STOP_WORDS = {
    'a', 'about', 'ang', 'and', 'ano', 'are', 'at', 'ba',
    'bakit', 'can', 'do', 'for', 'how', 'i', 'in', 'is',
    'ito', 'ko', 'may', 'mga', 'me', 'my', 'na', 'ng',
    'of', 'on', 'or', 'our', 'sa', 'the', 'this', 'to',
    'what', 'when', 'where', 'which', 'who', 'why', 'with',
    'we', 'you', 'your', 'does', 'did', 'there', 'kung',
    'paano', 'pwede', 'maaari', 'aking'
}


_BILINGUAL_TERMS = {
    'palay': 'rice',
    'bigas': 'rice',
    'butil': 'grain',
    'mais': 'corn',

    'gulay': 'vegetable',
    'gulayan': 'vegetable',
    'prutas': 'fruit',

    'saka': 'farm',
    'sakahan': 'farm',
    'bukid': 'farm',
    'magsasaka': 'farmer',

    'peste': 'pest',
    'pestehan': 'pest',
    'sakit': 'disease',
    'karamdaman': 'disease',

    'halaman': 'plant',
    'tanim': 'planting',
    'magtanim': 'planting',
    'pagtatanim': 'planting',

    'barayti': 'variety',
    'punla': 'seedling',
    'kuhol': 'snail',
    'patubig': 'irrigation',

    'damo': 'weed',
    'pagpapatuyo': 'drying',
    'bodega': 'storage',
    'gastos': 'cost',

    'panahon': 'weather',
    'bagyo': 'typhoon',
    'baha': 'flood',
    'hayop': 'animal',

    'bakuna': 'vaccination',
    'pakain': 'feed',

    'dahon': 'leaf',
    'dilaw': 'yellow',
    'naninilaw': 'yellow',
    'lupa': 'soil',

    'pataba': 'fertilizer',
    'abono': 'fertilizer',
    'binhi': 'seed',
    'buto': 'seed',

    'ulan': 'rain',
    'tubig': 'water',
    'ani': 'harvest',
    'pagaani': 'harvest',

    'presyo': 'price',
    'benta': 'market',
    'pamilihan': 'market',
    'rehistro': 'registration',
    'pagrehistro': 'registration',
    'seguro': 'insurance',

    'gamot': 'treatment',
    'lunas': 'treatment',
    'alaga': 'care',
    'alagaing': 'care',
    'sungay': 'ear',

    'leaves': 'leaf',
    'yellowing': 'yellow',
    'seeds': 'seed',
    'snails': 'snail',
    'weeds': 'weed',
    'vegetables': 'vegetable',
    'fruits': 'fruit',
    'plants': 'plant'
}


def _canonical_word(word):
    word = ''.join(
        char
        for char in unicodedata.normalize('NFKD', word)
        if not unicodedata.combining(char)
    )

    word = (
        word
        .lower()
        .strip(".,!?;:()[]{}\"'“”‘’")
    )

    return _BILINGUAL_TERMS.get(word, word)


def _tokens(value):
    if isinstance(value, (list, tuple, set)):
        value = ' '.join(str(item) for item in value)

    words = (
        _canonical_word(word)
        for word in re.findall(
            r"[\w’'-]+",
            str(value or ''),
            flags=re.UNICODE
        )
    )

    return {
        word
        for word in words
        if len(word) > 2
        and word not in _STOP_WORDS
    }


def _clean_keywords(value):
    if isinstance(value, str):
        return [
            item.strip()
            for item in value.split(',')
            if item.strip()
        ]

    if isinstance(value, (list, tuple, set)):
        return [
            str(item).strip()
            for item in value
            if str(item).strip()
        ]

    return []


def _duplicate_ticket_article(ticket_id):
    if not ticket_id:
        return None

    docs = (
        db.collection(COLLECTION)
        .where('sourceTicketId', '==', ticket_id)
        .limit(1)
        .get()
    )

    return _entry(docs[0]) if docs else None


class KnowledgeListView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]

        return [IsAuthenticated()]

    def get(self, request):
        query = (
            request.query_params.get('q')
            or ''
        ).strip().lower()

        category = (
            request.query_params.get('category')
            or ''
        ).strip()

        docs = (
            db
            .collection(COLLECTION)
            .get()
        )

        entries = [_entry(doc) for doc in docs]

        user = request.user

        is_authenticated = bool(
            user
            and getattr(
                user,
                'is_authenticated',
                False
            )
        )

        role = (
            getattr(user, 'role', None)
            if is_authenticated
            else None
        )

        # Farmers/public users see published articles only.
        # Admin/LGU personnel may see drafts and rejected entries.
        if role not in MANAGER_ROLES:
            entries = [
                item
                for item in entries
                if _is_public(item)
            ]

        if category:
            entries = [
                item
                for item in entries
                if item.get('category') == category
            ]

        if query:
            incoming = _tokens(query)
            ranked = []

            for item in entries:
                title_question = _tokens(
                    ' '.join([
                        item.get('title', ''),
                        item.get('question', ''),
                        item.get('category', ''),
                        item.get('subcategory', '')
                    ])
                )

                keywords = _tokens(
                    item.get('keywords', [])
                )

                answer = _tokens(
                    item.get('answer', '')
                )

                matched = incoming & (
                    title_question
                    | keywords
                    | answer
                )

                if not matched:
                    continue

                percentage = round(
                    100
                    * len(matched)
                    / max(len(incoming), 1)
                )

                field_score = (
                    len(matched & title_question) * 3
                    + len(matched & keywords) * 2
                    + len(matched & answer)
                )

                ranked.append((
                    percentage,
                    field_score,
                    {
                        **item,
                        'matchPercentage': percentage
                    }
                ))

            entries = [
                item
                for _, _, item in sorted(
                    ranked,
                    key=lambda row: (
                        row[0],
                        row[1]
                    ),
                    reverse=True
                )
            ]

        else:
            entries.sort(
                key=lambda item:
                    item.get(
                        'updatedAt',
                        item.get('createdAt', '')
                    ),
                reverse=True
            )

        return Response(entries)

    def post(self, request):
        if request.user.role not in MANAGER_ROLES:
            return Response(
                {
                    'error':
                        'Only Admins and LGU personnel '
                        'can manage knowledge.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        title = str(
            request.data.get('title')
            or ''
        ).strip()

        question = str(
            request.data.get('question')
            or title
        ).strip()

        answer = str(
            request.data.get('answer')
            or ''
        ).strip()

        category = str(
            request.data.get('category')
            or 'General'
        ).strip()

        subcategory = str(
            request.data.get('subcategory')
            or ''
        ).strip()

        source_type = str(
            request.data.get('sourceType')
            or 'manual'
        ).strip()

        source_ticket_id = str(
            request.data.get('sourceTicketId')
            or ''
        ).strip()

        source_ticket_title = str(
            request.data.get('sourceTicketTitle')
            or ''
        ).strip()

        source_name = str(
            request.data.get('sourceName')
            or ''
        ).strip()

        source_url = str(
            request.data.get('sourceUrl')
            or ''
        ).strip()

        if not title:
            return Response(
                {'error': 'title is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not answer:
            return Response(
                {
                    'error':
                        'A recommended solution is required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent one ticket from producing duplicate articles.
        duplicate = _duplicate_ticket_article(
            source_ticket_id
        )

        if duplicate:
            return Response(
                {
                    'error':
                        'This ticket already has a '
                        'Discussions.',
                    'entryId': duplicate.get('id'),
                    'entry': duplicate
                },
                status=status.HTTP_409_CONFLICT
            )

        now = datetime.now(
            timezone.utc
        ).isoformat()

        data = {
            'title': title,
            'question': question,
            'answer': answer,

            'category': category,
            'subcategory': subcategory,

            'keywords': _clean_keywords(
                request.data.get('keywords')
            ),

            # Optional reference information.
            # URL is NOT required.
            'sourceName': source_name,
            'sourceUrl': source_url,

            # Ticket source metadata.
            'sourceType': source_type,
            'sourceTicketId': source_ticket_id,
            'sourceTicketTitle': source_ticket_title,

            'isPublished': False,
            'validationStatus': 'pending',

            'createdBy': str(request.user.id),
            'createdByName': _actor_name(request.user),

            'createdAt': now,
            'updatedAt': now,
            'submittedAt': now,

            'validatedBy': None,
            'validatedByName': None,
            'validatedByRole': None,
            'validatedAt': None,
            'validationNote': None
        }

        ref = (
            db
            .collection(COLLECTION)
            .document()
        )

        ref.set(data)

        return Response(
            {
                'id': ref.id,
                **data
            },
            status=status.HTTP_201_CREATED
        )


class KnowledgeDetailView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def patch(self, request, entry_id):
        if request.user.role not in MANAGER_ROLES:
            return Response(
                {
                    'error':
                        'Only Admins and LGU personnel '
                        'can manage knowledge.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        ref = (
            db
            .collection(COLLECTION)
            .document(entry_id)
        )

        doc = ref.get()

        if not doc.exists:
            return Response(
                {'error': 'Knowledge entry not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        current = doc.to_dict()

        allowed = (
            'title',
            'question',
            'answer',
            'category',
            'subcategory',
            'keywords',
            'sourceName',
            'sourceUrl'
        )

        changes = {
            key: request.data[key]
            for key in allowed
            if key in request.data
        }

        text_fields = (
            'title',
            'question',
            'answer',
            'category',
            'subcategory',
            'sourceName',
            'sourceUrl'
        )

        for key in text_fields:
            if key in changes:
                changes[key] = str(
                    changes[key] or ''
                ).strip()

        if 'keywords' in changes:
            changes['keywords'] = _clean_keywords(
                changes['keywords']
            )

        merged = {
            **current,
            **changes
        }

        if not str(
            merged.get('title') or ''
        ).strip():
            return Response(
                {'error': 'title is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not str(
            merged.get('answer') or ''
        ).strip():
            return Response(
                {
                    'error':
                        'A recommended solution is required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        content_changed = bool(
            set(changes)
            & {
                'title',
                'question',
                'answer',
                'category',
                'subcategory',
                'keywords',
                'sourceName',
                'sourceUrl'
            }
        )

        if content_changed:
            changes.update({
                'isPublished': False,
                'validationStatus': 'pending',

                'submittedAt':
                    datetime.now(
                        timezone.utc
                    ).isoformat(),

                'validatedBy': None,
                'validatedByName': None,
                'validatedByRole': None,
                'validatedAt': None,
                'validationNote': None
            })

        # Direct publishing is Admin-only.
        if 'isPublished' in request.data:
            requested_public = bool(
                request.data.get('isPublished')
            )

            if (
                requested_public
                and request.user.role
                not in VALIDATOR_ROLES
            ):
                return Response(
                    {
                        'error':
                            'Only an Admin can publish '
                            'knowledge articles.'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            if (
                requested_public
                and current.get(
                    'validationStatus'
                ) != 'validated'
            ):
                return Response(
                    {
                        'error':
                            'The article must be '
                            'validated before publishing.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not requested_public:
                changes['isPublished'] = False

        changes['updatedAt'] = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        ref.update(changes)

        return Response({
            'id': entry_id,
            **current,
            **changes
        })

    def delete(self, request, entry_id):
        if request.user.role not in MANAGER_ROLES:
            return Response(
                {
                    'error':
                        'Only Admins and LGU personnel '
                        'can manage knowledge.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        ref = (
            db
            .collection(COLLECTION)
            .document(entry_id)
        )

        if not ref.get().exists:
            return Response(
                {'error': 'Knowledge entry not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        ref.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class KnowledgeValidationView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request, entry_id):
        # Publishing / validation is ADMIN ONLY.
        if request.user.role not in VALIDATOR_ROLES:
            return Response(
                {
                    'error':
                        'Only an Admin can validate '
                        'and publish knowledge articles.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        action = str(
            request.data.get('action')
            or ''
        ).strip().lower()

        if action not in {
            'approve',
            'reject'
        }:
            return Response(
                {
                    'error':
                        'action must be approve or reject'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        ref = (
            db
            .collection(COLLECTION)
            .document(entry_id)
        )

        doc = ref.get()

        if not doc.exists:
            return Response(
                {'error': 'Knowledge entry not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        current = doc.to_dict()

        if action == 'approve':
            if not str(
                current.get('title') or ''
            ).strip():
                return Response(
                    {
                        'error':
                            'An article title is required '
                            'before approval.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not str(
                current.get('answer') or ''
            ).strip():
                return Response(
                    {
                        'error':
                            'A recommended solution is '
                            'required before approval.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        now = datetime.now(
            timezone.utc
        ).isoformat()

        reviewer = _actor_name(
            request.user
        )

        approved = action == 'approve'

        changes = {
            'validationStatus':
                'validated'
                if approved
                else 'rejected',

            'isPublished': approved,

            'validatedBy':
                str(request.user.id),

            'validatedByName':
                reviewer,

            'validatedByRole':
                request.user.role,

            'validatedAt':
                now,

            'validationNote':
                str(
                    request.data.get('note')
                    or ''
                ).strip()
                or (
                    'Approved and published by Admin.'
                    if approved
                    else
                    'Returned for content revision.'
                ),

            'updatedAt':
                now
        }

        ref.update(changes)

        return Response({
            'id': entry_id,
            **current,
            **changes
        })