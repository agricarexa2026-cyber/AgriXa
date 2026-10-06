import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { createWebSocketUrl } from '../../services/websocket'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    MdSearch,
    MdMenuBook,
    MdConfirmationNumber,
    MdPushPin,
    MdSend,
    MdAttachFile,
    MdClose,
    MdInsertDriveFile,
    MdAdd,
    MdPeople,
    MdPerson,
    MdCheckCircle,
    MdPendingActions,
    MdForum,
    MdArrowForward,
    MdSupportAgent,
    MdFilterList,
} from 'react-icons/md'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import FarmerLayout from '../../components/layout/FarmerLayout'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import TicketCapacity from '../../components/tickets/TicketCapacity'
import AssignedPersonnel from '../../components/tickets/AssignedPersonnel'
import TicketDetailsToggle from '../../components/tickets/TicketDetailsToggle'
import ConversationHeader from '../../components/tickets/ConversationHeader'

const STATUS_TABS = [
    'all',
    'pending',
    'ongoing',
    'waiting_for_feedback',
    'resolved',
]

const STATUS_LABEL = {
    all: 'All',
    pending: 'Pending',
    ongoing: 'Ongoing',
    waiting_for_feedback: 'Waiting for Feedback',
    resolved: 'Resolved',
}

const statusStyle = {
    pending: {
        bg: '#fff7d6',
        color: '#a16207',
        border: '#fde68a',
    },
    ongoing: {
        bg: '#eaf2ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
    },
    waiting_for_feedback: {
        bg: '#fdf0f7',
        color: '#be185d',
        border: '#fbcfe8',
    },
    resolved: {
        bg: '#e8f8ee',
        color: '#15803d',
        border: '#bbf7d0',
    },
}

