import { useCallback, useEffect, useState } from 'react'
import { createWebSocketUrl } from '../../services/websocket'
import { useSelector } from 'react-redux'

import { useNavigate } from 'react-router-dom'

import { Bar } from 'react-chartjs-2'



import {

    Chart as ChartJS,

    CategoryScale,

    LinearScale,

    BarElement,

    Title,

    Tooltip,

    Legend,

} from 'chart.js'



import {

    MdPeople,

    MdMenuBook,

    MdConfirmationNumber,

    MdPending,

    MdCheckCircle,

    MdArrowForward,

    MdAssignment,

    MdAccessTime,

    MdTrendingUp,

    MdSettings,

    MdPerson,

    MdInbox,

    MdRefresh,

    MdChevronRight,

    MdOutlineForum,

    MdOutlineAgriculture,

} from 'react-icons/md'



import AdminLayout from '../../components/layout/AdminLayout'

import FarmerLayout from '../../components/layout/FarmerLayout'

import ExtensionWorkerLayout from '../../components/layout/ExtensionWorkerLayout'

import api from '../../services/api'



ChartJS.register(

    CategoryScale,

    LinearScale,

    BarElement,

    Title,

    Tooltip,

    Legend

)





const safeNumber = (value) => {

    const number = Number(value)

    return Number.isFinite(number) ? number : 0

}





const formatStatus = (status) => {

    const value = String(status || '').toLowerCase()



    if (value === 'ongoing') return 'In Progress'

    if (value === 'waiting_feedback') return 'Waiting for Feedback'

    if (value === 'resolved') return 'Resolved'

    if (value === 'pending') return 'Pending'



    return status || 'Pending'

}





const formatDate = (value) => {

    if (!value) return '—'



    const date = new Date(value)



    if (Number.isNaN(date.getTime())) {

        return '—'

    }



    return date.toLocaleDateString('en-PH', {

        month: 'short',

        day: 'numeric',

        year: 'numeric',

    })

}





const statusStyle = (status) => {

    const value = String(status || '').toLowerCase()



    if (value === 'resolved') {

        return {

            backgroundColor: '#dcfce7',

            color: '#166534',

        }

    }



    if (value === 'ongoing') {

        return {

            backgroundColor: '#dbeafe',

            color: '#1d4ed8',

        }

    }



    if (value === 'waiting_feedback') {

        return {

            backgroundColor: '#f3e8ff',

            color: '#7e22ce',

        }

    }



    return {

        backgroundColor: '#fef3c7',

        color: '#92400e',

    }

}





const priorityStyle = (priority) => {

    const value = String(priority || '').toLowerCase()



    if (value === 'high') {

        return {

            backgroundColor: '#fee2e2',

            color: '#b91c1c',

        }

    }



    if (value === 'medium') {

        return {

            backgroundColor: '#fef3c7',

            color: '#92400e',

        }

    }



    if (value === 'low') {

        return {

            backgroundColor: '#dcfce7',

            color: '#166534',

        }

    }



    return {

        backgroundColor: '#f1f5f9',

        color: '#64748b',

    }

}





const Avatar = ({ user }) => (

    <div

        className='flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold sm:h-20 sm:w-20 sm:text-2xl'

        style={{

            backgroundColor: 'rgba(255,255,255,.18)',

            border: '1px solid rgba(255,255,255,.25)',

            color: '#fff',

        }}

    >

        {user?.profilePicture ? (

            <img

                src={user.profilePicture}

                alt=''

                className='h-full w-full object-cover'

            />

        ) : (

            `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`

        )}

    </div>

)





const HeroBanner = ({

    user,

    badge,

    actionLabel,

    actionIcon: ActionIcon,

    actionPath,

    admin = false,

}) => {

    const theme = useSelector((state) => state.theme)

    const navigate = useNavigate()



    return (

        <div

            className='relative overflow-hidden rounded-[26px] border p-5 shadow-xl sm:p-7'

            style={{

                background: `

                    linear-gradient(

                        125deg,

                        ${theme.primaryColor || '#236b3c'} 0%,

                        ${theme.secondaryColor || '#4d8c48'} 100%

                    )

                `,

                borderColor: 'rgba(255,255,255,.16)',

            }}

        >

            <div

                className='absolute -right-16 -top-24 h-72 w-72 rounded-full'

                style={{

                    background:

                        'radial-gradient(circle, rgba(255,255,255,.15), transparent 68%)',

                }}

            />



            <div

                className='absolute -bottom-28 right-24 h-64 w-64 rounded-full'

                style={{

                    background:

                        'radial-gradient(circle, rgba(255,255,255,.08), transparent 70%)',

                }}

            />



            <div className='relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between'>

                <div className='flex items-center gap-4'>

                    <Avatar user={user} />



                    <div>

                        <p className='mb-1 text-sm font-medium text-white/70'>

                            {admin

                                ? 'Welcome back,'

                                : user?.role === 'farmer'

                                    ? 'Welcome,'

                                    : 'Welcome back,'}

                        </p>



                        <h1 className='text-2xl font-bold tracking-tight text-white sm:text-3xl'>

                            {user?.firstName} {user?.lastName}

                        </h1>



                        {admin && (

                            <p className='mt-1 max-w-xl text-sm text-white/70'>

                                Monitor agricultural concerns, personnel activity,

                                and AgriCare performance.

                            </p>

                        )}



                        {badge && (

                            <span className='mt-3 inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white'>

                                {badge}

                            </span>

                        )}

                    </div>

                </div>



                <button

                    onClick={() => navigate(actionPath)}

                    className='flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg'

                    style={{

                        color: theme.primaryColor || '#236b3c',

                    }}

                >

                    <ActionIcon size={18} />

                    {actionLabel}

                    <MdArrowForward size={17} />

                </button>

            </div>

        </div>

    )

}





