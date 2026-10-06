import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
    MdDashboard,
    MdConfirmationNumber,
    MdMenuBook,
    MdManageAccounts,
    MdSettings,
    MdBarChart
} from 'react-icons/md'

import Topbar from './Topbar'
import Sidebar from './Sidebar'
import api from '../../services/api'
import { getCookie } from '../../utils/cookies'

const adminNavLinks = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: MdDashboard
    },
    {
        label: 'Tickets',
        path: '/admin/knowledge-repository',
        icon: MdConfirmationNumber,
        tone: 'ticketing'
    },
    {
        label: 'Discussions',
        path: '/admin/knowledge-base',
        icon: MdMenuBook
    },
    {
        label: 'Users & Access',
        path: '/admin/users',
        icon: MdManageAccounts
    },
    {
        label: 'Configuration',
        path: '/admin/configuration',
        icon: MdSettings
    },
    {
        label: 'Reports',
        path: '/admin/reports',
        icon: MdBarChart
    }
]

const AdminLayout = ({ children }) => {
    const layout = useSelector(
        (state) => state.layout.layout
    )

    const { user } = useSelector(
        (state) => state.auth
    )

    const [unreadCount, setUnreadCount] =
        useState(0)

    const wsRef = useRef(null)
    const reconnectTimerRef = useRef(null)
    const shouldReconnectRef = useRef(true)

    /*
     * Load current notification count
     */
    useEffect(() => {
        let cancelled = false

        const loadNotifications = async () => {
            try {
                const res = await api.get(
                    '/users/notifications/'
                )

                if (cancelled) return

                const notifications =
                    Array.isArray(res.data)
                        ? res.data
                        : []

                const unread =
                    notifications.filter(
                        (notification) =>
                            !notification.isRead
                    ).length

                setUnreadCount(unread)
            } catch (error) {
                if (!cancelled) {
                    console.warn(
                        'Unable to load notifications.',
                        error
                    )

                    setUnreadCount(0)
                }
            }
        }

        loadNotifications()

        return () => {
            cancelled = true
        }
    }, [user?.id])

    /*
     * Notification WebSocket
     */
    useEffect(() => {
        if (!user?.id) {
            return undefined
        }

        const token = getCookie('token')

        if (!token) {
            console.warn(
                'Notification WebSocket not started: token unavailable.'
            )

            return undefined
        }

        shouldReconnectRef.current = true

        const wsProtocol =
            window.location.protocol === 'https:'
                ? 'wss:'
                : 'ws:'

        const defaultWsHost =
            `${wsProtocol}//127.0.0.1:8000`

        const configuredWsHost =
            import.meta.env.VITE_WS_URL?.trim()

        const wsHost =
            configuredWsHost || defaultWsHost

        const connect = () => {
            if (!shouldReconnectRef.current) {
                return
            }

            /*
             * Prevent multiple active sockets.
             */
            if (
                wsRef.current &&
                (
                    wsRef.current.readyState ===
                        WebSocket.OPEN ||
                    wsRef.current.readyState ===
                        WebSocket.CONNECTING
                )
            ) {
                return
            }

            const socketUrl =
                `${wsHost}` +
                `/ws/notifications/` +
                `${encodeURIComponent(user.id)}/` +
                `?token=${encodeURIComponent(token)}`

            const ws = new WebSocket(socketUrl)

            wsRef.current = ws

            ws.onopen = () => {
                console.log(
                    'Notification WebSocket connected.'
                )

                if (reconnectTimerRef.current) {
                    clearTimeout(
                        reconnectTimerRef.current
                    )

                    reconnectTimerRef.current = null
                }
            }

            ws.onmessage = (event) => {
                try {
                    const notification =
                        JSON.parse(event.data)

                    if (notification) {
                        setUnreadCount(
                            (previous) =>
                                previous + 1
                        )
                    }
                } catch {
                    /*
                     * Even if the server sends a message
                     * that isn't JSON, it still represents
                     * a new notification.
                     */
                    setUnreadCount(
                        (previous) =>
                            previous + 1
                    )
                }
            }

            ws.onerror = () => {
                /*
                 * Do not call ws.close() here.
                 * onclose will handle reconnecting.
                 */
                console.warn(
                    'Notification WebSocket encountered an error.'
                )
            }

            ws.onclose = (event) => {
                if (wsRef.current === ws) {
                    wsRef.current = null
                }

                /*
                 * 4403 means the server deliberately
                 * rejected authentication/authorization.
                 * Do not endlessly reconnect in that case.
                 */
                if (event.code === 4403) {
                    console.warn(
                        'Notification WebSocket authorization rejected.'
                    )

                    return
                }

                if (!shouldReconnectRef.current) {
                    return
                }

                if (reconnectTimerRef.current) {
                    clearTimeout(
                        reconnectTimerRef.current
                    )
                }

                reconnectTimerRef.current =
                    setTimeout(
                        () => {
                            connect()
                        },
                        3000
                    )
            }
        }

        connect()

        return () => {
            shouldReconnectRef.current = false

            if (reconnectTimerRef.current) {
                clearTimeout(
                    reconnectTimerRef.current
                )

                reconnectTimerRef.current = null
            }

            const ws = wsRef.current

            wsRef.current = null

            /*
             * Avoid forcing close() on a socket that
             * hasn't finished its opening handshake.
             * This helps prevent the Chrome warning:
             *
             * "WebSocket is closed before the connection
             * is established."
             */
            if (
                ws &&
                ws.readyState === WebSocket.OPEN
            ) {
                ws.close(
                    1000,
                    'Component unmounted'
                )
            }
        }
    }, [user?.id])

    if (layout === 'sidebar') {
        return (
            <Sidebar
                navLinks={adminNavLinks}
                notificationCount={unreadCount}
            >
                {children}
            </Sidebar>
        )
    }

    return (
        <Topbar
            navLinks={adminNavLinks}
            notificationCount={unreadCount}
        >
            {children}
        </Topbar>
    )
}

export default AdminLayout