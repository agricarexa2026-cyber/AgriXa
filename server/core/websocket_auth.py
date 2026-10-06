from http.cookies import SimpleCookie
from types import SimpleNamespace
from urllib.parse import parse_qs, unquote

from channels.db import database_sync_to_async


@database_sync_to_async
def authenticate_scope(scope):
    """
    Authenticate a WebSocket connection using the same JWT used
    by the REST API.

    Supported token sources:
    1. Authorization: Bearer <token>
    2. Browser cookie named "token"
    3. ?token=<token> query parameter as fallback
    """

    from accounts.authentication import FirebaseJWTAuthentication

    headers = dict(scope.get('headers', []))

    authorization = (
        headers
        .get(b'authorization', b'')
        .decode('utf-8', errors='ignore')
        .strip()
    )

    token = ''

    # ---------------------------------------------------------
    # 1. Authorization header
    # ---------------------------------------------------------

    if authorization:
        if authorization.lower().startswith('bearer '):
            token = authorization[7:].strip()

    # ---------------------------------------------------------
    # 2. Cookie
    # ---------------------------------------------------------

    if not token:
        cookie_header = (
            headers
            .get(b'cookie', b'')
            .decode('utf-8', errors='ignore')
        )

        if cookie_header:
            try:
                cookies = SimpleCookie()
                cookies.load(cookie_header)

                if 'token' in cookies:
                    token = unquote(
                        cookies['token'].value
                    ).strip()

            except Exception:
                pass

    # ---------------------------------------------------------
    # 3. Query-string fallback
    # ---------------------------------------------------------

    if not token:
        try:
            query_string = (
                scope
                .get('query_string', b'')
                .decode('utf-8', errors='ignore')
            )

            params = parse_qs(query_string)

            values = params.get('token', [])

            if values:
                token = values[0].strip()

        except Exception:
            pass

    if not token:
        return None

    authorization = f'Bearer {token}'

    request = SimpleNamespace(
        headers={
            'Authorization': authorization
        },
        META={
            'HTTP_AUTHORIZATION': authorization
        }
    )

    try:
        result = (
            FirebaseJWTAuthentication()
            .authenticate(request)
        )

        if not result:
            return None

        user = result[0]

        if not user:
            return None

        return user

    except Exception as exc:
        print(
            '[WebSocket Auth] Authentication failed:',
            str(exc)
        )

        return None


class TokenAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(
        self,
        scope,
        receive,
        send
    ):
        scope = dict(scope)

        user = await authenticate_scope(scope)

        scope['user'] = user

        return await self.app(
            scope,
            receive,
            send
        )