const AdminMetricCard = ({

    icon: Icon,

    label,

    value,

    description,

    accent,

}) => (

    <div className='group relative overflow-hidden rounded-[22px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-lg'>

        <div

            className='absolute left-0 top-0 h-full w-1'

            style={{ backgroundColor: accent }}

        />



        <div className='flex items-start justify-between gap-4'>

            <div>

                <p className='text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400'>

                    {label}

                </p>



                <p className='mt-2 text-3xl font-bold tracking-tight text-slate-800'>

                    {value ?? 0}

                </p>



                <p className='mt-1 text-xs text-slate-500'>

                    {description}

                </p>

            </div>



            <div

                className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl'

                style={{

                    backgroundColor: `${accent}15`,

                    color: accent,

                }}

            >

                <Icon size={25} />

            </div>

        </div>

    </div>

)





const EmptyChart = () => (

    <div className='flex h-[255px] flex-col items-center justify-center px-5 text-center'>

        <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700'>

            <MdTrendingUp size={28} />

        </div>



        <h3 className='mt-4 font-semibold text-slate-700'>

            No ticket activity yet

        </h3>



        <p className='mt-1 max-w-sm text-sm leading-6 text-slate-400'>

            Ticket activity will appear here once farmers begin submitting

            agricultural concerns.

        </p>

    </div>

)





const AdminTicketChart = ({ stats, theme }) => {

    const data = [

        safeNumber(stats?.tickets?.today),

        safeNumber(stats?.tickets?.weekly),

        safeNumber(stats?.tickets?.monthly),

    ]



    const hasData = data.some((item) => item > 0)



    return (

        <section className='overflow-hidden rounded-[24px] border border-white/70 bg-white/90 shadow-sm backdrop-blur-xl'>

            <div className='flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'>

                <div>

                    <h2 className='text-lg font-bold text-slate-800'>

                        Ticket Activity

                    </h2>



                    <p className='mt-1 text-xs text-slate-400'>

                        Submitted concerns across the current period

                    </p>

                </div>



                <div className='flex items-center gap-2 text-xs font-semibold text-green-700'>

                    <span className='h-2 w-2 rounded-full bg-green-500' />

                    Live overview

                </div>

            </div>



            {hasData ? (

                <div className='h-[285px] p-5 sm:p-6'>

                    <Bar

                        data={{

                            labels: [

                                'Today',

                                'This Week',

                                'This Month',

                            ],

                            datasets: [

                                {

                                    label: 'Tickets',

                                    data,

                                    backgroundColor: [

                                        `${theme.primaryColor || '#236b3c'}dd`,

                                        `${theme.secondaryColor || '#4d8c48'}cc`,

                                        `${theme.primaryColor || '#236b3c'}88`,

                                    ],

                                    borderRadius: 10,

                                    borderSkipped: false,

                                    maxBarThickness: 62,

                                },

                            ],

                        }}

                        options={{

                            responsive: true,

                            maintainAspectRatio: false,



                            plugins: {

                                legend: {

                                    display: false,

                                },



                                tooltip: {

                                    displayColors: false,

                                    callbacks: {

                                        label: (context) =>

                                            `${context.raw} ticket${context.raw === 1 ? '' : 's'}`,

                                    },

                                },

                            },



                            scales: {

                                y: {

                                    beginAtZero: true,



                                    ticks: {

                                        precision: 0,

                                        color: '#94a3b8',

                                    },



                                    grid: {

                                        color: 'rgba(148,163,184,.12)',

                                    },



                                    border: {

                                        display: false,

                                    },

                                },



                                x: {

                                    ticks: {

                                        color: '#64748b',

                                        font: {

                                            weight: '600',

                                        },

                                    },



                                    grid: {

                                        display: false,

                                    },



                                    border: {

                                        display: false,

                                    },

                                },

                            },

                        }}

                    />

                </div>

            ) : (

                <EmptyChart />

            )}

        </section>

    )

}





