import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createWebSocketUrl } from '../../services/websocket'
import {
    MdPeople,
    MdSupportAgent,
    MdNotifications,
    MdSend,
    MdClose,
    MdConfirmationNumber,
    MdPushPin,
    MdCheckCircle,
    MdInsertDriveFile,
    MdAttachFile,
    MdDoneAll,
    MdInbox,
    MdSchedule,
    MdMoreVert,
    MdDeleteSweep,
    MdRestore,
    MdCampaign,
    MdSearch,
    MdArrowForward,
    MdCircle
} from 'react-icons/md'

import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import AdminLayout from '../../components/layout/AdminLayout'
import FarmerLayout from '../../components/layout/FarmerLayout'
import ExtensionWorkerLayout from '../../components/layout/ExtensionWorkerLayout'

import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'

import api from '../../services/api'


/* =========================================================
   NOTIFICATION CONFIG
========================================================= */

const TYPE_ICON = {
    new_farmer: MdPeople,
    new_extension_worker: MdSupportAgent,
    ticket_reply: MdConfirmationNumber,
    ticket_pinned: MdPushPin,
    ticket_resolved: MdCheckCircle,
    ticket_waiting_feedback: MdSchedule
}


const TYPE_COLOR = {
    new_farmer: '#3b82f6',
    new_extension_worker: '#8b5cf6',
    ticket_reply: '#f59e0b',
    ticket_pinned: '#ec4899',
    ticket_resolved: '#10b981',
    ticket_waiting_feedback: '#be185d'
}


const TYPE_LABEL = {
    new_farmer: 'New Farmer',
    new_extension_worker: 'New Extension Worker',
    ticket_reply: 'Ticket Reply',
    ticket_pinned: 'Pinned Answer',
    ticket_resolved: 'Ticket Resolved',
    ticket_waiting_feedback: 'Awaiting Confirmation'
}


const FARMER_HIDDEN_STATS = new Set([
    'new_farmer',
    'new_extension_worker',
    'ticket_waiting_feedback'
])


const ROLE_LABEL = {
    farmer: 'Farmer',
    extension_worker: 'Extension Worker',
    lgu_personnel: 'Extension Worker',
    admin: 'Admin'
}


const TICKET_TYPES = [
    'ticket_reply',
    'ticket_pinned',
    'ticket_resolved',
    'ticket_waiting_feedback'
]


/* =========================================================
   DATE HELPERS
========================================================= */

const groupByDate = notifications => {
    const groups = {}

    const today = new Date()

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const sorted = [...notifications].sort(
        (a, b) =>
            new Date(b.date) - new Date(a.date)
    )

    sorted.forEach(notification => {
        const date = new Date(notification.date)

        let label = ''

        if (
            date.toDateString() ===
            today.toDateString()
        ) {
            label = 'Today'
        } else if (
            date.toDateString() ===
            yesterday.toDateString()
        ) {
            label = 'Yesterday'
        } else {
            label = date.toLocaleDateString(
                undefined,
                {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                }
            )
        }

        if (!groups[label]) {
            groups[label] = []
        }

        groups[label].push(notification)
    })

    return groups
}


const formatTime = date => {
    if (!date) return ''

    return new Date(date).toLocaleTimeString(
        undefined,
        {
            hour: '2-digit',
            minute: '2-digit'
        }
    )
}


