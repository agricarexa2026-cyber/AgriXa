import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from accounts.permissions import (
    APPLICATION_ROLES,
    is_active_user,
)

from tickets.permissions import can_view_ticket

from .websocket_auth import authenticate_scope


class SystemConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            'system',
            self.channel_name
        )

        await self.accept()

    async def disconnect(
        self,
        close_code
    ):
        await self.channel_layer.group_discard(
            'system',
            self.channel_name
        )

    async def system_update(
        self,
        event
    ):
        await self.send(
            text_data=json.dumps(
                event['data']
            )
        )


class ProtectedConsumer(
    AsyncWebsocketConsumer
):
    async def permitted(self):
        user = self.scope.get('user')

        if not user:
            return False

        return (
            is_active_user(user)
            and getattr(
                user,
                'role',
                None
            ) in APPLICATION_ROLES
        )

    async def connect(self):
        permitted = await self.permitted()

        if not permitted:
            print(
                '[WebSocket] Connection rejected:',
                self.scope.get('path')
            )

            await self.close(
                code=4403
            )

            return

        self.group_name = (
            self.get_group_name()
        )

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(
        self,
        close_code
    ):
        group_name = getattr(
            self,
            'group_name',
            None
        )

        if group_name:
            await (
                self.channel_layer
                .group_discard(
                    group_name,
                    self.channel_name
                )
            )

    async def refresh_user(self):
        user = await authenticate_scope(
            self.scope
        )

        self.scope['user'] = user

        return user

    async def deliver(
        self,
        event
    ):
        await self.refresh_user()

        if not await self.permitted():
            await self.close(
                code=4403
            )

            return

        data = event.get(
            'data',
            event
        )

        await self.send(
            text_data=json.dumps(data)
        )


class NotificationConsumer(
    ProtectedConsumer
):
    async def permitted(self):
        if not await super().permitted():
            return False

        user = self.scope.get('user')

        if not user:
            return False

        authenticated_user_id = str(
            getattr(
                user,
                'id',
                ''
            )
        ).strip()

        requested_user_id = str(
            self.scope
            .get(
                'url_route',
                {}
            )
            .get(
                'kwargs',
                {}
            )
            .get(
                'user_id',
                ''
            )
        ).strip()

        if not authenticated_user_id:
            print(
                '[Notification WS] '
                'Authenticated user has no ID.'
            )

            return False

        if not requested_user_id:
            print(
                '[Notification WS] '
                'No user ID supplied in URL.'
            )

            return False

        if (
            authenticated_user_id
            != requested_user_id
        ):
            print(
                '[Notification WS] '
                'User ID mismatch:',
                authenticated_user_id,
                '!=',
                requested_user_id
            )

            return False

        return True

    def get_group_name(self):
        user_id = str(
            getattr(
                self.scope.get('user'),
                'id',
                ''
            )
        ).strip()

        return (
            f'notifications_{user_id}'
        )

    async def send_notification(
        self,
        event
    ):
        await self.deliver(event)


class AdminUpdatesConsumer(
    ProtectedConsumer
):
    async def permitted(self):
        if not await super().permitted():
            return False

        user = self.scope.get('user')

        return (
            getattr(
                user,
                'role',
                None
            )
            == 'admin'
        )

    def get_group_name(self):
        return 'admin_updates'

    async def admin_update(
        self,
        event
    ):
        await self.deliver(
            {
                'data': {
                    'type':
                        event
                        .get(
                            'data',
                            {}
                        )
                        .get(
                            'type',
                            'admin_update'
                        )
                }
            }
        )


class TicketUpdatesConsumer(
    ProtectedConsumer
):
    def get_group_name(self):
        return 'ticket_updates'

    async def ticket_update(
        self,
        event
    ):
        await self.deliver(
            {
                'data': {
                    'type':
                        'ticket_update'
                }
            }
        )


class TicketConsumer(
    ProtectedConsumer
):
    async def permitted(self):
        if not await super().permitted():
            return False

        ticket_id = (
            self.scope
            .get(
                'url_route',
                {}
            )
            .get(
                'kwargs',
                {}
            )
            .get(
                'ticket_id'
            )
        )

        if not ticket_id:
            return False

        from tickets.firebase_service import (
            get_ticket_by_id
        )

        ticket = await database_sync_to_async(
            get_ticket_by_id
        )(ticket_id)

        if not ticket:
            return False

        return can_view_ticket(
            self.scope['user'],
            ticket
        )

    def get_group_name(self):
        ticket_id = (
            self.scope['url_route']
            ['kwargs']
            ['ticket_id']
        )

        return f'ticket_{ticket_id}'

    async def ticket_message(
        self,
        event
    ):
        await self.deliver(event)