const StatusRow = ({

    label,

    value,

    total,

    color,

}) => {

    const count = safeNumber(value)



    const percentage =

        total > 0

            ? Math.round((count / total) * 100)

            : 0



    return (

        <div>

            <div className='mb-2 flex items-center justify-between gap-3'>

                <div className='flex items-center gap-2.5'>

                    <span

                        className='h-2.5 w-2.5 rounded-full'

                        style={{ backgroundColor: color }}

                    />



                    <span className='text-sm font-medium text-slate-600'>

                        {label}

                    </span>

                </div>



                <span className='text-sm font-bold text-slate-800'>

                    {count}

                </span>

            </div>



            <div className='h-1.5 overflow-hidden rounded-full bg-slate-100'>

                <div

                    className='h-full rounded-full transition-all'

                    style={{

                        width: `${percentage}%`,

                        backgroundColor: color,

                    }}

                />

            </div>

        </div>

    )

}





const TicketStatusCard = ({ stats }) => {

    const total = safeNumber(stats?.tickets?.total)



    const resolved = safeNumber(

        stats?.tickets?.resolved

    )



    const resolutionRate =

        total > 0

            ? Math.round((resolved / total) * 100)

            : 0



    return (

        <section className='rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:p-6'>

            <div className='flex items-start justify-between'>

                <div>

                    <h2 className='text-lg font-bold text-slate-800'>

                        Ticket Status

                    </h2>



                    <p className='mt-1 text-xs text-slate-400'>

                        Current concern distribution

                    </p>

                </div>



                <div className='rounded-xl bg-green-50 p-2.5 text-green-700'>

                    <MdConfirmationNumber size={22} />

                </div>

            </div>



            <div className='mt-6 flex items-end gap-2'>

                <span className='text-4xl font-bold tracking-tight text-slate-800'>

                    {total}

                </span>



                <span className='pb-1 text-sm text-slate-400'>

                    total tickets

                </span>

            </div>



            <div className='mt-6 space-y-5'>

                <StatusRow

                    label='Pending'

                    value={stats?.tickets?.pending}

                    total={total}

                    color='#f59e0b'

                />



                <StatusRow

                    label='In Progress'

                    value={stats?.tickets?.ongoing}

                    total={total}

                    color='#3b82f6'

                />



                <StatusRow

                    label='Waiting for Feedback'

                    value={stats?.tickets?.waitingFeedback}

                    total={total}

                    color='#a855f7'

                />



                <StatusRow

                    label='Resolved'

                    value={stats?.tickets?.resolved}

                    total={total}

                    color='#22c55e'

                />

            </div>



            <div className='mt-6 rounded-2xl bg-slate-50 px-4 py-3'>

                <div className='flex items-center justify-between'>

                    <span className='text-xs font-medium text-slate-500'>

                        Resolution rate

                    </span>



                    <span className='text-sm font-bold text-green-700'>

                        {resolutionRate}%

                    </span>

                </div>

            </div>

        </section>

    )

}





const HighVolumeConcerns = ({ concerns }) => {

    const data = Array.isArray(concerns)

        ? concerns

        : []



    const maximum = Math.max(

        ...data.map((item) =>

            safeNumber(item.count)

        ),

        1

    )



    return (

        <section className='rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:p-6'>

            <div className='flex items-start justify-between gap-3'>

                <div>

                    <h2 className='text-lg font-bold text-slate-800'>

                        High Volume Concerns

                    </h2>



                    <p className='mt-1 text-xs text-slate-400'>

                        Most frequently submitted agricultural concerns

                    </p>

                </div>



                <div className='rounded-xl bg-amber-50 p-2.5 text-amber-600'>

                    <MdTrendingUp size={22} />

                </div>

            </div>



            {data.length === 0 ? (

                <div className='flex min-h-[245px] flex-col items-center justify-center text-center'>

                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700'>

                        <MdOutlineAgriculture size={25} />

                    </div>



                    <p className='mt-3 text-sm font-semibold text-slate-600'>

                        No concern trends yet

                    </p>



                    <p className='mt-1 max-w-xs text-xs leading-5 text-slate-400'>

                        Categories will be ranked here as farmers submit

                        tickets.

                    </p>

                </div>

            ) : (

                <div className='mt-6 space-y-5'>

                    {data.map((item, index) => {

                        const count =

                            safeNumber(item.count)



                        const width =

                            Math.max(

                                8,

                                (count / maximum) * 100

                            )



                        return (

                            <div

                                key={`${item.categoryName}-${item.subcategoryName}-${index}`}

                            >

                                <div className='flex items-start justify-between gap-4'>

                                    <div className='min-w-0'>

                                        <p className='truncate text-sm font-semibold text-slate-700'>

                                            {item.categoryName ||

                                                'Uncategorized'}

                                        </p>



                                        <p className='mt-0.5 truncate text-xs text-slate-400'>

                                            {item.subcategoryName ||

                                                'General concern'}

                                        </p>

                                    </div>



                                    <div className='flex shrink-0 items-center gap-2'>

                                        {item.priority && (

                                            <span

                                                className='rounded-full px-2 py-1 text-[10px] font-bold uppercase'

                                                style={priorityStyle(

                                                    item.priority

                                                )}

                                            >

                                                {item.priority}

                                            </span>

                                        )}



                                        <span className='text-sm font-bold text-slate-700'>

                                            {count}

                                        </span>

                                    </div>

                                </div>



                                <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100'>

                                    <div

                                        className='h-full rounded-full bg-green-600'

                                        style={{

                                            width: `${width}%`,

                                        }}

                                    />

                                </div>

                            </div>

                        )

                    })}

                </div>

            )}

        </section>

    )

}





