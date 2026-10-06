import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { Bar } from 'react-chartjs-2'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'

import {
    MdSupportAgent,
    MdCheckCircle,
    MdCancel,
    MdDeleteForever,
    MdConfirmationNumber,
    MdPeople,
    MdMenuBook,
    MdArrowForward,
    MdBarChart,
    MdFileDownload,
    MdChevronLeft,
    MdChevronRight
} from 'react-icons/md'

import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import AdminLayout from '../../components/layout/AdminLayout'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import api from '../../services/api'


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
)


const exportCSV = (columns, rows, filename) => {
    const escape = value =>
        `"${String(value ?? '').replace(/"/g, '""')}"`

    const csv = [columns, ...rows]
        .map(row => row.map(escape).join(','))
        .join('\n')

    const blob = new Blob(
        ['\uFEFF', csv],
        {
            type: 'text/csv;charset=utf-8;'
        }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
}


const Reports = () => {
    const theme = useSelector(state => state.theme)

    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    const [dialog, setDialog] = useState(null)

    /* ------------------------------------------
       TICKETS
    ------------------------------------------ */

    const [selectedYear, setSelectedYear] = useState(
        new Date().getFullYear()
    )

    const [yearLoading, setYearLoading] = useState(false)


    /* ------------------------------------------
       FARMERS
    ------------------------------------------ */

    const [farmerYear, setFarmerYear] = useState(
        new Date().getFullYear()
    )

    const [farmerLoading, setFarmerLoading] = useState(false)


    /* ------------------------------------------
       AGRIXA VISITS
    ------------------------------------------ */

    const [visitsMode, setVisitsMode] = useState('weekly')

    const [visitsYear, setVisitsYear] = useState(
        new Date().getFullYear()
    )

    const [visitsWeekOffset, setVisitsWeekOffset] = useState(0)
    const [visitsWeekLabel, setVisitsWeekLabel] = useState('')
    const [visitsLoading, setVisitsLoading] = useState(false)


    /* ------------------------------------------
       EXTENSION WORKERS
    ------------------------------------------ */

    const [workerMode, setWorkerMode] = useState('weekly')

    const [workerYear, setWorkerYear] = useState(
        new Date().getFullYear()
    )

    const [weekOffset, setWeekOffset] = useState(0)
    const [workerWeekLabel, setWorkerWeekLabel] = useState('')
    const [workerLoading, setWorkerLoading] = useState(false)

    const [onlineWorkers, setOnlineWorkers] = useState(null)
    const [onlineLoading, setOnlineLoading] = useState(false)


    /* ==========================================
       MAIN REPORT DATA
    ========================================== */

    const fetchStats = () => {
        api.get('/dashboard/reports/')
            .then(res => {
                setStats(res.data)
                setLoading(false)
            })
            .catch(error => {
                console.error(
                    'Failed to load report statistics:',
                    error
                )

                setLoading(false)
            })
    }


    useEffect(() => {
        fetchStats()

        const wsProtocol =
            window.location.protocol === 'https:'
                ? 'wss:'
                : 'ws:'

        const ws = new WebSocket(
            `${wsProtocol}//${window.location.host}/ws/admin-updates/`
        )

        ws.onmessage = () => {
            fetchStats()
        }

        ws.onerror = () => {
            ws.close()
        }

        return () => {
            ws.close()
        }
    }, [])


    /* ==========================================
       CHART CONFIGURATION
    ========================================== */

    const chartOptions = () => ({
        responsive: true,

        maintainAspectRatio: false,

        interaction: {
            intersect: false,
            mode: 'index'
        },

        plugins: {
            legend: {
                display: false
            },

            tooltip: {
                displayColors: false,

                backgroundColor: '#17351f',

                titleColor: '#ffffff',

                bodyColor: '#ffffff',

                padding: 10,

                cornerRadius: 8
            }
        },

        scales: {
            y: {
                beginAtZero: true,

                ticks: {
                    color: '#78917d',

                    stepSize: 1,

                    precision: 0,

                    font: {
                        size: 10
                    }
                },

                grid: {
                    color: '#e9efe9'
                },

                border: {
                    display: false
                }
            },

            x: {
                ticks: {
                    color: '#78917d',

                    font: {
                        size: 10
                    }
                },

                grid: {
                    display: false
                },

                border: {
                    display: false
                }
            }
        }
    })


    /* ==========================================
       GENERIC MONTHLY DIALOG
    ========================================== */

    const openMonthlyDialog = (
        title,
        labels,
        data,
        colLabel,
        type = 'simple',
        availableYears = []
    ) => {
        setDialog({
            type,

            title,

            columns: [
                'Month',
                colLabel
            ],

            rows: (labels ?? [])
                .map((label, index) => [
                    label,
                    data?.[index] ?? 0
                ])
                .reverse(),

            availableYears
        })
    }


    /* ==========================================
       FARMER REPORT
    ========================================== */

    const handleFarmerYearChange = async year => {
        setFarmerYear(year)
        setFarmerLoading(true)

        try {
            const res = await api.get(
                `/dashboard/reports/farmers-by-month/?year=${year}`
            )

            setDialog(previous => ({
                ...previous,

                rows: res.data.labels
                    .map((label, index) => [
                        label,
                        res.data.data[index]
                    ])
                    .reverse()
            }))
        } catch (error) {
            console.error(
                'Failed to load farmer report:',
                error
            )
        } finally {
            setFarmerLoading(false)
        }
    }


    /* ==========================================
       AGRIXA VISITS
    ========================================== */

    const fetchVisitsLog = async (
        mode,
        year,
        offset
    ) => {
        setVisitsLoading(true)

        try {
            const params =
                mode === 'monthly'
                    ? `mode=monthly&year=${year}`
                    : `mode=weekly&year=${year}&week_offset=${offset}`

            const res = await api.get(
                `/dashboard/reports/visits-log/?${params}`
            )

            setDialog(previous => ({
                ...previous,

                rows: res.data.rows,

                weekLabel:
                    res.data.weekLabel ?? ''
            }))

            if (res.data.weekLabel) {
                setVisitsWeekLabel(
                    res.data.weekLabel
                )
            }
        } catch (error) {
            console.error(
                'Failed to load AgriXa visits:',
                error
            )
        } finally {
            setVisitsLoading(false)
        }
    }


    const openVisitsDialog = async () => {
        const initMode = 'weekly'

        const initYear =
            new Date().getFullYear()

        setVisitsMode(initMode)
        setVisitsYear(initYear)
        setVisitsWeekOffset(0)
        setVisitsLoading(true)

        try {
            const res = await api.get(
                `/dashboard/reports/visits-log/?mode=weekly&year=${initYear}&week_offset=0`
            )

            setVisitsWeekLabel(
                res.data.weekLabel ?? ''
            )

            setDialog({
                type: 'visits',

                title: 'AgriXa Engagement',

                columns: [
                    'Day / Month',
                    'Visits'
                ],

                rows: res.data.rows,

                weekLabel:
                    res.data.weekLabel ?? '',

                availableVisitYears:
                    stats?.availableVisitYears ??
                    [initYear]
            })
        } catch (error) {
            console.error(
                'Failed to open AgriXa report:',
                error
            )
        } finally {
            setVisitsLoading(false)
        }
    }


    const handleVisitsModeChange = mode => {
        setVisitsMode(mode)
        setVisitsWeekOffset(0)

        fetchVisitsLog(
            mode,
            visitsYear,
            0
        )
    }


    const handleVisitsYearChange = year => {
        setVisitsYear(year)
        setVisitsWeekOffset(0)

        fetchVisitsLog(
            visitsMode,
            year,
            0
        )
    }


    const handleVisitsWeekNav = direction => {
        const newOffset =
            visitsWeekOffset + direction

        setVisitsWeekOffset(newOffset)

        fetchVisitsLog(
            'weekly',
            visitsYear,
            newOffset
        )
    }


    /* ==========================================
       TICKET REPORT
    ========================================== */

    const openTicketsByPositionDialog = () => {
        const {
            months,
            positions,
            matrix
        } =
            stats?.ticketsByPosition ?? {
                months: [],
                positions: [],
                matrix: {}
            }

        setDialog({
            type: 'tickets',

            title: 'Ticket Activity',

            columns: [
                'Month',
                ...positions
            ],

            rows: months
                .map(month => [
                    month,

                    ...positions.map(
                        position =>
                            matrix[month]?.[position] ??
                            0
                    )
                ])
                .reverse(),

            availableYears:
                stats?.availableYears ?? []
        })
    }


    const handleYearChange = async year => {
        setSelectedYear(year)
        setYearLoading(true)

        try {
            const res = await api.get(
                `/dashboard/reports/tickets-by-position/?year=${year}`
            )

            const {
                months,
                positions,
                matrix
            } = res.data

            setDialog(previous => ({
                ...previous,

                columns: [
                    'Month',
                    ...positions
                ],

                rows: months
                    .map(month => [
                        month,

                        ...positions.map(
                            position =>
                                matrix[month]?.[position] ??
                                0
                        )
                    ])
                    .reverse()
            }))
        } catch (error) {
            console.error(
                'Failed to load ticket report:',
                error
            )
        } finally {
            setYearLoading(false)
        }
    }


    /* ==========================================
       WORKER REPORT
    ========================================== */

    const WORKER_COLUMNS = [
        'Day / Month',
        'Online',
        'Offline',
        'Deleted',
        'Total'
    ]


    const fetchWorkerLogs = async (
        mode,
        year,
        offset
    ) => {
        setWorkerLoading(true)

        try {
            const params =
                mode === 'monthly'
                    ? `mode=monthly&year=${year}`
                    : `mode=weekly&year=${year}&week_offset=${offset}`

            const res = await api.get(
                `/dashboard/reports/worker-logs/?${params}`
            )

            setDialog(previous => ({
                ...previous,

                rows: res.data.rows,

                weekLabel:
                    res.data.weekLabel ?? ''
            }))

            if (res.data.weekLabel) {
                setWorkerWeekLabel(
                    res.data.weekLabel
                )
            }
        } catch (error) {
            console.error(
                'Failed to load worker logs:',
                error
            )
        } finally {
            setWorkerLoading(false)
        }
    }


    const openWorkerDialog = async () => {
        const initMode = 'weekly'

        const initYear =
            new Date().getFullYear()

        const initOffset = 0

        setWorkerMode(initMode)
        setWorkerYear(initYear)
        setWeekOffset(initOffset)
        setWorkerLoading(true)

        try {
            const res = await api.get(
                `/dashboard/reports/worker-logs/?mode=weekly&year=${initYear}&week_offset=0`
            )

            setWorkerWeekLabel(
                res.data.weekLabel ?? ''
            )

            setDialog({
                type: 'workers',

                title: 'Extension Worker Activity',

                columns: WORKER_COLUMNS,

                rows: res.data.rows,

                weekLabel:
                    res.data.weekLabel ?? '',

                availableWorkerYears:
                    stats?.availableWorkerYears ??
                    [initYear]
            })
        } catch (error) {
            console.error(
                'Failed to open worker report:',
                error
            )
        } finally {
            setWorkerLoading(false)
        }
    }


    const handleWorkerModeChange = mode => {
        setWorkerMode(mode)
        setWeekOffset(0)

        fetchWorkerLogs(
            mode,
            workerYear,
            0
        )
    }


    const handleWorkerYearChange = year => {
        setWorkerYear(year)
        setWeekOffset(0)

        fetchWorkerLogs(
            workerMode,
            year,
            0
        )
    }


    const handleWeekNav = direction => {
        const newOffset =
            weekOffset + direction

        setWeekOffset(newOffset)

        fetchWorkerLogs(
            'weekly',
            workerYear,
            newOffset
        )
    }


    /* ==========================================
       ONLINE WORKERS
    ========================================== */

    const handleOnlineCardClick = async event => {
        event.stopPropagation()

        setOnlineLoading(true)
        setOnlineWorkers([])

        try {
            const res = await api.get(
                '/dashboard/reports/online-workers/'
            )

            setOnlineWorkers(
                res.data.workers
            )
        } catch (error) {
            console.error(
                'Failed to load online workers:',
                error
            )

            setOnlineWorkers([])
        } finally {
            setOnlineLoading(false)
        }
    }


    const workerInnerCards = [
        {
            label: 'Total E-Workers',

            value:
                stats?.workers?.total ??
                0,

            icon: MdSupportAgent,

            color:
                theme.primaryColor,

            onClick: null
        },

        {
            label: 'Online',

            value:
                stats?.workers?.active ??
                0,

            icon: MdCheckCircle,

            color: '#16a34a',

            onClick:
                handleOnlineCardClick
        },

        {
            label: 'Offline',

            value:
                stats?.workers?.inactive ??
                0,

            icon: MdCancel,

            color: '#ef4444',

            onClick: null
        },

        {
            label: 'Deleted',

            value:
                stats?.workers?.deleted ??
                0,

            icon: MdDeleteForever,

            color: '#6b7280',

            onClick: null
        }
    ]


    /* ==========================================
       SUMMARY VALUES
    ========================================== */

    const totalTickets =
        (stats?.tickets?.data ?? [])
            .reduce(
                (sum, value) =>
                    sum + Number(value || 0),
                0
            )


    const totalFarmers =
        (stats?.farmers?.data ?? [])
            .reduce(
                (sum, value) =>
                    sum + Number(value || 0),
                0
            )


    const totalVisits =
        (stats?.visits?.data ?? [])
            .reduce(
                (sum, value) =>
                    sum + Number(value || 0),
                0
            )


    /* ==========================================
       CLOSE REPORT
    ========================================== */

    const closeDialog = () => {
        setDialog(null)

        setSelectedYear(
            new Date().getFullYear()
        )

        setWeekOffset(0)

        setFarmerYear(
            new Date().getFullYear()
        )

        setVisitsWeekOffset(0)
    }


    /* ==========================================
       CSV FILE NAME
    ========================================== */

    const getCSVFilename = () => {
        if (!dialog) {
            return 'report.csv'
        }

        let suffix = ''

        if (dialog.type === 'tickets') {
            suffix = selectedYear
        }

        if (dialog.type === 'farmers') {
            suffix = farmerYear
        }

        if (dialog.type === 'workers') {
            suffix =
                workerMode === 'weekly'
                    ? workerWeekLabel
                        .replace(/\s/g, '_')
                    : workerYear
        }

        if (dialog.type === 'visits') {
            suffix =
                visitsMode === 'weekly'
                    ? visitsWeekLabel
                        .replace(/\s/g, '_')
                    : visitsYear
        }

        const title =
            dialog.title
                .replace(/\s+/g, '_')

        return suffix
            ? `${title}_${suffix}.csv`
            : `${title}.csv`
    }


    /* ==========================================
       PAGE
    ========================================== */

    return (
        <AdminLayout>

            <div className='app-page flex flex-col gap-5'>

                {/* HEADER */}
                <header className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>

                    <div>
                        <p
                            className='app-kicker'
                            style={{
                                color:
                                    theme.primaryColor
                            }}
                        >
                            ADMIN OVERVIEW
                        </p>

                        <h1
                            className='app-page-title'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            Reports & Analytics
                        </h1>

                        <p className='app-page-subtitle'>
                            Monitor ticket activity,
                            personnel availability,
                            farmer growth, and AgriXa
                            engagement at a glance.
                        </p>
                    </div>

                    <div
                        className='hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold'
                        style={{
                            backgroundColor:
                                '#ffffffcc',

                            border:
                                `1px solid ${theme.secondaryColor}`,

                            color:
                                theme.primaryColor
                        }}
                    >
                        <MdBarChart size={17} />

                        System Overview
                    </div>

                </header>


                {loading ? (

                    <div className='flex justify-center py-20'>

                        <AiOutlineLoading3Quarters
                            className='animate-spin'
                            size={28}
                            color={
                                theme.primaryColor
                            }
                        />

                    </div>

                ) : (

                    <>

                        {/* =========================
                            SUMMARY
                        ========================= */}

                        <div className='grid grid-cols-2 xl:grid-cols-4 gap-3'>

                            <ReportStat
                                icon={
                                    MdConfirmationNumber
                                }
                                label='Tickets'
                                value={totalTickets}
                                note='Recorded tickets'
                                color={
                                    theme.primaryColor
                                }
                                theme={theme}
                            />

                            <ReportStat
                                icon={MdPeople}
                                label='New Farmers'
                                value={totalFarmers}
                                note='Registered farmers'
                                color='#2563eb'
                                theme={theme}
                            />

                            <ReportStat
                                icon={
                                    MdSupportAgent
                                }
                                label='E-Workers'
                                value={
                                    stats?.workers
                                        ?.total ?? 0
                                }
                                note={
                                    `${stats?.workers?.active ?? 0} currently online`
                                }
                                color='#16a34a'
                                theme={theme}
                            />

                            <ReportStat
                                icon={MdMenuBook}
                                label='AgriXa Visits'
                                value={totalVisits}
                                note='Knowledge engagement'
                                color='#d97706'
                                theme={theme}
                            />

                        </div>


                        {/* =========================
                            REPORT CARDS
                        ========================= */}

                        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>

                            {/* TICKETS */}
                            <ReportCard
                                title='Ticket Activity'
                                subtitle='Monthly farmer concern volume'
                                icon={
                                    MdConfirmationNumber
                                }
                                color={
                                    theme.primaryColor
                                }
                                onClick={
                                    openTicketsByPositionDialog
                                }
                                theme={theme}
                            >

                                <div className='h-[225px]'>

                                    <Bar
                                        data={{
                                            labels:
                                                stats
                                                    ?.tickets
                                                    ?.labels ??
                                                [],

                                            datasets: [
                                                {
                                                    label:
                                                        'Tickets',

                                                    data:
                                                        stats
                                                            ?.tickets
                                                            ?.data ??
                                                        [],

                                                    backgroundColor:
                                                        `${theme.primaryColor}cc`,

                                                    hoverBackgroundColor:
                                                        theme.primaryColor,

                                                    borderRadius:
                                                        7,

                                                    borderSkipped:
                                                        false,

                                                    maxBarThickness:
                                                        52
                                                }
                                            ]
                                        }}

                                        options={
                                            chartOptions()
                                        }
                                    />

                                </div>

                            </ReportCard>


                            {/* FARMERS */}
                            <ReportCard
                                title='Farmer Registration'
                                subtitle='Monthly new farmer accounts'
                                icon={MdPeople}
                                color='#2563eb'
                                onClick={() =>
                                    openMonthlyDialog(
                                        'Monthly New Farmers',

                                        stats?.farmers
                                            ?.labels,

                                        stats?.farmers
                                            ?.data,

                                        'Farmers',

                                        'farmers',

                                        stats
                                            ?.availableFarmerYears ??
                                        []
                                    )
                                }
                                theme={theme}
                            >

                                <div className='h-[225px]'>

                                    <Bar
                                        data={{
                                            labels:
                                                stats
                                                    ?.farmers
                                                    ?.labels ??
                                                [],

                                            datasets: [
                                                {
                                                    label:
                                                        'Farmers',

                                                    data:
                                                        stats
                                                            ?.farmers
                                                            ?.data ??
                                                        [],

                                                    backgroundColor:
                                                        '#3b82f6cc',

                                                    hoverBackgroundColor:
                                                        '#2563eb',

                                                    borderRadius:
                                                        7,

                                                    borderSkipped:
                                                        false,

                                                    maxBarThickness:
                                                        52
                                                }
                                            ]
                                        }}

                                        options={
                                            chartOptions()
                                        }
                                    />

                                </div>

                            </ReportCard>


                            {/* EXTENSION WORKERS */}
                            <ReportCard
                                title='Extension Workers'
                                subtitle='Personnel availability and account status'
                                icon={
                                    MdSupportAgent
                                }
                                color='#16a34a'
                                onClick={
                                    openWorkerDialog
                                }
                                theme={theme}
                            >

                                <div className='grid grid-cols-2 gap-3 mt-1'>

                                    {workerInnerCards.map(
                                        card => (

                                            <div
                                                key={
                                                    card.label
                                                }

                                                onClick={
                                                    card.onClick ??
                                                    undefined
                                                }

                                                className={`
                                                    rounded-xl
                                                    p-4
                                                    transition-all
                                                    ${
                                                        card.onClick
                                                            ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm'
                                                            : ''
                                                    }
                                                `}

                                                style={{
                                                    backgroundColor:
                                                        `${card.color}0d`,

                                                    border:
                                                        `1px solid ${card.color}25`
                                                }}
                                            >

                                                <div className='flex items-start justify-between gap-3'>

                                                    <div>

                                                        <p
                                                            className='text-[11px] font-medium opacity-55'
                                                            style={{
                                                                color:
                                                                    theme.textColor
                                                            }}
                                                        >
                                                            {
                                                                card.label
                                                            }
                                                        </p>

                                                        <p
                                                            className='text-2xl font-bold mt-1'
                                                            style={{
                                                                color:
                                                                    theme.textColor
                                                            }}
                                                        >
                                                            {
                                                                card.value
                                                            }
                                                        </p>

                                                    </div>


                                                    <div
                                                        className='w-9 h-9 rounded-lg flex items-center justify-center'
                                                        style={{
                                                            backgroundColor:
                                                                `${card.color}15`
                                                        }}
                                                    >

                                                        <card.icon
                                                            size={
                                                                19
                                                            }
                                                            color={
                                                                card.color
                                                            }
                                                        />

                                                    </div>

                                                </div>

                                            </div>

                                        )
                                    )}

                                </div>


                                <div
                                    className='mt-4 pt-3 flex items-center justify-between'
                                    style={{
                                        borderTop:
                                            `1px solid ${theme.secondaryColor}45`
                                    }}
                                >

                                    <span
                                        className='text-[11px] opacity-45'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Click to view worker
                                        activity history
                                    </span>

                                    <MdArrowForward
                                        size={17}
                                        color={
                                            theme.primaryColor
                                        }
                                    />

                                </div>

                            </ReportCard>


                            {/* AGRIXA */}
                            <ReportCard
                                title='AgriXa Engagement'
                                subtitle='Monthly Knowledge Base visits'
                                icon={MdMenuBook}
                                color='#d97706'
                                onClick={
                                    openVisitsDialog
                                }
                                theme={theme}
                            >

                                <div className='h-[225px]'>

                                    <Bar
                                        data={{
                                            labels:
                                                stats
                                                    ?.visits
                                                    ?.labels ??
                                                [],

                                            datasets: [
                                                {
                                                    label:
                                                        'Visits',

                                                    data:
                                                        stats
                                                            ?.visits
                                                            ?.data ??
                                                        [],

                                                    backgroundColor:
                                                        '#f59e0bcc',

                                                    hoverBackgroundColor:
                                                        '#d97706',

                                                    borderRadius:
                                                        7,

                                                    borderSkipped:
                                                        false,

                                                    maxBarThickness:
                                                        52
                                                }
                                            ]
                                        }}

                                        options={
                                            chartOptions()
                                        }
                                    />

                                </div>

                            </ReportCard>

                        </div>

                    </>

                )}

            </div>


            {/* ======================================
                REPORT DETAILS DIALOG
            ====================================== */}

            <Dialog
                isOpen={!!dialog}

                onClose={closeDialog}

                title={
                    dialog?.title ?? ''
                }
            >

                {dialog && (

                    <div className='flex flex-col gap-4 w-full sm:w-[min(760px,90vw)]'>

                        {/* TOP TOOLBAR */}
                        <div className='flex items-center justify-between gap-3 flex-wrap'>

                            <div className='flex items-center gap-2 flex-wrap'>


                                {/* TICKET YEAR */}
                                {dialog.type === 'tickets' && (

                                    <select
                                        value={
                                            selectedYear
                                        }

                                        onChange={event =>
                                            handleYearChange(
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }

                                        className='text-sm border rounded-lg px-3 py-2 outline-none'

                                        style={{
                                            borderColor:
                                                theme.secondaryColor,

                                            color:
                                                theme.textColor,

                                            backgroundColor:
                                                '#fff'
                                        }}
                                    >

                                        {(
                                            dialog
                                                .availableYears
                                                ?.length
                                                ? dialog.availableYears
                                                : [
                                                    new Date()
                                                        .getFullYear()
                                                ]
                                        ).map(year => (

                                            <option
                                                key={year}
                                                value={year}
                                            >
                                                {year}
                                            </option>

                                        ))}

                                    </select>

                                )}


                                {/* FARMER YEAR */}
                                {dialog.type === 'farmers' && (

                                    <select
                                        value={
                                            farmerYear
                                        }

                                        onChange={event =>
                                            handleFarmerYearChange(
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }

                                        className='text-sm border rounded-lg px-3 py-2 outline-none'

                                        style={{
                                            borderColor:
                                                theme.secondaryColor,

                                            color:
                                                theme.textColor,

                                            backgroundColor:
                                                '#fff'
                                        }}
                                    >

                                        {(
                                            dialog
                                                .availableYears
                                                ?.length
                                                ? dialog.availableYears
                                                : [
                                                    new Date()
                                                        .getFullYear()
                                                ]
                                        ).map(year => (

                                            <option
                                                key={year}
                                                value={year}
                                            >
                                                {year}
                                            </option>

                                        ))}

                                    </select>

                                )}


                                {/* WORKER FILTERS */}
                                {dialog.type === 'workers' && (

                                    <>

                                        <ModeToggle
                                            value={
                                                workerMode
                                            }
                                            onChange={
                                                handleWorkerModeChange
                                            }
                                            theme={
                                                theme
                                            }
                                        />

                                        <select
                                            value={
                                                workerYear
                                            }

                                            onChange={event =>
                                                handleWorkerYearChange(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }

                                            className='text-sm border rounded-lg px-3 py-2 outline-none'

                                            style={{
                                                borderColor:
                                                    theme.secondaryColor,

                                                color:
                                                    theme.textColor,

                                                backgroundColor:
                                                    '#fff'
                                            }}
                                        >

                                            {(
                                                dialog
                                                    .availableWorkerYears
                                                    ?.length
                                                    ? dialog
                                                        .availableWorkerYears
                                                    : [
                                                        new Date()
                                                            .getFullYear()
                                                    ]
                                            ).map(year => (

                                                <option
                                                    key={
                                                        year
                                                    }
                                                    value={
                                                        year
                                                    }
                                                >
                                                    {year}
                                                </option>

                                            ))}

                                        </select>


                                        {workerMode ===
                                            'weekly' && (

                                            <WeekNavigator
                                                label={
                                                    workerWeekLabel
                                                }

                                                onPrevious={() =>
                                                    handleWeekNav(
                                                        -1
                                                    )
                                                }

                                                onNext={() =>
                                                    handleWeekNav(
                                                        1
                                                    )
                                                }

                                                theme={
                                                    theme
                                                }
                                            />

                                        )}

                                    </>

                                )}


                                {/* VISITS FILTERS */}
                                {dialog.type === 'visits' && (

                                    <>

                                        <ModeToggle
                                            value={
                                                visitsMode
                                            }

                                            onChange={
                                                handleVisitsModeChange
                                            }

                                            theme={
                                                theme
                                            }
                                        />

                                        <select
                                            value={
                                                visitsYear
                                            }

                                            onChange={event =>
                                                handleVisitsYearChange(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }

                                            className='text-sm border rounded-lg px-3 py-2 outline-none'

                                            style={{
                                                borderColor:
                                                    theme.secondaryColor,

                                                color:
                                                    theme.textColor,

                                                backgroundColor:
                                                    '#fff'
                                            }}
                                        >

                                            {(
                                                dialog
                                                    .availableVisitYears
                                                    ?.length
                                                    ? dialog
                                                        .availableVisitYears
                                                    : [
                                                        new Date()
                                                            .getFullYear()
                                                    ]
                                            ).map(year => (

                                                <option
                                                    key={
                                                        year
                                                    }
                                                    value={
                                                        year
                                                    }
                                                >
                                                    {year}
                                                </option>

                                            ))}

                                        </select>


                                        {visitsMode ===
                                            'weekly' && (

                                            <WeekNavigator
                                                label={
                                                    visitsWeekLabel
                                                }

                                                onPrevious={() =>
                                                    handleVisitsWeekNav(
                                                        -1
                                                    )
                                                }

                                                onNext={() =>
                                                    handleVisitsWeekNav(
                                                        1
                                                    )
                                                }

                                                theme={
                                                    theme
                                                }
                                            />

                                        )}

                                    </>

                                )}

                            </div>


                            {/* EXPORT */}
                            <Button
                                size='sm'
                                variant='outline'

                                onClick={() =>
                                    exportCSV(
                                        dialog.columns,
                                        dialog.rows,
                                        getCSVFilename()
                                    )
                                }
                            >
                                <span className='flex items-center gap-1.5'>
                                    <MdFileDownload
                                        size={16}
                                    />

                                    Export CSV
                                </span>
                            </Button>

                        </div>


                        {/* TABLE */}
                        <div
                            className='rounded-xl overflow-hidden'
                            style={{
                                border:
                                    `1px solid ${theme.secondaryColor}70`
                            }}
                        >

                            <div className='overflow-x-auto'>

                                {(
                                    yearLoading ||
                                    workerLoading ||
                                    farmerLoading ||
                                    visitsLoading
                                ) ? (

                                    <div className='flex justify-center py-12'>

                                        <AiOutlineLoading3Quarters
                                            className='animate-spin'
                                            size={22}
                                            color={
                                                theme.primaryColor
                                            }
                                        />

                                    </div>

                                ) : dialog.rows?.length ? (

                                    <table className='w-full text-sm border-collapse'>

                                        <thead
                                            style={{
                                                backgroundColor:
                                                    `${theme.primaryColor}08`
                                            }}
                                        >

                                            <tr>

                                                {dialog.columns.map(
                                                    column => (

                                                        <th
                                                            key={
                                                                column
                                                            }

                                                            className='text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap'

                                                            style={{
                                                                color:
                                                                    theme.textColor,

                                                                borderBottom:
                                                                    `1px solid ${theme.secondaryColor}60`
                                                            }}
                                                        >
                                                            {
                                                                column
                                                            }
                                                        </th>

                                                    )
                                                )}

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {dialog.rows.map(
                                                (
                                                    row,
                                                    rowIndex
                                                ) => (

                                                    <tr
                                                        key={
                                                            rowIndex
                                                        }

                                                        className='hover:bg-black/[0.02] transition-colors'
                                                    >

                                                        {row.map(
                                                            (
                                                                cell,
                                                                cellIndex
                                                            ) => (

                                                                <td
                                                                    key={
                                                                        cellIndex
                                                                    }

                                                                    className='py-3 px-4 whitespace-nowrap'

                                                                    style={{
                                                                        color:
                                                                            theme.textColor,

                                                                        borderBottom:
                                                                            rowIndex ===
                                                                            dialog.rows.length -
                                                                            1
                                                                                ? 'none'
                                                                                : `1px solid ${theme.secondaryColor}35`
                                                                    }}
                                                                >
                                                                    {
                                                                        cell
                                                                    }
                                                                </td>

                                                            )
                                                        )}

                                                    </tr>

                                                )
                                            )}

                                        </tbody>

                                    </table>

                                ) : (

                                    <div className='py-12 text-center'>

                                        <MdBarChart
                                            size={30}
                                            className='mx-auto opacity-20'
                                            color={
                                                theme.textColor
                                            }
                                        />

                                        <p
                                            className='text-sm opacity-45 mt-2'
                                            style={{
                                                color:
                                                    theme.textColor
                                            }}
                                        >
                                            No report data
                                            available.
                                        </p>

                                    </div>

                                )}

                            </div>

                        </div>


                        {/* FOOTER */}
                        <div className='flex items-center justify-between gap-3'>

                            <p
                                className='text-[10px] opacity-40'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {dialog.rows?.length ??
                                    0}{' '}
                                record
                                {(dialog.rows?.length ??
                                    0) !== 1
                                    ? 's'
                                    : ''}
                            </p>

                            <Button
                                size='sm'
                                variant='ghost'
                                onClick={
                                    closeDialog
                                }
                            >
                                Close
                            </Button>

                        </div>

                    </div>

                )}

            </Dialog>


            {/* ======================================
                ONLINE EXTENSION WORKERS
            ====================================== */}

            <Dialog
                isOpen={
                    onlineWorkers !== null
                }

                onClose={() =>
                    setOnlineWorkers(null)
                }

                title='Online Extension Workers'
            >

                <div className='flex flex-col gap-4 w-full sm:w-[min(430px,90vw)]'>

                    {onlineLoading ? (

                        <div className='flex justify-center py-10'>

                            <AiOutlineLoading3Quarters
                                className='animate-spin'
                                size={22}
                                color={
                                    theme.primaryColor
                                }
                            />

                        </div>

                    ) : onlineWorkers?.length ===
                        0 ? (

                        <div className='py-8 text-center'>

                            <MdSupportAgent
                                size={30}
                                className='mx-auto opacity-20'
                                color={
                                    theme.textColor
                                }
                            />

                            <p
                                className='text-sm opacity-45 mt-2'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                No Extension Workers
                                are currently online.
                            </p>

                        </div>

                    ) : (

                        <div className='flex flex-col gap-2'>

                            {onlineWorkers?.map(
                                worker => (

                                    <div
                                        key={
                                            worker.id
                                        }

                                        className='flex items-center justify-between gap-4 px-4 py-3 rounded-xl'

                                        style={{
                                            backgroundColor:
                                                '#22c55e0d',

                                            border:
                                                '1px solid #22c55e25'
                                        }}
                                    >

                                        <div className='flex items-center gap-3 min-w-0'>

                                            <div className='relative'>

                                                <div
                                                    className='w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold'
                                                    style={{
                                                        color:
                                                            '#15803d',

                                                        backgroundColor:
                                                            '#dcfce7'
                                                    }}
                                                >
                                                    {(
                                                        worker.name ||
                                                        'EW'
                                                    )
                                                        .split(
                                                            ' '
                                                        )
                                                        .map(
                                                            part =>
                                                                part[
                                                                    0
                                                                ]
                                                        )
                                                        .join(
                                                            ''
                                                        )
                                                        .slice(
                                                            0,
                                                            2
                                                        )
                                                        .toUpperCase()}
                                                </div>

                                                <span className='absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white' />

                                            </div>


                                            <div className='min-w-0'>

                                                <p
                                                    className='text-sm font-semibold truncate'
                                                    style={{
                                                        color:
                                                            theme.textColor
                                                    }}
                                                >
                                                    {
                                                        worker.name
                                                    }
                                                </p>

                                                <p
                                                    className='text-[10px] opacity-45 truncate'
                                                    style={{
                                                        color:
                                                            theme.textColor
                                                    }}
                                                >
                                                    {
                                                        worker.position
                                                    }
                                                </p>

                                            </div>

                                        </div>


                                        <span className='text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full'>
                                            Online
                                        </span>

                                    </div>

                                )
                            )}

                        </div>

                    )}


                    <div className='flex justify-end'>

                        <Button
                            size='sm'
                            variant='ghost'

                            onClick={() =>
                                setOnlineWorkers(
                                    null
                                )
                            }
                        >
                            Close
                        </Button>

                    </div>

                </div>

            </Dialog>

        </AdminLayout>
    )
}


/* ==========================================================
   SUMMARY STAT
========================================================== */

const ReportStat = ({
    icon: Icon,
    label,
    value,
    note,
    color,
    theme
}) => {

    return (

        <div
            className='app-card p-4 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md'

            style={{
                backgroundColor:
                    '#ffffff',

                border:
                    `1px solid ${theme.secondaryColor}`
            }}
        >

            <div
                className='w-11 h-11 rounded-xl flex items-center justify-center shrink-0'

                style={{
                    backgroundColor:
                        `${color}12`
                }}
            >
                <Icon
                    size={21}
                    color={color}
                />
            </div>


            <div className='min-w-0'>

                <p
                    className='text-[11px] font-semibold opacity-50'
                    style={{
                        color:
                            theme.textColor
                    }}
                >
                    {label}
                </p>

                <p
                    className='text-2xl font-bold leading-tight mt-0.5'
                    style={{
                        color:
                            theme.textColor
                    }}
                >
                    {value}
                </p>

                <p
                    className='text-[10px] opacity-40 truncate mt-0.5'
                    style={{
                        color:
                            theme.textColor
                    }}
                >
                    {note}
                </p>

            </div>

        </div>
    )
}


/* ==========================================================
   REPORT CARD
========================================================== */

const ReportCard = ({
    title,
    subtitle,
    icon: Icon,
    color,
    onClick,
    theme,
    children
}) => {

    return (

        <section
            onClick={onClick}

            className='app-card bg-white overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg'

            style={{
                border:
                    `1px solid ${theme.secondaryColor}`
            }}
        >

            <div className='p-5 pb-3'>

                <div className='flex items-start justify-between gap-4'>

                    <div className='flex items-center gap-3'>

                        <div
                            className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0'

                            style={{
                                backgroundColor:
                                    `${color}12`
                            }}
                        >
                            <Icon
                                size={20}
                                color={color}
                            />
                        </div>


                        <div>

                            <h2
                                className='text-sm font-bold'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {title}
                            </h2>

                            <p
                                className='text-[11px] opacity-45 mt-0.5'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {subtitle}
                            </p>

                        </div>

                    </div>


                    <div
                        className='flex items-center gap-1 text-[10px] font-semibold'
                        style={{
                            color
                        }}
                    >
                        Details

                        <MdArrowForward
                            size={14}
                        />
                    </div>

                </div>

            </div>


            <div className='px-5 pb-5'>
                {children}
            </div>

        </section>
    )
}


/* ==========================================================
   WEEKLY / MONTHLY TOGGLE
========================================================== */

const ModeToggle = ({
    value,
    onChange,
    theme
}) => {

    return (

        <div
            className='flex rounded-lg overflow-hidden border text-xs'

            style={{
                borderColor:
                    theme.secondaryColor
            }}
        >

            {[
                'weekly',
                'monthly'
            ].map(mode => (

                <button
                    key={mode}

                    type='button'

                    onClick={() =>
                        onChange(mode)
                    }

                    className='px-3 py-2 capitalize transition-colors'

                    style={{
                        backgroundColor:
                            value === mode
                                ? theme.primaryColor
                                : '#fff',

                        color:
                            value === mode
                                ? '#fff'
                                : theme.textColor
                    }}
                >
                    {mode}
                </button>

            ))}

        </div>
    )
}


/* ==========================================================
   WEEK NAVIGATION
========================================================== */

const WeekNavigator = ({
    label,
    onPrevious,
    onNext,
    theme
}) => {

    return (

        <div
            className='flex items-center gap-1'

            style={{
                color:
                    theme.textColor
            }}
        >

            <button
                type='button'

                onClick={
                    onPrevious
                }

                className='w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-black/[0.03]'

                style={{
                    borderColor:
                        theme.secondaryColor
                }}
            >
                <MdChevronLeft
                    size={18}
                />
            </button>


            <span className='px-2 text-[10px] opacity-55 whitespace-nowrap'>
                {label || 'Current Week'}
            </span>


            <button
                type='button'

                onClick={
                    onNext
                }

                className='w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-black/[0.03]'

                style={{
                    borderColor:
                        theme.secondaryColor
                }}
            >
                <MdChevronRight
                    size={18}
                />
            </button>

        </div>
    )
}


export default Reports