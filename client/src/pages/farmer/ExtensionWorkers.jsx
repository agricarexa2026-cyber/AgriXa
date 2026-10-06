import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
    MdSearch,
    MdSupportAgent,
    MdGroups,
    MdWorkOutline,
    MdLocationOn,
    MdInfoOutline,
    MdClose,
    MdPerson
} from 'react-icons/md'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import FarmerLayout from '../../components/layout/FarmerLayout'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import api from '../../services/api'

export default function FarmerExtensionWorkers() {
    const theme = useSelector(state => state.theme)

    const [workers, setWorkers] = useState([])
    const [positions, setPositions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)

    const primary = theme.primaryColor || '#438a49'
    const secondary = theme.secondaryColor || '#b8d8ba'
    const textColor = theme.textColor || '#173d1c'

    const fetchWorkers = () => {
        setLoading(true)

        api.get('/users/extension-workers/')
            .then(({ data }) => {
                setWorkers(
                    data.filter(
                        worker =>
                            !worker.isPending &&
                            worker.isActive !== false
                    )
                )

                setError('')
            })
            .catch(() => {
                setError('Personnel could not be loaded.')
            })
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchWorkers()

        api.get('/positions/')
            .then(({ data }) => {
                setPositions(data)
            })
            .catch(() => {})

        const protocol =
            window.location.protocol === 'https:' ? 'wss:' : 'ws:'

        const ws = new WebSocket(
            `${protocol}//${window.location.host}/ws/admin-updates/`
        )

        ws.onmessage = fetchWorkers

        ws.onerror = () => {
            ws.close()
        }

        return () => {
            ws.close()
        }
    }, [])

    const positionName = id =>
        positions.find(position => position.id === id)?.name ||
        'LGU Personnel'

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase()

        if (!keyword) return workers

        return workers.filter(worker => {
            const fullName =
                `${worker.firstName || ''} ${worker.lastName || ''}`

            const position = positionName(worker.positionId)

            return `${fullName} ${position}`
                .toLowerCase()
                .includes(keyword)
        })
    }, [workers, positions, search])

    const uniquePositions = useMemo(() => {
        return new Set(
            workers.map(worker => positionName(worker.positionId))
        ).size
    }, [workers, positions])

    const initials = worker => {
        const first = worker?.firstName?.[0] || ''
        const last = worker?.lastName?.[0] || ''

        return `${first}${last}`.toUpperCase() || 'LG'
    }

    return (
        <FarmerLayout>
            <div className='app-page flex flex-col gap-5'>

                {/* =====================================================
                    PAGE HEADER
                ===================================================== */}
                <section
                    className='overflow-hidden rounded-[24px] border bg-white'
                    style={{
                        borderColor: `${secondary}80`,
                        boxShadow:
                            '0 12px 35px rgba(25, 70, 35, 0.08)'
                    }}
                >
                    <div
                        className='relative overflow-hidden px-6 py-6 md:px-8 md:py-7'
                        style={{
                            background: `linear-gradient(
                                120deg,
                                ${primary},
                                ${primary}dd
                            )`
                        }}
                    >
                        {/* decorative circles */}
                        <div
                            className='pointer-events-none absolute -right-8 -top-16 h-44 w-44 rounded-full border-[22px] border-white/5'
                        />

                        <div
                            className='pointer-events-none absolute bottom-[-90px] right-[18%] h-48 w-48 rounded-full bg-white/[0.04]'
                        />

                        <div className='relative flex items-center justify-between gap-5'>
                            <div className='flex items-center gap-4'>
                                <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/15 text-white backdrop-blur-sm'>
                                    <MdSupportAgent size={29} />
                                </div>

                                <div>
                                    <p className='text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/70'>
                                        Your Local Support Team
                                    </p>

                                    <h1 className='mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl'>
                                        Extension Workers
                                    </h1>

                                    <p className='mt-2 max-w-2xl text-xs leading-5 text-white/80 md:text-sm'>
                                        Meet the LGU agricultural personnel
                                        available to assist farmers with crop,
                                        pest, disease, and other agricultural
                                        concerns.
                                    </p>
                                </div>
                            </div>

                            <div className='hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white md:flex'>
                                <MdGroups size={32} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================================
                    SUMMARY + SEARCH
                ===================================================== */}
                <section
                    className='rounded-[22px] border bg-white p-4 md:p-5'
                    style={{
                        borderColor: `${secondary}80`,
                        boxShadow:
                            '0 8px 26px rgba(25, 70, 35, 0.06)'
                    }}
                >
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-center'>

                        {/* SUMMARY */}
                        <div className='flex shrink-0 items-center gap-3'>
                            <div
                                className='flex h-11 w-11 items-center justify-center rounded-xl'
                                style={{
                                    backgroundColor: `${primary}10`,
                                    color: primary
                                }}
                            >
                                <MdGroups size={22} />
                            </div>

                            <div>
                                <p
                                    className='text-xl font-extrabold leading-none'
                                    style={{ color: textColor }}
                                >
                                    {workers.length}
                                </p>

                                <p className='mt-1 text-[10px] font-semibold text-slate-500'>
                                    Active Personnel
                                </p>
                            </div>

                            <div className='mx-2 hidden h-9 w-px bg-slate-200 sm:block' />

                            <div className='hidden sm:block'>
                                <p
                                    className='text-xl font-extrabold leading-none'
                                    style={{ color: textColor }}
                                >
                                    {uniquePositions}
                                </p>

                                <p className='mt-1 text-[10px] font-semibold text-slate-500'>
                                    Specializations
                                </p>
                            </div>
                        </div>

                        {/* SEARCH */}
                        <label className='relative min-w-0 flex-1 lg:ml-4'>
                            <span className='sr-only'>
                                Search personnel directory
                            </span>

                            <MdSearch
                                size={19}
                                className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                            />

                            <input
                                value={search}
                                onChange={event =>
                                    setSearch(event.target.value)
                                }
                                placeholder='Search personnel by name or position...'
                                className='h-12 w-full rounded-xl border bg-white pl-11 pr-11 text-sm outline-none transition focus:shadow-sm'
                                style={{
                                    borderColor: secondary,
                                    color: textColor
                                }}
                            />

                            {search && (
                                <button
                                    type='button'
                                    onClick={() => setSearch('')}
                                    className='absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
                                >
                                    <MdClose size={17} />
                                </button>
                            )}
                        </label>
                    </div>
                </section>

                {/* =====================================================
                    DIRECTORY HEADER
                ===================================================== */}
                <div className='flex items-end justify-between gap-4 px-1'>
                    <div>
                        <p
                            className='text-[10px] font-extrabold uppercase tracking-[0.18em]'
                            style={{ color: primary }}
                        >
                            Personnel Directory
                        </p>

                        <h2
                            className='mt-1 text-lg font-bold'
                            style={{ color: textColor }}
                        >
                            Meet your agricultural support team
                        </h2>

                        <p className='mt-1 text-xs text-slate-500'>
                            Select a personnel card to view more information.
                        </p>
                    </div>

                    {!loading && (
                        <div
                            className='hidden rounded-full px-3 py-1.5 text-[10px] font-bold sm:block'
                            style={{
                                backgroundColor: `${primary}0c`,
                                color: primary
                            }}
                        >
                            {filtered.length}{' '}
                            {filtered.length === 1
                                ? 'person'
                                : 'people'}
                        </div>
                    )}
                </div>

                {/* =====================================================
                    ERROR
                ===================================================== */}
                {error && (
                    <div className='flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3'>
                        <p className='text-xs font-medium text-red-700'>
                            {error}
                        </p>

                        <button
                            type='button'
                            onClick={fetchWorkers}
                            className='shrink-0 text-xs font-bold text-red-700 underline'
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* =====================================================
                    CONTENT
                ===================================================== */}
                {loading ? (
                    <div
                        className='flex min-h-[300px] flex-col items-center justify-center rounded-[22px] border bg-white'
                        style={{
                            borderColor: `${secondary}70`
                        }}
                    >
                        <AiOutlineLoading3Quarters
                            className='animate-spin'
                            size={28}
                            color={primary}
                        />

                        <p className='mt-3 text-xs font-medium text-slate-500'>
                            Loading personnel directory...
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        className='flex min-h-[300px] flex-col items-center justify-center rounded-[22px] border bg-white px-6 text-center'
                        style={{
                            borderColor: `${secondary}70`
                        }}
                    >
                        <div
                            className='flex h-16 w-16 items-center justify-center rounded-2xl'
                            style={{
                                backgroundColor: `${primary}0c`,
                                color: primary
                            }}
                        >
                            <MdSupportAgent size={32} />
                        </div>

                        <h3
                            className='mt-4 text-base font-bold'
                            style={{ color: textColor }}
                        >
                            No personnel found
                        </h3>

                        <p className='mt-1 max-w-sm text-xs leading-5 text-slate-500'>
                            We couldn't find any personnel matching
                            your search.
                        </p>

                        {search && (
                            <button
                                type='button'
                                onClick={() => setSearch('')}
                                className='mt-4 rounded-xl px-4 py-2 text-xs font-semibold'
                                style={{
                                    backgroundColor: `${primary}0c`,
                                    color: primary
                                }}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                        {filtered.map(worker => {
                            const position = positionName(
                                worker.positionId
                            )

                            return (
                                <button
                                    key={worker.id}
                                    type='button'
                                    onClick={() =>
                                        setSelected(worker)
                                    }
                                    className='group relative overflow-hidden rounded-[20px] border bg-white text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl'
                                    style={{
                                        borderColor: `${secondary}75`,
                                        boxShadow:
                                            '0 6px 20px rgba(25,70,35,.04)'
                                    }}
                                >
                                    {/* TOP ACCENT */}
                                    <div
                                        className='h-1 w-full'
                                        style={{
                                            backgroundColor: primary
                                        }}
                                    />

                                    <div className='p-5'>
                                        <div className='flex items-start gap-4'>

                                            {/* AVATAR */}
                                            <div className='relative shrink-0'>
                                                {worker.profilePicture ? (
                                                    <img
                                                        src={
                                                            worker.profilePicture
                                                        }
                                                        alt={`${worker.firstName || ''} ${worker.lastName || ''}`}
                                                        className='h-16 w-16 rounded-2xl object-cover ring-4 ring-slate-50'
                                                    />
                                                ) : (
                                                    <div
                                                        className='flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-extrabold text-white ring-4 ring-slate-50'
                                                        style={{
                                                            backgroundColor:
                                                                primary
                                                        }}
                                                    >
                                                        {initials(worker)}
                                                    </div>
                                                )}

                                                <span className='absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500'>
                                                    <span className='h-1.5 w-1.5 rounded-full bg-white' />
                                                </span>
                                            </div>

                                            {/* PERSON */}
                                            <div className='min-w-0 flex-1'>
                                                <p className='text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                                                    LGU Personnel
                                                </p>

                                                <h3
                                                    className='mt-1 truncate text-base font-bold'
                                                    style={{
                                                        color: textColor
                                                    }}
                                                >
                                                    {worker.firstName}{' '}
                                                    {worker.lastName}
                                                </h3>

                                                <div
                                                    className='mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold'
                                                    style={{
                                                        backgroundColor:
                                                            `${primary}0c`,
                                                        color: primary
                                                    }}
                                                >
                                                    <MdWorkOutline
                                                        size={12}
                                                    />

                                                    <span className='truncate'>
                                                        {position}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='my-4 h-px bg-slate-100' />

                                        <div className='flex items-center justify-between gap-3'>
                                            <div className='flex items-center gap-1.5 text-[10px] font-medium text-slate-500'>
                                                <MdLocationOn
                                                    size={14}
                                                    style={{
                                                        color: primary
                                                    }}
                                                />

                                                LGU Agricultural Office
                                            </div>

                                            <span
                                                className='flex items-center gap-1 text-[10px] font-bold'
                                                style={{
                                                    color: primary
                                                }}
                                            >
                                                <MdInfoOutline
                                                    size={14}
                                                />
                                                View Profile
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* =========================================================
                PERSONNEL PROFILE MODAL
            ========================================================= */}
            <Dialog
                isOpen={!!selected}
                onClose={() => setSelected(null)}
                title='Personnel Profile'
            >
                {selected && (
                    <div className='w-full max-w-md'>

                        {/* PROFILE */}
                        <div className='flex flex-col items-center text-center'>
                            <div className='relative'>
                                {selected.profilePicture ? (
                                    <img
                                        src={selected.profilePicture}
                                        alt={`${selected.firstName || ''} ${selected.lastName || ''}`}
                                        className='h-24 w-24 rounded-[24px] object-cover shadow-md'
                                    />
                                ) : (
                                    <div
                                        className='flex h-24 w-24 items-center justify-center rounded-[24px] text-2xl font-extrabold text-white shadow-md'
                                        style={{
                                            backgroundColor: primary
                                        }}
                                    >
                                        {initials(selected)}
                                    </div>
                                )}

                                <span className='absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-emerald-500'>
                                    <span className='h-2 w-2 rounded-full bg-white' />
                                </span>
                            </div>

                            <p className='mt-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400'>
                                LGU Agricultural Personnel
                            </p>

                            <h2
                                className='mt-1 text-xl font-extrabold'
                                style={{
                                    color: textColor
                                }}
                            >
                                {selected.firstName}{' '}
                                {selected.lastName}
                            </h2>

                            <span
                                className='mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold'
                                style={{
                                    backgroundColor: `${primary}0d`,
                                    color: primary
                                }}
                            >
                                <MdWorkOutline size={14} />

                                {positionName(
                                    selected.positionId
                                )}
                            </span>
                        </div>

                        {/* INFORMATION */}
                        <div
                            className='mt-6 rounded-2xl border p-4'
                            style={{
                                borderColor: `${secondary}70`,
                                backgroundColor: `${primary}025`
                            }}
                        >
                            <div className='flex items-start gap-3'>
                                <div
                                    className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'
                                    style={{
                                        backgroundColor:
                                            `${primary}0c`,
                                        color: primary
                                    }}
                                >
                                    <MdPerson size={18} />
                                </div>

                                <div>
                                    <p
                                        className='text-xs font-bold'
                                        style={{
                                            color: textColor
                                        }}
                                    >
                                        How this personnel can
                                        assist you
                                    </p>

                                    <p className='mt-1 text-[11px] leading-5 text-slate-500'>
                                        Submit a ticket and choose
                                        the category and subcategory
                                        that best matches your
                                        concern. AgriCare will
                                        automatically assign the
                                        appropriate LGU personnel.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className='mt-5 flex justify-end'>
                            <Button
                                onClick={() =>
                                    setSelected(null)
                                }
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>
        </FarmerLayout>
    )
}