const QuickActions = () => {

    const navigate = useNavigate()



    const actions = [

        {

            icon: MdConfirmationNumber,

            label: 'Manage Tickets',

            description: 'Review farmer concerns',

            path: '/admin/tickets',

        },

        {

            icon: MdMenuBook,

            label: 'Agrixa',

            description: 'Review AgriXa content',

            path: '/admin/knowledge-base',

        },

        {

            icon: MdPeople,

            label: 'Users & Access',

            description: 'Manage system users',

            path: '/admin/users',

        },

        {

            icon: MdSettings,

            label: 'Configuration',

            description: 'Categories and positions',

            path: '/admin/configuration',

        },

    ]



    return (

        <section className='rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:p-6'>

            <div>

                <h2 className='text-lg font-bold text-slate-800'>

                    Quick Actions

                </h2>



                <p className='mt-1 text-xs text-slate-400'>

                    Common administrative tasks

                </p>

            </div>



            <div className='mt-5 space-y-2'>

                {actions.map(

                    ({

                        icon: Icon,

                        label,

                        description,

                        path,

                    }) => (

                        <button

                            key={label}

                            type='button'

                            onClick={() => navigate(path)}

                            className='group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition hover:border-green-100 hover:bg-green-50/70'

                        >

                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 transition group-hover:bg-green-100'>

                                <Icon size={20} />

                            </div>



                            <div className='min-w-0 flex-1'>

                                <p className='text-sm font-semibold text-slate-700'>

                                    {label}

                                </p>



                                <p className='mt-0.5 truncate text-xs text-slate-400'>

                                    {description}

                                </p>

                            </div>



                            <MdChevronRight

                                className='text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-green-700'

                                size={20}

                            />

                        </button>

                    )

                )}

            </div>

        </section>

    )

}





const RecentTickets = ({ tickets }) => {

    const navigate = useNavigate()



    const data = Array.isArray(tickets)

        ? tickets

        : []



    return (

        <section className='overflow-hidden rounded-[24px] border border-white/70 bg-white/90 shadow-sm backdrop-blur-xl'>

            <div className='flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'>

                <div>

                    <h2 className='text-lg font-bold text-slate-800'>

                        Recent Tickets

                    </h2>



                    <p className='mt-1 text-xs text-slate-400'>

                        Latest concerns submitted through AgriCare

                    </p>

                </div>



                <button

                    type='button'

                    onClick={() =>

                        navigate('/admin/tickets')

                    }

                    className='flex w-fit items-center gap-1 text-sm font-semibold text-green-700 transition hover:gap-2'

                >

                    View all

                    <MdArrowForward size={17} />

                </button>

            </div>



            {data.length === 0 ? (

                <div className='flex min-h-[220px] flex-col items-center justify-center px-6 text-center'>

                    <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400'>

                        <MdInbox size={28} />

                    </div>



                    <p className='mt-4 text-sm font-semibold text-slate-600'>

                        No tickets submitted yet

                    </p>



                    <p className='mt-1 max-w-sm text-xs leading-5 text-slate-400'>

                        New farmer concerns will appear here automatically.

                    </p>

                </div>

            ) : (

                <>

                    <div className='hidden overflow-x-auto md:block'>

                        <table className='w-full'>

                            <thead>

                                <tr className='bg-slate-50/70 text-left'>

                                    <th className='px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400'>

                                        Ticket

                                    </th>



                                    <th className='px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400'>

                                        Concern

                                    </th>



                                    <th className='px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400'>

                                        Farmer

                                    </th>



                                    <th className='px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400'>

                                        Priority

                                    </th>



                                    <th className='px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400'>

                                        Status

                                    </th>



                                    <th className='px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400'>

                                        Date

                                    </th>

                                </tr>

                            </thead>



                            <tbody className='divide-y divide-slate-100'>

                                {data.map(

                                    (ticket, index) => (

                                        <tr

                                            key={

                                                ticket.id ||

                                                index

                                            }

                                            className='transition hover:bg-green-50/30'

                                        >

                                            <td className='px-6 py-4'>

                                                <span className='text-sm font-bold text-green-700'>

                                                    #

                                                    {String(

                                                        ticket.id ||

                                                        ''

                                                    ).slice(

                                                        0,

                                                        8

                                                    )}

                                                </span>

                                            </td>



                                            <td className='max-w-[280px] px-6 py-4'>

                                                <p className='truncate text-sm font-semibold text-slate-700'>

                                                    {ticket.title ||

                                                        ticket.categoryName ||

                                                        'Agricultural Concern'}

                                                </p>



                                                <p className='mt-0.5 truncate text-xs text-slate-400'>

                                                    {ticket.categoryName ||

                                                        'Uncategorized'}



                                                    {ticket.subcategoryName

                                                        ? ` / ${ticket.subcategoryName}`

                                                        : ''}

                                                </p>

                                            </td>



                                            <td className='px-6 py-4 text-sm text-slate-500'>

                                                {ticket.farmerName ||

                                                    '—'}

                                            </td>



                                            <td className='px-6 py-4'>

                                                <span

                                                    className='rounded-full px-2.5 py-1 text-[10px] font-bold uppercase'

                                                    style={priorityStyle(

                                                        ticket.priority

                                                    )}

                                                >

                                                    {ticket.priority ||

                                                        'Not set'}

                                                </span>

                                            </td>



                                            <td className='px-6 py-4'>

                                                <span

                                                    className='whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold'

                                                    style={statusStyle(

                                                        ticket.status

                                                    )}

                                                >

                                                    {formatStatus(

                                                        ticket.status

                                                    )}

                                                </span>

                                            </td>



                                            <td className='whitespace-nowrap px-6 py-4 text-xs text-slate-400'>

                                                {formatDate(

                                                    ticket.date

                                                )}

                                            </td>

                                        </tr>

                                    )

                                )}

                            </tbody>

                        </table>

                    </div>



                    <div className='divide-y divide-slate-100 md:hidden'>

                        {data.map(

                            (ticket, index) => (

                                <div

                                    key={

                                        ticket.id ||

                                        index

                                    }

                                    className='p-5'

                                >

                                    <div className='flex items-start justify-between gap-3'>

                                        <div className='min-w-0'>

                                            <p className='truncate text-sm font-bold text-slate-700'>

                                                {ticket.title ||

                                                    'Agricultural Concern'}

                                            </p>



                                            <p className='mt-1 text-xs text-slate-400'>

                                                {ticket.categoryName ||

                                                    'Uncategorized'}

                                            </p>

                                        </div>



                                        <span

                                            className='shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold'

                                            style={statusStyle(

                                                ticket.status

                                            )}

                                        >

                                            {formatStatus(

                                                ticket.status

                                            )}

                                        </span>

                                    </div>



                                    <div className='mt-3 flex items-center justify-between text-xs text-slate-400'>

                                        <span>

                                            {ticket.farmerName ||

                                                'Unknown farmer'}

                                        </span>



                                        <span>

                                            {formatDate(

                                                ticket.date

                                            )}

                                        </span>

                                    </div>

                                </div>

                            )

                        )}

                    </div>

                </>

            )}

        </section>

    )

}