const formatDate = (iso) => {
    if (!iso) return ''

    const d = new Date(iso)

    return d.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

const formatDateTime = (iso) => {
    if (!iso) return ''

    return new Date(iso).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

const FarmerKnowledgeRepository = ({ ticketOnly = false }) => {
    const theme = useSelector((state) => state.theme)
    const { user } = useSelector((state) => state.auth)

    const location = useLocation()
    const navigate = useNavigate()

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [topTab, setTopTab] = useState('all')
    const [activeTab, setActiveTab] = useState('all')

    const [selected, setSelected] = useState(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)

    const [visits, setVisits] = useState(0)

    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [joining, setJoining] = useState(false)

    const [attachedFile, setAttachedFile] = useState(null)
    const [fileError, setFileError] = useState('')
    const [error, setError] = useState('')

    const [lightboxSrc, setLightboxSrc] = useState(null)

    const messagesContainerRef = useRef(null)
    const wsRef = useRef(null)
    const selectedIdRef = useRef(null)
    const refetchRef = useRef(null)
    const ticketRefs = useRef({})
    const fileInputRef = useRef(null)
    const msgRefs = useRef({})

    /*
    |--------------------------------------------------------------------------
    | Fetch tickets
    |--------------------------------------------------------------------------
    */

    const fetchTickets = () => {
        api.get('/tickets/', {
            params: {
                repository: '1',
            },
        })
            .then((res) => {
                setTickets(res.data)
                setError('')
                setLoading(false)
            })
            .catch(() => {
                setError('Unable to load conversations. Please try again.')
                setLoading(false)
            })
    }

   useEffect(() => {
    api.post('/tickets/visits/')
        .then(() => {
            api.get('/tickets/visits/')
                .then((r) => setVisits(r.data.visits))
                .catch(() => {})
        })
        .catch(() => {})

    fetchTickets()

    const refresh = setInterval(() => {
        if (!document.hidden) {
            fetchTickets()
        }
    }, 30000)

    const ws = new WebSocket(
        createWebSocketUrl('/ws/ticket-updates/')
    )

    ws.onmessage = () => {
        fetchTickets()
    }

    ws.onerror = () => {
        ws.close()
    }

    return () => {
        clearInterval(refresh)
        ws.close()
    }
}, [])
    /*
    |--------------------------------------------------------------------------
    | Open ticket from navigation state
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const ticketId = location.state?.ticketId

        if (!ticketId || tickets.length === 0) return

        const ticket = tickets.find((t) => t.id === ticketId)

        if (ticket) {
            handleView(ticket)

            setTimeout(() => {
                ticketRefs.current[ticketId]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                })
            }, 100)
        } else {
            api.get(`/tickets/${ticketId}/`)
                .then((res) => {
                    handleView(res.data)
                })
                .catch(() => {})
        }
    }, [location.state?.ticketId, tickets.length])

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    const isMember = (ticket) =>
        ticket?.farmerId === user?.id ||
        !!ticket?.participants?.includes(user?.id)

    const topFiltered =
        topTab === 'resolved'
            ? tickets.filter(
                  (t) => isMember(t) && t.status === 'resolved'
              )
            : topTab === 'my'
              ? tickets.filter(isMember)
              : tickets

    const sorted = [...topFiltered].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    )

    const filtered = sorted.filter((t) => {
        const matchTab =
            activeTab === 'all' || t.status === activeTab

        const searchableText = `
            ${t.title || ''}
            ${t.concern || ''}
            ${t.extensionWorkerName || ''}
            ${t.categoryName || ''}
            ${t.farmerName || ''}
            ${t.barangay || ''}
            ${t.answerSearchText || ''}
        `.toLowerCase()

        const matchSearch = searchableText.includes(
            search.toLowerCase()
        )

        return matchTab && matchSearch
    })

    /*
    |--------------------------------------------------------------------------
    | View ticket
    |--------------------------------------------------------------------------
    */

    async function handleView(ticket) {
        setDetailsOpen(false)

        setSelected({
            ...ticket,
            messages: [],
        })

        setReply('')
        setAttachedFile(null)
        setFileError('')
        setDetailLoading(true)

        try {
            const res = await api.get(`/tickets/${ticket.id}/`)
            setSelected(res.data)
        } catch {
            setSelected(null)
            setError(
                'Unable to open this conversation. Please try again.'
            )
        } finally {
            setDetailLoading(false)
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Refetch selected ticket
    |--------------------------------------------------------------------------
    */

    const refetchSelected = async (ticketId) => {
        const res = await api.get(`/tickets/${ticketId}/`)

        setSelected((current) =>
            current?.id === ticketId ? res.data : current
        )
    }

    useEffect(() => {
        refetchRef.current = refetchSelected
    }, [tickets])

    useEffect(() => {
        selectedIdRef.current = selected?.id ?? null
    }, [selected?.id])

    /*
    |--------------------------------------------------------------------------
    | Selected ticket websocket
    |--------------------------------------------------------------------------
    */

  useEffect(() => {
    if (!selected) {
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        return
    }

    const ws = new WebSocket(
        createWebSocketUrl(`/ws/tickets/${selected.id}/`)
    )

    ws.onmessage = () => {
        if (selectedIdRef.current && refetchRef.current) {
            refetchRef.current(selectedIdRef.current)
        }
    }

    ws.onerror = () => {
        ws.close()
    }

    wsRef.current = ws

    const refresh = setInterval(() => {
        if (
            !document.hidden &&
            selectedIdRef.current &&
            refetchRef.current
        ) {
            refetchRef.current(selectedIdRef.current).catch(
                () => {}
            )
        }
    }, 10000)

    return () => {
        clearInterval(refresh)
        ws.close()
        wsRef.current = null
    }
}, [selected?.id])

    /*
    |--------------------------------------------------------------------------
    | Scroll conversation
    |--------------------------------------------------------------------------
    */

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop =
                    messagesContainerRef.current.scrollHeight
            }
        })
    }

    useEffect(() => {
        scrollToBottom()
    }, [selected?.messages])

    /*
    |--------------------------------------------------------------------------
    | Send reply
    |--------------------------------------------------------------------------
    */

    const handleSendReply = async () => {
        if (
            sending ||
            (!reply.trim() && !attachedFile) ||
            !selected
        ) {
            return
        }

        setSending(true)

        try {
            await api.post(
                `/tickets/${selected.id}/messages/`,
                {
                    message: reply.trim(),
                    fileData: attachedFile?.data || '',
                    fileName: attachedFile?.name || '',
                    fileType: attachedFile?.type || '',
                }
            )

            setReply('')
            setAttachedFile(null)

            await refetchSelected(selected.id)

            fetchTickets()

            setFileError('')

            setTimeout(() => {
                scrollToBottom()
            }, 300)
        } catch (err) {
            setFileError(
                err.response?.data?.error ||
                    'Unable to send your reply. Please try again.'
            )
        } finally {
            setSending(false)
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Join conversation
    |--------------------------------------------------------------------------
    */

    const handleJoin = async () => {
        if (joining || !selected) return

        setJoining(true)
        setFileError('')

        try {
            await api.post(`/tickets/${selected.id}/join/`)

            await refetchSelected(selected.id)

            fetchTickets()
        } catch (err) {
            setFileError(
                err.response?.data?.error ||
                    err.response?.data?.detail ||
                    'Unable to join this conversation. Please try again.'
            )
        } finally {
            setJoining(false)
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Attachment
    |--------------------------------------------------------------------------
    */

    const handleFileChange = (e) => {
        const file = e.target.files[0]

        if (!file) return

        if (file.size > 750 * 1024) {
            setFileError('File must be under 1MB.')
            e.target.value = ''
            return
        }

        setFileError('')

        const reader = new FileReader()

        reader.onload = (ev) => {
            setAttachedFile({
                data: ev.target.result,
                name: file.name,
                type: file.type,
            })
        }

        reader.readAsDataURL(file)

        e.target.value = ''
    }

    /*
    |--------------------------------------------------------------------------
    | Top tab data
    |--------------------------------------------------------------------------
    */

    const topTabs = [
        {
            id: 'all',
            label: 'Community',
            description: 'All farmer concerns',
            icon: MdPeople,
        },
        {
            id: 'my',
            label: 'My Tickets',
            description: 'Conversations you joined',
            icon: MdPerson,
        },
        {
            id: 'resolved',
            label: 'My Resolved',
            description: 'Completed concerns',
            icon: MdCheckCircle,
        },
    ]

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <FarmerLayout>
            <div className='app-page flex flex-col gap-5 md:gap-6'>

                {/* =========================================================
                    HEADER
                ========================================================= */}

                <section
                    className='relative overflow-hidden rounded-[28px] border bg-white shadow-sm'
                    style={{
                        borderColor: `${theme.primaryColor}18`,
                    }}
                >
                    <div
                        className='absolute left-0 top-0 h-full w-1.5'
                        style={{
                            backgroundColor: theme.primaryColor,
                        }}
                    />

                    <div className='flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7'>

                        <div className='flex items-start gap-4'>

                            <div
                                className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}12`,
                                    color: theme.primaryColor,
                                }}
                            >
                                <MdConfirmationNumber size={27} />
                            </div>

                            <div>
                                <p
                                    className='text-[11px] font-bold uppercase tracking-[0.2em]'
                                    style={{
                                        color: theme.primaryColor,
                                    }}
                                >
                                    Farmer Support
                                </p>

                                <h1
                                    className='mt-1 text-2xl font-bold tracking-tight md:text-3xl'
                                    style={{
                                        color: theme.textColor,
                                    }}
                                >
                                    Ticketing System
                                </h1>

                                <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-600'>
                                    Browse community concerns, follow
                                    your tickets, and communicate
                                    directly with assigned LGU
                                    personnel.
                                </p>
                            </div>
                        </div>

                        {/* CREATE TICKET */}

                        <button
                            type='button'
                            onClick={() =>
                                navigate('/farmer/submit-ticket')
                            }
                            className='group flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg'
                            style={{
                                backgroundColor: theme.primaryColor,
                            }}
                        >
                            <MdAdd size={21} />

                            <span>Create Ticket</span>

                            <MdArrowForward
                                size={17}
                                className='transition-transform group-hover:translate-x-0.5'
                            />
                        </button>
                    </div>
                </section>

                {/* =========================================================
                    SEARCH
                ========================================================= */}

                <section className='rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm'>

                    <div className='relative'>

                        <MdSearch
                            size={23}
                            className='pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2'
                            style={{
                                color: theme.primaryColor,
                            }}
                        />

                        <input
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            aria-label='Search tickets'
                            placeholder='Search concerns, solutions, categories, farmers or LGU personnel...'
                            className='w-full rounded-2xl border border-slate-300 bg-slate-50 py-4 pl-12 pr-4 text-[15px] font-medium text-slate-800 outline-none transition-all placeholder:text-slate-500 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100'
                        />
                    </div>
                </section>

                {/* =========================================================
                    MAIN TABS
                ========================================================= */}

                <section className='rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm'>

                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>

                        {topTabs.map((item) => {
                            const Icon = item.icon
                            const active = topTab === item.id

                            return (
                                <button
                                    key={item.id}
                                    type='button'
                                    onClick={() => {
                                        setTopTab(item.id)
                                        setActiveTab('all')
                                    }}
                                    className='flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200'
                                    style={{
                                        backgroundColor: active
                                            ? theme.primaryColor
                                            : '#f8fafc',
                                        color: active
                                            ? '#ffffff'
                                            : '#334155',
                                        boxShadow: active
                                            ? `0 8px 20px ${theme.primaryColor}25`
                                            : 'none',
                                    }}
                                >
                                    <span
                                        className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'
                                        style={{
                                            backgroundColor: active
                                                ? 'rgba(255,255,255,.16)'
                                                : `${theme.primaryColor}10`,
                                            color: active
                                                ? '#ffffff'
                                                : theme.primaryColor,
                                        }}
                                    >
                                        <Icon size={20} />
                                    </span>

                                    <span className='min-w-0'>
                                        <span className='block text-sm font-bold'>
                                            {item.label}
                                        </span>

                                        <span
                                            className={`mt-0.5 block text-[11px] ${
                                                active
                                                    ? 'text-white/75'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {item.description}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* =========================================================
                    STATUS FILTERS
                ========================================================= */}

                <section className='flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center'>

                    <div className='flex items-center gap-2 text-sm font-semibold text-slate-600'>
                        <MdFilterList
                            size={19}
                            style={{
                                color: theme.primaryColor,
                            }}
                        />

                        <span>Status</span>
                    </div>

                    <div className='flex flex-1 gap-2 overflow-x-auto sm:flex-wrap'>

                        {STATUS_TABS.map((tab) => {
                            const active = activeTab === tab

                            return (
                                <button
                                    key={tab}
                                    type='button'
                                    onClick={() =>
                                        setActiveTab(tab)
                                    }
                                    className='whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all'
                                    style={{
                                        backgroundColor: active
                                            ? theme.primaryColor
                                            : '#ffffff',
                                        color: active
                                            ? '#ffffff'
                                            : '#475569',
                                        borderColor: active
                                            ? theme.primaryColor
                                            : '#dbe4dc',
                                        boxShadow: active
                                            ? `0 4px 12px ${theme.primaryColor}25`
                                            : 'none',
                                    }}
                                >
                                    {STATUS_LABEL[tab]}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* =========================================================
                    ERROR
                ========================================================= */}

                {error && (
                    <div
                        role='alert'
                        className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'
                    >
                        {error}

                        <button
                            type='button'
                            onClick={fetchTickets}
                            className='ml-2 font-bold underline'
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* =========================================================
                    TICKET LIST
                ========================================================= */}

                {loading ? (
                    <div className='flex justify-center rounded-[26px] border border-slate-200 bg-white py-20 shadow-sm'>
                        <AiOutlineLoading3Quarters
                            className='animate-spin'
                            size={30}
                            color={theme.primaryColor}
                        />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className='flex flex-col items-center justify-center rounded-[26px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm'>

                        <div
                            className='mb-4 flex h-16 w-16 items-center justify-center rounded-2xl'
                            style={{
                                backgroundColor:
                                    `${theme.primaryColor}10`,
                                color: theme.primaryColor,
                            }}
                        >
                            <MdForum size={30} />
                        </div>

                        <h3 className='text-lg font-bold text-slate-800'>
                            No tickets found
                        </h3>

                        <p className='mt-1 max-w-md text-sm leading-6 text-slate-500'>
                            No conversations match your current
                            search or filters.
                        </p>

                        <button
                            type='button'
                            onClick={() =>
                                navigate('/farmer/submit-ticket')
                            }
                            className='mt-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white'
                            style={{
                                backgroundColor: theme.primaryColor,
                            }}
                        >
                            <MdAdd size={18} />
                            Create Ticket
                        </button>
                    </div>
                ) : (
                    <div className='flex flex-col gap-4'>

                        {filtered.map((ticket) => {
                            const member = isMember(ticket)

                            return (
                                <article
                                    key={ticket.id}
                                    ref={(el) =>
                                        (ticketRefs.current[
                                            ticket.id
                                        ] = el)
                                    }
                                    onClick={() =>
                                        handleView(ticket)
                                    }
                                    className='group cursor-pointer overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg'
                                >
                                    <div className='p-5 md:p-6'>

                                        {/* TOP */}

                                        <div className='flex items-start justify-between gap-4'>

                                            <div className='min-w-0 flex-1'>

                                                <div className='flex flex-wrap items-center gap-2'>

                                                    {ticket.categoryName && (
                                                        <span
                                                            className='rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider'
                                                            style={{
                                                                backgroundColor:
                                                                    `${theme.primaryColor}10`,
                                                                color:
                                                                    theme.primaryColor,
                                                            }}
                                                        >
                                                            {
                                                                ticket.categoryName
                                                            }
                                                        </span>
                                                    )}

                                                    {member && (
                                                        <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600'>
                                                            Your
                                                            conversation
                                                        </span>
                                                    )}
                                                </div>

                                                <h3
                                                    className='mt-3 line-clamp-2 text-lg font-bold leading-6 md:text-xl'
                                                    style={{
                                                        color:
                                                            theme.textColor,
                                                    }}
                                                >
                                                    {ticket.title ||
                                                        ticket.concern}
                                                </h3>

                                                {ticket.title && (
                                                    <p className='mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-600'>
                                                        {
                                                            ticket.concern
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <span
                                                className='shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold'
                                                style={{
                                                    backgroundColor:
                                                        statusStyle[
                                                            ticket
                                                                .status
                                                        ]?.bg,
                                                    color:
                                                        statusStyle[
                                                            ticket
                                                                .status
                                                        ]?.color,
                                                    borderColor:
                                                        statusStyle[
                                                            ticket
                                                                .status
                                                        ]?.border,
                                                }}
                                            >
                                                {STATUS_LABEL[
                                                    ticket.status
                                                ] ??
                                                    ticket.status}
                                            </span>
                                        </div>

                                        {/* SOLUTION */}

                                        {ticket.solution && (
                                            <div className='mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4'>

                                                <div className='flex items-center gap-2 text-xs font-bold text-emerald-800'>
                                                    <MdCheckCircle
                                                        size={16}
                                                    />
                                                    LGU Solution
                                                </div>

                                                <p className='mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-emerald-950'>
                                                    {
                                                        ticket.solution
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {/* INFORMATION */}

                                        <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600'>

                                            <TicketCapacity
                                                ticket={ticket}
                                                compact
                                            />

                                            {ticket.farmerName && (
                                                <span>
                                                    Submitted by:{' '}
                                                    <strong className='font-semibold text-slate-700'>
                                                        {ticket.farmerId ===
                                                        user?.id
                                                            ? 'You'
                                                            : ticket.farmerName}
                                                    </strong>

                                                    {ticket.barangay
                                                        ? ` · ${ticket.barangay}`
                                                        : ''}
                                                </span>
                                            )}

                                            <span>
                                                {formatDate(
                                                    ticket.date
                                                )}
                                            </span>
                                        </div>

                                        {/* BOTTOM */}

                                        <div className='mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>

                                            <div className='flex items-center gap-3'>

                                                <div
                                                    className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'
                                                    style={{
                                                        backgroundColor:
                                                            `${theme.primaryColor}10`,
                                                        color:
                                                            theme.primaryColor,
                                                    }}
                                                >
                                                    <MdSupportAgent
                                                        size={18}
                                                    />
                                                </div>

                                                <div>
                                                    <p className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
                                                        Assigned
                                                        personnel
                                                    </p>

                                                    <div
                                                        className='mt-0.5 text-xs font-semibold'
                                                        style={{
                                                            color:
                                                                theme.primaryColor,
                                                        }}
                                                    >
                                                        <AssignedPersonnel
                                                            ticket={
                                                                ticket
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type='button'
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    handleView(
                                                        ticket
                                                    )
                                                }}
                                                className='group/button flex items-center justify-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:self-auto'
                                                style={{
                                                    backgroundColor:
                                                        `${theme.primaryColor}10`,
                                                    color:
                                                        theme.primaryColor,
                                                }}
                                            >
                                                {!member
                                                    ? 'View & Join'
                                                    : ticket.status ===
                                                        'resolved'
                                                      ? 'View Solution'
                                                      : 'Open Conversation'}

                                                <MdArrowForward
                                                    size={16}
                                                    className='transition-transform group-hover/button:translate-x-0.5'
                                                />
                                            </button>
                                        </div>

                                        {ticket.acceptedAt && (
                                            <p className='mt-3 text-right text-[11px] text-slate-400'>
                                                Accepted:{' '}
                                                {formatDateTime(
                                                    ticket.acceptedAt
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* =============================================================
                TICKET CONVERSATION MODAL
            ============================================================= */}

            <Dialog
                isOpen={!!selected}
                onClose={() => setSelected(null)}
                title='Ticket Conversation'
                mobileMaxH='max-h-[90dvh]'
            >
                {selected && (
                    <div className='flex w-full min-w-0 flex-col gap-4 sm:w-[min(840px,86vw)]'>

                        {/* HEADER */}

                        <ConversationHeader
                            ticket={selected}
                            theme={theme}
                            statusLabel={
                                STATUS_LABEL[selected.status] ??
                                selected.status
                            }
                            statusStyle={
                                statusStyle[selected.status]
                            }
                        />

                        {/* DETAILS */}

                        <TicketDetailsToggle
                            open={detailsOpen}
                            onToggle={() =>
                                setDetailsOpen(
                                    (value) => !value
                                )
                            }
                            theme={theme}
                        >
                            <TicketCapacity
                                ticket={selected}
                            />

                            {selected.categoryName && (
                                <p className='text-sm text-slate-700'>
                                    <strong>Category:</strong>{' '}
                                    {selected.categoryName}
                                </p>
                            )}

                            {selected.farmerName && (
                                <p className='text-sm text-slate-700'>
                                    <strong>Submitted by:</strong>{' '}
                                    {selected.farmerId ===
                                    user?.id
                                        ? 'You'
                                        : selected.farmerName}

                                    {selected.barangay
                                        ? ` · ${selected.barangay}`
                                        : ''}
                                </p>
                            )}

                            <div className='flex flex-col gap-1'>

                                {selected.title && (
                                    <p className='text-base font-bold text-slate-800'>
                                        {selected.title}
                                    </p>
                                )}

                                <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>
                                    Concern
                                </p>

                                <p
                                    className='rounded-xl p-3 text-sm leading-6'
                                    style={{
                                        backgroundColor:
                                            `${theme.primaryColor}08`,
                                        color:
                                            theme.textColor,
                                    }}
                                >
                                    {selected.concern}
                                </p>
                            </div>

                            {/* PINNED MESSAGE */}

                            {(() => {
                                const pinned =
                                    selected.messages?.find(
                                        (m) => m.isPinned
                                    )

                                if (!pinned) return null

                                return (
                                    <div
                                        className='flex cursor-pointer flex-col gap-1'
                                        onClick={() =>
                                            msgRefs.current[
                                                pinned.id
                                            ]?.scrollIntoView({
                                                behavior:
                                                    'smooth',
                                                block: 'center',
                                            })
                                        }
                                    >
                                        <div className='flex items-center gap-1'>
                                            <MdPushPin
                                                size={12}
                                                color={
                                                    theme.primaryColor
                                                }
                                            />

                                            <p
                                                className='text-xs font-bold'
                                                style={{
                                                    color:
                                                        theme.primaryColor,
                                                }}
                                            >
                                                Pinned Answer
                                            </p>
                                        </div>

                                        <div
                                            className='rounded-xl p-3 text-sm'
                                            style={{
                                                backgroundColor:
                                                    `${theme.primaryColor}10`,
                                                color:
                                                    theme.textColor,
                                                outline: `1px solid ${theme.primaryColor}30`,
                                            }}
                                        >
                                            {pinned.message && (
                                                <p>
                                                    {
                                                        pinned.message
                                                    }
                                                </p>
                                            )}

                                            {pinned.fileData &&
                                                pinned.fileType?.startsWith(
                                                    'image/'
                                                ) && (
                                                    <span
                                                        className='mt-2 flex cursor-pointer items-center gap-1 text-xs font-semibold underline'
                                                        style={{
                                                            color:
                                                                theme.primaryColor,
                                                        }}
                                                        onClick={(
                                                            e
                                                        ) => {
                                                            e.stopPropagation()
                                                            setLightboxSrc(
                                                                pinned.fileData
                                                            )
                                                        }}
                                                    >
                                                        <MdInsertDriveFile
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        {
                                                            pinned.fileName
                                                        }
                                                    </span>
                                                )}

                                            {pinned.fileData &&
                                                !pinned.fileType?.startsWith(
                                                    'image/'
                                                ) && (
                                                    <a
                                                        href={
                                                            pinned.fileData
                                                        }
                                                        download={
                                                            pinned.fileName
                                                        }
                                                        className='mt-2 flex items-center gap-1 text-xs font-semibold underline'
                                                        style={{
                                                            color:
                                                                theme.primaryColor,
                                                        }}
                                                        onClick={(
                                                            e
                                                        ) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <MdInsertDriveFile
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        {
                                                            pinned.fileName
                                                        }
                                                    </a>
                                                )}
                                        </div>
                                    </div>
                                )
                            })()}
                        </TicketDetailsToggle>

                        {/* CONVERSATION */}

                        <div className='border-t border-slate-200 pt-4'>

                            <div className='mb-3 flex items-center gap-2'>
                                <MdForum
                                    size={17}
                                    style={{
                                        color:
                                            theme.primaryColor,
                                    }}
                                />

                                <p className='text-sm font-bold text-slate-700'>
                                    Conversation
                                </p>
                            </div>

                            {detailLoading ? (
                                <div className='flex justify-center py-8'>
                                    <AiOutlineLoading3Quarters
                                        className='animate-spin'
                                        size={22}
                                        color={
                                            theme.primaryColor
                                        }
                                    />
                                </div>
                            ) : selected.messages?.length ===
                              0 ? (
                                <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center'>
                                    <MdForum
                                        size={28}
                                        className='mx-auto text-slate-300'
                                    />

                                    <p className='mt-2 text-sm font-semibold text-slate-600'>
                                        No messages yet
                                    </p>

                                    <p className='mt-1 text-xs text-slate-400'>
                                        The conversation will
                                        appear here.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    ref={
                                        messagesContainerRef
                                    }
                                    className='conversation-messages flex min-h-44 max-h-[380px] flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4'
                                >
                                    {selected.messages?.map(
                                        (msg) => {
                                            const own =
                                                msg.senderId ===
                                                user?.id

                                            return (
                                                <div
                                                    key={
                                                        msg.id
                                                    }
                                                    ref={(
                                                        el
                                                    ) =>
                                                        (msgRefs.current[
                                                            msg.id
                                                        ] = el)
                                                    }
                                                    className='flex flex-col gap-1 break-words rounded-2xl border p-3.5 shadow-sm'
                                                    style={{
                                                        backgroundColor:
                                                            own
                                                                ? `${theme.primaryColor}10`
                                                                : '#ffffff',
                                                        borderColor:
                                                            own
                                                                ? `${theme.primaryColor}25`
                                                                : '#e2e8f0',
                                                        alignSelf:
                                                            own
                                                                ? 'flex-end'
                                                                : 'flex-start',
                                                        maxWidth:
                                                            '85%',
                                                    }}
                                                >
                                                    <p className='text-[11px] font-bold text-slate-500'>
                                                        {
                                                            msg.senderName
                                                        }{' '}
                                                        ·{' '}
                                                        <span className='capitalize'>
                                                            {msg.senderRole?.replace(
                                                                '_',
                                                                ' '
                                                            )}
                                                        </span>
                                                    </p>

                                                    {msg.message && (
                                                        <p className='text-sm leading-6 text-slate-800'>
                                                            {
                                                                msg.message
                                                            }
                                                        </p>
                                                    )}

                                                    {msg.fileData &&
                                                        msg.fileType?.startsWith(
                                                            'image/'
                                                        ) && (
                                                            <img
                                                                src={
                                                                    msg.fileData
                                                                }
                                                                alt={
                                                                    msg.fileName
                                                                }
                                                                className='mt-1 max-w-[200px] cursor-pointer rounded-xl'
                                                                onClick={() =>
                                                                    setLightboxSrc(
                                                                        msg.fileData
                                                                    )
                                                                }
                                                            />
                                                        )}

                                                    {msg.fileData &&
                                                        !msg.fileType?.startsWith(
                                                            'image/'
                                                        ) && (
                                                            <a
                                                                href={
                                                                    msg.fileData
                                                                }
                                                                download={
                                                                    msg.fileName
                                                                }
                                                                className='mt-1 flex items-center gap-1 text-xs font-semibold underline'
                                                                style={{
                                                                    color:
                                                                        theme.primaryColor,
                                                                }}
                                                            >
                                                                <MdInsertDriveFile
                                                                    size={
                                                                        14
                                                                    }
                                                                />

                                                                {
                                                                    msg.fileName
                                                                }
                                                            </a>
                                                        )}

                                                    <p className='text-right text-[10px] text-slate-400'>
                                                        {formatDateTime(
                                                            msg.date
                                                        )}
                                                    </p>
                                                </div>
                                            )
                                        }
                                    )}
                                </div>
                            )}
                        </div>

                        {/* =================================================
                            JOIN
                        ================================================= */}

                        {!detailLoading &&
                            !isMember(selected) && (
                                <div
                                    className='rounded-2xl border p-4'
                                    style={{
                                        borderColor:
                                            `${theme.primaryColor}25`,
                                        backgroundColor:
                                            `${theme.primaryColor}07`,
                                    }}
                                >
                                    <div className='flex items-start gap-3'>

                                        <div
                                            className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'
                                            style={{
                                                backgroundColor:
                                                    `${theme.primaryColor}12`,
                                                color:
                                                    theme.primaryColor,
                                            }}
                                        >
                                            <MdPeople
                                                size={20}
                                            />
                                        </div>

                                        <div className='flex-1'>
                                            <h4 className='text-sm font-bold text-slate-800'>
                                                Have the same
                                                concern?
                                            </h4>

                                            <p className='mt-1 text-sm leading-6 text-slate-600'>
                                                {selected
                                                    .capacity
                                                    ?.status ===
                                                'full'
                                                    ? 'This conversation is full. Submit a new ticket if you need help with the same concern.'
                                                    : 'Join this conversation to communicate with the assigned LGU personnel and receive updates.'}
                                            </p>

                                            {fileError && (
                                                <p
                                                    className='mt-2 text-xs font-medium'
                                                    style={{
                                                        color:
                                                            theme.dangerColor,
                                                    }}
                                                >
                                                    {
                                                        fileError
                                                    }
                                                </p>
                                            )}

                                            {selected
                                                .capacity
                                                ?.status !==
                                                'full' && (
                                                <div className='mt-3'>
                                                    <Button
                                                        size='sm'
                                                        onClick={
                                                            handleJoin
                                                        }
                                                        loading={
                                                            joining
                                                        }
                                                    >
                                                        Join this
                                                        conversation
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* =================================================
                            REPLY
                        ================================================= */}

                        {isMember(selected) && (
                            <div className='rounded-2xl border border-slate-200 bg-white p-4'>

                                {selected.status ===
                                    'resolved' && (
                                    <div className='mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900'>
                                        <strong>
                                            Need more help?
                                        </strong>{' '}
                                        Send a follow-up below
                                        to reopen this ticket.
                                        Your previous
                                        conversation will be
                                        kept.
                                    </div>
                                )}

                                {attachedFile && (
                                    <div className='mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'>

                                        {attachedFile.type.startsWith(
                                            'image/'
                                        ) ? (
                                            <img
                                                src={
                                                    attachedFile.data
                                                }
                                                alt=''
                                                className='h-10 w-10 rounded-lg object-cover'
                                            />
                                        ) : (
                                            <MdInsertDriveFile
                                                size={22}
                                                color={
                                                    theme.primaryColor
                                                }
                                            />
                                        )}

                                        <span className='min-w-0 flex-1 truncate text-xs font-medium text-slate-600'>
                                            {
                                                attachedFile.name
                                            }
                                        </span>

                                        <button
                                            type='button'
                                            onClick={() =>
                                                setAttachedFile(
                                                    null
                                                )
                                            }
                                            className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200'
                                        >
                                            <MdClose
                                                size={16}
                                            />
                                        </button>
                                    </div>
                                )}

                                {fileError && (
                                    <p
                                        className='mb-2 text-xs font-medium'
                                        style={{
                                            color:
                                                theme.dangerColor,
                                        }}
                                    >
                                        {fileError}
                                    </p>
                                )}

                                <div className='flex items-end gap-2'>

                                    <input
                                        ref={fileInputRef}
                                        type='file'
                                        className='hidden'
                                        onChange={
                                            handleFileChange
                                        }
                                    />

                                    <button
                                        type='button'
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100'
                                        title='Attach file'
                                    >
                                        <MdAttachFile
                                            size={20}
                                        />
                                    </button>

                                    <input
                                        value={reply}
                                        onChange={(e) => {
                                            setReply(
                                                e.target.value
                                            )
                                            setFileError('')
                                        }}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key ===
                                                    'Enter' &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault()
                                                handleSendReply()
                                            }
                                        }}
                                        placeholder='Type your reply...'
                                        aria-label='Your reply'
                                        className='min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100'
                                    />

                                    <button
                                        type='button'
                                        onClick={
                                            handleSendReply
                                        }
                                        disabled={
                                            (!reply.trim() &&
                                                !attachedFile) ||
                                            sending
                                        }
                                        aria-label='Send reply'
                                        className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40'
                                        style={{
                                            backgroundColor:
                                                theme.primaryColor,
                                        }}
                                    >
                                        {sending ? (
                                            <AiOutlineLoading3Quarters
                                                className='animate-spin'
                                                size={17}
                                            />
                                        ) : (
                                            <MdSend
                                                size={18}
                                            />
                                        )}
                                    </button>
                                </div>

                                <p className='mt-2 text-[10px] text-slate-400'>
                                    Attachments must be below
                                    1MB.
                                </p>
                            </div>
                        )}

                        {/* =================================================
                            FOOTER
                        ================================================= */}

                        <div className='flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between'>

                            <div>
                                {selected.status ===
                                    'waiting_for_feedback' &&
                                    (selected.farmerId ||
                                        selected
                                            .participants?.[0]) ===
                                        user?.id && (
                                        <Button
                                            size='sm'
                                            onClick={async () => {
                                                try {
                                                    await api.patch(
                                                        `/tickets/${selected.id}/status/`,
                                                        {
                                                            status:
                                                                'resolved',
                                                        }
                                                    )

                                                    await refetchSelected(
                                                        selected.id
                                                    )

                                                    fetchTickets()
                                                } catch {
                                                    setFileError(
                                                        'Unable to confirm resolution. Please try again.'
                                                    )
                                                }
                                            }}
                                            loading={sending}
                                        >
                                            Confirm Resolved
                                        </Button>
                                    )}
                            </div>

                            <button
                                type='button'
                                onClick={() =>
                                    setSelected(null)
                                }
                                className='rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50'
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* =============================================================
                IMAGE LIGHTBOX
            ============================================================= */}

            {lightboxSrc && (
                <div
                    className='fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4'
                    onClick={() =>
                        setLightboxSrc(null)
                    }
                >
                    <button
                        type='button'
                        aria-label='Close image'
                        className='absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20'
                        onClick={() =>
                            setLightboxSrc(null)
                        }
                    >
                        <MdClose size={27} />
                    </button>

                    <img
                        src={lightboxSrc}
                        alt='Attachment preview'
                        className='max-h-[90vh] max-w-[90vw] rounded-xl object-contain'
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    />
                </div>
            )}
        </FarmerLayout>
    )
}

export default FarmerKnowledgeRepository