import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import {
    MdMenuBook,
    MdSupportAgent,
    MdDashboard,
    MdConfirmationNumber,
} from 'react-icons/md'

import Topbar from './Topbar'
import Sidebar from './Sidebar'
import api from '../../services/api'
import { createWebSocketUrl } from '../../services/websocket'

const farmerNavLinks = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: MdDashboard,
    },
    {
        label: 'AgriXa',
        path: '/farmer/knowledge-repository',
        icon: MdMenuBook,
        tone: 'knowledge',
    },
    {
        label: 'Ticketing System',
        path: '/farmer/tickets',
        icon: MdConfirmationNumber,
        tone: 'ticketing',
    },
    {
        label: 'Extension Workers',
        path: '/farmer/extension-workers',
        icon: MdSupportAgent,
    },
]

const FarmerLayout = ({ children }) => {
    const layout = useSelector((state) => state.layout.layout)
    const { user } = useSelector((state) => state.auth)

    const [unreadCount, setUnreadCount] = useState(0)

    const wsRef = useRef(null)

    useEffect(() => {
        api.get('/users/notifications/')
            .then((res) => {
                setUnreadCount(
                    res.data.filter((notification) => !notification.isRead).length
                )
            })
            .catch(() => {})
    }, [])

   useEffect(() => {
    if (!user?.id) return

    const ws = new WebSocket(
        createWebSocketUrl(`/ws/notifications/${user.id}/`)
    )

    ws.onmessage = () => {
        setUnreadCount((prev) => prev + 1)
    }

    ws.onerror = () => {
        ws.close()
    }

    wsRef.current = ws

    return () => {
        ws.close()
        wsRef.current = null
    }
}, [user?.id])

    if (layout === 'sidebar') {
        return (
            <Sidebar
                navLinks={farmerNavLinks}
                notificationCount={unreadCount}
            >
                {children}
            </Sidebar>
        )
    }

    return (
        <Topbar
            navLinks={farmerNavLinks}
            notificationCount={unreadCount}
        >
            {children}
        </Topbar>
    )
}

export default FarmerLayout