const StatCards = ({ items }) => {

    const theme = useSelector(

        (state) => state.theme

    )



    return (

        <div

            className={`grid gap-4 ${

                items.length === 4

                    ? 'grid-cols-2 md:grid-cols-4'

                    : 'grid-cols-1 sm:grid-cols-3'

            }`}

        >

            {items.map(

                ({

                    icon: Icon,

                    label,

                    value,

                    color,

                }) => (

                    <div

                        key={label}

                        className='app-card relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg'

                        style={{

                            backgroundColor: '#fff',

                            border: `1px solid ${theme.secondaryColor}20`,

                        }}

                    >

                        <div className='flex items-center justify-between'>

                            <div>

                                <p

                                    className='mb-1 text-sm font-semibold opacity-50'

                                    style={{

                                        color: theme.textColor,

                                    }}

                                >

                                    {label}

                                </p>



                                <p

                                    className='text-3xl font-bold'

                                    style={{

                                        color: theme.textColor,

                                    }}

                                >

                                    {value ?? '...'}

                                </p>

                            </div>



                            <div

                                className='rounded-xl p-3'

                                style={{

                                    backgroundColor:

                                        color + '15',

                                }}

                            >

                                <Icon

                                    size={26}

                                    color={color}

                                />

                            </div>

                        </div>



                        <div

                            className='absolute bottom-0 left-0 h-1 w-full rounded-b-xl'

                            style={{

                                backgroundColor:

                                    color + '60',

                            }}

                        />

                    </div>

                )

            )}

        </div>

    )

}





const TicketChart = ({

    data,

    theme,

    title = 'Ticket Activity',

}) => (

    <div

        className='app-card p-5 sm:p-6'

        style={{

            height: '260px',

        }}

    >

        <Bar

            data={{

                labels: [

                    'Today',

                    'This Week',

                    'This Month',

                ],



                datasets: [

                    {

                        label: 'Tickets',

                        data,

                        backgroundColor: [

                            theme.primaryColor + 'cc',

                            theme.secondaryColor + 'cc',

                            theme.primaryColor + '88',

                        ],

                        borderRadius: 8,

                    },

                ],

            }}

            options={{

                responsive: true,

                maintainAspectRatio: false,



                plugins: {

                    legend: {

                        display: false,

                    },



                    title: {

                        display: true,

                        text: title,

                        color: theme.textColor,



                        font: {

                            size: 14,

                            weight: 'bold',

                        },

                    },

                },



                scales: {

                    y: {

                        beginAtZero: true,



                        ticks: {

                            color: theme.textColor,

                            precision: 0,

                        },



                        grid: {

                            color:

                                theme.textColor +

                                '10',

                        },

                    },



                    x: {

                        ticks: {

                            color: theme.textColor,

                        },



                        grid: {

                            display: false,

                        },

                    },

                },

            }}

        />

    </div>

)







