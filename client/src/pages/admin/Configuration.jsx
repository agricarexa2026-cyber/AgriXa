import { useEffect, useMemo, useState } from 'react'
import {
    MdAdd, MdBadge, MdCategory, MdCheckCircle, MdChevronRight,
    MdDeleteOutline, MdEdit, MdExpandMore, MdFolderOpen,
    MdGroups, MdInfoOutline, MdLabelOutline, MdLowPriority,
    MdMoreVert, MdOutlineSettings, MdSearch, MdTune
} from 'react-icons/md'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import AdminLayout from '../../components/layout/AdminLayout'
import Dialog from '../../components/ui/Dialog'
import Confirmation from '../../components/ui/Confirmation'
import api from '../../services/api'

const EMPTY_CATEGORY = {
    id: null,
    name: '',
    positionId: '',
    isActive: true
}

const EMPTY_SUBCATEGORY = {
    id: null,
    categoryId: '',
    name: '',
    priority: 'medium',
    isActive: true
}

const EMPTY_POSITION = {
    id: null,
    name: '',
    isActive: true
}

const getError = (e, fallback) =>
    e?.response?.data?.error ||
    e?.response?.data?.detail ||
    fallback

export default function Configuration() {
    const [section, setSection] = useState('categories')
    const [categories, setCategories] = useState([])
    const [positions, setPositions] = useState([])
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState({})
    const [menu, setMenu] = useState(null)

    const [categoryForm, setCategoryForm] = useState(null)
    const [subcategoryForm, setSubcategoryForm] = useState(null)
    const [positionForm, setPositionForm] = useState(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [confirm, setConfirm] = useState({
        open: false,
        type: '',
        item: null
    })

    const load = async () => {
        setLoading(true)

        try {
            const [c, p] = await Promise.all([
                api.get('/tickets/categories/'),
                api.get('/positions/')
            ])

            setCategories(Array.isArray(c.data) ? c.data : [])
            setPositions(Array.isArray(p.data) ? p.data : [])
        } catch (e) {
            console.error('Unable to load configuration:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const subcategories = useMemo(
        () => categories.flatMap(c => c.subcategories || []),
        [categories]
    )

    const counts = {
        activeCategories: categories.filter(c => c.isActive !== false).length,
        activePositions: positions.filter(p => p.isActive !== false).length,
        high: subcategories.filter(
            s => (s.priority || '').toLowerCase() === 'high'
        ).length
    }

    const filteredCategories = useMemo(() => {
        const q = search.trim().toLowerCase()

        if (!q) return categories

        return categories.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.positionName?.toLowerCase().includes(q) ||
            (c.subcategories || []).some(
                s => s.name?.toLowerCase().includes(q)
            )
        )
    }, [categories, search])

    const filteredPositions = useMemo(() => {
        const q = search.trim().toLowerCase()

        return !q
            ? positions
            : positions.filter(p =>
                p.name?.toLowerCase().includes(q)
            )
    }, [positions, search])

    const reset = () => {
        setMenu(null)
        setFormError('')
    }

    const openCategory = (item = null) => {
        reset()

        setCategoryForm(item ? {
            id: item.id,
            name: item.name || '',
            positionId: item.positionId || '',
            isActive: item.isActive !== false
        } : { ...EMPTY_CATEGORY })
    }

    const openSubcategory = (item = null, categoryId = '') => {
        reset()

        setSubcategoryForm(item ? {
            id: item.id,
            categoryId: item.categoryId || categoryId,
            name: item.name || '',
            priority: item.priority || 'medium',
            isActive: item.isActive !== false
        } : {
            ...EMPTY_SUBCATEGORY,
            categoryId
        })
    }

    const openPosition = (item = null) => {
        reset()

        setPositionForm(item ? {
            id: item.id,
            name: item.name || '',
            isActive: item.isActive !== false
        } : { ...EMPTY_POSITION })
    }

    const saveCategory = async e => {
        e.preventDefault()

        const name = categoryForm.name.trim()

        if (!name)
            return setFormError('Category name is required.')

        if (!categoryForm.positionId)
            return setFormError(
                'Please select an assigned personnel position.'
            )

        setSaving(true)
        setFormError('')

        try {
            const payload = {
                name,
                positionId: categoryForm.positionId,
                isActive: categoryForm.isActive
            }

            categoryForm.id
                ? await api.patch(
                    `/tickets/categories/${categoryForm.id}/`,
                    payload
                )
                : await api.post(
                    '/tickets/categories/',
                    payload
                )

            setCategoryForm(null)
            await load()
        } catch (e) {
            setFormError(
                getError(e, 'Unable to save category.')
            )
        } finally {
            setSaving(false)
        }
    }

    const saveSubcategory = async e => {
        e.preventDefault()

        const name = subcategoryForm.name.trim()

        if (!subcategoryForm.categoryId)
            return setFormError('Please select a category.')

        if (!name)
            return setFormError('Subcategory name is required.')

        setSaving(true)
        setFormError('')

        try {
            const payload = {
                categoryId: subcategoryForm.categoryId,
                name,
                priority: subcategoryForm.priority,
                isActive: subcategoryForm.isActive
            }

            subcategoryForm.id
                ? await api.patch(
                    `/tickets/subcategories/${subcategoryForm.id}/`,
                    payload
                )
                : await api.post(
                    '/tickets/subcategories/',
                    payload
                )

            const id = subcategoryForm.categoryId

            setSubcategoryForm(null)
            setExpanded(x => ({ ...x, [id]: true }))
            await load()
        } catch (e) {
            setFormError(
                getError(e, 'Unable to save subcategory.')
            )
        } finally {
            setSaving(false)
        }
    }

    const savePosition = async e => {
        e.preventDefault()

        const name = positionForm.name.trim()

        if (!name)
            return setFormError('Position name is required.')

        setSaving(true)
        setFormError('')

        try {
            const payload = {
                name,
                isActive: positionForm.isActive
            }

            positionForm.id
                ? await api.patch(
                    `/positions/${positionForm.id}/`,
                    payload
                )
                : await api.post('/positions/', payload)

            setPositionForm(null)
            await load()
        } catch (e) {
            setFormError(
                getError(e, 'Unable to save position.')
            )
        } finally {
            setSaving(false)
        }
    }

    const paths = {
        category: item => `/tickets/categories/${item.id}/`,
        subcategory: item => `/tickets/subcategories/${item.id}/`,
        position: item => `/positions/${item.id}/`
    }

    const toggle = async (type, item) => {
        setMenu(null)

        try {
            await api.patch(paths[type](item), {
                isActive: item.isActive === false
            })

            await load()
        } catch (e) {
            console.error(`Unable to update ${type}:`, e)
        }
    }

    const remove = async () => {
        if (!confirm.item) return

        try {
            await api.delete(
                paths[confirm.type](confirm.item)
            )

            setConfirm({
                open: false,
                type: '',
                item: null
            })

            await load()
        } catch (e) {
            console.error('Unable to delete:', e)
        }
    }

    const askDelete = (type, item) => {
        setMenu(null)
        setConfirm({ open: true, type, item })
    }

    return (
        <AdminLayout>
            <div className="space-y-5">

                {/* HEADER */}
                <section className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/90 px-6 py-5 shadow-xl shadow-green-950/5 backdrop-blur-xl">
                    <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-green-200/30 blur-3xl" />

                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="mb-1 flex items-center gap-2 text-green-700">
                                <MdOutlineSettings size={17} />
                                <span className="text-[10px] font-extrabold uppercase tracking-[.2em]">
                                    System Administration
                                </span>
                            </div>

                            <h1 className="text-3xl font-extrabold text-green-950">
                                Configuration
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                Configure ticket routing, concerns,
                                priorities and personnel positions.
                            </p>
                        </div>

                        <button
                            onClick={() =>
                                section === 'categories'
                                    ? openCategory()
                                    : openPosition()
                            }
                            className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900"
                        >
                            <MdAdd />
                            {section === 'categories'
                                ? 'Add Category'
                                : 'Add Position'}
                        </button>
                    </div>
                </section>

                {/* SUMMARY */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Summary
                        icon={MdCategory}
                        label="Categories"
                        value={categories.length}
                        detail={`${counts.activeCategories} active`}
                    />

                    <Summary
                        icon={MdLabelOutline}
                        label="Subcategories"
                        value={subcategories.length}
                        detail="Configured concerns"
                    />

                    <Summary
                        icon={MdLowPriority}
                        label="High Priority"
                        value={counts.high}
                        detail="Urgent concerns"
                    />

                    <Summary
                        icon={MdBadge}
                        label="Positions"
                        value={positions.length}
                        detail={`${counts.activePositions} active`}
                    />
                </div>

                {/* CONTENT */}
                <section className="overflow-visible rounded-[26px] border border-white/50 bg-white/90 shadow-xl shadow-green-950/5">

                    <div className="flex gap-1 border-b border-gray-100 px-5 pt-2">
                        <Tab
                            active={section === 'categories'}
                            icon={MdCategory}
                            label="Ticket Categories"
                            count={categories.length}
                            onClick={() => {
                                setSection('categories')
                                setSearch('')
                            }}
                        />

                        <Tab
                            active={section === 'positions'}
                            icon={MdGroups}
                            label="Personnel Positions"
                            count={positions.length}
                            onClick={() => {
                                setSection('positions')
                                setSearch('')
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

                        <div className="relative w-full max-w-lg">
                            <MdSearch
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                size={19}
                            />

                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={
                                    section === 'categories'
                                        ? 'Search category, subcategory or position...'
                                        : 'Search positions...'
                                }
                                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                            />
                        </div>

                        {section === 'categories' && (
                            <button
                                onClick={() => openSubcategory()}
                                disabled={!categories.length}
                                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-green-200 px-4 text-xs font-bold text-green-800 hover:bg-green-50 disabled:opacity-40"
                            >
                                <MdAdd />
                                Add Subcategory
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <Loading />
                    ) : section === 'categories' ? (
                        filteredCategories.length ? (
                            <div className="divide-y divide-gray-100">
                                {filteredCategories.map(category => (
                                    <CategoryRow
                                        key={category.id}
                                        category={category}
                                        expanded={
                                            expanded[category.id] ||
                                            !!search
                                        }
                                        menu={menu}
                                        setMenu={setMenu}
                                        onExpand={() =>
                                            setExpanded(x => ({
                                                ...x,
                                                [category.id]:
                                                    !x[category.id]
                                            }))
                                        }
                                        onAdd={() =>
                                            openSubcategory(
                                                null,
                                                category.id
                                            )
                                        }
                                        onEdit={() =>
                                            openCategory(category)
                                        }
                                        onToggle={() =>
                                            toggle(
                                                'category',
                                                category
                                            )
                                        }
                                        onDelete={() =>
                                            askDelete(
                                                'category',
                                                category
                                            )
                                        }
                                        onEditSub={openSubcategory}
                                        onToggleSub={item =>
                                            toggle(
                                                'subcategory',
                                                item
                                            )
                                        }
                                        onDeleteSub={item =>
                                            askDelete(
                                                'subcategory',
                                                item
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <Empty
                                icon={MdCategory}
                                title="No categories found"
                                text="Create a category and assign its personnel position."
                                action={!search && 'Add Category'}
                                onAction={() => openCategory()}
                            />
                        )
                    ) : filteredPositions.length ? (
                        <div className="divide-y divide-gray-100">
                            {filteredPositions.map(position => (
                                <PositionRow
                                    key={position.id}
                                    position={position}
                                    menu={menu}
                                    setMenu={setMenu}
                                    onEdit={() =>
                                        openPosition(position)
                                    }
                                    onToggle={() =>
                                        toggle(
                                            'position',
                                            position
                                        )
                                    }
                                    onDelete={() =>
                                        askDelete(
                                            'position',
                                            position
                                        )
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <Empty
                            icon={MdBadge}
                            title="No positions found"
                            text="Create positions before configuring ticket routing."
                            action={!search && 'Add Position'}
                            onAction={() => openPosition()}
                        />
                    )}
                </section>

                {section === 'categories' && (
                    <section className="flex flex-col gap-3 rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="rounded-xl bg-green-100 p-2 text-green-800">
                                <MdInfoOutline size={18} />
                            </span>

                            <div>
                                <p className="text-sm font-bold text-gray-800">
                                    Automatic Routing & Priority
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Category determines the personnel position;
                                    subcategory determines ticket priority.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Priority value="low" />
                            <Priority value="medium" />
                            <Priority value="high" />
                        </div>
                    </section>
                )}
            </div>

            {/* CATEGORY */}
            <Dialog
                isOpen={!!categoryForm}
                onClose={() =>
                    !saving && setCategoryForm(null)
                }
                title={
                    categoryForm?.id
                        ? 'Edit Category'
                        : 'Add Category'
                }
                subtitle="Configure the category and personnel responsible for it."
                icon={
                    categoryForm?.id
                        ? MdEdit
                        : MdCategory
                }
                width="max-w-[540px]"
            >
                {categoryForm && (
                    <form
                        onSubmit={saveCategory}
                        className="space-y-4"
                    >
                        <Input
                            label="Category Name"
                            icon={MdCategory}
                            value={categoryForm.name}
                            placeholder="e.g. Corn"
                            onChange={name =>
                                setCategoryForm({
                                    ...categoryForm,
                                    name
                                })
                            }
                        />

                        <Select
                            label="Assigned Personnel Position"
                            icon={MdBadge}
                            value={categoryForm.positionId}
                            onChange={positionId =>
                                setCategoryForm({
                                    ...categoryForm,
                                    positionId
                                })
                            }
                        >
                            <option value="">
                                Select personnel position
                            </option>

                            {positions
                                .filter(
                                    p => p.isActive !== false
                                )
                                .map(p => (
                                    <option
                                        key={p.id}
                                        value={p.id}
                                    >
                                        {p.name}
                                    </option>
                                ))}
                        </Select>

                        <div className="flex items-start gap-2 rounded-xl border border-green-100 bg-green-50/60 p-3">
                            <MdInfoOutline
                                className="mt-0.5 shrink-0 text-green-700"
                            />
                            <p className="text-xs leading-5 text-green-800">
                                Tickets under this category will
                                automatically be routed to an active
                                personnel member assigned to this
                                position.
                            </p>
                        </div>

                        <Switch
                            checked={categoryForm.isActive}
                            onChange={isActive =>
                                setCategoryForm({
                                    ...categoryForm,
                                    isActive
                                })
                            }
                            title="Active Category"
                            text="Available when farmers submit tickets."
                        />

                        <ErrorText error={formError} />

                        <Actions
                            saving={saving}
                            onCancel={() =>
                                setCategoryForm(null)
                            }
                            text={
                                categoryForm.id
                                    ? 'Save Changes'
                                    : 'Create Category'
                            }
                        />
                    </form>
                )}
            </Dialog>

            {/* SUBCATEGORY */}
            <Dialog
                isOpen={!!subcategoryForm}
                onClose={() =>
                    !saving && setSubcategoryForm(null)
                }
                title={
                    subcategoryForm?.id
                        ? 'Edit Subcategory'
                        : 'Add Subcategory'
                }
                subtitle="Configure a concern and its automatic priority."
                icon={
                    subcategoryForm?.id
                        ? MdEdit
                        : MdLabelOutline
                }
                width="max-w-[560px]"
            >
                {subcategoryForm && (
                    <form
                        onSubmit={saveSubcategory}
                        className="space-y-4"
                    >
                        <Select
                            label="Category"
                            icon={MdCategory}
                            value={subcategoryForm.categoryId}
                            onChange={categoryId =>
                                setSubcategoryForm({
                                    ...subcategoryForm,
                                    categoryId
                                })
                            }
                        >
                            <option value="">
                                Select category
                            </option>

                            {categories.map(c => (
                                <option
                                    key={c.id}
                                    value={c.id}
                                >
                                    {c.name}
                                </option>
                            ))}
                        </Select>

                        <Input
                            label="Subcategory"
                            icon={MdLabelOutline}
                            value={subcategoryForm.name}
                            placeholder="e.g. Pest Infestation"
                            onChange={name =>
                                setSubcategoryForm({
                                    ...subcategoryForm,
                                    name
                                })
                            }
                        />

                        <div>
                            <Label text="Automatic Priority" />

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    'low',
                                    'medium',
                                    'high'
                                ].map(priority => (
                                    <button
                                        key={priority}
                                        type="button"
                                        onClick={() =>
                                            setSubcategoryForm({
                                                ...subcategoryForm,
                                                priority
                                            })
                                        }
                                        className={`rounded-xl border p-3 text-xs font-bold capitalize transition ${
                                            subcategoryForm.priority === priority
                                                ? priorityStyle(priority)
                                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {priority}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Switch
                            checked={subcategoryForm.isActive}
                            onChange={isActive =>
                                setSubcategoryForm({
                                    ...subcategoryForm,
                                    isActive
                                })
                            }
                            title="Active Subcategory"
                            text="Available in the farmer ticket form."
                        />

                        <ErrorText error={formError} />

                        <Actions
                            saving={saving}
                            onCancel={() =>
                                setSubcategoryForm(null)
                            }
                            text={
                                subcategoryForm.id
                                    ? 'Save Changes'
                                    : 'Add Subcategory'
                            }
                        />
                    </form>
                )}
            </Dialog>

            {/* POSITION */}
            <Dialog
                isOpen={!!positionForm}
                onClose={() =>
                    !saving && setPositionForm(null)
                }
                title={
                    positionForm?.id
                        ? 'Edit Position'
                        : 'Add Position'
                }
                subtitle="Manage an LGU personnel position."
                icon={
                    positionForm?.id
                        ? MdEdit
                        : MdBadge
                }
                width="max-w-[500px]"
            >
                {positionForm && (
                    <form
                        onSubmit={savePosition}
                        className="space-y-4"
                    >
                        <Input
                            label="Position Name"
                            icon={MdBadge}
                            value={positionForm.name}
                            placeholder="e.g. Corn Program"
                            onChange={name =>
                                setPositionForm({
                                    ...positionForm,
                                    name
                                })
                            }
                        />

                        <Switch
                            checked={positionForm.isActive}
                            onChange={isActive =>
                                setPositionForm({
                                    ...positionForm,
                                    isActive
                                })
                            }
                            title="Active Position"
                            text="Can receive category assignments."
                        />

                        <ErrorText error={formError} />

                        <Actions
                            saving={saving}
                            onCancel={() =>
                                setPositionForm(null)
                            }
                            text={
                                positionForm.id
                                    ? 'Save Changes'
                                    : 'Create Position'
                            }
                        />
                    </form>
                )}
            </Dialog>

            <Confirmation
                isOpen={confirm.open}
                title={`Delete ${labelFor(confirm.type)}?`}
                message={
                    confirm.item
                        ? `Delete "${confirm.item.name}"? This action cannot be undone.`
                        : ''
                }
                confirmText="Delete Permanently"
                onConfirm={remove}
                onCancel={() =>
                    setConfirm({
                        open: false,
                        type: '',
                        item: null
                    })
                }
            />
        </AdminLayout>
    )
}

/* ===================== ROWS ===================== */

function CategoryRow({
    category, expanded, menu, setMenu,
    onExpand, onAdd, onEdit, onToggle, onDelete,
    onEditSub, onToggleSub, onDeleteSub
}) {
    const children = category.subcategories || []
    const active = category.isActive !== false

    return (
        <div>
            <div className="flex items-center gap-3 px-5 py-4 hover:bg-green-50/50">
                <button
                    onClick={onExpand}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-gray-400"
                >
                    {expanded
                        ? <MdExpandMore />
                        : <MdChevronRight />}
                </button>

                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-800">
                    <MdFolderOpen size={20} />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900">
                            {category.name}
                        </p>
                        <Status active={active} />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                        <span>
                            {children.length}{' '}
                            {children.length === 1
                                ? 'subcategory'
                                : 'subcategories'}
                        </span>

                        {category.positionName ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                                <MdBadge />
                                Routes to {category.positionName}
                            </span>
                        ) : (
                            <span className="font-bold text-red-500">
                                No routing position
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={onAdd}
                    className="hidden items-center gap-1 rounded-lg border border-green-200 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50 sm:flex"
                >
                    <MdAdd />
                    Subcategory
                </button>

                <MenuButton
                    id={`category-${category.id}`}
                    menu={menu}
                    setMenu={setMenu}
                    items={[
                        ['Edit category', MdEdit, onEdit],
                        ['Add subcategory', MdAdd, onAdd],
                        [
                            active
                                ? 'Deactivate'
                                : 'Activate',
                            MdTune,
                            onToggle
                        ],
                        [
                            'Delete category',
                            MdDeleteOutline,
                            onDelete,
                            'danger'
                        ]
                    ]}
                />
            </div>

            {expanded && (
                <div className="border-t border-green-50 bg-[#f8fbf7] px-5 py-4">
                    {!children.length ? (
                        <div className="rounded-xl border border-dashed border-green-200 bg-white p-6 text-center">
                            <MdLabelOutline
                                size={22}
                                className="mx-auto text-green-700"
                            />

                            <p className="mt-2 text-sm font-bold text-gray-700">
                                No subcategories yet
                            </p>

                            <button
                                onClick={onAdd}
                                className="mt-3 text-xs font-bold text-green-700"
                            >
                                + Add Subcategory
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                            <div className="hidden grid-cols-[1fr_130px_110px_50px] gap-3 bg-gray-50 px-4 py-2 text-[10px] font-bold uppercase text-gray-400 md:grid">
                                <span>Subcategory</span>
                                <span>Priority</span>
                                <span>Status</span>
                                <span />
                            </div>

                            <div className="divide-y divide-gray-100">
                                {children.map(item => (
                                    <SubcategoryRow
                                        key={item.id}
                                        item={{
                                            ...item,
                                            categoryId:
                                                item.categoryId ||
                                                category.id
                                        }}
                                        menu={menu}
                                        setMenu={setMenu}
                                        onEdit={() =>
                                            onEditSub({
                                                ...item,
                                                categoryId:
                                                    item.categoryId ||
                                                    category.id
                                            })
                                        }
                                        onToggle={() =>
                                            onToggleSub(item)
                                        }
                                        onDelete={() =>
                                            onDeleteSub(item)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function SubcategoryRow({
    item, menu, setMenu,
    onEdit, onToggle, onDelete
}) {
    const active = item.isActive !== false

    return (
        <div className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_130px_110px_50px] md:items-center">
            <div className="flex items-center gap-2">
                <MdLabelOutline className="text-green-700" />
                <span className="text-sm font-semibold text-gray-700">
                    {item.name}
                </span>
            </div>

            <Priority value={item.priority} />
            <Status active={active} />

            <MenuButton
                id={`subcategory-${item.id}`}
                menu={menu}
                setMenu={setMenu}
                items={[
                    ['Edit', MdEdit, onEdit],
                    [
                        active
                            ? 'Deactivate'
                            : 'Activate',
                        MdTune,
                        onToggle
                    ],
                    [
                        'Delete',
                        MdDeleteOutline,
                        onDelete,
                        'danger'
                    ]
                ]}
            />
        </div>
    )
}

function PositionRow({
    position, menu, setMenu,
    onEdit, onToggle, onDelete
}) {
    const active = position.isActive !== false

    return (
        <div className="flex items-center gap-3 px-5 py-4 hover:bg-green-50/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-800">
                <MdBadge size={20} />
            </span>

            <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gray-800">
                    {position.name}
                </p>
                <p className="text-xs text-gray-400">
                    Ticket routing / personnel position
                </p>
            </div>

            <Status active={active} />

            <MenuButton
                id={`position-${position.id}`}
                menu={menu}
                setMenu={setMenu}
                items={[
                    ['Edit', MdEdit, onEdit],
                    [
                        active
                            ? 'Deactivate'
                            : 'Activate',
                        MdTune,
                        onToggle
                    ],
                    [
                        'Delete',
                        MdDeleteOutline,
                        onDelete,
                        'danger'
                    ]
                ]}
            />
        </div>
    )
}

/* ===================== SMALL UI ===================== */

function Select({
    label, icon: Icon, value,
    onChange, children
}) {
    return (
        <label className="block">
            <Label text={label} />

            <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />

                <select
                    value={value}
                    onChange={e =>
                        onChange(e.target.value)
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                >
                    {children}
                </select>

                <MdExpandMore className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
        </label>
    )
}

function Input({
    label, icon: Icon, value,
    onChange, placeholder
}) {
    return (
        <label className="block">
            <Label text={label} />

            <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" />

                <input
                    value={value}
                    onChange={e =>
                        onChange(e.target.value)
                    }
                    placeholder={placeholder}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
            </div>
        </label>
    )
}

function Switch({
    checked, onChange, title, text
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-left"
        >
            <div>
                <p className="text-sm font-bold text-gray-700">
                    {title}
                </p>
                <p className="text-xs text-gray-400">
                    {text}
                </p>
            </div>

            <span className={`relative h-6 w-11 rounded-full transition ${
                checked
                    ? 'bg-green-700'
                    : 'bg-gray-300'
            }`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    checked
                        ? 'left-6'
                        : 'left-1'
                }`} />
            </span>
        </button>
    )
}

function MenuButton({
    id, menu, setMenu, items
}) {
    return (
        <div className="relative flex justify-end">
            <button
                type="button"
                onClick={() =>
                    setMenu(menu === id ? null : id)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-700"
            >
                <MdMoreVert />
            </button>

            {menu === id && (
                <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                    {items.map(
                        ([label, Icon, action, tone]) => (
                            <button
                                key={label}
                                type="button"
                                onClick={action}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                                    tone === 'danger'
                                        ? 'text-red-600 hover:bg-red-50'
                                        : 'text-gray-600 hover:bg-green-50 hover:text-green-800'
                                }`}
                            >
                                <Icon />
                                {label}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    )
}

function Summary({
    icon: Icon, label, value, detail
}) {
    return (
        <div className="rounded-2xl border border-white/50 bg-white/90 p-4 shadow-lg shadow-green-950/5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-500">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-green-900">
                        {value}
                    </p>
                    <p className="text-[10px] text-gray-400">
                        {detail}
                    </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-800">
                    <Icon size={20} />
                </span>
            </div>
        </div>
    )
}

function Tab({
    active, icon: Icon,
    label, count, onClick
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold ${
                active
                    ? 'text-green-800'
                    : 'text-gray-500'
            }`}
        >
            <Icon />
            {label}

            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                active
                    ? 'bg-green-800 text-white'
                    : 'bg-gray-100'
            }`}>
                {count}
            </span>

            {active && (
                <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-green-700" />
            )}
        </button>
    )
}

function Actions({
    saving, onCancel, text
}) {
    return (
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
                type="button"
                disabled={saving}
                onClick={onCancel}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
                Cancel
            </button>

            <button
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900 disabled:opacity-60"
            >
                {saving
                    ? <AiOutlineLoading3Quarters className="animate-spin" />
                    : <MdCheckCircle />}

                {saving ? 'Saving...' : text}
            </button>
        </div>
    )
}

function Priority({ value = 'medium' }) {
    const p = (value || 'medium').toLowerCase()

    return (
        <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${priorityStyle(p)}`}>
            {p}
        </span>
    )
}

function priorityStyle(p) {
    if (p === 'high')
        return 'border-red-200 bg-red-50 text-red-600'

    if (p === 'low')
        return 'border-emerald-200 bg-emerald-50 text-emerald-700'

    return 'border-amber-200 bg-amber-50 text-amber-700'
}

function Status({ active }) {
    return (
        <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${
            active
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
        }`}>
            {active ? 'Active' : 'Inactive'}
        </span>
    )
}

function Empty({
    icon: Icon, title, text,
    action, onAction
}) {
    return (
        <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
            <span className="rounded-2xl bg-green-50 p-4 text-green-700">
                <Icon size={26} />
            </span>

            <p className="mt-3 font-bold text-gray-700">
                {title}
            </p>

            <p className="mt-1 text-xs text-gray-400">
                {text}
            </p>

            {action && (
                <button
                    onClick={onAction}
                    className="mt-4 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white"
                >
                    <MdAdd className="mr-1 inline" />
                    {action}
                </button>
            )}
        </div>
    )
}

function Loading() {
    return (
        <div className="flex min-h-[250px] items-center justify-center">
            <AiOutlineLoading3Quarters className="animate-spin text-2xl text-green-700" />
        </div>
    )
}

function Label({ text }) {
    return (
        <span className="mb-1.5 block text-xs font-bold text-gray-600">
            {text}
        </span>
    )
}

function ErrorText({ error }) {
    return error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
        </div>
    ) : null
}

function labelFor(type) {
    if (type === 'subcategory')
        return 'Subcategory'

    if (type === 'position')
        return 'Position'

    return 'Category'
}