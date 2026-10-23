
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
    MdSearch,
    MdClose,
    MdDelete,
    MdInsertDriveFile,
    MdPushPin,
    MdConfirmationNumber,
    MdSchedule,
    MdAutorenew,
    MdCheckCircle,
    MdPeople,
    MdMenuBook,
    MdRefresh
} from 'react-icons/md'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import AdminLayout from '../../components/layout/AdminLayout'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import TicketAssignment from '../../components/tickets/TicketAssignment'
import TicketCapacity from '../../components/tickets/TicketCapacity'
import AssignedPersonnel from '../../components/tickets/AssignedPersonnel'
import ConversationHeader from '../../components/tickets/ConversationHeader'
import api from '../../services/api'

const TABS = [
    'all',
    'pending',
    'ongoing',
    'waiting_for_feedback',
    'resolved'
]

const LABEL = {
    all: 'All',
    pending: 'Pending',
    ongoing: 'In Progress',
    waiting_for_feedback: 'Waiting for Feedback',
    resolved: 'Resolved'
}

const STATUS = {
    pending: { bg: '#fff7d6', color: '#b77900' },
    ongoing: { bg: '#e5efff', color: '#2563eb' },
    waiting_for_feedback: { bg: '#fce7f3', color: '#be185d' },
    resolved: { bg: '#dcfce7', color: '#15803d' }
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const formatDate = value => {
    if (!value) return ''
    const d = new Date(value)
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
}

const formatDateTime = value => {
    if (!value) return ''
    const d = new Date(value)
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
}

const mondayOf = (year, month, day = 1) => {
    const d = new Date(year, month, day)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
    return d
}

const isoDate = d => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const normalizeStatus = status =>
    String(status || '').trim().toLowerCase()

const getError = (error, fallback) =>
    error.response?.data?.error ||
    error.response?.data?.detail ||
    error.message ||
    fallback

const Info = ({ label, value, theme }) => (
    <div className='min-w-0'>
        <p
            className='text-[11px] font-medium mb-1'
            style={{ color: theme.textColor, opacity: 0.5 }}
        >
            {label}
        </p>
        <p
            className='text-sm font-semibold break-words'
            style={{ color: theme.textColor }}
        >
            {value || '—'}
        </p>
    </div>
)

const AdminTickets = () => {
    const theme = useSelector(state => state.theme)

    const initialMonday = useMemo(() => {
        const now = new Date()
        return mondayOf(now.getFullYear(), now.getMonth(), now.getDate())
    }, [])

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [listError, setListError] = useState('')

    const [statistics, setStatistics] = useState(null)
    const [statisticsLoading, setStatisticsLoading] = useState(true)
    const [statisticsError, setStatisticsError] = useState('')

    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('all')

    const [weekStart, setWeekStart] = useState(initialMonday)
    const [month, setMonth] = useState(initialMonday.getMonth())
    const [year, setYear] = useState(initialMonday.getFullYear())
    const [weekLabel, setWeekLabel] = useState('')
    const [years, setYears] = useState([])

    const [selected, setSelected] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')
    const [statusLoading, setStatusLoading] = useState(false)
    const [actionError, setActionError] = useState('')

    const [confirmDelete, setConfirmDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [deletingMsgId, setDeletingMsgId] = useState(null)
    const [lightbox, setLightbox] = useState(null)

    const [knowledgeOpen, setKnowledgeOpen] = useState(false)
    const [knowledgeSaving, setKnowledgeSaving] = useState(false)
    const [knowledgeError, setKnowledgeError] = useState('')
    const [knowledgeCreated, setKnowledgeCreated] = useState(null)

    const [knowledgeForm, setKnowledgeForm] = useState({
        title: '',
        question: '',
        answer: '',
        keywords: ''
    })

    const weekRef = useRef(initialMonday)
    const selectedRef = useRef(null)
    const refetchRef = useRef(null)
    const ticketWs = useRef(null)
    const messagesEnd = useRef(null)
    const messageRefs = useRef({})
    const listRequestRef = useRef(0)

    const fetchStatistics = useCallback(async () => {
        setStatisticsLoading(true)
        setStatisticsError('')

        try {
            const { data } = await api.get('/tickets/statistics/')

            setStatistics({
                total: Number(data.total || 0),
                pending: Number(data.pending || 0),
                ongoing: Number(data.ongoing || 0),
                waiting_for_feedback: Number(data.waiting_for_feedback || 0),
                resolved: Number(data.resolved || 0),
                resolutionRate: Number(data.resolutionRate || 0)
            })
        } catch (error) {
            console.error('Failed to retrieve statistics:', error)
            setStatisticsError(
                getError(error, 'Unable to retrieve ticket statistics.')
            )
        } finally {
            setStatisticsLoading(false)
        }
    }, [])

    const fetchTickets = useCallback(async monday => {
        const requestId = ++listRequestRef.current
        weekRef.current = monday

        setLoading(true)
        setListError('')

        try {
            const { data } = await api.get(
                `/tickets/?week_start=${isoDate(monday)}`
            )

            if (requestId !== listRequestRef.current) return

            const rows = Array.isArray(data)
                ? data
                : Array.isArray(data?.tickets)
                    ? data.tickets
                    : []

            setTickets(rows)
            setWeekLabel(data?.weekLabel || '')
            setMonth((Number(data?.month) || monday.getMonth() + 1) - 1)
            setYear(Number(data?.year) || monday.getFullYear())

            if (Array.isArray(data?.availableYears)) {
                setYears(data.availableYears)
            }
        } catch (error) {
            if (requestId !== listRequestRef.current) return

            console.error('Failed to retrieve tickets:', error)
            setListError(getError(error, 'Unable to retrieve tickets.'))
            setTickets([])
        } finally {
            if (requestId === listRequestRef.current) {
                setLoading(false)
            }
        }
    }, [])

    const refreshAll = useCallback(async () => {
        await Promise.all([
            fetchTickets(weekRef.current),
            fetchStatistics()
        ])
    }, [fetchTickets, fetchStatistics])

    const refetchSelected = useCallback(async id => {
        const { data } = await api.get(`/tickets/${id}/`)

        if (selectedRef.current === id) {
            setSelected(data)
        }

        return data
    }, [])

    useEffect(() => {
        fetchTickets(initialMonday)
        fetchStatistics()

        return () => {
            listRequestRef.current += 1
        }
    }, [fetchTickets, fetchStatistics, initialMonday])

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(
            `${protocol}//${window.location.host}/ws/ticket-updates/`
        )

        ws.onmessage = () => {
            refreshAll()
        }

        ws.onerror = () => ws.close()

        return () => ws.close()
    }, [refreshAll])

    useEffect(() => {
        selectedRef.current = selected?.id || null
    }, [selected?.id])

    useEffect(() => {
        refetchRef.current = refetchSelected
    }, [refetchSelected])

    useEffect(() => {
        if (!selected?.id) {
            ticketWs.current?.close()
            ticketWs.current = null
            return
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(
            `${protocol}//${window.location.host}/ws/tickets/${selected.id}/`
        )

        ws.onmessage = () => {
            if (selectedRef.current && refetchRef.current) {
                refetchRef.current(selectedRef.current).catch(console.error)
            }
            refreshAll()
        }

        ws.onerror = () => ws.close()
        ticketWs.current = ws

        return () => {
            ws.close()
            ticketWs.current = null
        }
    }, [selected?.id, refreshAll])

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
    }, [selected?.messages])

    const changeWeek = direction => {
        const next = new Date(weekRef.current)
        next.setDate(next.getDate() + direction * 7)
        setWeekStart(next)
        fetchTickets(next)
    }

    const changeMonth = value => {
        const next = mondayOf(year, value, 1)
        setWeekStart(next)
        fetchTickets(next)
    }

    const changeYear = value => {
        const next = mondayOf(value, month, 1)
        setWeekStart(next)
        fetchTickets(next)
    }

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase()

        return [...tickets]
            .sort((a, b) =>
                new Date(b.date || 0) - new Date(a.date || 0)
            )
            .filter(ticket => {
                const statusMatch =
                    tab === 'all' ||
                    normalizeStatus(ticket.status) === tab

                const text = [
                    ticket.title,
                    ticket.concern,
                    ticket.categoryName,
                    ticket.subcategoryName,
                    ticket.extensionWorkerName,
                    ticket.farmerName,
                    ticket.barangay
                ].filter(Boolean).join(' ').toLowerCase()

                return statusMatch && (!query || text.includes(query))
            })
    }, [tickets, search, tab])

    const counts = useMemo(() => ({
        all: tickets.length,
        pending: tickets.filter(
            ticket => normalizeStatus(ticket.status) === 'pending'
        ).length,
        ongoing: tickets.filter(
            ticket => normalizeStatus(ticket.status) === 'ongoing'
        ).length,
        waiting_for_feedback: tickets.filter(
            ticket => normalizeStatus(ticket.status) === 'waiting_for_feedback'
        ).length,
        resolved: tickets.filter(
            ticket => normalizeStatus(ticket.status) === 'resolved'
        ).length
    }), [tickets])

    const statCards = [
        {
            label: 'Total Tickets',
            value: statistics?.total,
            icon: MdConfirmationNumber
        },
        {
            label: 'Pending',
            value: statistics?.pending,
            icon: MdSchedule
        },
        {
            label: 'In Progress',
            value: statistics?.ongoing,
            icon: MdAutorenew
        },
        {
            label: 'Resolved',
            value: statistics?.resolved,
            icon: MdCheckCircle
        }
    ]

    const openTicket = async ticket => {
        selectedRef.current = ticket.id
        setSelected({ ...ticket, messages: [] })
        setDetailLoading(true)
        setDetailError('')
        setActionError('')
        setKnowledgeCreated(null)
        setKnowledgeError('')

        try {
            const { data } = await api.get(`/tickets/${ticket.id}/`)

            if (selectedRef.current !== ticket.id) return

            setSelected(data)

            if (normalizeStatus(data.status) === 'resolved') {
                try {
                    const knowledge = await api.get('/knowledge/')
                    const rows = Array.isArray(knowledge.data)
                        ? knowledge.data
                        : knowledge.data?.entries ||
                          knowledge.data?.results ||
                          []

                    const existing = rows.find(
                        item => item.sourceTicketId === ticket.id
                    )

                    if (selectedRef.current === ticket.id) {
                        setKnowledgeCreated(existing || null)
                    }
                } catch (error) {
                    console.error('Knowledge lookup failed:', error)
                }
            }
        } catch (error) {
            setDetailError(
                getError(error, 'Unable to load ticket details.')
            )
        } finally {
            setDetailLoading(false)
        }
    }

    const closeTicket = () => {
        selectedRef.current = null
        setSelected(null)
        setDetailError('')
        setActionError('')
    }

    const openKnowledgeForm = () => {
        if (!selected || selected.status !== 'resolved') return

        const messages = selected.messages || []

        const workerMessages = messages.filter(message =>
            ['extension_worker', 'lgu_personnel'].includes(
                message.senderRole
            ) && message.message?.trim()
        )

        const pinnedAnswer = workerMessages.find(
            message => message.isPinned
        )

        const latestAnswer = workerMessages.length
            ? workerMessages[workerMessages.length - 1]
            : null

        const solution =
            pinnedAnswer?.message ||
            latestAnswer?.message ||
            ''

        setKnowledgeForm({
            title: selected.title ||
                `${selected.categoryName || 'Agricultural'} Concern`,
            question: selected.concern || selected.title || '',
            answer: solution,
            keywords: [
                selected.categoryName,
                selected.subcategoryName
            ].filter(Boolean).join(', ')
        })

        setKnowledgeError('')
        setKnowledgeOpen(true)
    }

    const createKnowledgeArticle = async event => {
        event.preventDefault()
        if (!selected) return

        const title = knowledgeForm.title.trim()
        const question = knowledgeForm.question.trim()
        const answer = knowledgeForm.answer.trim()

        if (!title) {
            setKnowledgeError('Article title is required.')
            return
        }

        if (!answer) {
            setKnowledgeError('Recommended solution is required.')
            return
        }

        setKnowledgeSaving(true)
        setKnowledgeError('')

        try {
            const { data } = await api.post('/knowledge/', {
                title,
                question: question || selected.concern || title,
                answer,
                category: selected.categoryName || 'General',
                subcategory: selected.subcategoryName || '',
                keywords: knowledgeForm.keywords
                    .split(',')
                    .map(value => value.trim())
                    .filter(Boolean),
                sourceType: 'ticket',
                sourceTicketId: selected.id,
                sourceTicketTitle:
                    selected.title || selected.concern || selected.id
            })

            setKnowledgeCreated(
                data?.entry || data?.knowledge || data
            )

            setKnowledgeOpen(false)
            setKnowledgeForm({
                title: '',
                question: '',
                answer: '',
                keywords: ''
            })
        } catch (error) {
            setKnowledgeError(
                error.response?.status === 409
                    ? 'This ticket already has a Knowledge Base article.'
                    : getError(error, 'Unable to create Knowledge Base article.')
            )
        } finally {
            setKnowledgeSaving(false)
        }
    }

    const updateStatus = async nextStatus => {
        if (!selected) return

        setStatusLoading(true)
        setActionError('')

        try {
            const { data } = await api.patch(
                `/tickets/${selected.id}/status/`,
                { status: nextStatus }
            )

            const updated = data?.ticket || {
                status: nextStatus
            }

            setSelected(current =>
                current ? { ...current, ...updated } : current
            )

            setTickets(current =>
                current.map(ticket =>
                    ticket.id === selected.id
                        ? { ...ticket, ...updated }
                        : ticket
                )
            )

            await refreshAll()
        } catch (error) {
            setActionError(
                getError(error, 'Unable to update ticket status.')
            )
        } finally {
            setStatusLoading(false)
        }
    }

    const deleteTicket = async id => {
        const ticketId = id || selected?.id
        if (!ticketId) return

        setDeleting(true)
        setActionError('')

        try {
            await api.delete(`/tickets/${ticketId}/delete/`)

            setTickets(current =>
                current.filter(ticket => ticket.id !== ticketId)
            )

            if (selected?.id === ticketId) {
                closeTicket()
            }

            setConfirmDelete(null)
            await refreshAll()
        } catch (error) {
            setActionError(
                getError(error, 'Unable to delete ticket.')
            )
        } finally {
            setDeleting(false)
        }
    }

    const deleteMessage = async id => {
        if (!selected || !window.confirm('Delete this message?')) return

        setDeletingMsgId(id)
        setActionError('')

        try {
            await api.delete(
                `/tickets/${selected.id}/messages/${id}/delete/`
            )

            await refetchSelected(selected.id)
        } catch (error) {
            setActionError(
                getError(error, 'Unable to delete message.')
            )
        } finally {
            setDeletingMsgId(null)
        }
    }

    const handleAssigned = updated => {
        setSelected(current =>
            current?.id === updated.id
                ? { ...current, ...updated }
                : current
        )

        setTickets(current =>
            current.map(ticket =>
                ticket.id === updated.id
                    ? { ...ticket, ...updated }
                    : ticket
            )
        )

        refreshAll()
    }

    return (
        <AdminLayout>
            <div className='app-page flex flex-col gap-5'>
                <section
                    className='app-card p-6 sm:p-7'
                    style={{
                        background:
                            'linear-gradient(120deg,#ffffff 0%,#ffffffee 70%,#edf8ef 100%)'
                    }}
                >
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                            <p
                                className='app-kicker'
                                style={{ color: theme.primaryColor }}
                            >
                                ADMIN SUPPORT OPERATIONS
                            </p>
                            <h1
                                className='app-page-title mt-1'
                                style={{ color: theme.textColor }}
                            >
                                Tickets
                            </h1>
                            <p className='app-page-subtitle mt-1'>
                                Manage farmer concerns, personnel assignments,
                                conversations and ticket status.
                            </p>
                        </div>

                        <button
                            type='button'
                            onClick={refreshAll}
                            className='app-control px-3 py-2 text-xs font-semibold flex items-center gap-2'
                            style={{ color: theme.primaryColor }}
                        >
                            <MdRefresh size={18} />
                            Refresh
                        </button>
                    </div>
                </section>

                <section className='flex flex-col gap-2'>
                    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
                        {statCards.map(({ label, value, icon: Icon }) => (
                            <div
                                key={label}
                                className='app-card p-4 flex items-center justify-between'
                                style={{ backgroundColor: '#fff' }}
                            >
                                <div>
                                    <p
                                        className='text-xs opacity-60'
                                        style={{ color: theme.textColor }}
                                    >
                                        {label}
                                    </p>
                                    <p
                                        className='text-2xl font-bold mt-1'
                                        style={{ color: theme.primaryColor }}
                                    >
                                        {statisticsLoading
                                            ? '...'
                                            : value ?? '—'}
                                    </p>
                                </div>

                                <div
                                    className='w-11 h-11 rounded-xl flex items-center justify-center'
                                    style={{
                                        color: theme.primaryColor,
                                        backgroundColor:
                                            `${theme.primaryColor}12`
                                    }}
                                >
                                    <Icon size={22} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {statisticsError && (
                        <div className='flex flex-wrap justify-between gap-2 text-xs text-red-600'>
                            <span>{statisticsError}</span>
                            <button
                                type='button'
                                onClick={fetchStatistics}
                                className='font-semibold underline'
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </section>

                <section
                    className='app-card p-4 sm:p-5 flex flex-col gap-4'
                    style={{ backgroundColor: '#fff' }}
                >
                    <div className='flex flex-col xl:flex-row gap-3 xl:items-center'>
                        <div className='relative flex-1'>
                            <MdSearch
                                size={19}
                                className='absolute left-3 top-1/2 -translate-y-1/2 opacity-40'
                            />
                            <input
                                value={search}
                                onChange={event =>
                                    setSearch(event.target.value)
                                }
                                placeholder='Search ticket, category, farmer or personnel...'
                                className='app-control w-full pl-10 pr-4 py-2.5 text-sm outline-none'
                                style={{
                                    backgroundColor: '#fff',
                                    color: theme.textColor
                                }}
                            />
                        </div>

                        <div className='flex flex-wrap gap-2 items-center'>
                            <button
                                type='button'
                                onClick={() => changeWeek(-1)}
                                className='app-control px-3 py-2 hover:opacity-70'
                            >
                                ‹
                            </button>

                            <div
                                className='app-control px-3 py-2 text-xs whitespace-nowrap'
                                style={{ color: theme.textColor }}
                            >
                                {weekLabel || `Week of ${formatDate(weekStart)}`}
                            </div>

                            <button
                                type='button'
                                onClick={() => changeWeek(1)}
                                className='app-control px-3 py-2 hover:opacity-70'
                            >
                                ›
                            </button>

                            <select
                                value={month}
                                onChange={event =>
                                    changeMonth(Number(event.target.value))
                                }
                                className='app-control px-3 py-2 text-sm bg-white'
                            >
                                {MONTHS.map((name, index) => (
                                    <option key={name} value={index}>
                                        {name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={year}
                                onChange={event =>
                                    changeYear(Number(event.target.value))
                                }
                                className='app-control px-3 py-2 text-sm bg-white'
                            >
                                {Array.from(new Set([
                                    ...years,
                                    year
                                ])).sort((a, b) => b - a).map(value => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className='flex gap-2 overflow-x-auto pb-1'>
                        {TABS.map(item => (
                            <button
                                key={item}
                                type='button'
                                onClick={() => setTab(item)}
                                className='px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all'
                                style={{
                                    color: tab === item
                                        ? '#fff'
                                        : theme.primaryColor,
                                    backgroundColor: tab === item
                                        ? theme.primaryColor
                                        : `${theme.primaryColor}10`
                                }}
                            >
                                {LABEL[item]}
                                <span className='ml-1.5 opacity-70'>
                                    {counts[item]}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {listError && (
                    <div
                        className='app-card p-4 text-sm text-red-600'
                        style={{ backgroundColor: '#fff' }}
                    >
                        <div className='flex justify-between gap-3'>
                            <span>{listError}</span>
                            <button
                                type='button'
                                onClick={() => fetchTickets(weekRef.current)}
                                className='font-semibold underline'
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className='flex justify-center py-20'>
                        <AiOutlineLoading3Quarters
                            className='animate-spin'
                            size={28}
                            color={theme.primaryColor}
                        />
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        className='app-card flex flex-col items-center justify-center py-20'
                        style={{ backgroundColor: '#fff' }}
                    >
                        <div
                            className='w-14 h-14 rounded-2xl flex items-center justify-center mb-3'
                            style={{
                                backgroundColor: `${theme.primaryColor}10`,
                                color: theme.primaryColor
                            }}
                        >
                            <MdConfirmationNumber size={28} />
                        </div>
                        <p
                            className='font-semibold'
                            style={{ color: theme.textColor }}
                        >
                            No tickets found
                        </p>
                        <p className='text-xs opacity-50 mt-1'>
                            Try another status, week or search term.
                        </p>
                    </div>
                ) : (
                    <section className='flex flex-col gap-3'>
                        {filtered.map(ticket => (
                            <article
                                key={ticket.id}
                                onClick={() => openTicket(ticket)}
                                className='app-card cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg'
                                style={{
                                    backgroundColor: '#fff',
                                    border:
                                        `1px solid ${theme.secondaryColor}55`
                                }}
                            >
                                <div className='p-4 sm:p-5'>
                                    <div className='flex items-start gap-4'>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-start justify-between gap-3'>
                                                <div className='min-w-0'>
                                                    <p
                                                        className='font-bold text-sm sm:text-base truncate'
                                                        style={{
                                                            color: theme.textColor
                                                        }}
                                                    >
                                                        {ticket.title ||
                                                            ticket.concern}
                                                    </p>

                                                    <div className='flex flex-wrap gap-2 mt-2'>
                                                        {ticket.categoryName && (
                                                            <span
                                                                className='text-xs font-semibold'
                                                                style={{
                                                                    color: theme.primaryColor
                                                                }}
                                                            >
                                                                {ticket.categoryName}
                                                            </span>
                                                        )}

                                                        {ticket.subcategoryName && (
                                                            <span className='text-xs opacity-60'>
                                                                {ticket.subcategoryName}
                                                            </span>
                                                        )}

                                                        {ticket.priority && (
                                                            <span
                                                                className='px-2 py-0.5 rounded-full text-[10px] font-bold uppercase'
                                                                style={{
                                                                    backgroundColor:
                                                                        ticket.priority === 'high'
                                                                            ? '#fee2e2'
                                                                            : ticket.priority === 'medium'
                                                                                ? '#fef3c7'
                                                                                : '#dcfce7',
                                                                    color:
                                                                        ticket.priority === 'high'
                                                                            ? '#dc2626'
                                                                            : ticket.priority === 'medium'
                                                                                ? '#b45309'
                                                                                : '#15803d'
                                                                }}
                                                            >
                                                                {ticket.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span
                                                    className='shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold'
                                                    style={{
                                                        backgroundColor:
                                                            STATUS[normalizeStatus(ticket.status)]?.bg,
                                                        color:
                                                            STATUS[normalizeStatus(ticket.status)]?.color
                                                    }}
                                                >
                                                    {LABEL[normalizeStatus(ticket.status)] ||
                                                        ticket.status}
                                                </span>
                                            </div>

                                            {ticket.title && (
                                                <p
                                                    className='text-sm opacity-60 line-clamp-2 mt-3'
                                                    style={{
                                                        color: theme.textColor
                                                    }}
                                                >
                                                    {ticket.concern}
                                                </p>
                                            )}

                                            <div className='flex flex-wrap items-center gap-x-5 gap-y-2 mt-3'>
                                                <TicketCapacity
                                                    ticket={ticket}
                                                    compact
                                                />

                                                {ticket.barangay && (
                                                    <span className='text-xs opacity-55'>
                                                        {ticket.barangay}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type='button'
                                            title='Delete ticket'
                                            onClick={event => {
                                                event.stopPropagation()
                                                setConfirmDelete(ticket)
                                            }}
                                            className='shrink-0 w-8 h-8 rounded-lg flex items-center justify-center opacity-35 hover:opacity-100 hover:bg-red-50'
                                        >
                                            <MdDelete
                                                size={17}
                                                color='#ef4444'
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className='px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2'
                                    style={{
                                        backgroundColor:
                                            `${theme.primaryColor}05`,
                                        borderTop:
                                            `1px solid ${theme.secondaryColor}30`
                                    }}
                                >
                                    <div
                                        className='text-xs'
                                        style={{ color: theme.primaryColor }}
                                    >
                                        <span className='opacity-60'>
                                            Assigned to:{' '}
                                        </span>
                                        <span className='font-semibold'>
                                            <AssignedPersonnel ticket={ticket} />
                                        </span>
                                    </div>

                                    <div className='flex flex-wrap items-center gap-4'>
                                        {ticket.acceptedAt && (
                                            <span className='text-xs opacity-50'>
                                                Accepted{' '}
                                                {formatDateTime(ticket.acceptedAt)}
                                            </span>
                                        )}
                                        <span className='text-xs opacity-40'>
                                            {formatDate(ticket.date)}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>

            <Dialog
                isOpen={!!selected}
                onClose={closeTicket}
                title='Ticket Conversation'
                mobileMaxH='max-h-[96vh]'
            >
                {selected && (
                    <div className='w-[min(1050px,92vw)] max-w-full flex flex-col gap-4'>
                        <ConversationHeader
                            ticket={selected}
                            theme={theme}
                            statusLabel={
                                LABEL[selected.status] || selected.status
                            }
                            statusStyle={STATUS[selected.status]}
                        />

                        {detailError && (
                            <div className='rounded-xl p-3 bg-red-50 text-red-700 text-xs'>
                                {detailError}
                            </div>
                        )}

                        <section
                            className='rounded-2xl overflow-hidden'
                            style={{
                                backgroundColor: '#fff',
                                border:
                                    `1px solid ${theme.secondaryColor}55`
                            }}
                        >
                            <div
                                className='px-4 py-3'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}07`,
                                    borderBottom:
                                        `1px solid ${theme.secondaryColor}35`
                                }}
                            >
                                <p
                                    className='text-xs font-bold uppercase tracking-wider'
                                    style={{ color: theme.primaryColor }}
                                >
                                    Ticket Information
                                </p>
                            </div>

                            <div className='p-4'>
                                <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4'>
                                    <Info
                                        label='Ticket Title'
                                        value={selected.title}
                                        theme={theme}
                                    />
                                    <Info
                                        label='Category'
                                        value={selected.categoryName}
                                        theme={theme}
                                    />
                                    <Info
                                        label='Subcategory'
                                        value={selected.subcategoryName}
                                        theme={theme}
                                    />
                                    <Info
                                        label='Priority'
                                        value={selected.priority}
                                        theme={theme}
                                    />
                                    <Info
                                        label='Farmer'
                                        value={selected.farmerName}
                                        theme={theme}
                                    />
                                    <Info
                                        label='Barangay'
                                        value={selected.barangay}
                                        theme={theme}
                                    />
                                    <Info
                                        label='Submitted'
                                        value={formatDateTime(selected.date)}
                                        theme={theme}
                                    />
                                    <div>
                                        <p className='text-[11px] opacity-50 mb-1'>
                                            Participants
                                        </p>
                                        <TicketCapacity
                                            ticket={selected}
                                            compact
                                        />
                                    </div>
                                    <div>
                                        <p className='text-[11px] opacity-50 mb-1'>
                                            Status
                                        </p>
                                        <span
                                            className='inline-flex px-2.5 py-1 rounded-full text-xs font-semibold'
                                            style={{
                                                backgroundColor:
                                                    STATUS[selected.status]?.bg,
                                                color:
                                                    STATUS[selected.status]?.color
                                            }}
                                        >
                                            {LABEL[selected.status] ||
                                                selected.status}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className='mt-5 pt-4'
                                    style={{
                                        borderTop:
                                            `1px solid ${theme.secondaryColor}30`
                                    }}
                                >
                                    <p
                                        className='text-[11px] font-bold uppercase tracking-wider mb-2'
                                        style={{ color: theme.primaryColor }}
                                    >
                                        Farmer Concern
                                    </p>
                                    <div
                                        className='rounded-xl p-4 text-sm leading-relaxed'
                                        style={{
                                            backgroundColor:
                                                `${theme.primaryColor}07`,
                                            color: theme.textColor
                                        }}
                                    >
                                        {selected.concern ||
                                            'No concern provided.'}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section
                            className='rounded-2xl p-4'
                            style={{
                                backgroundColor: '#fff',
                                border:
                                    `1px solid ${theme.secondaryColor}55`
                            }}
                        >
                            <div className='mb-3'>
                                <p
                                    className='text-xs font-bold uppercase tracking-wider'
                                    style={{ color: theme.primaryColor }}
                                >
                                    Personnel Assignment
                                </p>
                                <p className='text-[11px] opacity-45 mt-1'>
                                    Reassign this ticket when another LGU
                                    personnel should handle the concern.
                                </p>
                            </div>

                            {!detailLoading && (
                                <TicketAssignment
                                    key={selected.id}
                                    ticket={selected}
                                    onAssigned={handleAssigned}
                                />
                            )}
                        </section>

                        {(() => {
                            const pinned = selected.messages?.find(
                                message => message.isPinned
                            )

                            if (!pinned) return null

                            return (
                                <section
                                    className='rounded-2xl p-4 cursor-pointer'
                                    style={{
                                        backgroundColor:
                                            `${theme.primaryColor}0d`,
                                        border:
                                            `1px solid ${theme.primaryColor}35`
                                    }}
                                    onClick={() =>
                                        messageRefs.current[pinned.id]
                                            ?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'center'
                                            })
                                    }
                                >
                                    <div
                                        className='flex items-center gap-1.5 text-xs font-bold mb-2'
                                        style={{
                                            color: theme.primaryColor
                                        }}
                                    >
                                        <MdPushPin size={14} />
                                        Pinned Answer
                                    </div>
                                    <p
                                        className='text-sm'
                                        style={{ color: theme.textColor }}
                                    >
                                        {pinned.message ||
                                            'Pinned attachment'}
                                    </p>
                                </section>
                            )
                        })()}

                        <section
                            className='rounded-xl overflow-hidden'
                            style={{
                                border:
                                    `1px solid ${theme.secondaryColor}45`
                            }}
                        >
                            <div
                                className='px-4 py-3 flex items-center justify-between'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}06`
                                }}
                            >
                                <div>
                                    <p
                                        className='text-sm font-semibold'
                                        style={{ color: theme.textColor }}
                                    >
                                        Conversation
                                    </p>
                                    <p className='text-[11px] opacity-45'>
                                        Farmer and assigned LGU personnel
                                    </p>
                                </div>
                                <span
                                    className='text-xs px-2 py-1 rounded-full'
                                    style={{
                                        color: theme.primaryColor,
                                        backgroundColor:
                                            `${theme.primaryColor}10`
                                    }}
                                >
                                    {selected.messages?.length || 0} messages
                                </span>
                            </div>

                            <div className='h-[360px] max-h-[45vh] overflow-y-auto p-4 bg-white'>
                                {detailLoading ? (
                                    <div className='h-full flex items-center justify-center'>
                                        <AiOutlineLoading3Quarters
                                            className='animate-spin'
                                            size={22}
                                            color={theme.primaryColor}
                                        />
                                    </div>
                                ) : !selected.messages?.length ? (
                                    <div className='h-full flex flex-col items-center justify-center opacity-40'>
                                        <MdPeople size={30} />
                                        <p className='text-sm mt-2'>
                                            No messages yet
                                        </p>
                                    </div>
                                ) : (
                                    <div className='flex flex-col gap-3'>
                                        {selected.messages.map(message => {
                                            const worker = [
                                                'extension_worker',
                                                'lgu_personnel'
                                            ].includes(message.senderRole)

                                            return (
                                                <div
                                                    key={message.id}
                                                    ref={element => {
                                                        messageRefs.current[
                                                            message.id
                                                        ] = element
                                                    }}
                                                    className='flex flex-col gap-1.5 px-3.5 py-3 rounded-2xl'
                                                    style={{
                                                        alignSelf: worker
                                                            ? 'flex-end'
                                                            : 'flex-start',
                                                        width: 'fit-content',
                                                        maxWidth: '72%',
                                                        backgroundColor: worker
                                                            ? `${theme.primaryColor}12`
                                                            : '#f4f5f4',
                                                        border: message.isPinned
                                                            ? `2px solid ${theme.primaryColor}`
                                                            : '1px solid transparent'
                                                    }}
                                                >
                                                    <div className='flex items-center justify-between gap-5'>
                                                        <p
                                                            className='text-[11px] font-semibold'
                                                            style={{
                                                                color: worker
                                                                    ? theme.primaryColor
                                                                    : theme.textColor
                                                            }}
                                                        >
                                                            {message.senderName}
                                                            {' · '}
                                                            <span className='font-normal opacity-60 capitalize'>
                                                                {message.senderRole
                                                                    ?.replaceAll('_', ' ')}
                                                            </span>
                                                        </p>

                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                deleteMessage(
                                                                    message.id
                                                                )
                                                            }
                                                            disabled={
                                                                deletingMsgId ===
                                                                message.id
                                                            }
                                                            className='opacity-25 hover:opacity-100'
                                                        >
                                                            {deletingMsgId ===
                                                            message.id ? (
                                                                <AiOutlineLoading3Quarters
                                                                    className='animate-spin'
                                                                    size={12}
                                                                />
                                                            ) : (
                                                                <MdDelete
                                                                    size={13}
                                                                    color='#ef4444'
                                                                />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {message.message && (
                                                        <p
                                                            className='text-sm whitespace-pre-wrap'
                                                            style={{
                                                                color: theme.textColor
                                                            }}
                                                        >
                                                            {message.message}
                                                        </p>
                                                    )}

                                                    {message.fileData &&
                                                    message.fileType?.startsWith('image/') && (
                                                        <img
                                                            src={message.fileData}
                                                            alt={message.fileName || ''}
                                                            onClick={() =>
                                                                setLightbox(
                                                                    message.fileData
                                                                )
                                                            }
                                                            className='max-w-[260px] max-h-[180px] object-cover rounded-xl cursor-pointer mt-1'
                                                        />
                                                    )}

                                                    {message.fileData &&
                                                    !message.fileType?.startsWith('image/') && (
                                                        <a
                                                            href={message.fileData}
                                                            download={message.fileName}
                                                            className='flex items-center gap-1 text-xs underline'
                                                            style={{
                                                                color: theme.primaryColor
                                                            }}
                                                        >
                                                            <MdInsertDriveFile />
                                                            {message.fileName}
                                                        </a>
                                                    )}

                                                    <p className='text-[10px] opacity-35 text-right'>
                                                        {formatDateTime(
                                                            message.date
                                                        )}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                        <div ref={messagesEnd} />
                                    </div>
                                )}
                            </div>
                        </section>

                        {actionError && (
                            <div className='rounded-xl px-3 py-2.5 text-xs text-red-700 bg-red-50'>
                                {actionError}
                            </div>
                        )}

                        <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
                            <div className='flex flex-wrap gap-2'>
                                {selected.status === 'pending' && (
                                    <Button
                                        size='sm'
                                        loading={statusLoading}
                                        onClick={() =>
                                            updateStatus('ongoing')
                                        }
                                    >
                                        Mark as In Progress
                                    </Button>
                                )}

                                {selected.status === 'ongoing' && (
                                    <Button
                                        size='sm'
                                        loading={statusLoading}
                                        onClick={() =>
                                            updateStatus(
                                                'waiting_for_feedback'
                                            )
                                        }
                                    >
                                        Request Resolution
                                    </Button>
                                )}

                                {selected.status === 'waiting_for_feedback' && (
                                    <Button
                                        size='sm'
                                        loading={statusLoading}
                                        onClick={() =>
                                            updateStatus('resolved')
                                        }
                                    >
                                        Force Resolve
                                    </Button>
                                )}

                                {selected.status === 'resolved' && (
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <span className='px-3 py-2 rounded-lg text-xs font-semibold text-green-700 bg-green-100'>
                                            ✓ Ticket Resolved
                                        </span>

                                        {knowledgeCreated ? (
                                            <span
                                                className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold'
                                                style={{
                                                    color:
                                                        knowledgeCreated.validationStatus === 'validated'
                                                            ? '#15803d'
                                                            : '#b45309',
                                                    backgroundColor:
                                                        knowledgeCreated.validationStatus === 'validated'
                                                            ? '#dcfce7'
                                                            : '#fef3c7'
                                                }}
                                            >
                                                <MdMenuBook size={15} />
                                                {knowledgeCreated.validationStatus === 'validated'
                                                    ? 'Published in AgriXa'
                                                    : knowledgeCreated.validationStatus === 'rejected'
                                                        ? 'Knowledge Article Needs Revision'
                                                        : 'Knowledge Article Pending Review'}
                                            </span>
                                        ) : (
                                            <Button
                                                size='sm'
                                                onClick={openKnowledgeForm}
                                            >
                                                <span className='flex items-center gap-1.5'>
                                                    <MdMenuBook size={16} />
                                                    Create Knowledge Article
                                                </span>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button
                                size='sm'
                                variant='ghost'
                                onClick={closeTicket}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            <Dialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title='Delete Ticket'
            >
                {confirmDelete && (
                    <div className='w-[min(380px,88vw)] flex flex-col gap-4'>
                        <div className='p-3 rounded-xl bg-red-50'>
                            <p className='text-sm text-red-700'>
                                Delete this ticket and all its messages?
                                This action cannot be undone.
                            </p>
                        </div>

                        <p
                            className='text-sm font-semibold'
                            style={{ color: theme.textColor }}
                        >
                            {confirmDelete.title || confirmDelete.concern}
                        </p>

                        {actionError && (
                            <p className='text-xs text-red-600'>
                                {actionError}
                            </p>
                        )}

                        <div className='flex justify-end gap-2'>
                            <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size='sm'
                                variant='danger'
                                loading={deleting}
                                onClick={() =>
                                    deleteTicket(confirmDelete.id)
                                }
                            >
                                Delete Ticket
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            <Dialog
                isOpen={knowledgeOpen}
                onClose={() => {
                    if (!knowledgeSaving) {
                        setKnowledgeOpen(false)
                        setKnowledgeError('')
                    }
                }}
                title='Create Knowledge Article'
            >
                <form
                    onSubmit={createKnowledgeArticle}
                    className='w-[min(620px,90vw)] flex flex-col gap-4'
                >
                    <div
                        className='rounded-xl p-4'
                        style={{
                            backgroundColor: `${theme.primaryColor}08`,
                            border: `1px solid ${theme.primaryColor}25`
                        }}
                    >
                        <div className='flex items-center gap-2 mb-3'>
                            <MdConfirmationNumber
                                size={18}
                                color={theme.primaryColor}
                            />
                            <p
                                className='text-sm font-bold'
                                style={{ color: theme.textColor }}
                            >
                                Resolved Ticket
                            </p>
                        </div>

                        <div className='grid sm:grid-cols-3 gap-3'>
                            <Info
                                label='Ticket'
                                value={selected?.title || selected?.id}
                                theme={theme}
                            />
                            <Info
                                label='Category'
                                value={selected?.categoryName || 'General'}
                                theme={theme}
                            />
                            <Info
                                label='Subcategory'
                                value={selected?.subcategoryName}
                                theme={theme}
                            />
                        </div>
                    </div>

                    <label className='flex flex-col gap-1.5'>
                        <span
                            className='text-xs font-semibold'
                            style={{ color: theme.textColor }}
                        >
                            Article Title
                        </span>
                        <input
                            required
                            value={knowledgeForm.title}
                            onChange={event =>
                                setKnowledgeForm(current => ({
                                    ...current,
                                    title: event.target.value
                                }))
                            }
                            className='app-control px-3 py-2.5 text-sm outline-none'
                            placeholder='Enter article title'
                        />
                    </label>

                    <label className='flex flex-col gap-1.5'>
                        <span
                            className='text-xs font-semibold'
                            style={{ color: theme.textColor }}
                        >
                            Common Farmer Question
                        </span>
                        <textarea
                            rows={3}
                            value={knowledgeForm.question}
                            onChange={event =>
                                setKnowledgeForm(current => ({
                                    ...current,
                                    question: event.target.value
                                }))
                            }
                            className='app-control px-3 py-2.5 text-sm outline-none resize-none'
                            placeholder='Farmer concern'
                        />
                    </label>

                    <label className='flex flex-col gap-1.5'>
                        <div className='flex items-center justify-between gap-3'>
                            <span
                                className='text-xs font-semibold'
                                style={{ color: theme.textColor }}
                            >
                                Recommended Solution
                            </span>
                            <span className='text-[10px] opacity-45'>
                                Extension Worker Answer
                            </span>
                        </div>

                        <textarea
                            required
                            rows={6}
                            value={knowledgeForm.answer}
                            onChange={event =>
                                setKnowledgeForm(current => ({
                                    ...current,
                                    answer: event.target.value
                                }))
                            }
                            className='app-control px-3 py-2.5 text-sm outline-none resize-y'
                            placeholder='Enter the recommended solution...'
                        />

                        <p className='text-[10px] opacity-45'>
                            The pinned Extension Worker answer is used
                            automatically. If no answer is pinned, the
                            latest Extension Worker response is used.
                        </p>
                    </label>

                    <label className='flex flex-col gap-1.5'>
                        <span
                            className='text-xs font-semibold'
                            style={{ color: theme.textColor }}
                        >
                            Search Keywords
                        </span>
                        <input
                            value={knowledgeForm.keywords}
                            onChange={event =>
                                setKnowledgeForm(current => ({
                                    ...current,
                                    keywords: event.target.value
                                }))
                            }
                            className='app-control px-3 py-2.5 text-sm outline-none'
                            placeholder='corn, pest, infestation'
                        />
                        <p className='text-[10px] opacity-45'>
                            Separate keywords with commas.
                        </p>
                    </label>

                    <div className='rounded-xl p-3 bg-amber-50 border border-amber-200'>
                        <div className='flex gap-2'>
                            <MdMenuBook
                                size={18}
                                color='#b45309'
                                className='shrink-0 mt-0.5'
                            />
                            <div>
                                <p className='text-xs font-semibold text-amber-800'>
                                    Admin Review Required
                                </p>
                                <p className='text-[11px] text-amber-700 mt-1 leading-relaxed'>
                                    This will be added to the Knowledge Base
                                    as Pending Review. It will only become
                                    searchable in AgriXa after Admin approval.
                                </p>
                            </div>
                        </div>
                    </div>

                    {knowledgeError && (
                        <div className='rounded-xl px-3 py-2.5 text-xs text-red-700 bg-red-50'>
                            {knowledgeError}
                        </div>
                    )}

                    <div
                        className='flex justify-end gap-2 pt-4'
                        style={{
                            borderTop:
                                `1px solid ${theme.secondaryColor}35`
                        }}
                    >
                        <Button
                            type='button'
                            size='sm'
                            variant='ghost'
                            disabled={knowledgeSaving}
                            onClick={() => {
                                setKnowledgeOpen(false)
                                setKnowledgeError('')
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            type='submit'
                            size='sm'
                            loading={knowledgeSaving}
                        >
                            <span className='flex items-center gap-1.5'>
                                <MdMenuBook size={16} />
                                Save for Review
                            </span>
                        </Button>
                    </div>
                </form>
            </Dialog>

            {lightbox && (
                <div
                    className='fixed inset-0 z-[80] flex items-center justify-center'
                    style={{ backgroundColor: 'rgba(0,0,0,.9)' }}
                    onClick={() => setLightbox(null)}
                >
                    <button
                        type='button'
                        onClick={() => setLightbox(null)}
                        className='absolute top-5 right-5 text-white opacity-70 hover:opacity-100'
                    >
                        <MdClose size={34} />
                    </button>

                    <img
                        src={lightbox}
                        alt=''
                        className='max-w-[92vw] max-h-[90vh] object-contain rounded-xl'
                        onClick={event => event.stopPropagation()}
                    />
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminTickets
