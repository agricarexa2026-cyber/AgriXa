import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
    MdSearch, MdClose, MdDelete, MdInsertDriveFile,
    MdPushPin, MdConfirmationNumber, MdSchedule,
    MdAutorenew, MdCheckCircle, MdPeople, MdMenuBook
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

const TABS = ['all', 'pending', 'ongoing', 'waiting_for_feedback', 'resolved']

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

const date = iso => iso
    ? new Date(iso).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric'
    })
    : ''

const dateTime = iso => iso
    ? new Date(iso).toLocaleString('en-PH', {
        dateStyle: 'medium', timeStyle: 'short'
    })
    : ''

const mondayOf = (year, month, day = 1) => {
    const d = new Date(year, month, day)
    d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
    return d
}

const isoDate = d => d.toISOString().split('T')[0]

const AdminTickets = () => {
    const theme = useSelector(s => s.theme)

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('all')

    const [selected, setSelected] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [statusLoading, setStatusLoading] = useState(false)

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

    const now = new Date()
    const initialMonday = mondayOf(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    )

    const [weekStart, setWeekStart] = useState(initialMonday)
    const [month, setMonth] = useState(initialMonday.getMonth())
    const [year, setYear] = useState(initialMonday.getFullYear())
    const [weekLabel, setWeekLabel] = useState('')
    const [years, setYears] = useState([])

    const weekRef = useRef(initialMonday)
    const selectedRef = useRef(null)
    const refetchRef = useRef(null)
    const ticketWs = useRef(null)
    const messagesEnd = useRef(null)
    const messageRefs = useRef({})

    const fetchTickets = async monday => {
        weekRef.current = monday

        try {
            const { data } = await api.get(
                `/tickets/?week_start=${isoDate(monday)}`
            )

            setTickets(data.tickets || [])
            setWeekLabel(data.weekLabel || '')
            setMonth((data.month || monday.getMonth() + 1) - 1)
            setYear(data.year || monday.getFullYear())

            if (data.availableYears?.length)
                setYears(data.availableYears)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTickets(initialMonday)

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(
            `${protocol}//${location.host}/ws/ticket-updates/`
        )

        ws.onmessage = () => fetchTickets(weekRef.current)
        ws.onerror = () => ws.close()

        return () => ws.close()
    }, [])

    const refetchSelected = async id => {
        const { data } = await api.get(`/tickets/${id}/`)
        setSelected(data)
    }

    useEffect(() => {
        refetchRef.current = refetchSelected
    }, [tickets])

    useEffect(() => {
        selectedRef.current = selected?.id || null
    }, [selected?.id])

    useEffect(() => {
        if (!selected) {
            ticketWs.current?.close()
            ticketWs.current = null
            return
        }

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(
            `${protocol}//${location.host}/ws/tickets/${selected.id}/`
        )

        ws.onmessage = () => {
            if (selectedRef.current && refetchRef.current)
                refetchRef.current(selectedRef.current)
        }

        ws.onerror = () => ws.close()
        ticketWs.current = ws

        return () => {
            ws.close()
            ticketWs.current = null
        }
    }, [selected?.id])

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
    }, [selected?.messages])

    const changeWeek = direction => {
        setLoading(true)
        const next = new Date(weekStart)
        next.setDate(next.getDate() + direction * 7)
        setWeekStart(next)
        fetchTickets(next)
    }

    const changeMonth = value => {
        const next = mondayOf(year, value, 1)
        setLoading(true)
        setWeekStart(next)
        fetchTickets(next)
    }

    const changeYear = value => {
        const next = mondayOf(value, month, 1)
        setLoading(true)
        setWeekStart(next)
        fetchTickets(next)
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()

        return [...tickets]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .filter(t => {
                const statusMatch = tab === 'all' || t.status === tab

                const text = [
                    t.title,
                    t.concern,
                    t.categoryName,
                    t.subcategoryName,
                    t.extensionWorkerName,
                    t.farmerName,
                    t.barangay
                ].filter(Boolean).join(' ').toLowerCase()

                return statusMatch && (!q || text.includes(q))
            })
    }, [tickets, search, tab])

    const counts = useMemo(() => ({
        all: tickets.length,
        pending: tickets.filter(t => t.status === 'pending').length,
        ongoing: tickets.filter(t => t.status === 'ongoing').length,
        waiting: tickets.filter(
            t => t.status === 'waiting_for_feedback'
        ).length,
        resolved: tickets.filter(t => t.status === 'resolved').length
    }), [tickets])

