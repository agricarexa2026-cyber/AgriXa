import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

import {
    MdSearch,
    MdConfirmationNumber,
    MdSend,
    MdPushPin,
    MdAttachFile,
    MdClose,
    MdInsertDriveFile,
    MdSchedule,
    MdAutorenew,
    MdCheckCircle,
    MdPeople,
    MdLocationOn,
    MdCalendarToday,
    MdDownload,
    MdArrowForward,
    MdFilterAlt,
    MdRefresh,
    MdPerson,
    MdChat,
    MdInfoOutline
} from 'react-icons/md'

import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import ExtensionWorkerLayout from '../../components/layout/ExtensionWorkerLayout'
import api from '../../services/api'

const STATUS_TABS = [
    'all',
    'pending',
    'ongoing',
    'waiting_for_feedback',
    'resolved'
]

const STATUS_LABEL = {
    all: 'All',
    pending: 'Pending',
    ongoing: 'In Progress',
    waiting_for_feedback: 'Waiting for Feedback',
    resolved: 'Resolved'
}

const STATUS_COLORS = {
    pending: '#f59e0b',
    ongoing: '#3b82f6',
    waiting_for_feedback: '#9333ea',
    resolved: '#16a34a'
}

const formatDate = iso => {
    if (!iso) return '—'

    try {
        const date = new Date(iso)

        if (Number.isNaN(date.getTime())) return '—'

        return date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    } catch {
        return '—'
    }
}

const formatDateTime = iso => {
    if (!iso) return ''

    try {
        const date = new Date(iso)

        if (Number.isNaN(date.getTime())) return ''

        return date.toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
    } catch {
        return ''
    }
}

const getInitials = name => {
    if (!name) return 'EW'

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part?.[0] || '')
        .join('')
        .toUpperCase()
}