const formatFullDate = date => {
    if (!date) return ''

    return new Date(date).toLocaleString(
        undefined,
        {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    )
}


/* =========================================================
   MAIN
========================================================= */

const Notifications = () => {
    const theme = useSelector(state => state.theme)
    const { user } = useSelector(state => state.auth)

    const navigate = useNavigate()

    /* =====================================================
       STATE
    ===================================================== */

    const [notifications, setNotifications] =
        useState([])

    const [loading, setLoading] =
        useState(true)

    const [selected, setSelected] =
        useState(null)

    const [
        mobileDetailOpen,
        setMobileDetailOpen
    ] = useState(false)

    const [
        markingAllRead,
        setMarkingAllRead
    ] = useState(false)

    const [search, setSearch] =
        useState('')

    const [filter, setFilter] =
        useState('all')


    /* LOGS */

    const [logAction, setLogAction] =
        useState('')

    const [logBusy, setLogBusy] =
        useState(false)

    const [logNotice, setLogNotice] =
        useState('')

    const [logMenuOpen, setLogMenuOpen] =
        useState(false)


    /* SEND NOTIFICATION */

    const [sendOpen, setSendOpen] =
        useState(false)

    const [allUsers, setAllUsers] =
        useState([])

    const [sendToAll, setSendToAll] =
        useState(false)

    const [
        selectedUsers,
        setSelectedUsers
    ] = useState([])

    const [userSearch, setUserSearch] =
        useState('')

    const [notifType, setNotifType] =
        useState('')

    const [notifMessage, setNotifMessage] =
        useState('')

    const [sending, setSending] =
        useState(false)

    const [
        dropdownOpen,
        setDropdownOpen
    ] = useState(false)

    const [notifFile, setNotifFile] =
        useState(null)

    const [
        notifFileError,
        setNotifFileError
    ] = useState('')


    /* LIGHTBOX */

    const [lightboxSrc, setLightboxSrc] =
        useState(null)


    const notifFileInputRef = useRef(null)
    const dropdownRef = useRef(null)
    const logMenuRef = useRef(null)


    /* =====================================================
       LAYOUT
    ===================================================== */

    const Layout =
        user?.role === 'farmer'
            ? FarmerLayout
            : user?.role === 'extension_worker' ||
                user?.role === 'lgu_personnel'
                ? ExtensionWorkerLayout
                : AdminLayout


    /* =====================================================
       FETCH
    ===================================================== */

    const fetchNotifications = async (
        showLoader = true
    ) => {
        if (showLoader) {
            setLoading(true)
        }

        try {
            const response =
                await api.get(
                    '/users/notifications/'
                )

            const rows =
                Array.isArray(response.data)
                    ? response.data
                    : response.data?.results ||
                      response.data?.notifications ||
                      []

            setNotifications(rows)

            setSelected(current => {
                if (!current) return current

                const updated =
                    rows.find(
                        item =>
                            item.id === current.id
                    )

                return updated || current
            })
        } catch (error) {
            console.error(
                'Unable to load notifications:',
                error
            )
        } finally {
            if (showLoader) {
                setLoading(false)
            }
        }
    }


    /* =====================================================
       INITIAL + WEBSOCKET
    ===================================================== */

   useEffect(() => {
    fetchNotifications()

    if (!user?.id) return

    const ws = new WebSocket(
        createWebSocketUrl(`/ws/notifications/${user.id}/`)
    )

    ws.onmessage = () => {
        fetchNotifications(false)
    }

    ws.onerror = () => {
        ws.close()
    }

    return () => {
        ws.close()
    }
}, [user?.id])


    /* =====================================================
       LOAD USERS FOR ADMIN
    ===================================================== */

    useEffect(() => {
        if (!sendOpen) return

        api.get('/users/all/')
            .then(response => {
                setAllUsers(
                    Array.isArray(response.data)
                        ? response.data
                        : response.data?.results ||
                          []
                )
            })
            .catch(error => {
                console.error(
                    'Unable to load users:',
                    error
                )
            })
    }, [sendOpen])


    /* =====================================================
       OUTSIDE CLICK
    ===================================================== */

    useEffect(() => {
        const handler = event => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(
                    event.target
                )
            ) {
                setDropdownOpen(false)
            }

            if (
                logMenuRef.current &&
                !logMenuRef.current.contains(
                    event.target
                )
            ) {
                setLogMenuOpen(false)
            }
        }

        document.addEventListener(
            'mousedown',
            handler
        )

        return () => {
            document.removeEventListener(
                'mousedown',
                handler
            )
        }
    }, [])


    /* =====================================================
       COUNTS
    ===================================================== */

    const unreadCount =
        notifications.filter(
            item => !item.isRead
        ).length


    const ticketCount =
        notifications.filter(
            item =>
                TICKET_TYPES.includes(
                    item.type
                )
        ).length


    const resolvedCount =
        notifications.filter(
            item =>
                item.type ===
                'ticket_resolved'
        ).length


    /* =====================================================
       FILTERED LIST
    ===================================================== */

    const filteredNotifications =
        useMemo(() => {
            const keyword =
                search.trim().toLowerCase()

            return notifications.filter(item => {
                if (
                    filter === 'unread' &&
                    item.isRead
                ) {
                    return false
                }

                if (
                    filter === 'tickets' &&
                    !TICKET_TYPES.includes(
                        item.type
                    )
                ) {
                    return false
                }

                if (!keyword) return true

                const text = [
                    item.message,
                    TYPE_LABEL[item.type],
                    item.type
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()

                return text.includes(keyword)
            })
        }, [
            notifications,
            search,
            filter
        ])


    const grouped =
        groupByDate(
            filteredNotifications
        )


    /* =====================================================
       MARK READ
    ===================================================== */

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return

        setMarkingAllRead(true)

        try {
            await api.patch(
                '/users/notifications/read-all/'
            )

            setNotifications(previous =>
                previous.map(item => ({
                    ...item,
                    isRead: true
                }))
            )

            setSelected(previous =>
                previous
                    ? {
                        ...previous,
                        isRead: true
                    }
                    : previous
            )
        } catch (error) {
            console.error(
                'Unable to mark notifications as read:',
                error
            )
        } finally {
            setMarkingAllRead(false)
        }
    }


    /* =====================================================
       SELECT
    ===================================================== */

    const handleSelect = async notification => {
        setSelected(notification)

        if (window.innerWidth < 768) {
            setMobileDetailOpen(true)
        }

        if (notification.isRead) return

        try {
            await api.patch(
                `/users/notifications/${notification.id}/read/`
            )

            setNotifications(previous =>
                previous.map(item =>
                    item.id ===
                    notification.id
                        ? {
                            ...item,
                            isRead: true
                        }
                        : item
                )
            )

            setSelected(previous =>
                previous?.id ===
                notification.id
                    ? {
                        ...previous,
                        isRead: true
                    }
                    : previous
            )
        } catch (error) {
            console.error(
                'Unable to mark notification as read:',
                error
            )
        }
    }


    /* =====================================================
       VIEW TICKET
    ===================================================== */

    const handleViewTicket = notification => {
        if (
            user?.role ===
                'extension_worker' ||
            user?.role ===
                'lgu_personnel'
        ) {
            navigate(
                '/extension-worker/tickets',
                {
                    state: {
                        ticketId:
                            notification.relatedTicketId
                    }
                }
            )

            return
        }

        if (user?.role === 'admin') {
            navigate(
                '/admin/knowledge-repository',
                {
                    state: {
                        ticketId:
                            notification.relatedTicketId
                    }
                }
            )

            return
        }

        navigate(
            '/farmer/knowledge-repository',
            {
                state: {
                    ticketId:
                        notification.relatedTicketId
                }
            }
        )
    }


    /* =====================================================
       CONFIRM RESOLVED
    ===================================================== */

    const confirmResolved = async notification => {
        try {
            await api.patch(
                `/tickets/${notification.relatedTicketId}/status/`,
                {
                    status: 'resolved'
                }
            )

            await fetchNotifications(false)

            setSelected(previous =>
                previous
                    ? {
                        ...previous,
                        type:
                            'ticket_resolved'
                    }
                    : previous
            )
        } catch (error) {
            console.error(
                'Unable to confirm resolution:',
                error
            )
        }
    }


    /* =====================================================
       LOG MANAGEMENT
    ===================================================== */

    const manageLogs = async () => {
        setLogBusy(true)
        setLogNotice('')

        try {
            const response =
                await api.post(
                    '/users/notifications/logs/',
                    {
                        action:
                            logAction
                    }
                )

            setLogNotice(
                `${response.data.count} notification log(s) ${
                    logAction === 'restore'
                        ? 'restored'
                        : 'cleared'
                }.`
            )

            setSelected(null)
            setMobileDetailOpen(false)
            setLogAction('')

            await fetchNotifications(false)
        } catch {
            setLogNotice(
                'Unable to update notification logs. Please try again.'
            )
        } finally {
            setLogBusy(false)
        }
    }


    /* =====================================================
       USER SEARCH
    ===================================================== */

    const filteredUsers =
        allUsers.filter(item => {
            const name =
                `${item.firstName || ''} ${item.lastName || ''}`
                    .trim()
                    .toLowerCase()

            return (
                name.includes(
                    userSearch.toLowerCase()
                ) &&
                !selectedUsers.find(
                    selectedUser =>
                        selectedUser.id ===
                        item.id
                )
            )
        })


    const handleSelectUser = selectedUser => {
        setSelectedUsers(previous => [
            ...previous,
            selectedUser
        ])

        setUserSearch('')
        setDropdownOpen(false)
    }


    const handleRemoveUser = id => {
        setSelectedUsers(previous =>
            previous.filter(
                item =>
                    item.id !== id
            )
        )
    }


    /* =====================================================
       ATTACHMENT
    ===================================================== */

    const handleNotifFileChange = event => {
        const file =
            event.target.files?.[0]

        if (!file) return

        if (file.size > 750 * 1024) {
            setNotifFileError(
                'File must be under 1MB.'
            )

            event.target.value = ''

            return
        }

        setNotifFileError('')

        const reader = new FileReader()

        reader.onload = readerEvent => {
            setNotifFile({
                data:
                    readerEvent.target.result,
                name:
                    file.name,
                type:
                    file.type
            })
        }

        reader.readAsDataURL(file)

        event.target.value = ''
    }


    /* =====================================================
       SEND NOTIFICATION
    ===================================================== */

    const resetSendForm = () => {
        setSelectedUsers([])
        setUserSearch('')
        setNotifType('')
        setNotifMessage('')
        setSendToAll(false)
        setNotifFile(null)
        setNotifFileError('')
        setDropdownOpen(false)
    }


    const closeSendDialog = () => {
        if (sending) return

        setSendOpen(false)
        resetSendForm()
    }


    const handleSend = async () => {
        if (
            !notifType.trim() ||
            !notifMessage.trim()
        ) {
            return
        }

        const userIds =
            sendToAll
                ? allUsers.map(
                    item => item.id
                )
                : selectedUsers.map(
                    item => item.id
                )

        if (!userIds.length) return

        setSending(true)

        try {
            await api.post(
                '/users/notifications/send/',
                {
                    userIds,

                    type:
                        notifType.trim(),

                    message:
                        notifMessage.trim(),

                    fileData:
                        notifFile?.data || '',

                    fileName:
                        notifFile?.name || '',

                    fileType:
                        notifFile?.type || ''
                }
            )

            setSendOpen(false)
            resetSendForm()

            await fetchNotifications(false)
        } catch (error) {
            console.error(
                'Unable to send notification:',
                error
            )
        } finally {
            setSending(false)
        }
    }


    const canSend =
        notifType.trim() &&
        notifMessage.trim() &&
        (
            sendToAll
                ? allUsers.length > 0
                : selectedUsers.length > 0
        )


    /* =====================================================
       NOTIFICATION DETAIL
    ===================================================== */

    const notificationDetail = notification => {
        if (!notification) return null

        const Icon =
            TYPE_ICON[notification.type] ||
            MdNotifications

        const color =
            TYPE_COLOR[notification.type] ||
            theme.primaryColor

        return (
            <div className='flex flex-col'>

                {/* TOP */}
                <div className='flex items-start justify-between gap-4'>

                    <div className='flex items-center gap-3'>

                        <div
                            className='w-12 h-12 rounded-2xl flex items-center justify-center shrink-0'
                            style={{
                                backgroundColor:
                                    `${color}12`,
                                border:
                                    `1px solid ${color}28`
                            }}
                        >
                            <Icon
                                size={23}
                                color={color}
                            />
                        </div>

                        <div>

                            <span
                                className='inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide'
                                style={{
                                    backgroundColor:
                                        `${color}10`,
                                    color
                                }}
                            >
                                {TYPE_LABEL[
                                    notification.type
                                ] ||
                                    notification.type}
                            </span>

                            <p
                                className='text-[11px] opacity-45 mt-1.5'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {formatFullDate(
                                    notification.date
                                )}
                            </p>

                        </div>

                    </div>


                    <div
                        className='flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold'
                        style={{
                            backgroundColor:
                                notification.isRead
                                    ? '#f0fdf4'
                                    : `${color}0d`,

                            color:
                                notification.isRead
                                    ? '#15803d'
                                    : color
                        }}
                    >
                        <MdCircle size={6} />

                        {notification.isRead
                            ? 'Read'
                            : 'Unread'}
                    </div>

                </div>


                {/* DIVIDER */}
                <div
                    className='h-px my-5'
                    style={{
                        backgroundColor:
                            `${theme.secondaryColor}80`
                    }}
                />


                {/* MESSAGE */}
                <div>

                    <p
                        className='text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2'
                        style={{
                            color:
                                theme.textColor
                        }}
                    >
                        Message
                    </p>

                    <div
                        className='rounded-2xl p-4'
                        style={{
                            backgroundColor:
                                `${theme.primaryColor}05`,

                            border:
                                `1px solid ${theme.secondaryColor}70`
                        }}
                    >

                        <div className='flex items-start gap-3'>

                            {notification.message?.includes(
                                'sent an attachment'
                            ) && (
                                <MdInsertDriveFile
                                    size={19}
                                    color={color}
                                    className='shrink-0 mt-0.5'
                                />
                            )}

                            <p
                                className='text-sm leading-6 font-medium'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {notification.message}
                            </p>

                        </div>

                    </div>

                </div>


                {/* ATTACHMENT */}
                {notification.fileData && (
                    <div className='mt-5'>

                        <p
                            className='text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            Attachment
                        </p>

                        {notification.fileType?.startsWith(
                            'image/'
                        ) ? (
                            <button
                                type='button'
                                onClick={() =>
                                    setLightboxSrc(
                                        notification.fileData
                                    )
                                }
                                className='block overflow-hidden rounded-xl'
                                style={{
                                    border:
                                        `1px solid ${theme.secondaryColor}`
                                }}
                            >
                                <img
                                    src={
                                        notification.fileData
                                    }
                                    alt={
                                        notification.fileName ||
                                        'Attachment'
                                    }
                                    className='max-w-[260px] max-h-[190px] object-cover'
                                />
                            </button>
                        ) : (
                            <a
                                href={
                                    notification.fileData
                                }
                                download={
                                    notification.fileName
                                }
                                className='flex items-center gap-3 p-3 rounded-xl'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}08`,

                                    border:
                                        `1px solid ${theme.secondaryColor}`,

                                    color:
                                        theme.primaryColor
                                }}
                            >
                                <div
                                    className='w-9 h-9 rounded-lg flex items-center justify-center'
                                    style={{
                                        backgroundColor:
                                            `${theme.primaryColor}10`
                                    }}
                                >
                                    <MdInsertDriveFile
                                        size={19}
                                    />
                                </div>

                                <div className='min-w-0'>

                                    <p className='text-xs font-semibold truncate'>
                                        {notification.fileName ||
                                            'Attachment'}
                                    </p>

                                    <p className='text-[9px] opacity-50'>
                                        Click to download
                                    </p>

                                </div>

                            </a>
                        )}

                    </div>
                )}


                {/* ACTIONS */}
                {TICKET_TYPES.includes(
                    notification.type
                ) &&
                    notification.relatedTicketId && (
                    <div
                        className='flex flex-wrap gap-2 mt-6 pt-5'
                        style={{
                            borderTop:
                                `1px solid ${theme.secondaryColor}70`
                        }}
                    >

                        <Button
                            size='sm'
                            onClick={() =>
                                handleViewTicket(
                                    notification
                                )
                            }
                        >
                            <span className='inline-flex items-center gap-1.5'>
                                <MdConfirmationNumber
                                    size={15}
                                />

                                View Ticket

                                <MdArrowForward
                                    size={14}
                                />
                            </span>
                        </Button>


                        {notification.type ===
                            'ticket_waiting_feedback' && (
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                    confirmResolved(
                                        notification
                                    )
                                }
                            >
                                <span className='inline-flex items-center gap-1.5'>
                                    <MdCheckCircle
                                        size={15}
                                    />

                                    Confirm Resolved
                                </span>
                            </Button>
                        )}

                    </div>
                )}

            </div>
        )
    }


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <Layout>

            <div className='w-full max-w-[1500px] mx-auto flex flex-col gap-5'>

                {/* =================================================
                    HERO
                ================================================= */}

                <div
                    className='relative overflow-hidden rounded-2xl px-5 py-5 sm:px-6'
                    style={{
                        background:
                            `linear-gradient(
                                135deg,
                                #ffffff 0%,
                                ${theme.primaryColor}08 100%
                            )`,

                        border:
                            `1px solid ${theme.secondaryColor}`
                    }}
                >

                    <div
                        className='absolute -right-10 -top-16 w-48 h-48 rounded-full pointer-events-none'
                        style={{
                            backgroundColor:
                                `${theme.primaryColor}08`
                        }}
                    />

                    <div className='relative flex flex-col lg:flex-row lg:items-center justify-between gap-4'>

                        <div className='flex items-start gap-4'>

                            <div
                                className='w-12 h-12 rounded-2xl flex items-center justify-center shrink-0'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}12`
                                }}
                            >
                                <MdNotifications
                                    size={24}
                                    color={
                                        theme.primaryColor
                                    }
                                />
                            </div>

                            <div>

                                <p
                                    className='text-[10px] font-bold tracking-[0.2em] uppercase mb-1'
                                    style={{
                                        color:
                                            theme.primaryColor
                                    }}
                                >
                                    Notification Center
                                </p>

                                <div className='flex flex-wrap items-center gap-2'>

                                    <h1
                                        className='text-xl sm:text-2xl font-bold'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Notifications
                                    </h1>

                                    {unreadCount > 0 && (
                                        <span
                                            className='px-2.5 py-1 rounded-full text-[10px] font-bold text-white'
                                            style={{
                                                backgroundColor:
                                                    theme.primaryColor
                                            }}
                                        >
                                            {unreadCount}{' '}
                                            unread
                                        </span>
                                    )}

                                </div>

                                <p
                                    className='text-xs sm:text-sm opacity-50 mt-1'
                                    style={{
                                        color:
                                            theme.textColor
                                    }}
                                >
                                    Stay updated with ticket activity,
                                    account events and system
                                    announcements.
                                </p>

                            </div>

                        </div>


                        <div className='flex flex-wrap items-center gap-2'>

                            {unreadCount > 0 && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={
                                        handleMarkAllRead
                                    }
                                    loading={
                                        markingAllRead
                                    }
                                >
                                    <span className='inline-flex items-center gap-1.5'>
                                        <MdDoneAll
                                            size={16}
                                        />
                                        Mark All Read
                                    </span>
                                </Button>
                            )}


                            {user?.role ===
                                'admin' && (
                                <Button
                                    size='sm'
                                    onClick={() =>
                                        setSendOpen(
                                            true
                                        )
                                    }
                                >
                                    <span className='inline-flex items-center gap-1.5'>
                                        <MdSend
                                            size={15}
                                        />
                                        Send Notification
                                    </span>
                                </Button>
                            )}


                            {user?.role ===
                                'admin' && (
                                <div
                                    className='relative'
                                    ref={
                                        logMenuRef
                                    }
                                >

                                    <button
                                        type='button'
                                        onClick={() =>
                                            setLogMenuOpen(
                                                previous =>
                                                    !previous
                                            )
                                        }
                                        className='w-9 h-9 rounded-xl flex items-center justify-center'
                                        style={{
                                            backgroundColor:
                                                '#fff',

                                            border:
                                                `1px solid ${theme.secondaryColor}`,

                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        <MdMoreVert
                                            size={19}
                                        />
                                    </button>


                                    {logMenuOpen && (
                                        <div
                                            className='absolute right-0 top-11 z-30 w-52 rounded-xl overflow-hidden shadow-xl p-1.5'
                                            style={{
                                                backgroundColor:
                                                    '#fff',

                                                border:
                                                    `1px solid ${theme.secondaryColor}`
                                            }}
                                        >

                                            <LogMenuButton
                                                icon={
                                                    MdDeleteSweep
                                                }
                                                label='Clear Read Logs'
                                                onClick={() => {
                                                    setLogAction(
                                                        'clear_read'
                                                    )

                                                    setLogMenuOpen(
                                                        false
                                                    )
                                                }}
                                                theme={
                                                    theme
                                                }
                                            />

                                            <LogMenuButton
                                                icon={
                                                    MdDeleteSweep
                                                }
                                                label='Clear All Logs'
                                                danger
                                                onClick={() => {
                                                    setLogAction(
                                                        'clear_all'
                                                    )

                                                    setLogMenuOpen(
                                                        false
                                                    )
                                                }}
                                                theme={
                                                    theme
                                                }
                                            />

                                            <LogMenuButton
                                                icon={
                                                    MdRestore
                                                }
                                                label='Restore Cleared Logs'
                                                onClick={() => {
                                                    setLogAction(
                                                        'restore'
                                                    )

                                                    setLogMenuOpen(
                                                        false
                                                    )
                                                }}
                                                theme={
                                                    theme
                                                }
                                            />

                                        </div>
                                    )}

                                </div>
                            )}

                        </div>

                    </div>

                </div>


                {/* NOTICE */}

                {logNotice && (
                    <div
                        role='status'
                        className='px-4 py-3 rounded-xl text-xs'
                        style={{
                            backgroundColor:
                                `${theme.primaryColor}08`,

                            color:
                                theme.textColor,

                            border:
                                `1px solid ${theme.secondaryColor}`
                        }}
                    >
                        {logNotice}
                    </div>
                )}


                {/* =================================================
                    STATS
                ================================================= */}

                <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>

                    <StatCard
                        icon={MdInbox}
                        label='Total'
                        value={
                            notifications.length
                        }
                        color={
                            theme.primaryColor
                        }
                        theme={theme}
                    />

                    <StatCard
                        icon={MdNotifications}
                        label='Unread'
                        value={unreadCount}
                        color='#f59e0b'
                        theme={theme}
                    />

                    <StatCard
                        icon={
                            MdConfirmationNumber
                        }
                        label='Ticket Updates'
                        value={ticketCount}
                        color='#3b82f6'
                        theme={theme}
                    />

                    <StatCard
                        icon={MdCheckCircle}
                        label='Resolved'
                        value={resolvedCount}
                        color='#10b981'
                        theme={theme}
                    />

                </div>


                {/* =================================================
                    TOOLBAR
                ================================================= */}

                <div
                    className='flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-2xl'
                    style={{
                        backgroundColor:
                            'rgba(255,255,255,0.94)',

                        border:
                            `1px solid ${theme.secondaryColor}`
                    }}
                >

                    <div className='relative flex-1'>

                        <MdSearch
                            size={18}
                            className='absolute left-3 top-1/2 -translate-y-1/2 opacity-35'
                            color={
                                theme.textColor
                            }
                        />

                        <input
                            value={search}
                            onChange={event =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder='Search notifications...'
                            className='w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none'
                            style={{
                                border:
                                    `1px solid ${theme.secondaryColor}`,

                                backgroundColor:
                                    '#fff',

                                color:
                                    theme.textColor
                            }}
                        />

                    </div>


                    <div className='flex items-center gap-1 p-1 rounded-xl bg-black/[0.025]'>

                        <FilterButton
                            active={
                                filter === 'all'
                            }
                            label='All'
                            count={
                                notifications.length
                            }
                            onClick={() =>
                                setFilter('all')
                            }
                            theme={theme}
                        />

                        <FilterButton
                            active={
                                filter ===
                                'unread'
                            }
                            label='Unread'
                            count={unreadCount}
                            onClick={() =>
                                setFilter(
                                    'unread'
                                )
                            }
                            theme={theme}
                        />

                        <FilterButton
                            active={
                                filter ===
                                'tickets'
                            }
                            label='Tickets'
                            count={ticketCount}
                            onClick={() =>
                                setFilter(
                                    'tickets'
                                )
                            }
                            theme={theme}
                        />

                    </div>

                </div>


                {/* =================================================
                    CONTENT
                ================================================= */}

                {loading ? (

                    <div
                        className='flex items-center justify-center py-28 rounded-2xl'
                        style={{
                            backgroundColor:
                                'rgba(255,255,255,.9)',

                            border:
                                `1px solid ${theme.secondaryColor}`
                        }}
                    >
                        <div className='flex flex-col items-center gap-3'>

                            <AiOutlineLoading3Quarters
                                className='animate-spin'
                                size={28}
                                color={
                                    theme.primaryColor
                                }
                            />

                            <p
                                className='text-xs opacity-50'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Loading notifications...
                            </p>

                        </div>
                    </div>

                ) : filteredNotifications.length === 0 ? (

                    <div
                        className='flex flex-col items-center justify-center py-24 rounded-2xl'
                        style={{
                            backgroundColor:
                                'rgba(255,255,255,.92)',

                            border:
                                `1px solid ${theme.secondaryColor}`
                        }}
                    >

                        <div
                            className='w-16 h-16 rounded-2xl flex items-center justify-center mb-3'
                            style={{
                                backgroundColor:
                                    `${theme.primaryColor}08`
                            }}
                        >
                            <MdNotifications
                                size={30}
                                color={
                                    theme.primaryColor
                                }
                            />
                        </div>

                        <p
                            className='text-sm font-semibold'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            {notifications.length
                                ? 'No matching notifications'
                                : 'No notifications yet'}
                        </p>

                        <p
                            className='text-xs opacity-40 mt-1'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            {notifications.length
                                ? 'Try changing your search or filter.'
                                : 'New activity will appear here.'}
                        </p>

                    </div>

                ) : (

                    <div
                        className='grid md:grid-cols-[390px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)] rounded-2xl overflow-hidden'
                        style={{
                            backgroundColor:
                                'rgba(255,255,255,.94)',

                            border:
                                `1px solid ${theme.secondaryColor}`
                        }}
                    >

                        {/* LEFT */}
                        <div
                            className='max-h-[650px] overflow-y-auto'
                            style={{
                                borderRight:
                                    `1px solid ${theme.secondaryColor}`
                            }}
                        >

                            {Object.entries(
                                grouped
                            ).map(
                                ([
                                    label,
                                    items
                                ]) => (
                                    <div
                                        key={
                                            label
                                        }
                                    >

                                        <div
                                            className='sticky top-0 z-10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em]'
                                            style={{
                                                backgroundColor:
                                                    '#f8faf8',

                                                color:
                                                    theme.textColor,

                                                borderBottom:
                                                    `1px solid ${theme.secondaryColor}`
                                            }}
                                        >
                                            {label}
                                        </div>


                                        {items.map(
                                            notification => (
                                                <NotificationRow
                                                    key={
                                                        notification.id
                                                    }
                                                    notification={
                                                        notification
                                                    }
                                                    selected={
                                                        selected?.id ===
                                                        notification.id
                                                    }
                                                    onClick={() =>
                                                        handleSelect(
                                                            notification
                                                        )
                                                    }
                                                    theme={
                                                        theme
                                                    }
                                                />
                                            )
                                        )}

                                    </div>
                                )
                            )}

                        </div>


                        {/* RIGHT */}
                        <div className='hidden md:flex min-h-[500px] p-6 lg:p-8'>

                            {selected ? (
                                <div className='w-full'>
                                    {notificationDetail(
                                        selected
                                    )}
                                </div>
                            ) : (
                                <div className='w-full flex flex-col items-center justify-center text-center'>

                                    <div
                                        className='w-20 h-20 rounded-3xl flex items-center justify-center mb-4'
                                        style={{
                                            backgroundColor:
                                                `${theme.primaryColor}07`
                                        }}
                                    >
                                        <MdNotifications
                                            size={34}
                                            color={
                                                theme.primaryColor
                                            }
                                        />
                                    </div>

                                    <p
                                        className='text-base font-semibold'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Select a notification
                                    </p>

                                    <p
                                        className='text-xs opacity-40 mt-1 max-w-[280px]'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Choose an item from the list to view its complete details.
                                    </p>

                                </div>
                            )}

                        </div>

                    </div>

                )}

            </div>


            {/* =====================================================
                MOBILE DETAIL
            ===================================================== */}

            <Dialog
                isOpen={mobileDetailOpen}
                onClose={() =>
                    setMobileDetailOpen(false)
                }
                title='Notification Details'
            >
                {notificationDetail(selected)}
            </Dialog>


            {/* =====================================================
                LOG CONFIRM
            ===================================================== */}

            <Dialog
                isOpen={!!logAction}
                onClose={() => {
                    if (!logBusy) {
                        setLogAction('')
                    }
                }}
                title='Manage Notification Logs'
            >

                <div className='flex flex-col gap-4 sm:w-[400px]'>

                    <div
                        className='p-4 rounded-xl'
                        style={{
                            backgroundColor:
                                `${theme.primaryColor}07`,

                            border:
                                `1px solid ${theme.secondaryColor}`
                        }}
                    >
                        <p
                            className='text-sm font-semibold'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            {logAction === 'restore'
                                ? 'Restore cleared notifications?'
                                : logAction === 'clear_read'
                                    ? 'Clear read notifications?'
                                    : 'Clear all notifications?'}
                        </p>

                        <p
                            className='text-xs leading-relaxed opacity-50 mt-1'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            This affects only your notification history.
                            Cleared logs can be restored later.
                        </p>
                    </div>


                    <div className='flex justify-end gap-2'>

                        <Button
                            size='sm'
                            variant='ghost'
                            onClick={() =>
                                setLogAction('')
                            }
                            disabled={logBusy}
                        >
                            Cancel
                        </Button>

                        <Button
                            size='sm'
                            onClick={manageLogs}
                            loading={logBusy}
                        >
                            {logAction === 'restore'
                                ? 'Restore'
                                : 'Confirm'}
                        </Button>

                    </div>

                </div>

            </Dialog>


            {/* =====================================================
                SEND NOTIFICATION
            ===================================================== */}

            <Dialog
                isOpen={sendOpen}
                onClose={closeSendDialog}
                title='Send Notification'
            >

                <div className='flex flex-col gap-5 w-full sm:w-[min(520px,90vw)]'>

                    {/* INFO */}
                    <div
                        className='flex gap-3 p-4 rounded-xl'
                        style={{
                            backgroundColor:
                                `${theme.primaryColor}07`,

                            border:
                                `1px solid ${theme.primaryColor}18`
                        }}
                    >
                        <div
                            className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0'
                            style={{
                                backgroundColor:
                                    `${theme.primaryColor}12`
                            }}
                        >
                            <MdCampaign
                                size={18}
                                color={
                                    theme.primaryColor
                                }
                            />
                        </div>

                        <div>

                            <p
                                className='text-xs font-semibold'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                System Notification
                            </p>

                            <p
                                className='text-[10px] opacity-50 mt-0.5 leading-relaxed'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Send an announcement, reminder or other message to selected users.
                            </p>

                        </div>
                    </div>


                    {/* ALL USERS */}
                    <label
                        className='flex items-center justify-between gap-3 p-3.5 rounded-xl cursor-pointer'
                        style={{
                            border:
                                `1px solid ${
                                    sendToAll
                                        ? theme.primaryColor
                                        : theme.secondaryColor
                                }`,

                            backgroundColor:
                                sendToAll
                                    ? `${theme.primaryColor}07`
                                    : '#fff'
                        }}
                    >

                        <div>

                            <p
                                className='text-xs font-semibold'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Send to All Users
                            </p>

                            <p
                                className='text-[9px] opacity-45 mt-0.5'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Deliver this notification to every active user.
                            </p>

                        </div>

                        <input
                            type='checkbox'
                            checked={sendToAll}
                            onChange={event => {
                                setSendToAll(
                                    event.target.checked
                                )

                                setSelectedUsers([])
                            }}
                            className='w-4 h-4'
                            style={{
                                accentColor:
                                    theme.primaryColor
                            }}
                        />

                    </label>


                    {/* RECIPIENTS */}
                    {!sendToAll && (
                        <div>

                            <FormLabel
                                label='Recipients'
                                required
                                theme={theme}
                            />


                            {selectedUsers.length >
                                0 && (
                                <div className='flex flex-wrap gap-1.5 mb-2'>

                                    {selectedUsers.map(
                                        selectedUser => (
                                            <span
                                                key={
                                                    selectedUser.id
                                                }
                                                className='flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white'
                                                style={{
                                                    backgroundColor:
                                                        theme.primaryColor
                                                }}
                                            >
                                                {selectedUser.firstName}{' '}
                                                {selectedUser.lastName}

                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        handleRemoveUser(
                                                            selectedUser.id
                                                        )
                                                    }
                                                >
                                                    <MdClose
                                                        size={12}
                                                    />
                                                </button>
                                            </span>
                                        )
                                    )}

                                </div>
                            )}


                            <div
                                className='relative'
                                ref={dropdownRef}
                            >

                                <MdSearch
                                    size={16}
                                    className='absolute left-3 top-1/2 -translate-y-1/2 opacity-30'
                                    color={
                                        theme.textColor
                                    }
                                />

                                <input
                                    value={
                                        userSearch
                                    }
                                    onChange={event => {
                                        setUserSearch(
                                            event.target.value
                                        )

                                        setDropdownOpen(
                                            true
                                        )
                                    }}
                                    onFocus={() =>
                                        setDropdownOpen(
                                            true
                                        )
                                    }
                                    placeholder='Search users by name...'
                                    className='w-full pl-9 pr-3 py-2.5 text-sm outline-none rounded-xl'
                                    style={{
                                        border:
                                            `1px solid ${theme.secondaryColor}`,

                                        backgroundColor:
                                            '#fff',

                                        color:
                                            theme.textColor
                                    }}
                                />


                                {dropdownOpen &&
                                    filteredUsers.length >
                                        0 && (
                                    <div
                                        className='absolute z-30 w-full mt-1 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto'
                                        style={{
                                            border:
                                                `1px solid ${theme.secondaryColor}`,

                                            backgroundColor:
                                                '#fff'
                                        }}
                                    >

                                        {filteredUsers.map(
                                            listedUser => (
                                                <button
                                                    type='button'
                                                    key={
                                                        listedUser.id
                                                    }
                                                    onClick={() =>
                                                        handleSelectUser(
                                                            listedUser
                                                        )
                                                    }
                                                    className='w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-black/[0.03]'
                                                >

                                                    <div className='flex items-center gap-2.5 min-w-0'>

                                                        <div
                                                            className='w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0'
                                                            style={{
                                                                backgroundColor:
                                                                    theme.primaryColor
                                                            }}
                                                        >
                                                            {`${listedUser.firstName?.[0] || ''}${listedUser.lastName?.[0] || ''}`.toUpperCase()}
                                                        </div>

                                                        <span
                                                            className='text-xs font-medium truncate'
                                                            style={{
                                                                color:
                                                                    theme.textColor
                                                            }}
                                                        >
                                                            {listedUser.firstName}{' '}
                                                            {listedUser.lastName}
                                                        </span>

                                                    </div>

                                                    <span
                                                        className='text-[9px] opacity-40 shrink-0'
                                                        style={{
                                                            color:
                                                                theme.textColor
                                                        }}
                                                    >
                                                        {ROLE_LABEL[
                                                            listedUser.role
                                                        ] ||
                                                            listedUser.role}
                                                    </span>

                                                </button>
                                            )
                                        )}

                                    </div>
                                )}

                            </div>

                        </div>
                    )}


                    {/* TYPE */}
                    <div>

                        <FormLabel
                            label='Notification Type'
                            required
                            theme={theme}
                        />

                        <input
                            value={notifType}
                            onChange={event =>
                                setNotifType(
                                    event.target.value
                                )
                            }
                            placeholder='e.g. Announcement, Reminder'
                            className='w-full px-3.5 py-2.5 text-sm outline-none rounded-xl'
                            style={{
                                border:
                                    `1px solid ${theme.secondaryColor}`,

                                backgroundColor:
                                    '#fff',

                                color:
                                    theme.textColor
                            }}
                        />

                    </div>


                    {/* MESSAGE */}
                    <div>

                        <div className='flex items-center justify-between mb-1.5'>

                            <FormLabel
                                label='Message'
                                required
                                theme={theme}
                                noMargin
                            />

                            <span
                                className='text-[9px] opacity-35'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {notifMessage.length} characters
                            </span>

                        </div>

                        <textarea
                            value={notifMessage}
                            onChange={event =>
                                setNotifMessage(
                                    event.target.value
                                )
                            }
                            placeholder='Write your notification message...'
                            rows={4}
                            className='w-full px-3.5 py-3 text-sm outline-none rounded-xl resize-none'
                            style={{
                                border:
                                    `1px solid ${theme.secondaryColor}`,

                                backgroundColor:
                                    '#fff',

                                color:
                                    theme.textColor
                            }}
                        />

                    </div>


                    {/* ATTACHMENT */}
                    <div>

                        <FormLabel
                            label='Attachment'
                            optional
                            theme={theme}
                        />

                        <input
                            ref={
                                notifFileInputRef
                            }
                            type='file'
                            className='hidden'
                            onChange={
                                handleNotifFileChange
                            }
                        />


                        {notifFile ? (
                            <div
                                className='flex items-center gap-3 p-3 rounded-xl'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}06`,

                                    border:
                                        `1px solid ${theme.secondaryColor}`
                                }}
                            >

                                {notifFile.type.startsWith(
                                    'image/'
                                ) ? (
                                    <img
                                        src={
                                            notifFile.data
                                        }
                                        alt=''
                                        className='w-11 h-11 rounded-lg object-cover'
                                    />
                                ) : (
                                    <div
                                        className='w-11 h-11 rounded-lg flex items-center justify-center'
                                        style={{
                                            backgroundColor:
                                                `${theme.primaryColor}10`
                                        }}
                                    >
                                        <MdInsertDriveFile
                                            size={21}
                                            color={
                                                theme.primaryColor
                                            }
                                        />
                                    </div>
                                )}

                                <div className='flex-1 min-w-0'>

                                    <p
                                        className='text-xs font-medium truncate'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        {notifFile.name}
                                    </p>

                                    <p
                                        className='text-[9px] opacity-40 mt-0.5'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Ready to send
                                    </p>

                                </div>

                                <button
                                    type='button'
                                    onClick={() =>
                                        setNotifFile(
                                            null
                                        )
                                    }
                                    className='w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.04]'
                                >
                                    <MdClose
                                        size={16}
                                        color={
                                            theme.textColor
                                        }
                                    />
                                </button>

                            </div>
                        ) : (
                            <button
                                type='button'
                                onClick={() =>
                                    notifFileInputRef.current?.click()
                                }
                                className='w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-semibold'
                                style={{
                                    color:
                                        theme.primaryColor,

                                    border:
                                        `1px dashed ${theme.primaryColor}70`,

                                    backgroundColor:
                                        `${theme.primaryColor}04`
                                }}
                            >
                                <MdAttachFile
                                    size={16}
                                />

                                Attach File

                                <span className='opacity-40 font-normal'>
                                    • Max 1MB
                                </span>
                            </button>
                        )}


                        {notifFileError && (
                            <p
                                className='text-[10px] mt-1.5'
                                style={{
                                    color:
                                        theme.dangerColor
                                }}
                            >
                                {notifFileError}
                            </p>
                        )}

                    </div>


                    {/* ACTIONS */}
                    <div
                        className='flex justify-end gap-2 pt-4'
                        style={{
                            borderTop:
                                `1px solid ${theme.secondaryColor}70`
                        }}
                    >

                        <Button
                            size='sm'
                            variant='ghost'
                            onClick={
                                closeSendDialog
                            }
                            disabled={sending}
                        >
                            Cancel
                        </Button>

                        <Button
                            size='sm'
                            onClick={handleSend}
                            loading={sending}
                            disabled={!canSend}
                        >
                            <span className='inline-flex items-center gap-1.5'>
                                <MdSend
                                    size={14}
                                />

                                Send Notification
                            </span>
                        </Button>

                    </div>

                </div>

            </Dialog>


            {/* =====================================================
                LIGHTBOX
            ===================================================== */}

            {lightboxSrc && (
                <div
                    className='fixed inset-0 z-[100] flex items-center justify-center p-5'
                    style={{
                        backgroundColor:
                            'rgba(0,0,0,0.88)'
                    }}
                    onClick={() =>
                        setLightboxSrc(null)
                    }
                >

                    <button
                        type='button'
                        className='absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white'
                        style={{
                            backgroundColor:
                                'rgba(255,255,255,.12)'
                        }}
                        onClick={() =>
                            setLightboxSrc(null)
                        }
                    >
                        <MdClose size={24} />
                    </button>


                    <img
                        src={lightboxSrc}
                        alt='Attachment preview'
                        className='max-w-[90vw] max-h-[90vh] object-contain rounded-xl'
                        onClick={event =>
                            event.stopPropagation()
                        }
                    />

                </div>
            )}

        </Layout>
    )
}


/* =========================================================
   NOTIFICATION ROW
========================================================= */

const NotificationRow = ({
    notification,
    selected,
    onClick,
    theme
}) => {
    const Icon =
        TYPE_ICON[notification.type] ||
        MdNotifications

    const color =
        TYPE_COLOR[notification.type] ||
        theme.primaryColor

    return (
        <button
            type='button'
            onClick={onClick}
            className='relative w-full flex gap-3 p-4 text-left transition-all hover:bg-black/[0.02]'
            style={{
                backgroundColor:
                    selected
                        ? `${color}09`
                        : notification.isRead
                            ? '#fff'
                            : `${color}035`,

                borderBottom:
                    `1px solid ${theme.secondaryColor}70`,

                boxShadow:
                    selected
                        ? `inset 3px 0 0 ${color}`
                        : 'none'
            }}
        >

            <div
                className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0'
                style={{
                    backgroundColor:
                        `${color}10`
                }}
            >
                <Icon
                    size={18}
                    color={color}
                />
            </div>


            <div className='flex-1 min-w-0'>

                <div className='flex items-center justify-between gap-2'>

                    <p
                        className='text-[10px] font-bold uppercase tracking-wide'
                        style={{
                            color
                        }}
                    >
                        {TYPE_LABEL[
                            notification.type
                        ] ||
                            notification.type}
                    </p>

                    <span
                        className='text-[9px] opacity-35 shrink-0'
                        style={{
                            color:
                                theme.textColor
                        }}
                    >
                        {formatTime(
                            notification.date
                        )}
                    </span>

                </div>


                <p
                    className={`text-xs leading-5 mt-1 line-clamp-2 ${
                        notification.isRead
                            ? 'font-normal'
                            : 'font-semibold'
                    }`}
                    style={{
                        color:
                            theme.textColor
                    }}
                >
                    {notification.message}
                </p>


                {notification.fileData && (
                    <div
                        className='flex items-center gap-1 mt-1.5 text-[9px] opacity-45'
                        style={{
                            color:
                                theme.textColor
                        }}
                    >
                        <MdAttachFile
                            size={11}
                        />

                        Attachment
                    </div>
                )}

            </div>


            {!notification.isRead && (
                <div
                    className='absolute right-3 bottom-3 w-2 h-2 rounded-full'
                    style={{
                        backgroundColor:
                            color
                    }}
                />
            )}

        </button>
    )
}


/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    theme
}) => (
    <div
        className='flex items-center gap-3 p-4 rounded-2xl'
        style={{
            backgroundColor:
                'rgba(255,255,255,.94)',

            border:
                `1px solid ${theme.secondaryColor}`
        }}
    >

        <div
            className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0'
            style={{
                backgroundColor:
                    `${color}10`
            }}
        >
            <Icon
                size={19}
                color={color}
            />
        </div>


        <div>

            <p
                className='text-xl font-bold leading-none'
                style={{
                    color:
                        theme.textColor
                }}
            >
                {value}
            </p>

            <p
                className='text-[10px] opacity-45 mt-1'
                style={{
                    color:
                        theme.textColor
                }}
            >
                {label}
            </p>

        </div>

    </div>
)


/* =========================================================
   FILTER BUTTON
========================================================= */

const FilterButton = ({
    active,
    label,
    count,
    onClick,
    theme
}) => (
    <button
        type='button'
        onClick={onClick}
        className='px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all'
        style={{
            backgroundColor:
                active
                    ? theme.primaryColor
                    : 'transparent',

            color:
                active
                    ? '#fff'
                    : theme.textColor
        }}
    >
        {label}

        <span
            className='ml-1.5 opacity-65'
        >
            {count}
        </span>
    </button>
)


/* =========================================================
   LOG MENU
========================================================= */

const LogMenuButton = ({
    icon: Icon,
    label,
    onClick,
    danger,
    theme
}) => (
    <button
        type='button'
        onClick={onClick}
        className='w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs hover:bg-black/[0.03]'
        style={{
            color:
                danger
                    ? theme.dangerColor
                    : theme.textColor
        }}
    >
        <Icon size={16} />

        {label}
    </button>
)


/* =========================================================
   FORM LABEL
========================================================= */

const FormLabel = ({
    label,
    required,
    optional,
    theme,
    noMargin
}) => (
    <div
        className={`flex items-center gap-1 ${
            noMargin
                ? ''
                : 'mb-1.5'
        }`}
    >
        <span
            className='text-[11px] font-semibold'
            style={{
                color:
                    theme.textColor
            }}
        >
            {label}
        </span>

        {required && (
            <span
                className='text-[10px]'
                style={{
                    color:
                        theme.dangerColor
                }}
            >
                *
            </span>
        )}

        {optional && (
            <span
                className='text-[9px] opacity-35'
                style={{
                    color:
                        theme.textColor
                }}
            >
                (optional)
            </span>
        )}
    </div>
)


export default Notifications