const openTicket = async ticket => {
        setSelected({ ...ticket, messages: [] })
        setDetailLoading(true)
        setKnowledgeCreated(null)
        setKnowledgeError('')

        try {
            const { data } = await api.get(`/tickets/${ticket.id}/`)
            setSelected(data)

            if (data.status === 'resolved') {
                try {
                    const knowledge = await api.get('/knowledge/')
                    const rows = Array.isArray(knowledge.data)
                        ? knowledge.data
                        : knowledge.data?.entries || knowledge.data?.results || []

                    const existing = rows.find(
                        item => item.sourceTicketId === ticket.id
                    )

                    setKnowledgeCreated(existing || null)
                } catch (error) {
                    console.error('Failed to check knowledge article:', error)
                }
            }
        } catch (error) {
            console.error('Failed to load ticket:', error)
        } finally {
            setDetailLoading(false)
        }
    }

    const openKnowledgeForm = () => {
        if (!selected || selected.status !== 'resolved') return

        const messages = selected.messages || []

        const workerMessages = messages.filter(message =>
            ['extension_worker', 'lgu_personnel'].includes(message.senderRole) &&
            message.message?.trim()
        )

        const pinnedAnswer = workerMessages.find(message => message.isPinned)
        const latestAnswer =
            workerMessages.length > 0
                ? workerMessages[workerMessages.length - 1]
                : null

        const solution =
            pinnedAnswer?.message ||
            latestAnswer?.message ||
            ''

        setKnowledgeForm({
            title:
                selected.title ||
                `${selected.categoryName || 'Agricultural'} Concern`,
            question:
                selected.concern ||
                selected.title ||
                '',
            answer: solution,
            keywords: [
                selected.categoryName,
                selected.subcategoryName
            ]
                .filter(Boolean)
                .join(', ')
        })

        setKnowledgeError('')
        setKnowledgeOpen(true)
    }

    const createKnowledgeArticle = async e => {
        e.preventDefault()

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
                question:
                    question ||
                    selected.concern ||
                    title,
                answer,
                category:
                    selected.categoryName ||
                    'General',
                subcategory:
                    selected.subcategoryName ||
                    '',
                keywords: knowledgeForm.keywords
                    .split(',')
                    .map(value => value.trim())
                    .filter(Boolean),
                sourceType: 'ticket',
                sourceTicketId: selected.id,
                sourceTicketTitle:
                    selected.title ||
                    selected.concern ||
                    selected.id
            })

            setKnowledgeCreated(
                data?.entry ||
                data?.knowledge ||
                data
            )

            setKnowledgeOpen(false)

            setKnowledgeForm({
                title: '',
                question: '',
                answer: '',
                keywords: ''
            })
        } catch (error) {
            if (error.response?.status === 409) {
                setKnowledgeError(
                    'This ticket already has a Knowledge Base article.'
                )
            } else {
                setKnowledgeError(
                    error.response?.data?.error ||
                    'Unable to create Knowledge Base article.'
                )
            }
        } finally {
            setKnowledgeSaving(false)
        }
    }

    const updateStatus = async status => {
        if (!selected) return

        setStatusLoading(true)

        try {
            const { data } = await api.patch(
                `/tickets/${selected.id}/status/`,
                { status }
            )

            const updated = data?.ticket || { status }

            setSelected(current => ({ ...current, ...updated }))
            setTickets(current =>
                current.map(t =>
                    t.id === selected.id ? { ...t, ...updated } : t
                )
            )
        } finally {
            setStatusLoading(false)
        }
    }

    const deleteTicket = async id => {
        id ||= selected?.id
        if (!id) return

        setDeleting(true)

        try {
            await api.delete(`/tickets/${id}/delete/`)
            setTickets(current => current.filter(t => t.id !== id))

            if (selected?.id === id)
                setSelected(null)

            setConfirmDelete(null)
        } finally {
            setDeleting(false)
        }
    }

    const deleteMessage = async id => {
        if (!window.confirm('Delete this message?')) return

        setDeletingMsgId(id)

        try {
            await api.delete(
                `/tickets/${selected.id}/messages/${id}/delete/`
            )

            await refetchSelected(selected.id)
        } finally {
            setDeletingMsgId(null)
        }
    }

    const statCards = [
        {
            label: 'Total Tickets',
            value: counts.all,
            icon: MdConfirmationNumber
        },
        {
            label: 'Pending',
            value: counts.pending,
            icon: MdSchedule
        },
        {
            label: 'In Progress',
            value: counts.ongoing,
            icon: MdAutorenew
        },
        {
            label: 'Resolved',
            value: counts.resolved,
            icon: MdCheckCircle
        }
    ]

    return (
        <AdminLayout>
            <div className='app-page flex flex-col gap-5'>

                {/* PAGE HEADER */}
                <section
                    className='app-card p-6 sm:p-7'
                    style={{
                        background:
                            'linear-gradient(120deg,#ffffff 0%,#ffffffee 70%,#edf8ef 100%)'
                    }}
                >
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
                </section>

                {/* STATISTICS */}
                <section className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
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
                                    {value}
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
                </section>

                {/* FILTER PANEL */}
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
                                onChange={e => setSearch(e.target.value)}
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
                                onClick={() => changeWeek(-1)}
                                className='app-control px-3 py-2 hover:opacity-70'
                            >
                                ‹
                            </button>

                            <div
                                className='app-control px-3 py-2 text-xs whitespace-nowrap'
                                style={{ color: theme.textColor }}
                            >
                                {weekLabel || 'Current week'}
                            </div>

                            <button
                                onClick={() => changeWeek(1)}
                                className='app-control px-3 py-2 hover:opacity-70'
                            >
                                ›
                            </button>

                            <select
                                value={month}
                                onChange={e =>
                                    changeMonth(Number(e.target.value))
                                }
                                className='app-control px-3 py-2 text-sm bg-white'
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={m} value={i}>
                                        {m}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={year}
                                onChange={e =>
                                    changeYear(Number(e.target.value))
                                }
                                className='app-control px-3 py-2 text-sm bg-white'
                            >
                                {(years.length ? years : [year]).map(y => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className='flex gap-2 overflow-x-auto pb-1'>
                        {TABS.map(item => (
                            <button
                                key={item}
                                onClick={() => setTab(item)}
                                className='px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all'
                                style={{
                                    color:
                                        tab === item
                                            ? '#fff'
                                            : theme.primaryColor,
                                    backgroundColor:
                                        tab === item
                                            ? theme.primaryColor
                                            : `${theme.primaryColor}10`
                                }}
                            >
                                {LABEL[item]}
                                <span className='ml-1.5 opacity-70'>
                                    {item === 'all'
                                        ? counts.all
                                        : item === 'waiting_for_feedback'
                                            ? counts.waiting
                                            : counts[item]}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* TICKET LIST */}
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
                                                            color:
                                                                theme.textColor
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
                                                                    color:
                                                                        theme.primaryColor
                                                                }}
                                                            >
                                                                {
                                                                    ticket.categoryName
                                                                }
                                                            </span>
                                                        )}

                                                        {ticket.subcategoryName && (
                                                            <>
                                                                <span className='opacity-25'>
                                                                    •
                                                                </span>
                                                                <span className='text-xs opacity-60'>
                                                                    {
                                                                        ticket.subcategoryName
                                                                    }
                                                                </span>
                                                            </>
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
                                                                {
                                                                    ticket.priority
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span
                                                    className='shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold'
                                                    style={{
                                                        backgroundColor:
                                                            STATUS[ticket.status]
                                                                ?.bg,
                                                        color:
                                                            STATUS[ticket.status]
                                                                ?.color
                                                    }}
                                                >
                                                    {LABEL[ticket.status] ||
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
                                            title='Delete ticket'
                                            onClick={e => {
                                                e.stopPropagation()
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
                                        style={{
                                            color: theme.primaryColor
                                        }}
                                    >
                                        <span className='opacity-60'>
                                            Assigned to:{' '}
                                        </span>
                                        <span className='font-semibold'>
                                            <AssignedPersonnel
                                                ticket={ticket}
                                            />
                                        </span>
                                    </div>

                                    <div className='flex flex-wrap items-center gap-4'>
                                        {ticket.acceptedAt && (
                                            <span className='text-xs opacity-50'>
                                                Accepted{' '}
                                                {dateTime(ticket.acceptedAt)}
                                            </span>
                                        )}

                                        <span className='text-xs opacity-40'>
                                            {date(ticket.date)}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>

            {/* TICKET CONVERSATION */}
            <Dialog
                isOpen={!!selected}
                onClose={() => setSelected(null)}
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

                      {/* TICKET INFORMATION */}
<section
    className='rounded-2xl overflow-hidden'
    style={{
        backgroundColor: '#fff',
        border: `1px solid ${theme.secondaryColor}55`
    }}
>
    <div
        className='px-4 py-3'
        style={{
            backgroundColor: `${theme.primaryColor}07`,
            borderBottom: `1px solid ${theme.secondaryColor}35`
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
                value={selected.title || '—'}
                theme={theme}
            />

            <Info
                label='Category'
                value={selected.categoryName || '—'}
                theme={theme}
            />

            <Info
                label='Subcategory'
                value={selected.subcategoryName || '—'}
                theme={theme}
            />

            <Info
                label='Priority'
                value={
                    selected.priority
                        ? selected.priority[0].toUpperCase() +
                          selected.priority.slice(1)
                        : '—'
                }
                theme={theme}
            />

            <Info
                label='Farmer'
                value={selected.farmerName || '—'}
                theme={theme}
            />

            <Info
                label='Barangay'
                value={selected.barangay || '—'}
                theme={theme}
            />

            <Info
                label='Submitted'
                value={dateTime(selected.date)}
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
                    {LABEL[selected.status] || selected.status}
                </span>
            </div>
        </div>

        <div
            className='mt-5 pt-4'
            style={{
                borderTop: `1px solid ${theme.secondaryColor}30`
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
                    backgroundColor: `${theme.primaryColor}07`,
                    color: theme.textColor
                }}
            >
                {selected.concern || 'No concern provided.'}
            </div>
        </div>
    </div>
</section>

{/* ASSIGNMENT */}
<section
    className='rounded-2xl p-4'
    style={{
        backgroundColor: '#fff',
        border: `1px solid ${theme.secondaryColor}55`
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
            Reassign this ticket when another LGU personnel
            should handle the concern.
        </p>
    </div>

    {!detailLoading && (
        <TicketAssignment
            key={selected.id}
            ticket={selected}
            onAssigned={updated => {
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
            }}
        />
    )}
</section>

{/* PINNED ANSWER */}
{(() => {
    const pinned = selected.messages?.find(
        message => message.isPinned
    )

    if (!pinned) return null

    return (
        <section
            className='rounded-2xl p-4 cursor-pointer'
            style={{
                backgroundColor: `${theme.primaryColor}0d`,
                border: `1px solid ${theme.primaryColor}35`
            }}
            onClick={() =>
                messageRefs.current[pinned.id]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                })
            }
        >
            <div
                className='flex items-center gap-1.5 text-xs font-bold mb-2'
                style={{ color: theme.primaryColor }}
            >
                <MdPushPin size={14} />
                Pinned Answer
            </div>

            <p
                className='text-sm'
                style={{ color: theme.textColor }}
            >
                {pinned.message || 'Pinned attachment'}
            </p>
        </section>
    )
})()}
                        {/* CONVERSATION */}
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
                                        style={{
                                            color: theme.textColor
                                        }}
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
                                    {selected.messages?.length || 0}{' '}
                                    messages
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
                                        {selected.messages.map(msg => {
                                            const worker =
                                                msg.senderRole ===
                                                'extension_worker' ||
                                                msg.senderRole ===
                                                'lgu_personnel'

                                            return (
                                                <div
                                                    key={msg.id}
                                                    ref={el =>
                                                        messageRefs.current[
                                                            msg.id
                                                        ] = el
                                                    }
                                                    className='flex flex-col gap-1.5 px-3.5 py-3 rounded-2xl'
                                                    style={{
                                                        alignSelf:
                                                            worker
                                                                ? 'flex-end'
                                                                : 'flex-start',
                                                        width: 'fit-content',
                                                        maxWidth: '72%',
                                                        backgroundColor:
                                                            worker
                                                                ? `${theme.primaryColor}12`
                                                                : '#f4f5f4',
                                                        border:
                                                            msg.isPinned
                                                                ? `2px solid ${theme.primaryColor}`
                                                                : '1px solid transparent'
                                                    }}
                                                >
                                                    <div className='flex items-center justify-between gap-5'>
                                                        <p
                                                            className='text-[11px] font-semibold'
                                                            style={{
                                                                color:
                                                                    worker
                                                                        ? theme.primaryColor
                                                                        : theme.textColor
                                                            }}
                                                        >
                                                            {msg.senderName}
                                                            {' · '}
                                                            <span className='font-normal opacity-60 capitalize'>
                                                                {msg.senderRole
                                                                    ?.replaceAll(
                                                                        '_',
                                                                        ' '
                                                                    )}
                                                            </span>
                                                        </p>

                                                        <button
                                                            onClick={() =>
                                                                deleteMessage(
                                                                    msg.id
                                                                )
                                                            }
                                                            disabled={
                                                                deletingMsgId ===
                                                                msg.id
                                                            }
                                                            className='opacity-25 hover:opacity-100'
                                                        >
                                                            {deletingMsgId ===
                                                            msg.id ? (
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

                                                    {msg.message && (
                                                        <p
                                                            className='text-sm whitespace-pre-wrap'
                                                            style={{
                                                                color:
                                                                    theme.textColor
                                                            }}
                                                        >
                                                            {msg.message}
                                                        </p>
                                                    )}

                                                    {msg.fileData &&
                                                        msg.fileType
                                                            ?.startsWith(
                                                                'image/'
                                                            ) && (
                                                        <img
                                                            src={
                                                                msg.fileData
                                                            }
                                                            alt={
                                                                msg.fileName
                                                            }
                                                            onClick={() =>
                                                                setLightbox(
                                                                    msg.fileData
                                                                )
                                                            }
                                                            className='max-w-[260px] max-h-[180px] object-cover rounded-xl cursor-pointer mt-1'
                                                        />
                                                    )}

                                                    {msg.fileData &&
                                                        !msg.fileType
                                                            ?.startsWith(
                                                                'image/'
                                                            ) && (
                                                        <a
                                                            href={
                                                                msg.fileData
                                                            }
                                                            download={
                                                                msg.fileName
                                                            }
                                                            className='flex items-center gap-1 text-xs underline'
                                                            style={{
                                                                color:
                                                                    theme.primaryColor
                                                            }}
                                                        >
                                                            <MdInsertDriveFile />
                                                            {msg.fileName}
                                                        </a>
                                                    )}

                                                    <p className='text-[10px] opacity-35 text-right'>
                                                        {dateTime(msg.date)}
                                                    </p>
                                                </div>
                                            )
                                        })}

                                        <div ref={messagesEnd} />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ACTIONS */}
                        <div
                            className='flex flex-wrap items-center justify-between gap-3 pt-1'
                        >
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

                                {selected.status ===
                                    'waiting_for_feedback' && (
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

                                    <span
                                        className='px-3 py-2 rounded-lg text-xs font-semibold'
                                        style={{
                                            color: '#15803d',
                                            backgroundColor: '#dcfce7'
                                        }}
                                    >
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
                                onClick={() => setSelected(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <Dialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title='Delete Ticket'
            >
                {confirmDelete && (
                    <div className='w-[min(380px,88vw)] flex flex-col gap-4'>
                        <div
                            className='p-3 rounded-xl'
                            style={{ backgroundColor: '#fef2f2' }}
                        >
                            <p className='text-sm text-red-700'>
                                Delete this ticket and all its messages?
                                This action cannot be undone.
                            </p>
                        </div>

                        <p
                            className='text-sm font-semibold'
                            style={{ color: theme.textColor }}
                        >
                            {confirmDelete.title ||
                                confirmDelete.concern}
                        </p>

                        <div className='flex justify-end gap-2'>
                            <Button
                                size='sm'
                                variant='ghost'
                                onClick={() =>
                                    setConfirmDelete(null)
                                }
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
   {/* CREATE KNOWLEDGE ARTICLE */}
<Dialog
    isOpen={knowledgeOpen}
    onClose={() => {
        if (!knowledgeSaving) {
            setKnowledgeOpen(false)
            setKnowledgeError('')
        }
    }}
    title='Create Knowledge Article'
    mobileMaxH='max-h-[92vh]'
>
    <form
        onSubmit={createKnowledgeArticle}
        className='w-[min(680px,92vw)] max-w-full'
    >
        {/* SCROLLABLE CONTENT */}
        <div className='max-h-[65vh] overflow-y-auto pr-1 flex flex-col gap-4'>

            {/* TICKET INFO */}
            <div
                className='rounded-xl p-3'
                style={{
                    backgroundColor: `${theme.primaryColor}08`,
                    border: `1px solid ${theme.primaryColor}25`
                }}
            >
                <div className='flex items-center gap-2 mb-2'>
                    <MdConfirmationNumber
                        size={16}
                        color={theme.primaryColor}
                    />

                    <p
                        className='text-xs font-bold'
                        style={{ color: theme.primaryColor }}
                    >
                        Resolved Ticket
                    </p>
                </div>

                <div className='grid grid-cols-3 gap-3'>
                    <div>
                        <p className='text-[9px] uppercase opacity-40'>
                            Ticket
                        </p>
                        <p
                            className='text-xs font-semibold mt-0.5 truncate'
                            style={{ color: theme.textColor }}
                        >
                            {selected?.title || selected?.id || '—'}
                        </p>
                    </div>

                    <div>
                        <p className='text-[9px] uppercase opacity-40'>
                            Category
                        </p>
                        <p
                            className='text-xs font-semibold mt-0.5'
                            style={{ color: theme.textColor }}
                        >
                            {selected?.categoryName || 'General'}
                        </p>
                    </div>

                    <div>
                        <p className='text-[9px] uppercase opacity-40'>
                            Subcategory
                        </p>
                        <p
                            className='text-xs font-semibold mt-0.5'
                            style={{ color: theme.textColor }}
                        >
                            {selected?.subcategoryName || '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* TITLE + KEYWORDS */}
            <div className='grid sm:grid-cols-2 gap-3'>
                <label className='flex flex-col gap-1'>
                    <span
                        className='text-xs font-semibold'
                        style={{ color: theme.textColor }}
                    >
                        Article Title
                    </span>

                    <input
                        required
                        value={knowledgeForm.title}
                        onChange={e =>
                            setKnowledgeForm(current => ({
                                ...current,
                                title: e.target.value
                            }))
                        }
                        className='app-control px-3 py-2 text-sm outline-none'
                        placeholder='Article title'
                    />
                </label>

                <label className='flex flex-col gap-1'>
                    <span
                        className='text-xs font-semibold'
                        style={{ color: theme.textColor }}
                    >
                        Search Keywords
                    </span>

                    <input
                        value={knowledgeForm.keywords}
                        onChange={e =>
                            setKnowledgeForm(current => ({
                                ...current,
                                keywords: e.target.value
                            }))
                        }
                        className='app-control px-3 py-2 text-sm outline-none'
                        placeholder='corn, pest, infestation'
                    />
                </label>
            </div>

            {/* QUESTION */}
            <label className='flex flex-col gap-1'>
                <span
                    className='text-xs font-semibold'
                    style={{ color: theme.textColor }}
                >
                    Common Farmer Question
                </span>

                <textarea
                    rows={2}
                    value={knowledgeForm.question}
                    onChange={e =>
                        setKnowledgeForm(current => ({
                            ...current,
                            question: e.target.value
                        }))
                    }
                    className='app-control px-3 py-2 text-sm outline-none resize-none'
                    placeholder='Farmer concern'
                />
            </label>

            {/* SOLUTION */}
            <label className='flex flex-col gap-1'>
                <div className='flex items-center justify-between gap-3'>
                    <span
                        className='text-xs font-semibold'
                        style={{ color: theme.textColor }}
                    >
                        Recommended Solution
                    </span>

                    <span
                        className='text-[9px] opacity-45'
                        style={{ color: theme.textColor }}
                    >
                        Extension Worker Answer
                    </span>
                </div>

                <textarea
                    required
                    rows={4}
                    value={knowledgeForm.answer}
                    onChange={e =>
                        setKnowledgeForm(current => ({
                            ...current,
                            answer: e.target.value
                        }))
                    }
                    className='app-control px-3 py-2 text-sm outline-none resize-y'
                    placeholder='Enter the recommended solution...'
                />

                <p
                    className='text-[10px] opacity-45'
                    style={{ color: theme.textColor }}
                >
                    Pinned worker answer is used first. Otherwise,
                    the latest worker response is used.
                </p>
            </label>

            {/* REVIEW NOTICE */}
            <div
                className='rounded-xl px-3 py-2.5'
                style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a'
                }}
            >
                <div className='flex items-start gap-2'>
                    <MdMenuBook
                        size={16}
                        color='#b45309'
                        className='shrink-0 mt-0.5'
                    />

                    <div>
                        <p className='text-xs font-semibold text-amber-800'>
                            Admin Review Required
                        </p>

                        <p className='text-[10px] text-amber-700 mt-0.5'>
                            This article will be saved as Pending Review.
                            It becomes searchable in AgriXa only after
                            Admin approval.
                        </p>
                    </div>
                </div>
            </div>

            {/* ERROR */}
            {knowledgeError && (
                <div
                    className='rounded-xl px-3 py-2 text-xs'
                    style={{
                        color: '#b91c1c',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca'
                    }}
                >
                    {knowledgeError}
                </div>
            )}
        </div>

        {/* FIXED BOTTOM ACTIONS */}
        <div
            className='flex items-center justify-between gap-3 mt-4 pt-3 bg-white'
            style={{
                borderTop: `1px solid ${theme.secondaryColor}35`
            }}
        >
            <p
                className='text-[10px] opacity-45 hidden sm:block'
                style={{ color: theme.textColor }}
            >
                Review the information before saving.
            </p>

            <div className='flex gap-2 ml-auto'>
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
                        <MdMenuBook size={15} />
                        Save for Review
                    </span>
                </Button>
            </div>
        </div>
    </form>
</Dialog>    
            {/* IMAGE LIGHTBOX */}
            {lightbox && (
                <div
                    className='fixed inset-0 z-[80] flex items-center justify-center'
                    style={{ backgroundColor: 'rgba(0,0,0,.9)' }}
                    onClick={() => setLightbox(null)}
                >
                    <button
                        onClick={() => setLightbox(null)}
                        className='absolute top-5 right-5 text-white opacity-70 hover:opacity-100'
                    >
                        <MdClose size={34} />
                    </button>

                    <img
                        src={lightbox}
                        alt=''
                        className='max-w-[92vw] max-h-[90vh] object-contain rounded-xl'
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </AdminLayout>
    )
}
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


export default AdminTickets