const UserDashboardHero = ({ user, roleLabel, subtitle, theme }) => {
    const firstName = user?.firstName || 'User'
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

    return (
        <section
            className='relative overflow-hidden rounded-[28px] border border-white/20 px-6 py-7 shadow-xl sm:px-8 sm:py-8'
            style={{
                background: `linear-gradient(120deg, ${theme.primaryColor || '#236b3c'} 0%, ${theme.secondaryColor || '#4d8c48'} 58%, #8fbd8f 100%)`,
            }}
        >
            <div className='pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[38px] border-white/[0.06]' />
            <div className='pointer-events-none absolute -bottom-36 right-40 h-72 w-72 rounded-full bg-white/[0.05]' />

            <div className='relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
                <div className='flex items-center gap-5'>
                    <Avatar user={user} />
                    <div>
                        <p className='text-sm font-medium text-white/70'>{greeting},</p>
                        <h1 className='mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl'>{firstName}</h1>
                        <p className='mt-2 max-w-xl text-sm leading-6 text-white/75'>{subtitle}</p>
                        <span className='mt-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm'>
                            {roleLabel}
                        </span>
                    </div>
                </div>

                <div className='hidden rounded-3xl border border-white/10 bg-white/10 p-5 text-white backdrop-blur-sm lg:block'>
                    <MdOutlineAgriculture size={42} className='opacity-90' />
                </div>
            </div>
        </section>
    )
}

const UserMetricCard = ({ icon: Icon, label, value, description, color }) => (
    <div className='group relative overflow-hidden rounded-[22px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-lg'>
        <div className='absolute left-0 top-0 h-full w-1' style={{ backgroundColor: color }} />
        <div className='flex items-start justify-between gap-4'>
            <div>
                <p className='text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400'>{label}</p>
                <p className='mt-2 text-3xl font-bold tracking-tight text-slate-800'>{value ?? 0}</p>
                <p className='mt-1 text-xs text-slate-400'>{description}</p>
            </div>
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl' style={{ backgroundColor: `${color}15`, color }}>
                <Icon size={25} />
            </div>
        </div>
    </div>
)

const UserTicketActivity = ({ stats, theme, title = 'Ticket Activity', description = 'Your concern activity across the current period' }) => {
    const data = [safeNumber(stats?.today), safeNumber(stats?.weekly), safeNumber(stats?.monthly)]
    const hasData = data.some((item) => item > 0)

    return (
        <section className='overflow-hidden rounded-[24px] border border-white/70 bg-white/90 shadow-sm backdrop-blur-xl'>
            <div className='border-b border-slate-100 px-5 py-5 sm:px-6'>
                <div className='flex items-center justify-between gap-4'>
                    <div>
                        <h2 className='text-lg font-bold text-slate-800'>{title}</h2>
                        <p className='mt-1 text-xs text-slate-400'>{description}</p>
                    </div>
                    <div className='flex h-10 w-10 items-center justify-center rounded-xl' style={{ backgroundColor: `${theme.primaryColor || '#236b3c'}12`, color: theme.primaryColor || '#236b3c' }}>
                        <MdTrendingUp size={21} />
                    </div>
                </div>
            </div>

            {hasData ? (
                <div className='h-[270px] p-5 sm:p-6'>
                    <Bar
                        data={{
                            labels: ['Today', 'This Week', 'This Month'],
                            datasets: [{
                                label: 'Tickets',
                                data,
                                backgroundColor: [`${theme.primaryColor || '#236b3c'}dd`, `${theme.secondaryColor || '#4d8c48'}bb`, `${theme.primaryColor || '#236b3c'}77`],
                                borderRadius: 10,
                                borderSkipped: false,
                                maxBarThickness: 65,
                            }],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context) => `${context.raw} ticket${context.raw === 1 ? '' : 's'}` } } },
                            scales: {
                                y: { beginAtZero: true, ticks: { precision: 0, color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.12)' }, border: { display: false } },
                                x: { ticks: { color: '#64748b', font: { weight: '600' } }, grid: { display: false }, border: { display: false } },
                            },
                        }}
                    />
                </div>
            ) : (
                <div className='flex h-[270px] flex-col items-center justify-center px-6 text-center'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-2xl' style={{ backgroundColor: `${theme.primaryColor || '#236b3c'}10`, color: theme.primaryColor || '#236b3c' }}>
                        <MdTrendingUp size={27} />
                    </div>
                    <p className='mt-4 text-sm font-semibold text-slate-700'>No activity yet</p>
                    <p className='mt-1 max-w-sm text-xs leading-5 text-slate-400'>Your ticket activity will appear here once concerns are submitted.</p>
                </div>
            )}
        </section>
    )
}

