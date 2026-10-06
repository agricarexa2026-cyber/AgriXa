from django.urls import path

from .views import (
    CheckTicketView,
    SubmitTicketView,
    TicketListView,
    TicketDetailView,
    KnowledgeRepositoryVisitsView,
    TicketStatusView,
    TicketMessageView,
    TicketPinView,
    TicketDeleteView,
    TicketMessageDeleteView,
    TicketAssignmentView,
    TicketJoinView,
)

from .category_views import (
    TicketCategoryListView,
    TicketCategoryDetailView,
    TicketSubcategoryListView,
    TicketSubcategoryDetailView,
    PublicTicketCategoryListView,
)


urlpatterns = [

    # =========================================================
    # TICKET CONFIGURATION
    # =========================================================

    path(
        'categories/',
        TicketCategoryListView.as_view(),
        name='ticket-categories'
    ),

    path(
        'categories/active/',
        PublicTicketCategoryListView.as_view(),
        name='active-ticket-categories'
    ),

    path(
        'categories/<str:category_id>/',
        TicketCategoryDetailView.as_view(),
        name='ticket-category-detail'
    ),

    path(
        'subcategories/',
        TicketSubcategoryListView.as_view(),
        name='ticket-subcategories'
    ),

    path(
        'subcategories/<str:subcategory_id>/',
        TicketSubcategoryDetailView.as_view(),
        name='ticket-subcategory-detail'
    ),

    # =========================================================
    # TICKET ACTIONS
    # =========================================================

    path(
        'check/',
        CheckTicketView.as_view(),
        name='ticket-check'
    ),

    path(
        'submit/',
        SubmitTicketView.as_view(),
        name='ticket-submit'
    ),

    path(
        'visits/',
        KnowledgeRepositoryVisitsView.as_view(),
        name='ticket-visits'
    ),

    # =========================================================
    # TICKET LIST
    # =========================================================

    path(
        '',
        TicketListView.as_view(),
        name='ticket-list'
    ),

    # =========================================================
    # INDIVIDUAL TICKET
    # =========================================================

    path(
        '<str:ticket_id>/',
        TicketDetailView.as_view(),
        name='ticket-detail'
    ),

    path(
        '<str:ticket_id>/delete/',
        TicketDeleteView.as_view(),
        name='ticket-delete'
    ),

    path(
        '<str:ticket_id>/join/',
        TicketJoinView.as_view(),
        name='ticket-join'
    ),

    path(
        '<str:ticket_id>/status/',
        TicketStatusView.as_view(),
        name='ticket-status'
    ),

    path(
        '<str:ticket_id>/assignment/',
        TicketAssignmentView.as_view(),
        name='ticket-assignment'
    ),

    # =========================================================
    # DISCUSSION / MESSAGES
    # =========================================================

    path(
        '<str:ticket_id>/messages/',
        TicketMessageView.as_view(),
        name='ticket-messages'
    ),

    path(
        '<str:ticket_id>/messages/<str:message_id>/pin/',
        TicketPinView.as_view(),
        name='ticket-pin'
    ),

    path(
        '<str:ticket_id>/messages/<str:message_id>/delete/',
        TicketMessageDeleteView.as_view(),
        name='ticket-message-delete'
    ),
]