const ExtensionWorkerTickets = () => {
    const theme = useSelector(state => state.theme)
    const { user } = useSelector(state => state.auth)
    const location = useLocation()

    const primary = theme?.primaryColor || '#438a46'
    const secondary = theme?.secondaryColor || '#d7e5d5'
    const textColor = theme?.textColor || '#1f3520'

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState('')
    const [barangay, setBarangay] = useState('')
    const [month, setMonth] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    const [exportIds, setExportIds] = useState([])
    const [exportNotice, setExportNotice] = useState('')

    const [selected, setSelected] = useState(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)

    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)

    const [attachedFile, setAttachedFile] = useState(null)
    const [fileError, setFileError] = useState('')
    const [accessNotice, setAccessNotice] = useState('')

    const [lightboxSrc, setLightboxSrc] = useState(null)

    const messagesContainerRef = useRef(null)
    const wsRef = useRef(null)
    const selectedIdRef = useRef(null)
    const refetchRef = useRef(null)
    const ticketRefs = useRef({})
    const fileInputRef = useRef(null)

    const fetchTickets = async () => {
        try {
            const res = await api.get('/tickets/')
            setTickets(Array.isArray(res.data) ? res.data : [])
        } catch {
            setTickets([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTickets()

        const wsProtocol =
            window.location.protocol === 'https:' ? 'wss:' : 'ws:'

        const ws = new WebSocket(
            `${wsProtocol}//${window.location.host}/ws/ticket-updates/`
        )

        ws.onmessage = () => fetchTickets()

        ws.onerror = () => {
            try {
                ws.close()
            } catch {
                // ignore
            }
        }

        return () => {
            try {
                ws.close()
            } catch {
                // ignore
            }
        }
    }, [])

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

    useEffect(() => {
        const ticketId = location.state?.ticketId

        if (!ticketId || tickets.length === 0) return

        const ticket = tickets.find(item => item.id === ticketId)

        if (ticket) {
            handleView(ticket)

            setTimeout(() => {
                ticketRefs.current[ticketId]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                })
            }, 100)
        } else {
            api.get(`/tickets/${ticketId}/`)
                .then(res => handleView(res.data))
                .catch(() => {})
        }
    }, [location.state?.ticketId, tickets.length])

    const refetchSelected = async ticketId => {
        try {
            const res = await api.get(`/tickets/${ticketId}/`)

            setSelected(current =>
                current?.id === ticketId ? res.data : current
            )

            setTickets(prev =>
                prev.map(ticket =>
                    ticket.id === ticketId
                        ? { ...ticket, ...res.data }
                        : ticket
                )
            )
        } catch (error) {
            if ([403, 404].includes(error.response?.status)) {
                setSelected(current =>
                    current?.id === ticketId ? null : current
                )

                setAccessNotice(
                    'This ticket is no longer available to you. Its assignment may have changed.'
                )

                fetchTickets()
            }
        }
    }

    useEffect(() => {
        refetchRef.current = refetchSelected
    })

    useEffect(() => {
        selectedIdRef.current = selected?.id ?? null
    }, [selected?.id])

    useEffect(() => {
        if (!selected) {
            if (wsRef.current) {
                try {
                    wsRef.current.close()
                } catch {
                    // ignore
                }

                wsRef.current = null
            }

            return
        }

        const wsProtocol =
            window.location.protocol === 'https:' ? 'wss:' : 'ws:'

        const ws = new WebSocket(
            `${wsProtocol}//${window.location.host}/ws/tickets/${selected.id}/`
        )

        ws.onmessage = () => {
            if (selectedIdRef.current && refetchRef.current) {
                refetchRef.current(selectedIdRef.current)
            }
        }

        ws.onclose = event => {
            if (event.code === 4403) {
                setSelected(current =>
                    current?.id === selected.id ? null : current
                )

                setAccessNotice(
                    'This ticket is no longer available to you. Its assignment may have changed.'
                )

                fetchTickets()
            }
        }

        ws.onerror = () => {
            try {
                ws.close()
            } catch {
                // ignore
            }
        }

        wsRef.current = ws

        return () => {
            try {
                ws.close()
            } catch {
                // ignore
            }

            wsRef.current = null
        }
    }, [selected?.id])

    async function handleView(ticket) {
        setAccessNotice('')
        setSelected({ ...ticket, messages: [] })
        setDetailsOpen(false)
        setReply('')
        setAttachedFile(null)
        setFileError('')
        setDetailLoading(true)

        try {
            const res = await api.get(`/tickets/${ticket.id}/`)
            setSelected(res.data)
        } catch (error) {
            setSelected(null)

            setAccessNotice(
                [403, 404].includes(error.response?.status)
                    ? 'This ticket is no longer available to you. Its assignment may have changed.'
                    : 'This ticket could not be loaded. Please try again.'
            )

            fetchTickets()
        } finally {
            setDetailLoading(false)
        }
    }

    const closeTicket = () => {
        setSelected(null)
        setReply('')
        setAttachedFile(null)
        setFileError('')
        setDetailsOpen(false)
    }

    const handleSendReply = async () => {
        if (!selected) return
        if (!reply.trim() && !attachedFile) return

        setSending(true)

        try {
            await api.post(`/tickets/${selected.id}/messages/`, {
                message: reply.trim(),
                fileData: attachedFile?.data || '',
                fileName: attachedFile?.name || '',
                fileType: attachedFile?.type || ''
            })

            setReply('')
            setAttachedFile(null)

            await refetchSelected(selected.id)

            setTimeout(scrollToBottom, 100)
        } catch (error) {
            console.error(error)
        } finally {
            setSending(false)
        }
    }

    const handleFileChange = e => {
        const file = e.target.files?.[0]

        if (!file) return

        if (file.size > 750 * 1024) {
            setFileError('File must be under 1MB.')
            e.target.value = ''
            return
        }

        setFileError('')

        const reader = new FileReader()

        reader.onload = event => {
            setAttachedFile({
                data: event.target.result,
                name: file.name,
                type: file.type
            })
        }

        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handlePin = async (e, msgId) => {
        e.stopPropagation()

        if (!selected) return

        try {
            await api.patch(
                `/tickets/${selected.id}/messages/${msgId}/pin/`
            )

            await refetchSelected(selected.id)
        } catch (error) {
            console.error(error)
        }
    }

    const handleStatusUpdate = async newStatus => {
        if (!selected) return

        setUpdatingStatus(true)

        try {
            const response = await api.patch(
                `/tickets/${selected.id}/status/`,
                { status: newStatus }
            )

            const updated =
                response.data?.ticket || {
                    status: newStatus
                }

            setSelected(prev => ({
                ...prev,
                ...updated
            }))

            setTickets(prev =>
                prev.map(ticket =>
                    ticket.id === selected.id
                        ? { ...ticket, ...updated }
                        : ticket
                )
            )
        } catch (error) {
            console.error(error)
        } finally {
            setUpdatingStatus(false)
        }
    }

    const sorted = useMemo(() => {
        return [...tickets].sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0)
            const dateB = new Date(b.date || b.createdAt || 0)

            return dateB - dateA
        })
    }, [tickets])

    const barangays = useMemo(() => {
        return [
            ...new Set(
                tickets
                    .map(ticket => ticket.barangay)
                    .filter(Boolean)
            )
        ].sort()
    }, [tickets])

    const filtered = useMemo(() => {
        return sorted.filter(ticket => {
            const matchTab =
                activeTab === 'all' ||
                ticket.status === activeTab

            const needle = search.trim().toLowerCase()

            const searchable = [
                ticket.title,
                ticket.concern,
                ticket.categoryName,
                ticket.subcategoryName,
                ticket.barangay,
                ticket.extensionWorkerName,
                ticket.farmerName
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            const matchSearch =
                !needle || searchable.includes(needle)

            const matchBarangay =
                !barangay ||
                (ticket.barangay || 'Unspecified') === barangay

            let matchMonth = true

            if (month) {
                const value =
                    ticket.date ||
                    ticket.createdAt ||
                    ticket.submittedAt

                const date = value ? new Date(value) : null

                if (!date || Number.isNaN(date.getTime())) {
                    matchMonth = false
                } else {
                    const ticketMonth =
                        `${date.getFullYear()}-${String(
                            date.getMonth() + 1
                        ).padStart(2, '0')}`

                    matchMonth = ticketMonth === month
                }
            }

            return (
                matchTab &&
                matchSearch &&
                matchBarangay &&
                matchMonth
            )
        })
    }, [
        sorted,
        activeTab,
        search,
        barangay,
        month
    ])

    const resolved = filtered.filter(
        ticket => ticket.status === 'resolved'
    )

    const chosen = resolved.filter(ticket =>
        exportIds.includes(ticket.id)
    )

    useEffect(() => {
        setExportIds(prev =>
            prev.filter(id =>
                tickets.some(
                    ticket =>
                        ticket.id === id &&
                        ticket.status === 'resolved'
                )
            )
        )
    }, [tickets])

    const toggleExport = id => {
        setExportIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        )
    }

    const toggleAllResolved = () => {
        const ids = resolved.map(ticket => ticket.id)

        const allSelected =
            ids.length > 0 &&
            ids.every(id => exportIds.includes(id))

        if (allSelected) {
            setExportIds(prev =>
                prev.filter(id => !ids.includes(id))
            )
        } else {
            setExportIds(prev => [
                ...new Set([...prev, ...ids])
            ])
        }
    }

    const exportResolved = () => {
        if (!chosen.length) return

        const cell = value => {
            const text = String(value ?? '')

            const safe =
                /^[=+@\-\t\r]/.test(text)
                    ? `'${text}`
                    : text

            return `"${safe.replace(/"/g, '""')}"`
        }

        const rows = [
            [
                'Ticket ID',
                'Title',
                'Concern',
                'Barangay',
                'Category',
                'Subcategory',
                'Priority',
                'Assigned Personnel',
                'Submitted Date',
                'Status'
            ],
            ...chosen.map(ticket => [
                ticket.id,
                ticket.title,
                ticket.concern,
                ticket.barangay,
                ticket.categoryName,
                ticket.subcategoryName,
                ticket.priority,
                ticket.extensionWorkerName,
                ticket.date || ticket.createdAt,
                ticket.status
            ])
        ]

        const csv =
            '\ufeff' +
            rows
                .map(row =>
                    row.map(cell).join(',')
                )
                .join('\r\n')

        const url = URL.createObjectURL(
            new Blob([csv], {
                type: 'text/csv;charset=utf-8'
            })
        )

        const link = document.createElement('a')

        link.href = url
        link.download =
            `resolved-concerns-${month || 'all-months'}.csv`

        document.body.appendChild(link)
        link.click()
        link.remove()

        setTimeout(() => {
            URL.revokeObjectURL(url)
        }, 1000)

        setExportNotice(
            `Exported ${chosen.length} resolved concern(s).`
        )

        setTimeout(() => {
            setExportNotice('')
        }, 3000)
    }

    const resetFilters = () => {
        setSearch('')
        setBarangay('')
        setMonth('')
        setActiveTab('all')
    }

    const counts = {
        all: tickets.length,
        pending: tickets.filter(
            ticket => ticket.status === 'pending'
        ).length,
        ongoing: tickets.filter(
            ticket => ticket.status === 'ongoing'
        ).length,
        waiting_for_feedback: tickets.filter(
            ticket =>
                ticket.status === 'waiting_for_feedback'
        ).length,
        resolved: tickets.filter(
            ticket => ticket.status === 'resolved'
        ).length
    }

    return (
        <ExtensionWorkerLayout>
            <main className="w-full max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-7">

                {/* HERO */}
                <section
                    className="relative overflow-hidden rounded-[26px] mb-5"
                    style={{
                        background: `linear-gradient(
                            135deg,
                            ${primary} 0%,
                            ${primary}ee 55%,
                            #79ad79 100%
                        )`,
                        boxShadow:
                            '0 16px 40px rgba(30,80,40,.14)'
                    }}
                >
                    <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full border-[35px] border-white/[0.045]" />

                    <div className="absolute right-[16%] -bottom-28 w-64 h-64 rounded-full bg-white/[0.04]" />

                    <div className="relative z-10 px-6 sm:px-8 py-7">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                            <div>
                                <p className="text-[10px] uppercase tracking-[.25em] font-bold text-white/65">
                                    LGU Personnel Workspace
                                </p>

                                <h1 className="text-2xl sm:text-[30px] font-bold text-white mt-1">
                                    My Tickets
                                </h1>

                                <p className="text-xs sm:text-sm text-white/70 mt-2 max-w-2xl">
                                    Review assigned farmer concerns,
                                    respond to inquiries, and monitor
                                    cases through resolution.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block text-right">
                                    <p className="text-[10px] text-white/55">
                                        Assigned concerns
                                    </p>

                                    <p className="text-xl font-bold text-white">
                                        {tickets.length}
                                    </p>
                                </div>

                                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center">
                                    <MdConfirmationNumber
                                        size={23}
                                        color="#fff"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* STATS */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <StatCard
                        title="Assigned"
                        value={counts.all}
                        subtitle="Total concerns"
                        icon={MdConfirmationNumber}
                        color={primary}
                        secondary={secondary}
                        textColor={textColor}
                    />

                    <StatCard
                        title="Pending"
                        value={counts.pending}
                        subtitle="Awaiting action"
                        icon={MdSchedule}
                        color="#f59e0b"
                        secondary={secondary}
                        textColor={textColor}
                    />

                    <StatCard
                        title="In Progress"
                        value={counts.ongoing}
                        subtitle="Currently handled"
                        icon={MdAutorenew}
                        color="#3b82f6"
                        secondary={secondary}
                        textColor={textColor}
                    />

                    <StatCard
                        title="Resolved"
                        value={counts.resolved}
                        subtitle="Completed concerns"
                        icon={MdCheckCircle}
                        color="#16a34a"
                        secondary={secondary}
                        textColor={textColor}
                    />
                </section>
                    {/* =========================================================
    SEARCH / STATUS / FILTERS
========================================================= */}
<section
    className="rounded-[22px] overflow-hidden mb-5"
    style={{
        background: 'rgba(255,255,255,.97)',
        border: `1px solid ${secondary}`,
        boxShadow: '0 10px 30px rgba(35,75,40,.06)'
    }}
>
    {/* SEARCH */}
    <div className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
                <MdSearch
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35"
                    color={textColor}
                />

                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search concern, category, farmer or location..."
                    className="w-full h-[48px] pl-11 pr-4 rounded-xl text-sm outline-none transition-all"
                    style={{
                        color: textColor,
                        background: '#fff',
                        border: `1px solid ${secondary}`
                    }}
                />
            </div>

            <button
                type="button"
                onClick={fetchTickets}
                className="h-[48px] px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-sm"
                style={{
                    color: primary,
                    background: '#fff',
                    border: `1px solid ${secondary}`
                }}
            >
                <MdRefresh size={17} />
                Refresh
            </button>
        </div>
    </div>

    {/* STATUS TABS */}
    <div
        className="px-4 sm:px-5 py-3 flex items-center gap-2 overflow-x-auto"
        style={{
            background: `${primary}035`,
            borderTop: `1px solid ${secondary}90`,
            borderBottom: `1px solid ${secondary}90`
        }}
    >
        {STATUS_TABS.map(tab => {
            const active = activeTab === tab

            return (
                <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className="h-[38px] flex items-center gap-2 px-4 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all"
                    style={{
                        color: active ? '#fff' : textColor,
                        background: active ? primary : '#fff',
                        border: active
                            ? `1px solid ${primary}`
                            : `1px solid ${secondary}`,
                        boxShadow: active
                            ? `0 4px 12px ${primary}20`
                            : 'none'
                    }}
                >
                    {STATUS_LABEL[tab]}

                    <span
                        className="min-w-[19px] h-[19px] px-1.5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{
                            background: active
                                ? 'rgba(255,255,255,.20)'
                                : `${primary}09`,
                            color: active ? '#fff' : primary
                        }}
                    >
                        {counts[tab]}
                    </span>
                </button>
            )
        })}
    </div>

    {/* FILTER TOOLBAR */}
    <div className="p-4 sm:p-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">

            {/* LEFT */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{
                            background: `${primary}0b`
                        }}
                    >
                        <MdFilterAlt
                            size={14}
                            color={primary}
                        />
                    </div>

                    <div>
                        <h3
                            className="text-[11px] font-bold leading-none"
                            style={{ color: textColor }}
                        >
                            Ticket History
                        </h3>

                        <p
                            className="text-[9px] opacity-40 mt-1"
                            style={{ color: textColor }}
                        >
                            Filter assigned concerns by barangay or month
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                    {/* BARANGAY */}
                    <div className="sm:w-[210px]">
                        <label
                            className="block text-[9px] font-bold uppercase tracking-wide mb-1.5 opacity-55"
                            style={{ color: textColor }}
                        >
                            Barangay
                        </label>

                        <select
                            value={barangay}
                            onChange={e => setBarangay(e.target.value)}
                            className="w-full h-[42px] px-3 rounded-xl text-xs outline-none cursor-pointer"
                            style={{
                                color: textColor,
                                background: '#fff',
                                border: `1px solid ${secondary}`
                            }}
                        >
                            <option value="">
                                All barangays
                            </option>

                            {barangays.map(item => (
                                <option
                                    key={item}
                                    value={item}
                                >
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* MONTH */}
                    <div className="sm:w-[190px]">
                        <label
                            className="block text-[9px] font-bold uppercase tracking-wide mb-1.5 opacity-55"
                            style={{ color: textColor }}
                        >
                            Submitted Month
                        </label>

                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="w-full h-[42px] px-3 rounded-xl text-xs outline-none cursor-pointer"
                            style={{
                                color: textColor,
                                background: '#fff',
                                border: `1px solid ${secondary}`
                            }}
                        />
                    </div>

                    {/* RESET */}
                    {(barangay || month || search || activeTab !== 'all') && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="h-[42px] px-4 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all hover:bg-black/[.02]"
                            style={{
                                color: primary,
                                background: '#fff',
                                border: `1px solid ${secondary}`
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* EXPORT */}
            <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl shrink-0"
                style={{
                    background: `${primary}045`,
                    border: `1px solid ${primary}10`
                }}
            >
                <label className="flex items-center gap-2 cursor-pointer px-1">
                    <input
                        type="checkbox"
                        checked={
                            resolved.length > 0 &&
                            resolved.every(ticket =>
                                exportIds.includes(ticket.id)
                            )
                        }
                        disabled={resolved.length === 0}
                        onChange={toggleAllResolved}
                        className="w-3.5 h-3.5 cursor-pointer"
                        style={{
                            accentColor: primary
                        }}
                    />

                    <span
                        className="text-[10px] font-semibold whitespace-nowrap"
                        style={{
                            color: textColor,
                            opacity: resolved.length === 0 ? .4 : .75
                        }}
                    >
                        Select resolved
                    </span>
                </label>

                <div
                    className="w-px h-6"
                    style={{
                        background: secondary
                    }}
                />

                <button
                    type="button"
                    onClick={exportResolved}
                    disabled={!chosen.length}
                    className="h-[36px] px-3.5 rounded-lg text-[10px] font-semibold text-white flex items-center gap-2 transition-all disabled:cursor-not-allowed"
                    style={{
                        background: chosen.length
                            ? primary
                            : `${primary}55`
                    }}
                >
                    <MdDownload size={14} />

                    Export CSV

                    {!!chosen.length && (
                        <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-white/20 flex items-center justify-center text-[8px]">
                            {chosen.length}
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* ACTIVE FILTER SUMMARY */}
        {(search || barangay || month || activeTab !== 'all') && (
            <div
                className="flex flex-wrap items-center gap-1.5 mt-4 pt-3"
                style={{
                    borderTop: `1px solid ${secondary}70`
                }}
            >
                <span
                    className="text-[9px] font-semibold opacity-40 mr-1"
                    style={{ color: textColor }}
                >
                    Active filters:
                </span>

                {activeTab !== 'all' && (
                    <FilterChip
                        label={STATUS_LABEL[activeTab]}
                        onRemove={() => setActiveTab('all')}
                        primary={primary}
                    />
                )}

                {barangay && (
                    <FilterChip
                        label={barangay}
                        onRemove={() => setBarangay('')}
                        primary={primary}
                    />
                )}

                {month && (
                    <FilterChip
                        label={new Date(`${month}-01T00:00:00`).toLocaleDateString(
                            'en-PH',
                            {
                                month: 'long',
                                year: 'numeric'
                            }
                        )}
                        onRemove={() => setMonth('')}
                        primary={primary}
                    />
                )}

                {search && (
                    <FilterChip
                        label={`"${search}"`}
                        onRemove={() => setSearch('')}
                        primary={primary}
                    />
                )}
            </div>
        )}

        {exportNotice && (
            <div
                className="mt-3 px-3 py-2 rounded-lg text-[10px] font-semibold"
                style={{
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #dcfce7'
                }}
            >
                {exportNotice}
            </div>
        )}
    </div>
</section>
                
                {accessNotice && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        {accessNotice}
                    </div>
                )}

                {/* RESULTS */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                        <h2
                            className="text-sm font-bold"
                            style={{ color: textColor }}
                        >
                            Assigned Concerns
                        </h2>

                        <p
                            className="text-[10px] opacity-45 mt-0.5"
                            style={{ color: textColor }}
                        >
                            {filtered.length} matching ticket
                            {filtered.length !== 1 ? 's' : ''}
                            {' • '}
                            {resolved.length} resolved
                        </p>
                    </div>
                </div>

                {loading ? (
                    <LoadingState
                        primary={primary}
                        secondary={secondary}
                        textColor={textColor}
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        primary={primary}
                        secondary={secondary}
                        textColor={textColor}
                        reset={resetFilters}
                    />
                ) : (
                    <div className="space-y-3">
                        {filtered.map(ticket => {
                            const status =
                                ticket.status || 'pending'

                            const statusColor =
                                STATUS_COLORS[status] ||
                                '#64748b'

                            const priority = String(
                                ticket.priority || ''
                            ).toLowerCase()

                            const priorityColor =
                                priority === 'high'
                                    ? '#dc2626'
                                    : priority === 'medium'
                                      ? '#d97706'
                                      : '#16a34a'

                            const participants =
                            Number(ticket.participantCount) ||
                            (Array.isArray(ticket.participants)
                                ? ticket.participants.length
                                : 0) ||
                            Number(ticket.farmerCount) ||
                            1

                        const capacity =
                            Number(ticket.capacity?.maxFarmers) ||
                            Number(ticket.capacity?.maxParticipants) ||
                            Number(ticket.capacity?.limit) ||
                            Number(ticket.capacity) ||
                            Number(ticket.maxParticipants) ||
                            10

                            return (
                                <article
                                    key={ticket.id}
                                    ref={el =>
                                        (ticketRefs.current[
                                            ticket.id
                                        ] = el)
                                    }
                                    className="group relative rounded-[20px] overflow-hidden transition-all hover:-translate-y-[1px]"
                                    style={{
                                        background:
                                            'rgba(255,255,255,.97)',
                                        border: `1px solid ${secondary}`,
                                        boxShadow:
                                            '0 5px 18px rgba(35,75,40,.05)'
                                    }}
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1"
                                        style={{
                                            background:
                                                statusColor
                                        }}
                                    />

                                    <div className="p-5 sm:p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3
                                                        className="text-base font-bold"
                                                        style={{
                                                            color: textColor
                                                        }}
                                                    >
                                                        {ticket.title ||
                                                            'Farmer Concern'}
                                                    </h3>

                                                    {ticket.categoryName && (
                                                        <Tag
                                                            text={
                                                                ticket.categoryName
                                                            }
                                                            color={
                                                                primary
                                                            }
                                                        />
                                                    )}

                                                    {ticket.subcategoryName && (
                                                        <Tag
                                                            text={
                                                                ticket.subcategoryName
                                                            }
                                                            color="#64748b"
                                                        />
                                                    )}

                                                    {priority && (
                                                        <Tag
                                                            text={priority.toUpperCase()}
                                                            color={
                                                                priorityColor
                                                            }
                                                        />
                                                    )}
                                                </div>

                                                <p
                                                    className="mt-2 text-xs sm:text-sm leading-relaxed opacity-65"
                                                    style={{
                                                        color: textColor
                                                    }}
                                                >
                                                    {ticket.concern ||
                                                        'No concern description provided.'}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <StatusBadge
                                                    status={
                                                        status
                                                    }
                                                />

                                                {status ===
                                                    'resolved' && (
                                                    <label
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                                                        style={{
                                                            border: `1px solid ${secondary}`
                                                        }}
                                                        title="Select for export"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={exportIds.includes(
                                                                ticket.id
                                                            )}
                                                            onChange={() =>
                                                                toggleExport(
                                                                    ticket.id
                                                                )
                                                            }
                                                        />

                                                        {exportIds.includes(
                                                            ticket.id
                                                        ) ? (
                                                            <MdCheckCircle
                                                                size={
                                                                    18
                                                                }
                                                                color={
                                                                    primary
                                                                }
                                                            />
                                                        ) : (
                                                            <MdDownload
                                                                size={
                                                                    17
                                                                }
                                                                color={
                                                                    textColor
                                                                }
                                                                className="opacity-40"
                                                            />
                                                        )}
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-4"
                                            style={{
                                                borderTop: `1px solid ${secondary}80`
                                            }}
                                        >
                                            <MetaItem
                                                icon={MdPeople}
                                                label="Participants"
                                                value={`${participants} / ${capacity} farmers`}
                                                primary={
                                                    primary
                                                }
                                                textColor={
                                                    textColor
                                                }
                                            />

                                            <MetaItem
                                                icon={MdLocationOn}
                                                label="Barangay"
                                                value={
                                                    ticket.barangay ||
                                                    'Not specified'
                                                }
                                                primary={
                                                    primary
                                                }
                                                textColor={
                                                    textColor
                                                }
                                            />

                                            <MetaItem
                                                icon={
                                                    MdCalendarToday
                                                }
                                                label="Submitted"
                                                value={formatDate(
                                                    ticket.date ||
                                                        ticket.createdAt
                                                )}
                                                primary={
                                                    primary
                                                }
                                                textColor={
                                                    textColor
                                                }
                                            />

                                            <MetaItem
                                                icon={
                                                    MdConfirmationNumber
                                                }
                                                label="Ticket"
                                                value={
                                                    ticket.ticketNumber ||
                                                    ticket.title ||
                                                    ticket.id
                                                }
                                                primary={
                                                    primary
                                                }
                                                textColor={
                                                    textColor
                                                }
                                            />
                                        </div>

                                        <div
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4"
                                            style={{
                                                borderTop: `1px solid ${secondary}80`
                                            }}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                                                    style={{
                                                        background: `${primary}0d`,
                                                        color: primary
                                                    }}
                                                >
                                                    {getInitials(
                                                        ticket.extensionWorkerName ||
                                                            user?.name
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p
                                                        className="text-[9px] uppercase tracking-wider opacity-40"
                                                        style={{
                                                            color: textColor
                                                        }}
                                                    >
                                                        Assigned
                                                        Personnel
                                                    </p>

                                                    <p
                                                        className="text-xs font-semibold truncate"
                                                        style={{
                                                            color: textColor
                                                        }}
                                                    >
                                                        {ticket.extensionWorkerName ||
                                                            user?.name ||
                                                            'Extension Worker'}

                                                        {(ticket.extensionWorkerPosition ||
                                                            user?.position) && (
                                                            <span className="font-normal opacity-50">
                                                                {' '}
                                                                •{' '}
                                                                {ticket.extensionWorkerPosition ||
                                                                    user?.position}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleView(
                                                        ticket
                                                    )
                                                }
                                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2"
                                                style={{
                                                    background:
                                                        primary
                                                }}
                                            >
                                                Open Conversation
                                                <MdArrowForward
                                                    size={15}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* CONVERSATION MODAL */}
            {selected && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5">
                    <div
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={closeTicket}
                    />

                    <div
                        className="relative w-full max-w-[1000px] max-h-[92vh] rounded-[24px] overflow-hidden flex flex-col"
                        style={{
                            background: '#fff',
                            boxShadow:
                                '0 30px 80px rgba(0,0,0,.28)'
                        }}
                    >
                        {/* MODAL HEADER */}
                        <div
                            className="px-5 sm:px-6 py-4 flex items-center justify-between"
                            style={{
                                borderBottom: `1px solid ${secondary}`
                            }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{
                                        background: `${primary}0d`
                                    }}
                                >
                                    <MdChat
                                        size={20}
                                        color={primary}
                                    />
                                </div>

                                <div className="min-w-0">
                                    <p
                                        className="text-[9px] uppercase tracking-[.15em] font-bold opacity-45"
                                        style={{
                                            color: textColor
                                        }}
                                    >
                                        Ticket Conversation
                                    </p>

                                    <h2
                                        className="font-bold text-base truncate"
                                        style={{
                                            color: textColor
                                        }}
                                    >
                                        {selected.title ||
                                            'Farmer Concern'}
                                    </h2>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeTicket}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/[.04]"
                            >
                                <MdClose
                                    size={21}
                                    color={textColor}
                                />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="flex-1 min-h-[450px] flex items-center justify-center">
                                <AiOutlineLoading3Quarters
                                    size={28}
                                    className="animate-spin"
                                    color={primary}
                                />
                            </div>
                        ) : (
                            <>
                                {/* TICKET SUMMARY */}
                                <div
                                    className="px-5 sm:px-6 py-4"
                                    style={{
                                        background: `${primary}04`,
                                        borderBottom: `1px solid ${secondary}`
                                    }}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            {selected.categoryName && (
                                                <Tag
                                                    text={
                                                        selected.categoryName
                                                    }
                                                    color={
                                                        primary
                                                    }
                                                />
                                            )}

                                            {selected.subcategoryName && (
                                                <Tag
                                                    text={
                                                        selected.subcategoryName
                                                    }
                                                    color="#64748b"
                                                />
                                            )}

                                            {selected.priority && (
                                                <Tag
                                                    text={String(
                                                        selected.priority
                                                    ).toUpperCase()}
                                                    color={
                                                        String(
                                                            selected.priority
                                                        ).toLowerCase() ===
                                                        'high'
                                                            ? '#dc2626'
                                                            : String(
                                                                    selected.priority
                                                                ).toLowerCase() ===
                                                                'medium'
                                                              ? '#d97706'
                                                              : '#16a34a'
                                                    }
                                                />
                                            )}

                                            <StatusBadge
                                                status={
                                                    selected.status
                                                }
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDetailsOpen(
                                                    prev => !prev
                                                )
                                            }
                                            className="text-[11px] font-semibold flex items-center gap-1.5"
                                            style={{
                                                color: primary
                                            }}
                                        >
                                            <MdInfoOutline
                                                size={15}
                                            />

                                            {detailsOpen
                                                ? 'Hide details'
                                                : 'Ticket details'}
                                        </button>
                                    </div>

                                    <div className="mt-3">
                                        <p
                                            className="text-[9px] uppercase tracking-wider opacity-40"
                                            style={{
                                                color: textColor
                                            }}
                                        >
                                            Farmer Concern
                                        </p>

                                        <p
                                            className="text-sm mt-1 leading-relaxed"
                                            style={{
                                                color: textColor
                                            }}
                                        >
                                            {selected.concern ||
                                                'No concern description provided.'}
                                        </p>
                                    </div>

                                    {detailsOpen && (
                                        <div
                                            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4"
                                            style={{
                                                borderTop: `1px solid ${secondary}`
                                            }}
                                        >
                                            <DetailBox
                                                label="Farmer"
                                                value={
                                                    selected.farmerName ||
                                                    selected.createdByName ||
                                                    'Farmer'
                                                }
                                            />

                                            <DetailBox
                                                label="Barangay"
                                                value={
                                                    selected.barangay ||
                                                    'Not specified'
                                                }
                                            />

                                            <DetailBox
                                                label="Submitted"
                                                value={formatDateTime(
                                                    selected.date ||
                                                        selected.createdAt
                                                )}
                                            />

                                            <DetailBox
                                                label="Participants"
                                                value={`${selected.participantCount ||
                                                    selected.participants
                                                        ?.length ||
                                                    1} / ${selected.capacity ||
                                                    selected.maxParticipants ||
                                                    10} farmers`}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* MESSAGES */}
                                <div
                                    ref={messagesContainerRef}
                                    className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 min-h-[300px] max-h-[48vh]"
                                    style={{
                                        background:
                                            '#f8faf8'
                                    }}
                                >
                                    {!selected.messages?.length ? (
                                        <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center">
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                                style={{
                                                    background: `${primary}0b`
                                                }}
                                            >
                                                <MdChat
                                                    size={25}
                                                    color={
                                                        primary
                                                    }
                                                />
                                            </div>

                                            <p
                                                className="font-semibold text-sm mt-3"
                                                style={{
                                                    color: textColor
                                                }}
                                            >
                                                No messages yet
                                            </p>

                                            <p
                                                className="text-[11px] opacity-45 mt-1"
                                                style={{
                                                    color: textColor
                                                }}
                                            >
                                                Start the
                                                conversation with
                                                the farmer.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {selected.messages.map(
                                                message => {
                                                    const worker =
                                                        [
                                                            'extension_worker',
                                                            'lgu_personnel'
                                                        ].includes(
                                                            message.senderRole
                                                        )

                                                    return (
                                                        <div
                                                            key={
                                                                message.id
                                                            }
                                                            className={`flex ${
                                                                worker
                                                                    ? 'justify-end'
                                                                    : 'justify-start'
                                                            }`}
                                                        >
                                                            <div
                                                                className={`max-w-[82%] sm:max-w-[72%] ${
                                                                    worker
                                                                        ? 'items-end'
                                                                        : 'items-start'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                                    <span
                                                                        className="text-[9px] font-semibold opacity-50"
                                                                        style={{
                                                                            color: textColor
                                                                        }}
                                                                    >
                                                                        {message.senderName ||
                                                                            (worker
                                                                                ? 'Extension Worker'
                                                                                : 'Farmer')}
                                                                    </span>

                                                                    {message.isPinned && (
                                                                        <span className="text-[8px] font-semibold text-amber-600 flex items-center gap-1">
                                                                            <MdPushPin
                                                                                size={
                                                                                    10
                                                                                }
                                                                            />
                                                                            Pinned
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div
                                                                    className="relative rounded-2xl px-4 py-3"
                                                                    style={{
                                                                        background:
                                                                            worker
                                                                                ? primary
                                                                                : '#fff',
                                                                        color: worker
                                                                            ? '#fff'
                                                                            : textColor,
                                                                        border: worker
                                                                            ? 'none'
                                                                            : `1px solid ${secondary}`,
                                                                        borderBottomRightRadius:
                                                                            worker
                                                                                ? 5
                                                                                : 16,
                                                                        borderBottomLeftRadius:
                                                                            worker
                                                                                ? 16
                                                                                : 5
                                                                    }}
                                                                >
                                                                    {message.message && (
                                                                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                                                            {
                                                                                message.message
                                                                            }
                                                                        </p>
                                                                    )}

                                                                    {message.fileData && (
                                                                        <div className="mt-2">
                                                                            {message.fileType?.startsWith(
                                                                                'image/'
                                                                            ) ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setLightboxSrc(
                                                                                            message.fileData
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <img
                                                                                        src={
                                                                                            message.fileData
                                                                                        }
                                                                                        alt={
                                                                                            message.fileName ||
                                                                                            'Attachment'
                                                                                        }
                                                                                        className="max-w-[250px] max-h-[180px] rounded-xl object-cover"
                                                                                    />
                                                                                </button>
                                                                            ) : (
                                                                                <a
                                                                                    href={
                                                                                        message.fileData
                                                                                    }
                                                                                    download={
                                                                                        message.fileName
                                                                                    }
                                                                                    className="flex items-center gap-2 text-xs underline"
                                                                                >
                                                                                    <MdInsertDriveFile
                                                                                        size={
                                                                                            17
                                                                                        }
                                                                                    />
                                                                                    {message.fileName ||
                                                                                        'Attachment'}
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {worker && (
                                                                        <button
                                                                            type="button"
                                                                            title="Pin as recommended answer"
                                                                            onClick={e =>
                                                                                handlePin(
                                                                                    e,
                                                                                    message.id
                                                                                )
                                                                            }
                                                                            className="absolute -left-8 top-2 w-7 h-7 rounded-lg bg-white border flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <MdPushPin
                                                                                size={
                                                                                    13
                                                                                }
                                                                                color={
                                                                                    message.isPinned
                                                                                        ? '#d97706'
                                                                                        : '#64748b'
                                                                                }
                                                                            />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <p
                                                                    className={`text-[8px] opacity-35 mt-1 px-1 ${
                                                                        worker
                                                                            ? 'text-right'
                                                                            : ''
                                                                    }`}
                                                                    style={{
                                                                        color: textColor
                                                                    }}
                                                                >
                                                                    {formatDateTime(
                                                                        message.date ||
                                                                            message.createdAt
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* REPLY */}
                                {selected.status !== 'resolved' && (
                                    <div
                                        className="px-5 sm:px-6 py-4"
                                        style={{
                                            borderTop: `1px solid ${secondary}`
                                        }}
                                    >
                                        {attachedFile && (
                                            <div
                                                className="mb-3 flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                                                style={{
                                                    background: `${primary}08`
                                                }}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <MdInsertDriveFile
                                                        size={
                                                            17
                                                        }
                                                        color={
                                                            primary
                                                        }
                                                    />

                                                    <span
                                                        className="text-[11px] truncate"
                                                        style={{
                                                            color: textColor
                                                        }}
                                                    >
                                                        {
                                                            attachedFile.name
                                                        }
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setAttachedFile(
                                                            null
                                                        )
                                                    }
                                                >
                                                    <MdClose
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        )}

                                        {fileError && (
                                            <p className="text-[10px] text-red-600 mb-2">
                                                {fileError}
                                            </p>
                                        )}

                                        <div className="flex items-end gap-2">
                                            <input
                                                ref={
                                                    fileInputRef
                                                }
                                                type="file"
                                                className="hidden"
                                                onChange={
                                                    handleFileChange
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                                style={{
                                                    border: `1px solid ${secondary}`
                                                }}
                                            >
                                                <MdAttachFile
                                                    size={19}
                                                    color={
                                                        primary
                                                    }
                                                />
                                            </button>

                                            <textarea
                                                value={reply}
                                                onChange={e =>
                                                    setReply(
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                onKeyDown={e => {
                                                    if (
                                                        e.key ===
                                                            'Enter' &&
                                                        !e.shiftKey
                                                    ) {
                                                        e.preventDefault()

                                                        if (
                                                            !sending
                                                        ) {
                                                            handleSendReply()
                                                        }
                                                    }
                                                }}
                                                rows={1}
                                                placeholder="Write a response to the farmer..."
                                                className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl px-4 py-3 text-xs outline-none"
                                                style={{
                                                    border: `1px solid ${secondary}`,
                                                    color: textColor
                                                }}
                                            />

                                            <button
                                                type="button"
                                                onClick={
                                                    handleSendReply
                                                }
                                                disabled={
                                                    sending ||
                                                    (!reply.trim() &&
                                                        !attachedFile)
                                                }
                                                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40"
                                                style={{
                                                    background:
                                                        primary
                                                }}
                                            >
                                                {sending ? (
                                                    <AiOutlineLoading3Quarters
                                                        size={
                                                            17
                                                        }
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    <MdSend
                                                        size={
                                                            18
                                                        }
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STATUS ACTIONS */}
                                <div
                                    className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                    style={{
                                        background: '#fff',
                                        borderTop: `1px solid ${secondary}`
                                    }}
                                >
                                    <div>
                                        <p
                                            className="text-[9px] uppercase tracking-wider opacity-40"
                                            style={{
                                                color: textColor
                                            }}
                                        >
                                            Current Status
                                        </p>

                                        <div className="mt-1">
                                            <StatusBadge
                                                status={
                                                    selected.status
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {selected.status ===
                                            'pending' && (
                                            <ActionButton
                                                loading={
                                                    updatingStatus
                                                }
                                                onClick={() =>
                                                    handleStatusUpdate(
                                                        'ongoing'
                                                    )
                                                }
                                                color="#3b82f6"
                                                icon={
                                                    MdAutorenew
                                                }
                                            >
                                                Mark as In
                                                Progress
                                            </ActionButton>
                                        )}

                                        {selected.status ===
                                            'ongoing' && (
                                            <ActionButton
                                                loading={
                                                    updatingStatus
                                                }
                                                onClick={() =>
                                                    handleStatusUpdate(
                                                        'waiting_for_feedback'
                                                    )
                                                }
                                                color="#9333ea"
                                                icon={
                                                    MdCheckCircle
                                                }
                                            >
                                                Request
                                                Resolution
                                            </ActionButton>
                                        )}

                                        {selected.status ===
                                            'waiting_for_feedback' && (
                                            <ActionButton
                                                loading={
                                                    updatingStatus
                                                }
                                                onClick={() =>
                                                    handleStatusUpdate(
                                                        'ongoing'
                                                    )
                                                }
                                                color="#64748b"
                                                icon={
                                                    MdAutorenew
                                                }
                                            >
                                                Cancel Resolution
                                                Request
                                            </ActionButton>
                                        )}

                                        {selected.status ===
                                            'resolved' && (
                                            <div className="px-4 py-2.5 rounded-xl bg-green-50 text-green-700 text-xs font-semibold flex items-center gap-2">
                                                <MdCheckCircle
                                                    size={16}
                                                />
                                                Ticket Resolved
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={closeTicket}
                                            className="px-4 py-2.5 rounded-xl text-xs font-semibold"
                                            style={{
                                                border: `1px solid ${secondary}`,
                                                color: textColor
                                            }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* IMAGE LIGHTBOX */}
            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-5"
                    onClick={() =>
                        setLightboxSrc(null)
                    }
                >
                    <button
                        type="button"
                        onClick={() =>
                            setLightboxSrc(null)
                        }
                        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"
                    >
                        <MdClose size={23} />
                    </button>

                    <img
                        src={lightboxSrc}
                        alt="Attachment"
                        className="max-w-[94vw] max-h-[90vh] object-contain rounded-xl"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    />
                </div>
            )}
        </ExtensionWorkerLayout>
    )
}

/* =========================================================
   UI COMPONENTS
========================================================= */

const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    secondary,
    textColor
}) => (
    <div
        className="relative overflow-hidden rounded-[18px] p-4 sm:p-5"
        style={{
            background: 'rgba(255,255,255,.96)',
            border: `1px solid ${secondary}`,
            boxShadow:
                '0 6px 18px rgba(35,75,40,.045)'
        }}
    >
        <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ background: color }}
        />

        <div className="flex justify-between gap-3">
            <div>
                <p
                    className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[.13em] opacity-45"
                    style={{ color: textColor }}
                >
                    {title}
                </p>

                <p
                    className="text-2xl font-bold mt-2"
                    style={{ color: textColor }}
                >
                    {value}
                </p>

                <p
                    className="text-[9px] sm:text-[10px] opacity-40 mt-1"
                    style={{ color: textColor }}
                >
                    {subtitle}
                </p>
            </div>

            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                    background: `${color}10`
                }}
            >
                <Icon size={20} color={color} />
            </div>
        </div>
    </div>
)

const Tag = ({ text, color }) => (
    <span
        className="px-2.5 py-1 rounded-full text-[9px] font-bold"
        style={{
            color,
            background: `${color}0d`,
            border: `1px solid ${color}18`
        }}
    >
        {text}
    </span>
)

const StatusBadge = ({ status }) => {
    const color =
        STATUS_COLORS[status] || '#64748b'

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap"
            style={{
                color,
                background: `${color}0e`,
                border: `1px solid ${color}18`
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                    background: color
                }}
            />

            {STATUS_LABEL[status] || status}
        </span>
    )
}

const MetaItem = ({
    icon: Icon,
    label,
    value,
    primary,
    textColor
}) => (
    <div className="flex items-center gap-2.5 min-w-0">
        <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
                background: `${primary}08`
            }}
        >
            <Icon
                size={14}
                color={primary}
            />
        </div>

        <div className="min-w-0">
            <p
                className="text-[8px] uppercase tracking-wider opacity-35"
                style={{ color: textColor }}
            >
                {label}
            </p>

            <p
                className="text-[10px] sm:text-[11px] font-semibold truncate mt-0.5"
                style={{ color: textColor }}
            >
                {value || '—'}
            </p>
        </div>
    </div>
)

const DetailBox = ({ label, value }) => (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-black/[.05]">
        <p className="text-[8px] uppercase tracking-wider text-gray-400">
            {label}
        </p>

        <p className="text-[11px] font-semibold text-gray-700 mt-1">
            {value || '—'}
        </p>
    </div>
)

const ActionButton = ({
    children,
    onClick,
    loading,
    color,
    icon: Icon
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 disabled:opacity-50"
        style={{
            background: color
        }}
    >
        {loading ? (
            <AiOutlineLoading3Quarters
                size={14}
                className="animate-spin"
            />
        ) : (
            <Icon size={15} />
        )}

        {children}
    </button>
)

const LoadingState = ({
    primary,
    secondary,
    textColor
}) => (
    <div
        className="rounded-[22px] py-24 flex flex-col items-center justify-center"
        style={{
            background: 'rgba(255,255,255,.96)',
            border: `1px solid ${secondary}`
        }}
    >
        <AiOutlineLoading3Quarters
            size={27}
            color={primary}
            className="animate-spin"
        />

        <p
            className="text-xs opacity-45 mt-3"
            style={{ color: textColor }}
        >
            Loading assigned concerns...
        </p>
    </div>
)

const EmptyState = ({
    primary,
    secondary,
    textColor,
    reset
}) => (
    <div
        className="rounded-[22px] py-20 px-5 flex flex-col items-center text-center"
        style={{
            background: 'rgba(255,255,255,.96)',
            border: `1px solid ${secondary}`
        }}
    >
        <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
                background: `${primary}09`
            }}
        >
            <MdConfirmationNumber
                size={29}
                color={primary}
            />
        </div>

        <h3
            className="text-sm font-bold mt-4"
            style={{ color: textColor }}
        >
            No tickets found
        </h3>

        <p
            className="text-xs opacity-45 mt-1"
            style={{ color: textColor }}
        >
            No assigned concerns match your current
            filters.
        </p>

        <button
            type="button"
            onClick={reset}
            className="mt-4 px-4 py-2.5 rounded-xl text-xs font-semibold"
            style={{
                background: `${primary}0b`,
                color: primary
            }}
        >
            Clear All Filters
        </button>
    </div>
)
const FilterChip = ({
    label,
    onRemove,
    primary
}) => (
    <span
        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[9px] font-semibold"
        style={{
            color: primary,
            background: `${primary}09`,
            border: `1px solid ${primary}15`
        }}
    >
        {label}

        <button
            type="button"
            onClick={onRemove}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/[.05]"
            title="Remove filter"
        >
            <MdClose size={10} />
        </button>
    </span>
)
export default ExtensionWorkerTickets