const UserSupportOverview = ({ stats, title = 'Support Overview' }) => {
    const total = safeNumber(stats?.total)
    const pending = safeNumber(stats?.pending)
    const ongoing = safeNumber(stats?.ongoing)
    const waiting = safeNumber(stats?.waitingFeedback ?? stats?.waiting_feedback)
    const resolved = safeNumber(stats?.resolved)
    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    const rows = [
        { label: 'Pending', value: pending, color: '#f59e0b' },
        { label: 'In Progress', value: ongoing, color: '#3b82f6' },
        { label: 'Waiting for Feedback', value: waiting, color: '#a855f7' },
        { label: 'Resolved', value: resolved, color: '#22c55e' },
    ]

    return (
        <section className='rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:p-6'>
            <div className='flex items-start justify-between gap-4'>
                <div>
                    <h2 className='text-lg font-bold text-slate-800'>{title}</h2>
                    <p className='mt-1 text-xs text-slate-400'>Current status of your concerns</p>
                </div>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700'>
                    <MdConfirmationNumber size={21} />
                </div>
            </div>

            <div className='mt-6 flex items-end gap-2'>
                <span className='text-4xl font-bold tracking-tight text-slate-800'>{total}</span>
                <span className='pb-1 text-xs font-medium text-slate-400'>total tickets</span>
            </div>

            <div className='mt-7 space-y-5'>
                {rows.map((item) => {
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
                    return (
                        <div key={item.label}>
                            <div className='mb-2 flex items-center justify-between gap-4'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: item.color }} />
                                    <span className='text-sm font-medium text-slate-600'>{item.label}</span>
                                </div>
                                <span className='text-sm font-bold text-slate-800'>{item.value}</span>
                            </div>
                            <div className='h-1.5 overflow-hidden rounded-full bg-slate-100'>
                                <div className='h-full rounded-full transition-all' style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className='mt-7 rounded-2xl bg-green-50/70 px-4 py-3'>
                <div className='flex items-center justify-between gap-3'>
                    <span className='text-xs font-medium text-slate-500'>Resolution rate</span>
                    <span className='text-sm font-bold text-green-700'>{resolvedRate}%</span>
                </div>
            </div>
        </section>
    )
}


const Dashboard = () => {

    const theme = useSelector(

        (state) => state.theme

    )



    const { user } = useSelector(

        (state) => state.auth

    )



    const [stats, setStats] =

        useState(null)



    const [loading, setLoading] =

        useState(true)



    const [error, setError] =

        useState('')



    const navigate = useNavigate()



    const role = user?.role





    const fetchStats = useCallback(

        async () => {

            if (!role) {

                return

            }



            try {

                setError('')



                let response



                if (role === 'admin') {

                    response = await api.get(

                        '/dashboard/stats/'

                    )

                } else if (

                    role === 'farmer'

                ) {

                    response = await api.get(

                        '/dashboard/farmer-stats/'

                    )

                } else if (

                    role ===

                    'extension_worker'

                ) {

                    response = await api.get(

                        '/dashboard/worker-stats/'

                    )

                }



                if (response) {

                    setStats(response.data)

                }

            } catch (err) {

                console.error(

                    'Unable to load dashboard:',

                    err

                )



                setError(

                    'Unable to load dashboard statistics.'

                )

            } finally {

                setLoading(false)

            }

        },

        [role]

    )





    useEffect(() => {

        fetchStats()



        if (!role) {

            return

        }



        let ws



       try {
    ws = new WebSocket(
        createWebSocketUrl('/ws/admin-updates/')
    )

    ws.onmessage = () => {
        fetchStats()
    }

    ws.onerror = () => {
        /*
         * Real-time refresh is optional.
         * Dashboard HTTP data continues
         * working without WebSocket.
         */
    }
} catch (err) {
    console.warn(
        'Dashboard WebSocket unavailable.'
    )
}

return () => {
    if (
        ws &&
        (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
        )
    ) {
        ws.close()
    }
}
}, [fetchStats, role])


    const adminContent = (

        <div className='app-page flex flex-col gap-5 sm:gap-6'>

            <HeroBanner

                user={user}

                badge='Administrator'

                actionLabel='Manage Knowledge'

                actionIcon={MdMenuBook}

                actionPath='/admin/knowledge-base'

                admin

            />



            {error && (

                <div className='flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>

                    <p className='text-sm font-medium text-red-700'>

                        {error}

                    </p>



                    <button

                        type='button'

                        onClick={fetchStats}

                        className='flex w-fit items-center gap-1.5 text-sm font-bold text-red-700'

                    >

                        <MdRefresh size={18} />

                        Retry

                    </button>

                </div>

            )}



            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>

                <AdminMetricCard

                    icon={MdOutlineForum}

                    label='Open Tickets'

                    value={

                        loading

                            ? '...'

                            : safeNumber(

                                stats?.tickets

                                    ?.open

                            )

                    }

                    description='Concerns needing attention'

                    accent='#f59e0b'

                />



                <AdminMetricCard

                    icon={MdAccessTime}

                    label='In Progress'

                    value={

                        loading

                            ? '...'

                            : safeNumber(

                                stats?.tickets

                                    ?.ongoing

                            )

                    }

                    description='Currently being handled'

                    accent='#3b82f6'

                />



                <AdminMetricCard

                    icon={MdPeople}

                    label='Active Personnel'

                    value={

                        loading

                            ? '...'

                            : safeNumber(

                                stats?.workers

                                    ?.active

                            )

                    }

                    description={`${safeNumber(

                        stats?.workers

                            ?.inactive

                    )} inactive personnel`}

                    accent='#22c55e'

                />



                <AdminMetricCard

                    icon={MdMenuBook}

                    label='AgriXa Visits'

                    value={

                        loading

                            ? '...'

                            : safeNumber(

                                stats?.knowledgeRepositoryVisits

                            )

                    }

                    description='Knowledge repository usage'

                    accent={

                        theme.primaryColor ||

                        '#236b3c'

                    }

                />

            </div>



            <div className='grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]'>

                <AdminTicketChart

                    stats={stats}

                    theme={theme}

                />



                <TicketStatusCard

                    stats={stats}

                />

            </div>



            <div className='grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]'>

                <HighVolumeConcerns

                    concerns={

                        stats?.highVolumeConcerns

                    }

                />



                <QuickActions />

            </div>



            <RecentTickets

                tickets={stats?.recentTickets}

            />

        </div>

    )





    const extensionWorkerContent = (
        <div className='app-page flex flex-col gap-5 sm:gap-6'>
            <UserDashboardHero
                user={user}
                roleLabel={user?.positionName || 'Extension Worker'}
                subtitle='Manage assigned farmer concerns and keep track of the support you provide to the community.'
                theme={theme}
            />

            {error && (
                <div className='flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                    <p className='text-sm font-medium text-red-700'>{error}</p>
                    <button type='button' onClick={fetchStats} className='flex w-fit items-center gap-1.5 text-sm font-bold text-red-700'>
                        <MdRefresh size={18} /> Retry
                    </button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <UserMetricCard icon={MdConfirmationNumber} label='Assigned Concerns' value={loading ? '...' : stats?.total} description='Total tickets assigned to you' color={theme.primaryColor || '#236b3c'} />
                <UserMetricCard icon={MdPending} label='Awaiting Action' value={loading ? '...' : stats?.pending} description='Concerns that need your attention' color='#f59e0b' />
                <UserMetricCard icon={MdCheckCircle} label='Resolved' value={loading ? '...' : stats?.resolved} description='Concerns successfully completed' color='#22c55e' />
            </div>

            <div className='grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]'>
                <UserTicketActivity stats={stats} theme={theme} description='Assigned concern activity across the current period' />
                <UserSupportOverview stats={stats} title='Work Overview' />
            </div>
        </div>
    )

    const farmerContent = (
        <div className='app-page flex flex-col gap-5 sm:gap-6'>
            <UserDashboardHero
                user={user}
                roleLabel='Farmer'
                subtitle='Track your agricultural concerns and stay updated on the assistance provided by your LGU support team.'
                theme={theme}
            />

            {error && (
                <div className='flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                    <p className='text-sm font-medium text-red-700'>{error}</p>
                    <button type='button' onClick={fetchStats} className='flex w-fit items-center gap-1.5 text-sm font-bold text-red-700'>
                        <MdRefresh size={18} /> Retry
                    </button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <UserMetricCard icon={MdConfirmationNumber} label='Total Concerns' value={loading ? '...' : stats?.total} description='All concerns you have submitted' color={theme.primaryColor || '#236b3c'} />
                <UserMetricCard icon={MdPending} label='Awaiting Assistance' value={loading ? '...' : stats?.pending} description='Concerns waiting for assistance' color='#f59e0b' />
                <UserMetricCard icon={MdCheckCircle} label='Resolved Concerns' value={loading ? '...' : stats?.resolved} description='Concerns successfully resolved' color='#22c55e' />
            </div>

            <div className='grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]'>
                <UserTicketActivity stats={stats} theme={theme} />
                <UserSupportOverview stats={stats} />
            </div>
        </div>
    )

    if (user?.role === 'admin') {

        return (

            <AdminLayout>

                {adminContent}

            </AdminLayout>

        )

    }



    if (user?.role === 'farmer') {

        return (

            <FarmerLayout>

                {farmerContent}

            </FarmerLayout>

        )

    }



    if (

        user?.role ===

        'extension_worker'

    ) {

        return (

            <ExtensionWorkerLayout>

                {extensionWorkerContent}

            </ExtensionWorkerLayout>

        )

    }



    return null

}





export default Dashboard