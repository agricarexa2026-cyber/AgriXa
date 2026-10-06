import {
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react'

import { useSelector } from 'react-redux'

import {
    MdAgriculture,
    MdBadge,
    MdBlock,
    MdCheckCircle,
    MdDeleteOutline,
    MdEdit,
    MdEmail,
    MdGroups,
    MdLocationOn,
    MdMoreVert,
    MdOutlineCalendarMonth,
    MdOutlinePendingActions,
    MdPerson,
    MdPersonAddAlt1,
    MdPhone,
    MdSearch,
    MdVisibility,
    MdVisibilityOff
} from 'react-icons/md'

import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import AdminLayout from '../../components/layout/AdminLayout'
import Dialog from '../../components/ui/Dialog'
import Confirmation from '../../components/ui/Confirmation'
import api from '../../services/api'

const EMPTY_PERSON = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    mobileNumber: '',
    barangay: '',
    password: '',
    positionId: ''
}

const UsersAccess = () => {
    const theme = useSelector((state) => state.theme)

    const [farmers, setFarmers] = useState([])
    const [workers, setWorkers] = useState([])
    const [positions, setPositions] = useState([])

    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const [viewUser, setViewUser] = useState(null)

    const [editPerson, setEditPerson] = useState(null)
    const [personSaving, setPersonSaving] = useState(false)
    const [personError, setPersonError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [openMenu, setOpenMenu] = useState(null)

    const [approveConfirm, setApproveConfirm] = useState({
        open: false,
        id: null
    })

    const [toggleConfirm, setToggleConfirm] = useState({
        open: false,
        id: null,
        role: null,
        isActive: false
    })

    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
        role: null,
        name: ''
    })

    const fetchData = async () => {
        setLoading(true)

        try {
            const [
                farmerResponse,
                workerResponse,
                positionResponse
            ] = await Promise.all([
                api.get('/users/farmers/'),
                api.get('/users/extension-workers/'),
                api.get('/positions/')
            ])

            setFarmers(
                Array.isArray(farmerResponse.data)
                    ? farmerResponse.data
                    : []
            )

            setWorkers(
                Array.isArray(workerResponse.data)
                    ? workerResponse.data
                    : []
            )

            setPositions(
                Array.isArray(positionResponse.data)
                    ? positionResponse.data
                    : []
            )
        } catch (error) {
            console.error('Unable to load users:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const getPositionName = (positionId) => {
        if (!positionId) return '—'

        return (
            positions.find(
                (position) => position.id === positionId
            )?.name || '—'
        )
    }

    const normalizedUsers = useMemo(() => {
        const farmerUsers = farmers.map((farmer) => ({
            ...farmer,
            userType: 'farmer',
            roleLabel: 'Farmer',
            positionName: '—',
            isPending: false
        }))

        const personnelUsers = workers.map((worker) => ({
            ...worker,
            userType: 'personnel',
            roleLabel: 'Personnel',
            positionName: getPositionName(worker.positionId)
        }))

        return [
            ...farmerUsers,
            ...personnelUsers
        ]
    }, [farmers, workers, positions])

    const counts = useMemo(
        () => ({
            all: normalizedUsers.length,
            farmers: farmers.length,
            personnel: workers.filter(
                (worker) => !worker.isPending
            ).length,
            pending: workers.filter(
                (worker) => worker.isPending
            ).length
        }),
        [normalizedUsers, farmers, workers]
    )

    const filteredUsers = useMemo(() => {
        let list = normalizedUsers

        if (activeTab === 'farmers') {
            list = list.filter(
                (user) => user.userType === 'farmer'
            )
        }

        if (activeTab === 'personnel') {
            list = list.filter(
                (user) =>
                    user.userType === 'personnel' &&
                    !user.isPending
            )
        }

        if (activeTab === 'pending') {
            list = list.filter(
                (user) =>
                    user.userType === 'personnel' &&
                    user.isPending
            )
        }

        const term = search.trim().toLowerCase()

        if (!term) return list

        return list.filter((user) => {
            const searchable = [
                user.firstName,
                user.lastName,
                user.username,
                user.email,
                user.mobileNumber,
                user.barangay,
                user.positionName,
                user.roleLabel
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return searchable.includes(term)
        })
    }, [
        normalizedUsers,
        activeTab,
        search
    ])

    useEffect(() => {
        setPage(1)
    }, [activeTab, search, pageSize])

    const totalPages = Math.max(
        1,
        Math.ceil(filteredUsers.length / pageSize)
    )

    const paginatedUsers = filteredUsers.slice(
        (page - 1) * pageSize,
        page * pageSize
    )

    const statusLabel = (user) => {
        if (user.isPending) {
            return 'Pending Approval'
        }

        return user.isActive
            ? 'Active'
            : 'Inactive'
    }

    const statusClass = (user) => {
        if (user.isPending) {
            return `
                border-amber-200
                bg-amber-50
                text-amber-700
            `
        }

        if (user.isActive) {
            return `
                border-emerald-200
                bg-emerald-50
                text-emerald-700
            `
        }

        return `
            border-gray-200
            bg-gray-100
            text-gray-600
        `
    }

    const openAddPersonnel = () => {
        setPersonError('')
        setShowPassword(false)

        setEditPerson({
            ...EMPTY_PERSON
        })
    }

    const openEditPersonnel = (worker) => {
        setOpenMenu(null)
        setPersonError('')
        setShowPassword(false)

        setEditPerson({
            ...worker,
            password: ''
        })
    }

    const savePersonnel = async (event) => {
        event.preventDefault()

        setPersonSaving(true)
        setPersonError('')

        try {
            if (editPerson.id) {
                const payload = {
                    firstName: editPerson.firstName,
                    lastName: editPerson.lastName,
                    username: editPerson.username,
                    email: editPerson.email,
                    mobileNumber: editPerson.mobileNumber,
                    barangay: editPerson.barangay || '',
                    positionId: editPerson.positionId || ''
                }

                await api.patch(
                    `/users/extension-workers/${editPerson.id}/`,
                    payload
                )
            } else {
                await api.post(
                    '/users/extension-workers/',
                    editPerson
                )
            }

            setEditPerson(null)
            await fetchData()
        } catch (error) {
            setPersonError(
                error.response?.data?.error ||
                    'Unable to save personnel. Please try again.'
            )
        } finally {
            setPersonSaving(false)
        }
    }

    const handleApprove = async () => {
        try {
            await api.patch(
                `/users/extension-workers/${approveConfirm.id}/approve/`
            )

            setApproveConfirm({
                open: false,
                id: null
            })

            await fetchData()
        } catch (error) {
            console.error(
                'Unable to approve personnel:',
                error
            )

            setApproveConfirm({
                open: false,
                id: null
            })
        }
    }

    const handleToggleActive = async () => {
        const { id, role } = toggleConfirm

        try {
            if (role === 'farmer') {
                await api.patch(
                    `/users/farmers/${id}/toggle-active/`
                )
            } else {
                await api.patch(
                    `/users/extension-workers/${id}/toggle-active/`
                )
            }

            setToggleConfirm({
                open: false,
                id: null,
                role: null,
                isActive: false
            })

            await fetchData()
        } catch (error) {
            console.error(
                'Unable to update account:',
                error
            )

            setToggleConfirm({
                open: false,
                id: null,
                role: null,
                isActive: false
            })
        }
    }

    const handleDelete = async () => {
        const { id, role } = deleteConfirm

        try {
            if (role === 'farmer') {
                await api.delete(
                    `/users/farmers/${id}/`
                )
            } else {
                await api.delete(
                    `/users/extension-workers/${id}/`
                )
            }

            setDeleteConfirm({
                open: false,
                id: null,
                role: null,
                name: ''
            })

            await fetchData()
        } catch (error) {
            console.error(
                'Unable to delete account:',
                error
            )

            setDeleteConfirm({
                open: false,
                id: null,
                role: null,
                name: ''
            })
        }
    }

    const openView = (user) => {
        setOpenMenu(null)
        setViewUser(user)
    }

    const openToggle = (user) => {
        setOpenMenu(null)

        setToggleConfirm({
            open: true,
            id: user.id,
            role:
                user.userType === 'farmer'
                    ? 'farmer'
                    : 'personnel',
            isActive: user.isActive
        })
    }

    const openDelete = (user) => {
        setOpenMenu(null)

        setDeleteConfirm({
            open: true,
            id: user.id,
            role:
                user.userType === 'farmer'
                    ? 'farmer'
                    : 'personnel',
            name: `${user.firstName} ${user.lastName}`
        })
    }

    const tabs = [
        {
            key: 'all',
            label: 'All Users',
            count: counts.all
        },
        {
            key: 'farmers',
            label: 'Farmers',
            count: counts.farmers
        },
        {
            key: 'personnel',
            label: 'Personnel',
            count: counts.personnel
        },
        {
            key: 'pending',
            label: 'Pending Approval',
            count: counts.pending
        }
    ]

    return (
        <AdminLayout>
            <div className='flex flex-col gap-6'>

                {/* HERO */}
                <section
                    className='relative overflow-hidden rounded-[28px] border border-white/25 px-6 py-6 shadow-[0_20px_60px_rgba(21,68,32,0.12)] backdrop-blur-xl sm:px-8'
                    style={{
                        background:
                            'linear-gradient(120deg, rgba(255,255,255,0.92), rgba(250,255,248,0.80))'
                    }}
                >
                    <div className='absolute -right-20 -top-28 h-64 w-64 rounded-full bg-green-300/20 blur-3xl' />

                    <div className='relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
                        <div>
                            <div className='mb-2 flex items-center gap-2'>
                                <span className='flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-800'>
                                    <MdGroups size={16} />
                                </span>

                                <p className='text-[11px] font-extrabold uppercase tracking-[0.22em] text-green-700'>
                                    Admin Management
                                </p>
                            </div>

                            <h1 className='text-3xl font-extrabold tracking-tight text-green-950 sm:text-[34px]'>
                                Users & Access
                            </h1>

                            <p className='mt-2 max-w-2xl text-sm leading-6 text-gray-500'>
                                Manage farmers, personnel,
                                account approvals and access
                                permissions from one place.
                            </p>
                        </div>

                        <button
                            type='button'
                            onClick={openAddPersonnel}
                            className='inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-800 px-5 text-sm font-bold text-white shadow-lg shadow-green-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-900 hover:shadow-xl'
                        >
                            <MdPersonAddAlt1 size={20} />
                            Add Personnel
                        </button>
                    </div>
                </section>

                {/* SUMMARY */}
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                    <SummaryCard
                        label='Total Users'
                        value={counts.all}
                        icon={MdGroups}
                        description='All registered accounts'
                        iconClass='bg-green-100 text-green-800'
                    />

                    <SummaryCard
                        label='Farmers'
                        value={counts.farmers}
                        icon={MdAgriculture}
                        description='Registered farmers'
                        iconClass='bg-lime-100 text-lime-800'
                    />

                    <SummaryCard
                        label='Personnel'
                        value={counts.personnel}
                        icon={MdBadge}
                        description='Active LGU personnel'
                        iconClass='bg-emerald-100 text-emerald-800'
                    />

                    <SummaryCard
                        label='Pending Approval'
                        value={counts.pending}
                        icon={MdOutlinePendingActions}
                        description='Accounts awaiting review'
                        iconClass='bg-amber-100 text-amber-700'
                        valueClass={
                            counts.pending > 0
                                ? 'text-amber-600'
                                : 'text-green-800'
                        }
                    />
                </div>

                {/* USER TABLE */}
                <section className='overflow-visible rounded-[28px] border border-white/40 bg-white/90 shadow-[0_20px_60px_rgba(31,78,40,0.12)] backdrop-blur-xl'>

                    {/* TABS */}
                    <div className='border-b border-gray-100 px-4 pt-3 sm:px-6'>
                        <div className='flex gap-1 overflow-x-auto'>
                            {tabs.map((tab) => {
                                const active =
                                    activeTab === tab.key

                                return (
                                    <button
                                        key={tab.key}
                                        type='button'
                                        onClick={() =>
                                            setActiveTab(tab.key)
                                        }
                                        className={`
                                            relative
                                            flex shrink-0
                                            items-center gap-2
                                            rounded-t-xl
                                            px-4 py-3.5
                                            text-sm font-semibold
                                            transition-all
                                            ${
                                                active
                                                    ? 'text-green-800'
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                            }
                                        `}
                                    >
                                        {tab.label}

                                        <span
                                            className={`
                                                flex h-5 min-w-5
                                                items-center justify-center
                                                rounded-full px-1.5
                                                text-[10px] font-bold
                                                ${
                                                    active
                                                        ? 'bg-green-800 text-white'
                                                        : 'bg-gray-100 text-gray-500'
                                                }
                                            `}
                                        >
                                            {tab.count}
                                        </span>

                                        {active && (
                                            <span className='absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full bg-green-700' />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* SEARCH */}
                    <div className='flex flex-col gap-3 border-b border-gray-100 bg-white/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                        <div className='relative w-full sm:max-w-lg'>
                            <MdSearch
                                size={20}
                                className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400'
                            />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder='Search users, username, barangay or position...'
                                className='h-11 w-full rounded-xl border border-gray-200 bg-white/90 pl-11 pr-4 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-100/70'
                            />
                        </div>

                        <div className='flex items-center gap-2 text-sm text-gray-400'>
                            <MdGroups size={18} />

                            <span>
                                {filteredUsers.length}{' '}
                                record
                                {filteredUsers.length === 1
                                    ? ''
                                    : 's'}
                            </span>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className='overflow-x-auto'>
                        <table className='w-full min-w-[1000px] text-sm'>
                            <thead>
                                <tr className='bg-[#145b32]'>
                                    {[
                                        'User',
                                        'Role',
                                        'Barangay / Position',
                                        'Contact',
                                        'Status',
                                        'Registered',
                                        ''
                                    ].map((heading, index) => (
                                        <th
                                            key={`${heading}-${index}`}
                                            className={`px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/90 ${
                                                index === 6
                                                    ? 'w-[80px] text-center'
                                                    : ''
                                            }`}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className='divide-y divide-gray-100'>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className='py-20 text-center'
                                        >
                                            <div className='flex flex-col items-center gap-3 text-gray-400'>
                                                <AiOutlineLoading3Quarters className='animate-spin text-2xl text-green-700' />
                                                <span className='text-sm'>
                                                    Loading users...
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className='py-20'
                                        >
                                            <EmptyState
                                                search={search}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <UserRow
                                            key={`${user.userType}-${user.id}`}
                                            user={user}
                                            theme={theme}
                                            statusLabel={statusLabel}
                                            statusClass={statusClass}
                                            openMenu={openMenu}
                                            setOpenMenu={setOpenMenu}
                                            onView={() =>
                                                openView(user)
                                            }
                                            onEdit={() =>
                                                openEditPersonnel(user)
                                            }
                                            onApprove={() => {
                                                setOpenMenu(null)

                                                setApproveConfirm({
                                                    open: true,
                                                    id: user.id
                                                })
                                            }}
                                            onToggle={() =>
                                                openToggle(user)
                                            }
                                            onDelete={() =>
                                                openDelete(user)
                                            }
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    <div className='flex flex-col gap-3 border-t border-gray-100 bg-white/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-center gap-2 text-sm text-gray-500'>
                            <span>
                                Rows per page:
                            </span>

                            <select
                                value={pageSize}
                                onChange={(event) =>
                                    setPageSize(
                                        Number(event.target.value)
                                    )
                                }
                                className='rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-medium outline-none focus:border-green-500'
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <div className='flex items-center gap-2 text-sm'>
                            <span className='mr-2 text-gray-400'>
                                {filteredUsers.length === 0
                                    ? '0'
                                    : `${
                                          (page - 1) *
                                              pageSize +
                                          1
                                      }–${Math.min(
                                          page * pageSize,
                                          filteredUsers.length
                                      )}`}{' '}
                                of {filteredUsers.length}
                            </span>

                            <PaginationButton
                                disabled={page === 1}
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(
                                            1,
                                            current - 1
                                        )
                                    )
                                }
                            >
                                ‹
                            </PaginationButton>

                            <span className='min-w-[58px] text-center font-semibold text-gray-600'>
                                {page} / {totalPages}
                            </span>

                            <PaginationButton
                                disabled={
                                    page === totalPages
                                }
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(
                                            totalPages,
                                            current + 1
                                        )
                                    )
                                }
                            >
                                ›
                            </PaginationButton>
                        </div>
                    </div>
                </section>
            </div>

            {/* USER DETAILS */}
            <Dialog
                isOpen={!!viewUser}
                onClose={() =>
                    setViewUser(null)
                }
                title='User Details'
            >
                {viewUser && (
                    <div className='w-full sm:min-w-[480px]'>
                        <div className='relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-lime-50 p-6'>
                            <div className='absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-200/30 blur-2xl' />

                            <div className='relative flex flex-col items-center text-center'>
                                <Avatar
                                    user={viewUser}
                                    theme={theme}
                                    large
                                />

                                <h3 className='mt-4 text-xl font-extrabold text-gray-900'>
                                    {viewUser.firstName}{' '}
                                    {viewUser.lastName}
                                </h3>

                                <p className='mt-0.5 text-sm text-gray-400'>
                                    @{viewUser.username}
                                </p>

                                <span
                                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                                        viewUser
                                    )}`}
                                >
                                    <span className='h-1.5 w-1.5 rounded-full bg-current' />
                                    {statusLabel(viewUser)}
                                </span>
                            </div>
                        </div>

                        <div className='mt-5 grid gap-3 sm:grid-cols-2'>
                            <InfoCard
                                icon={MdPerson}
                                label='Role'
                                value={viewUser.roleLabel}
                            />

                            <InfoCard
                                icon={
                                    viewUser.userType ===
                                    'farmer'
                                        ? MdLocationOn
                                        : MdBadge
                                }
                                label={
                                    viewUser.userType ===
                                    'farmer'
                                        ? 'Barangay'
                                        : 'Position'
                                }
                                value={
                                    viewUser.userType ===
                                    'farmer'
                                        ? viewUser.barangay
                                        : viewUser.positionName
                                }
                            />

                            <InfoCard
                                icon={MdPhone}
                                label='Mobile Number'
                                value={viewUser.mobileNumber}
                            />

                            <InfoCard
                                icon={MdEmail}
                                label='Email Address'
                                value={viewUser.email}
                            />

                            <InfoCard
                                icon={MdOutlineCalendarMonth}
                                label='Registered'
                                value={
                                    viewUser.date
                                        ? new Date(
                                              viewUser.date
                                          ).toLocaleDateString(
                                              undefined,
                                              {
                                                  year: 'numeric',
                                                  month: 'long',
                                                  day: 'numeric'
                                              }
                                          )
                                        : '—'
                                }
                                full
                            />
                        </div>

                        <div className='mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4'>
                            <button
                                type='button'
                                onClick={() =>
                                    setViewUser(null)
                                }
                                className='rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50'
                            >
                                Close
                            </button>

                            {viewUser.userType ===
                                'personnel' && (
                                <button
                                    type='button'
                                    onClick={() => {
                                        const user =
                                            viewUser

                                        setViewUser(null)
                                        openEditPersonnel(user)
                                    }}
                                    className='inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900'
                                >
                                    <MdEdit />
                                    Edit Personnel
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            {/* ADD / EDIT PERSONNEL */}
            <Dialog
                isOpen={!!editPerson}
                onClose={() => {
                    if (!personSaving) {
                        setEditPerson(null)
                    }
                }}
                title={
                    editPerson?.id
                        ? 'Edit Personnel'
                        : 'Add Personnel'
                }
                subtitle={
                    editPerson?.id
                        ? 'Update account details and personnel assignment.'
                        : 'Create an account for a member of your LGU agriculture team.'
                }
                icon={
                    editPerson?.id
                        ? MdEdit
                        : MdPersonAddAlt1
                }
                width='max-w-[720px]'
            >
                {editPerson && (
                    <form
                        onSubmit={savePersonnel}
                        className='w-full'
                    >
                        {/* INTRO */}
                        <div className='relative mb-7 overflow-hidden rounded-[20px] border border-green-100 bg-gradient-to-r from-[#f0f9f0] via-[#f7fcf5] to-[#f3fae9] p-4'>
                            <div className='absolute -right-8 -top-10 h-28 w-28 rounded-full bg-green-200/40 blur-2xl' />

                            <div className='relative flex items-center gap-4'>
                                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#176b38] text-white shadow-lg shadow-green-900/15'>
                                    {editPerson.id ? (
                                        <MdEdit size={22} />
                                    ) : (
                                        <MdPersonAddAlt1
                                            size={23}
                                        />
                                    )}
                                </div>

                                <div>
                                    <p className='text-sm font-extrabold text-green-950'>
                                        {editPerson.id
                                            ? 'Personnel account'
                                            : 'New personnel account'}
                                    </p>

                                    <p className='mt-1 text-xs leading-5 text-green-900/60'>
                                        {editPerson.id
                                            ? 'Update the account information and LGU assignment below.'
                                            : 'The personnel will use this account to access AgriCare and handle assigned concerns.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* PERSONAL */}
                        <FormGroupHeader
                            icon={MdPerson}
                            title='Personal Information'
                            description='Basic information about the personnel.'
                        />

                        <div className='grid gap-4 sm:grid-cols-2'>
                            <ModernField
                                label='First Name'
                                icon={MdPerson}
                                value={
                                    editPerson.firstName
                                }
                                onChange={(value) =>
                                    setEditPerson({
                                        ...editPerson,
                                        firstName: value
                                    })
                                }
                                placeholder='e.g. Juan'
                            />

                            <ModernField
                                label='Last Name'
                                icon={MdPerson}
                                value={
                                    editPerson.lastName
                                }
                                onChange={(value) =>
                                    setEditPerson({
                                        ...editPerson,
                                        lastName: value
                                    })
                                }
                                placeholder='e.g. Dela Cruz'
                            />
                        </div>

                        {/* ACCOUNT */}
                        <FormGroupHeader
                            icon={MdBadge}
                            title='Account & Assignment'
                            description='Login credentials, contact details and LGU assignment.'
                            className='mt-7'
                        />

                        <div className='grid gap-4 sm:grid-cols-2'>
                            <ModernField
                                label='Username'
                                icon={MdPerson}
                                value={
                                    editPerson.username
                                }
                                onChange={(value) =>
                                    setEditPerson({
                                        ...editPerson,
                                        username: value
                                    })
                                }
                                placeholder='e.g. juandelacruz'
                            />

                            <ModernField
                                label='Email Address'
                                icon={MdEmail}
                                type='email'
                                value={
                                    editPerson.email
                                }
                                onChange={(value) =>
                                    setEditPerson({
                                        ...editPerson,
                                        email: value
                                    })
                                }
                                placeholder='name@email.com'
                            />

                            <ModernField
                                label='Mobile Number'
                                icon={MdPhone}
                                value={
                                    editPerson.mobileNumber
                                }
                                onChange={(value) =>
                                    setEditPerson({
                                        ...editPerson,
                                        mobileNumber:
                                            value
                                    })
                                }
                                placeholder='09XXXXXXXXX'
                            />

                            {/* POSITION */}
                            <label className='block'>
                                <FieldLabel
                                    label='Position'
                                />

                                <div className='group relative'>
                                    <div className='pointer-events-none absolute left-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-green-50 text-green-700 transition group-focus-within:bg-green-100'>
                                        <MdBadge size={16} />
                                    </div>

                                    <select
                                        required
                                        value={
                                            editPerson.positionId ||
                                            ''
                                        }
                                        onChange={(event) =>
                                            setEditPerson({
                                                ...editPerson,
                                                positionId:
                                                    event
                                                        .target
                                                        .value
                                            })
                                        }
                                        className='h-[50px] w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/60 pl-[54px] pr-10 text-sm font-medium text-gray-700 outline-none transition-all hover:border-gray-300 hover:bg-white focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100/70'
                                    >
                                        <option value=''>
                                            Select position
                                        </option>

                                        {positions
                                            .filter(
                                                (
                                                    position
                                                ) =>
                                                    position.isActive !==
                                                    false
                                            )
                                            .map(
                                                (
                                                    position
                                                ) => (
                                                    <option
                                                        key={
                                                            position.id
                                                        }
                                                        value={
                                                            position.id
                                                        }
                                                    >
                                                        {
                                                            position.name
                                                        }
                                                    </option>
                                                )
                                            )}
                                    </select>

                                    <svg
                                        viewBox='0 0 20 20'
                                        fill='currentColor'
                                        className='pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
                                    >
                                        <path
                                            fillRule='evenodd'
                                            d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z'
                                            clipRule='evenodd'
                                        />
                                    </svg>
                                </div>
                            </label>

                            {/* BARANGAY */}
                            <div className='sm:col-span-2'>
                                <ModernField
                                    label='Barangay'
                                    icon={MdLocationOn}
                                    required={false}
                                    optional
                                    value={
                                        editPerson.barangay
                                    }
                                    onChange={(value) =>
                                        setEditPerson({
                                            ...editPerson,
                                            barangay: value
                                        })
                                    }
                                    placeholder='Enter barangay'
                                />
                            </div>

                            {/* PASSWORD */}
                            {!editPerson.id && (
                                <div className='sm:col-span-2'>
                                    <label className='block'>
                                        <div className='mb-2 flex items-center justify-between gap-3'>
                                            <FieldLabel
                                                label='Initial Password'
                                                noMargin
                                            />

                                            <span className='text-[10px] font-semibold text-gray-400'>
                                                Minimum 8 characters
                                            </span>
                                        </div>

                                        <div className='group relative'>
                                            <div className='pointer-events-none absolute left-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-green-50 text-green-700 transition group-focus-within:bg-green-100'>
                                                <MdBadge
                                                    size={16}
                                                />
                                            </div>

                                            <input
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                required
                                                minLength={8}
                                                value={
                                                    editPerson.password ||
                                                    ''
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditPerson(
                                                        {
                                                            ...editPerson,
                                                            password:
                                                                event
                                                                    .target
                                                                    .value
                                                        }
                                                    )
                                                }
                                                placeholder='Create initial password'
                                                className='h-[50px] w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-[54px] pr-12 text-sm font-medium text-gray-700 outline-none transition-all placeholder:font-normal placeholder:text-gray-300 hover:border-gray-300 hover:bg-white focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100/70'
                                            />

                                            <button
                                                type='button'
                                                onClick={() =>
                                                    setShowPassword(
                                                        (
                                                            current
                                                        ) =>
                                                            !current
                                                    )
                                                }
                                                className='absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-green-50 hover:text-green-700'
                                            >
                                                {showPassword ? (
                                                    <MdVisibilityOff
                                                        size={
                                                            19
                                                        }
                                                    />
                                                ) : (
                                                    <MdVisibility
                                                        size={
                                                            19
                                                        }
                                                    />
                                                )}
                                            </button>
                                        </div>

                                        <div className='mt-2 flex items-center gap-1.5 text-[11px] text-gray-400'>
                                            <MdCheckCircle
                                                size={13}
                                                className='text-green-600'
                                            />

                                            Personnel can change
                                            this password after
                                            signing in.
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* ERROR */}
                        {personError && (
                            <div className='mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3'>
                                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500' />

                                <p className='text-xs font-medium leading-5 text-red-700'>
                                    {personError}
                                </p>
                            </div>
                        )}

                        {/* ACTIONS */}
                        <div className='mt-7 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between'>
                            <p className='hidden text-[11px] text-gray-400 sm:block'>
                                <span className='text-red-400'>
                                    *
                                </span>{' '}
                                Required fields
                            </p>

                            <div className='flex gap-2'>
                                <button
                                    type='button'
                                    disabled={
                                        personSaving
                                    }
                                    onClick={() =>
                                        setEditPerson(
                                            null
                                        )
                                    }
                                    className='h-11 flex-1 rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 active:scale-[0.98] disabled:opacity-50 sm:flex-none'
                                >
                                    Cancel
                                </button>

                                <button
                                    type='submit'
                                    disabled={
                                        personSaving
                                    }
                                    className='inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#176b38] px-6 text-sm font-bold text-white shadow-lg shadow-green-900/10 transition-all hover:-translate-y-0.5 hover:bg-[#11582d] hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none'
                                >
                                    {personSaving ? (
                                        <>
                                            <AiOutlineLoading3Quarters className='animate-spin' />
                                            Saving...
                                        </>
                                    ) : editPerson.id ? (
                                        <>
                                            <MdCheckCircle
                                                size={18}
                                            />
                                            Save Changes
                                        </>
                                    ) : (
                                        <>
                                            <MdPersonAddAlt1
                                                size={18}
                                            />
                                            Create Personnel
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Dialog>

            {/* APPROVE */}
            <Confirmation
                isOpen={approveConfirm.open}
                title='Approve Personnel?'
                message='This account will become active and the personnel will be able to sign in and handle tickets.'
                confirmText='Approve Account'
                onConfirm={handleApprove}
                onCancel={() =>
                    setApproveConfirm({
                        open: false,
                        id: null
                    })
                }
            />

            {/* ACTIVATE / DEACTIVATE */}
            <Confirmation
                isOpen={toggleConfirm.open}
                title={
                    toggleConfirm.isActive
                        ? 'Deactivate Account?'
                        : 'Activate Account?'
                }
                message={
                    toggleConfirm.isActive
                        ? 'This user will no longer be able to sign in until the account is activated again.'
                        : 'This user will be able to sign in and use AgriCare again.'
                }
                confirmText={
                    toggleConfirm.isActive
                        ? 'Deactivate'
                        : 'Activate'
                }
                onConfirm={handleToggleActive}
                onCancel={() =>
                    setToggleConfirm({
                        open: false,
                        id: null,
                        role: null,
                        isActive: false
                    })
                }
            />

            {/* DELETE */}
            <Confirmation
                isOpen={deleteConfirm.open}
                title='Delete Account?'
                message={`Delete ${
                    deleteConfirm.name ||
                    'this account'
                } permanently? This action cannot be undone.`}
                confirmText='Delete Permanently'
                onConfirm={handleDelete}
                onCancel={() =>
                    setDeleteConfirm({
                        open: false,
                        id: null,
                        role: null,
                        name: ''
                    })
                }
            />
        </AdminLayout>
    )
}

/* =========================================================
   USER ROW
========================================================= */

const UserRow = ({
    user,
    theme,
    statusLabel,
    statusClass,
    openMenu,
    setOpenMenu,
    onView,
    onEdit,
    onApprove,
    onToggle,
    onDelete
}) => {
    const menuRef = useRef(null)

    const menuId =
        `${user.userType}-${user.id}`

    const isOpen =
        openMenu === menuId

    useEffect(() => {
        if (!isOpen) return

        const handleOutside = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target
                )
            ) {
                setOpenMenu(null)
            }
        }

        document.addEventListener(
            'mousedown',
            handleOutside
        )

        return () =>
            document.removeEventListener(
                'mousedown',
                handleOutside
            )
    }, [isOpen, setOpenMenu])

    return (
        <tr className='group bg-white/70 transition-colors hover:bg-green-50/60'>
            <td className='px-5 py-4'>
                <div className='flex items-center gap-3'>
                    <Avatar
                        user={user}
                        theme={theme}
                    />

                    <div className='min-w-0'>
                        <p className='truncate font-bold text-gray-900'>
                            {user.firstName}{' '}
                            {user.lastName}
                        </p>

                        <p className='mt-0.5 truncate text-xs text-gray-400'>
                            @{user.username}
                        </p>
                    </div>
                </div>
            </td>

            <td className='px-5 py-4'>
                <span
                    className={`
                        inline-flex items-center gap-1.5
                        rounded-lg
                        px-2.5 py-1.5
                        text-xs font-semibold
                        ${
                            user.userType ===
                            'farmer'
                                ? 'bg-lime-50 text-lime-700'
                                : 'bg-green-50 text-green-700'
                        }
                    `}
                >
                    {user.userType ===
                    'farmer' ? (
                        <MdAgriculture />
                    ) : (
                        <MdBadge />
                    )}

                    {user.roleLabel}
                </span>
            </td>

            <td className='px-5 py-4 text-gray-600'>
                {user.userType === 'farmer'
                    ? user.barangay || '—'
                    : user.positionName}
            </td>

            <td className='px-5 py-4'>
                <p className='font-medium text-gray-700'>
                    {user.mobileNumber || '—'}
                </p>

                <p className='mt-1 max-w-[220px] truncate text-xs text-gray-400'>
                    {user.email || 'No email'}
                </p>
            </td>

            <td className='px-5 py-4'>
                <span
                    className={`
                        inline-flex
                        items-center gap-1.5
                        rounded-full border
                        px-2.5 py-1
                        text-xs font-bold
                        ${statusClass(user)}
                    `}
                >
                    <span className='h-1.5 w-1.5 rounded-full bg-current' />

                    {statusLabel(user)}
                </span>
            </td>

            <td className='px-5 py-4 text-gray-500'>
                {user.date
                    ? new Date(
                          user.date
                      ).toLocaleDateString()
                    : '—'}
            </td>

            <td className='relative px-5 py-4 text-center'>
                <div
                    ref={menuRef}
                    className='relative inline-block'
                >
                    <button
                        type='button'
                        title='Actions'
                        onClick={() =>
                            setOpenMenu(
                                isOpen
                                    ? null
                                    : menuId
                            )
                        }
                        className={`
                            flex h-9 w-9
                            items-center justify-center
                            rounded-xl border
                            transition-all
                            ${
                                isOpen
                                    ? 'border-green-200 bg-green-50 text-green-800'
                                    : 'border-transparent text-gray-400 hover:border-gray-200 hover:bg-white hover:text-green-800 hover:shadow-sm'
                            }
                        `}
                    >
                        <MdMoreVert size={21} />
                    </button>

                    {isOpen && (
                        <div className='absolute right-0 top-11 z-[80] w-[210px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.16)]'>
                            <MenuButton
                                icon={MdVisibility}
                                label='View details'
                                onClick={onView}
                            />

                            {user.userType ===
                                'personnel' &&
                                user.isPending && (
                                    <MenuButton
                                        icon={
                                            MdCheckCircle
                                        }
                                        label='Approve account'
                                        onClick={
                                            onApprove
                                        }
                                        success
                                    />
                                )}

                            {user.userType ===
                                'personnel' && (
                                <MenuButton
                                    icon={MdEdit}
                                    label='Edit personnel'
                                    onClick={onEdit}
                                />
                            )}

                            {!user.isPending && (
                                <MenuButton
                                    icon={
                                        user.isActive
                                            ? MdBlock
                                            : MdCheckCircle
                                    }
                                    label={
                                        user.isActive
                                            ? 'Deactivate account'
                                            : 'Activate account'
                                    }
                                    onClick={onToggle}
                                    warning={
                                        user.isActive
                                    }
                                    success={
                                        !user.isActive
                                    }
                                />
                            )}

                            <div className='my-1 border-t border-gray-100' />

                            <MenuButton
                                icon={MdDeleteOutline}
                                label='Delete account'
                                onClick={onDelete}
                                danger
                            />
                        </div>
                    )}
                </div>
            </td>
        </tr>
    )
}

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
    label,
    value,
    icon: Icon,
    description,
    iconClass,
    valueClass = 'text-green-800'
}) => (
    <div className='group rounded-2xl border border-white/50 bg-white/90 p-5 shadow-[0_12px_35px_rgba(31,78,40,0.10)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(31,78,40,0.15)]'>
        <div className='flex items-center justify-between gap-4'>
            <div>
                <p className='text-sm font-semibold text-gray-500'>
                    {label}
                </p>

                <p
                    className={`mt-1 text-3xl font-extrabold ${valueClass}`}
                >
                    {value}
                </p>

                <p className='mt-1 text-[11px] text-gray-400'>
                    {description}
                </p>
            </div>

            <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${iconClass}`}
            >
                <Icon size={23} />
            </div>
        </div>
    </div>
)

/* =========================================================
   AVATAR
========================================================= */

const Avatar = ({
    user,
    theme,
    large = false
}) => {
    const size = large
        ? 'h-20 w-20 text-xl ring-4 ring-white shadow-lg'
        : 'h-11 w-11 text-sm'

    if (user.profilePicture) {
        return (
            <img
                src={user.profilePicture}
                alt={`${user.firstName || ''} ${user.lastName || ''}`}
                className={`${size} rounded-full object-cover`}
            />
        )
    }

    return (
        <div
            className={`${size} flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-sm`}
            style={{
                background:
                    `linear-gradient(135deg, ${theme.primaryColor}, #256d3b)`
            }}
        >
            {(user.firstName?.[0] || '')
                .toUpperCase()}

            {(user.lastName?.[0] || '')
                .toUpperCase()}
        </div>
    )
}

/* =========================================================
   ACTION MENU
========================================================= */

const MenuButton = ({
    icon: Icon,
    label,
    onClick,
    danger = false,
    success = false,
    warning = false
}) => (
    <button
        type='button'
        onClick={onClick}
        className={`
            flex w-full items-center gap-3
            rounded-xl px-3 py-2.5
            text-sm font-medium
            transition
            ${
                danger
                    ? 'text-red-600 hover:bg-red-50'
                    : success
                      ? 'text-green-700 hover:bg-green-50'
                      : warning
                        ? 'text-amber-700 hover:bg-amber-50'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
        `}
    >
        <span
            className={`
                flex h-7 w-7
                items-center justify-center
                rounded-lg
                ${
                    danger
                        ? 'bg-red-50'
                        : success
                          ? 'bg-green-50'
                          : warning
                            ? 'bg-amber-50'
                            : 'bg-gray-100'
                }
            `}
        >
            <Icon size={17} />
        </span>

        {label}
    </button>
)

/* =========================================================
   USER INFORMATION CARD
========================================================= */

const InfoCard = ({
    icon: Icon,
    label,
    value,
    full = false
}) => (
    <div
        className={`
            rounded-xl
            border border-gray-100
            bg-gray-50/70
            p-3.5
            ${full ? 'sm:col-span-2' : ''}
        `}
    >
        <div className='flex items-start gap-3'>
            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700'>
                <Icon size={17} />
            </div>

            <div className='min-w-0'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                    {label}
                </p>

                <p className='mt-1 break-words text-sm font-semibold text-gray-700'>
                    {value || '—'}
                </p>
            </div>
        </div>
    </div>
)

/* =========================================================
   MODAL SECTION HEADER
========================================================= */

const FormGroupHeader = ({
    icon: Icon,
    title,
    description,
    className = ''
}) => (
    <div
        className={`mb-4 flex items-center gap-3 ${className}`}
    >
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700'>
            <Icon size={18} />
        </div>

        <div className='shrink-0'>
            <h3 className='text-sm font-extrabold text-gray-900'>
                {title}
            </h3>

            <p className='mt-0.5 text-[10px] text-gray-400'>
                {description}
            </p>
        </div>

        <div className='ml-2 h-px flex-1 bg-gray-100' />
    </div>
)

/* =========================================================
   FIELD LABEL
========================================================= */

const FieldLabel = ({
    label,
    required = true,
    optional = false,
    noMargin = false
}) => (
    <div
        className={`flex items-center gap-1 ${
            noMargin ? '' : 'mb-2'
        }`}
    >
        <span className='text-xs font-bold text-gray-600'>
            {label}
        </span>

        {required && (
            <span className='text-red-400'>
                *
            </span>
        )}

        {optional && (
            <span className='ml-1 text-[10px] font-medium text-gray-400'>
                Optional
            </span>
        )}
    </div>
)

/* =========================================================
   MODERN INPUT
========================================================= */

const ModernField = ({
    label,
    value,
    onChange,
    icon: Icon,
    type = 'text',
    required = true,
    placeholder = '',
    optional = false
}) => (
    <label className='block'>
        <FieldLabel
            label={label}
            required={required}
            optional={optional}
        />

        <div className='group relative'>
            {Icon && (
                <div className='pointer-events-none absolute left-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-green-50 text-green-700 transition-all group-focus-within:bg-green-100 group-focus-within:text-green-800'>
                    <Icon size={16} />
                </div>
            )}

            <input
                type={type}
                required={required}
                value={value || ''}
                placeholder={placeholder}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className={`
                    h-[50px] w-full
                    rounded-xl
                    border border-gray-200
                    bg-gray-50/60
                    pr-4
                    text-sm font-medium
                    text-gray-700
                    outline-none
                    transition-all
                    placeholder:font-normal
                    placeholder:text-gray-300
                    hover:border-gray-300
                    hover:bg-white
                    focus:border-green-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-green-100/70
                    ${Icon ? 'pl-[54px]' : 'pl-4'}
                `}
            />
        </div>
    </label>
)

/* =========================================================
   PAGINATION
========================================================= */

const PaginationButton = ({
    children,
    disabled,
    onClick
}) => (
    <button
        type='button'
        disabled={disabled}
        onClick={onClick}
        className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg text-gray-500 transition hover:border-green-200 hover:bg-green-50 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-30'
    >
        {children}
    </button>
)

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({ search }) => (
    <div className='flex flex-col items-center justify-center px-4 text-center'>
        <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700'>
            <MdGroups size={27} />
        </div>

        <h3 className='mt-4 font-bold text-gray-800'>
            {search
                ? 'No matching users'
                : 'No users found'}
        </h3>

        <p className='mt-1 max-w-sm text-sm text-gray-400'>
            {search
                ? 'Try another name, username, barangay or position.'
                : 'Registered users will appear here.'}
        </p>
    </div>
)

export default UsersAccess