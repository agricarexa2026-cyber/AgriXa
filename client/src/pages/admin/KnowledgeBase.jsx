import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
    MdAdd,
    MdSearch,
    MdMenuBook,
    MdEdit,
    MdDelete,
    MdCheckCircle,
    MdPending,
    MdBlock,
    MdVerifiedUser,
    MdConfirmationNumber
} from 'react-icons/md'

import AdminLayout from '../../components/layout/AdminLayout'
import ExtensionWorkerLayout from '../../components/layout/ExtensionWorkerLayout'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import api from '../../services/api'

const EMPTY = {
    title: '',
    question: '',
    answer: '',
    category: 'General',
    subcategory: '',
    keywords: ''
}

const STATUS = {
    validated: {
        label: 'Published',
        color: '#15803d',
        bg: '#dcfce7',
        icon: MdCheckCircle
    },
    pending: {
        label: 'Pending Review',
        color: '#b45309',
        bg: '#fef3c7',
        icon: MdPending
    },
    rejected: {
        label: 'Needs Revision',
        color: '#b91c1c',
        bg: '#fee2e2',
        icon: MdBlock
    }
}

const KnowledgeBase = () => {
    const theme = useSelector(s => s.theme)
    const user = useSelector(s => s.auth.user)

    const isAdmin = user?.role === 'admin'
    const isWorker = [
        'extension_worker',
        'lgu_personnel'
    ].includes(user?.role)

    const Layout = isWorker
        ? ExtensionWorkerLayout
        : AdminLayout

    const [entries, setEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)

    const [review, setReview] = useState(null)
    const [reviewNote, setReviewNote] = useState('')
    const [reviewing, setReviewing] = useState('')

    const [error, setError] = useState('')

    const load = async () => {
        setLoading(true)

        try {
            const { data } = await api.get('/knowledge/')
            setEntries(Array.isArray(data) ? data : [])
            setError('')
        } catch {
            setError('Unable to load knowledge articles.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const getStatus = entry =>
        entry.validationStatus || 'pending'

    const stats = useMemo(() => ({
        total: entries.length,

        published: entries.filter(
            e => getStatus(e) === 'validated'
        ).length,

        pending: entries.filter(
            e => getStatus(e) === 'pending'
        ).length,

        rejected: entries.filter(
            e => getStatus(e) === 'rejected'
        ).length
    }), [entries])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()

        return entries.filter(entry => {
            const state = getStatus(entry)

            const statusMatch =
                filter === 'all' ||
                filter === state ||
                (
                    filter === 'published' &&
                    state === 'validated'
                )

            const text = [
                entry.title,
                entry.question,
                entry.answer,
                entry.category,
                entry.subcategory,
                ...(entry.keywords || [])
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return statusMatch && (!q || text.includes(q))
        })
    }, [entries, search, filter])

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY)
        setError('')
        setFormOpen(true)
    }

    const openEdit = entry => {
        setEditing(entry)

        setForm({
            title: entry.title || '',
            question: entry.question || '',
            answer: entry.answer || '',
            category: entry.category || 'General',
            subcategory: entry.subcategory || '',
            keywords: Array.isArray(entry.keywords)
                ? entry.keywords.join(', ')
                : entry.keywords || ''
        })

        setError('')
        setFormOpen(true)
    }

    const save = async e => {
        e.preventDefault()

        if (!form.title.trim()) {
            setError('Article title is required.')
            return
        }

        if (!form.answer.trim()) {
            setError('Recommended solution is required.')
            return
        }

        setSaving(true)
        setError('')

        const payload = {
            title: form.title.trim(),
            question:
                form.question.trim() ||
                form.title.trim(),

            answer: form.answer.trim(),

            category:
                form.category.trim() ||
                'General',

            subcategory:
                form.subcategory.trim(),

            keywords: form.keywords
                .split(',')
                .map(v => v.trim())
                .filter(Boolean)
        }

        try {
            if (editing) {
                await api.patch(
                    `/knowledge/${editing.id}/`,
                    payload
                )
            } else {
                await api.post(
                    '/knowledge/',
                    payload
                )
            }

            setFormOpen(false)
            setEditing(null)
            setForm(EMPTY)

            await load()
        } catch (err) {
            setError(
                err.response?.data?.error ||
                'Unable to save the article.'
            )
        } finally {
            setSaving(false)
        }
    }

    const remove = async entry => {
        if (
            !window.confirm(
                `Delete "${entry.title}"?`
            )
        ) return

        try {
            await api.delete(
                `/knowledge/${entry.id}/`
            )

            await load()
        } catch {
            setError('Unable to delete the article.')
        }
    }

    const validate = async action => {
        if (!review) return

        setReviewing(action)
        setError('')

        try {
            await api.post(
                `/knowledge/${review.id}/validate/`,
                {
                    action,
                    note: reviewNote.trim()
                }
            )

            setReview(null)
            setReviewNote('')

            await load()
        } catch (err) {
            setError(
                err.response?.data?.error ||
                'Unable to review the article.'
            )
        } finally {
            setReviewing('')
        }
    }

    const filters = [
        ['all', 'All'],
        ['published', 'Published'],
        ['pending', 'Pending Review'],
        ['rejected', 'Needs Revision']
    ]

    return (
        <Layout>
            <div className="app-page flex flex-col gap-5">

                {/* HEADER */}
                <section
                    className="rounded-2xl p-6 shadow-sm"
                    style={{
                        background:
                            `linear-gradient(120deg,
                            ${theme.primaryColor},
                            ${theme.primaryColor}dc)`
                    }}
                >
                    <div className="
                        flex flex-col gap-4
                        md:flex-row
                        md:items-center
                        md:justify-between
                    ">
                        <div className="flex items-center gap-4">
                            <div className="
                                flex h-12 w-12
                                items-center justify-center
                                rounded-xl bg-white/15
                                text-white
                            ">
                                <MdMenuBook size={27} />
                            </div>

                            <div>
                                <p className="
                                    text-xs font-semibold
                                    uppercase tracking-[.18em]
                                    text-white/70
                                ">
                                    AGRIXA
                                </p>

                                <h1 className="
                                    text-2xl font-bold
                                    text-white
                                ">
                                    AgriXa
                                </h1>

                                <p className="
                                    mt-1 text-sm
                                    text-white/75
                                ">
                                    Agricultural solutions reviewed
                                    before publication to farmers.
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={openCreate}
                            style={{
                                backgroundColor: '#fff',
                                color: theme.primaryColor
                            }}
                        >
                            <span className="
                                flex items-center gap-2
                            ">
                                <MdAdd size={18} />
                                New Article
                            </span>
                        </Button>
                    </div>
                </section>

                {/* STATS */}
                <div className="
                    grid grid-cols-2 gap-3
                    lg:grid-cols-4
                ">
                    <Stat
                        label="Total Articles"
                        value={stats.total}
                        icon={MdMenuBook}
                        color={theme.primaryColor}
                    />

                    <Stat
                        label="Published"
                        value={stats.published}
                        icon={MdCheckCircle}
                        color="#15803d"
                    />

                    <Stat
                        label="Pending Review"
                        value={stats.pending}
                        icon={MdPending}
                        color="#b45309"
                    />

                    <Stat
                        label="Needs Revision"
                        value={stats.rejected}
                        icon={MdBlock}
                        color="#b91c1c"
                    />
                </div>

                {/* CONTENT */}
                <section className="app-card p-4 md:p-5">
                    <div className="
                        flex flex-col gap-3
                        md:flex-row
                        md:items-center
                        md:justify-between
                    ">
                        <div>
                            <h2
                                className="text-lg font-bold"
                                style={{
                                    color: theme.textColor
                                }}
                            >
                                Knowledge Articles
                            </h2>

                            <p className="
                                mt-1 text-xs
                                text-slate-500
                            ">
                                Only Admin-approved articles are
                                published to AgriXa.
                            </p>
                        </div>

                        <div className="
                            relative w-full
                            md:max-w-sm
                        ">
                            <MdSearch
                                size={18}
                                className="
                                    absolute left-3 top-1/2
                                    -translate-y-1/2
                                    text-slate-400
                                "
                            />

                            <input
                                value={search}
                                onChange={e =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search articles..."
                                className="
                                    app-control
                                    w-full py-2
                                    pl-9 pr-3
                                    text-sm outline-none
                                "
                            />
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="
                        mt-5 flex gap-2
                        overflow-x-auto
                        border-b pb-3
                        border-slate-200
                    ">
                        {filters.map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() =>
                                    setFilter(value)
                                }
                                className="
                                    whitespace-nowrap
                                    rounded-full
                                    px-3 py-1.5
                                    text-xs font-semibold
                                "
                                style={{
                                    backgroundColor:
                                        filter === value
                                            ? theme.primaryColor
                                            : `${theme.primaryColor}10`,

                                    color:
                                        filter === value
                                            ? '#fff'
                                            : theme.primaryColor
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="
                            mt-4 rounded-xl
                            bg-red-50
                            px-3 py-2
                            text-xs text-red-600
                        ">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="
                            py-16 text-center
                            text-sm text-slate-400
                        ">
                            Loading knowledge articles...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="
                            flex flex-col
                            items-center
                            py-16 text-center
                        ">
                            <div
                                className="
                                    flex h-14 w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                "
                                style={{
                                    color:
                                        theme.primaryColor,

                                    backgroundColor:
                                        `${theme.primaryColor}12`
                                }}
                            >
                                <MdMenuBook size={28} />
                            </div>

                            <p className="
                                mt-3 font-semibold
                                text-slate-700
                            ">
                                No knowledge articles found
                            </p>

                            <p className="
                                mt-1 text-xs
                                text-slate-400
                            ">
                                Resolved ticket solutions can
                                be submitted here for review.
                            </p>
                        </div>
                    ) : (
                        <div className="
                            mt-4 grid gap-4
                            lg:grid-cols-2
                        ">
                            {filtered.map(entry => (
                                <ArticleCard
                                    key={entry.id}
                                    entry={entry}
                                    theme={theme}
                                    isAdmin={isAdmin}
                                    onEdit={() =>
                                        openEdit(entry)
                                    }
                                    onDelete={() =>
                                        remove(entry)
                                    }
                                    onReview={() => {
                                        setReview(entry)
                                        setReviewNote('')
                                        setError('')
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* CREATE / EDIT */}
            <Dialog
                isOpen={formOpen}
                onClose={() =>
                    !saving && setFormOpen(false)
                }
                title={
                    editing
                        ? 'Edit Knowledge Article'
                        : 'Create Knowledge Article'
                }
            >
                <form
                    onSubmit={save}
                    className="
                        flex w-[min(600px,88vw)]
                        flex-col gap-4
                    "
                >
                    <div
                        className="
                            rounded-xl
                            px-3 py-2
                            text-xs
                        "
                        style={{
                            color: theme.textColor,
                            backgroundColor:
                                `${theme.primaryColor}0d`
                        }}
                    >
                        Articles are saved for review.
                        Only an Administrator can publish
                        them to AgriXa.
                    </div>

                    {editing?.sourceTicketId && (
                        <div className="
                            rounded-xl
                            border border-slate-200
                            bg-slate-50
                            p-3
                        ">
                            <div className="
                                flex items-center gap-2
                                text-xs font-semibold
                                text-slate-700
                            ">
                                <MdConfirmationNumber />

                                Source Ticket
                            </div>

                            <p className="
                                mt-1 text-xs
                                text-slate-500
                            ">
                                {editing.sourceTicketTitle ||
                                    editing.sourceTicketId}
                            </p>
                        </div>
                    )}

                    <div className="
                        grid gap-3
                        sm:grid-cols-2
                    ">
                        <Field label="Article Title">
                            <input
                                required
                                value={form.title}
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        title: e.target.value
                                    })
                                }
                                placeholder="Managing corn pests"
                                className="kb-field"
                            />
                        </Field>

                        <Field label="Category">
                            <input
                                required
                                value={form.category}
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        category: e.target.value
                                    })
                                }
                                placeholder="Corn"
                                className="kb-field"
                            />
                        </Field>
                    </div>

                    <Field
                        label="Subcategory"
                        hint="Optional"
                    >
                        <input
                            value={form.subcategory}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    subcategory:
                                        e.target.value
                                })
                            }
                            placeholder="Pest Infestation"
                            className="kb-field"
                        />
                    </Field>

                    <Field label="Common Farmer Question">
                        <textarea
                            rows={3}
                            value={form.question}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    question: e.target.value
                                })
                            }
                            placeholder="What problem is the farmer experiencing?"
                            className="
                                kb-field resize-none
                            "
                        />
                    </Field>

                    <Field label="Recommended Solution">
                        <textarea
                            required
                            rows={6}
                            value={form.answer}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    answer: e.target.value
                                })
                            }
                            placeholder="Enter the recommended solution..."
                            className="
                                kb-field resize-y
                            "
                        />
                    </Field>

                    <Field
                        label="Search Keywords"
                        hint="Separate with commas"
                    >
                        <input
                            value={form.keywords}
                            onChange={e =>
                                setForm({
                                    ...form,
                                    keywords: e.target.value
                                })
                            }
                            placeholder="corn, pest, leaves"
                            className="kb-field"
                        />
                    </Field>

                    {/* NO URL / REFERENCE FIELDS */}

                    {error && (
                        <p className="
                            rounded-lg
                            bg-red-50
                            px-3 py-2
                            text-xs text-red-600
                        ">
                            {error}
                        </p>
                    )}

                    <div className="
                        flex justify-end
                        gap-2 border-t
                        border-slate-200
                        pt-4
                    ">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={saving}
                            onClick={() =>
                                setFormOpen(false)
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            loading={saving}
                        >
                            Save for Review
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* ADMIN REVIEW */}
            <Dialog
                isOpen={Boolean(review)}
                onClose={() =>
                    !reviewing && setReview(null)
                }
                title="Review Knowledge Article"
            >
                {review && (
                    <div className="
                        flex w-[min(620px,88vw)]
                        flex-col gap-4
                    ">
                        <div className="
                            rounded-xl
                            bg-amber-50
                            px-3 py-2
                            text-xs leading-5
                            text-amber-900
                        ">
                            Review the solution carefully.
                            Approving it immediately publishes
                            the article to AgriXa.
                        </div>

                        {review.sourceTicketId && (
                            <div className="
                                rounded-xl
                                border border-slate-200
                                bg-slate-50
                                p-3
                            ">
                                <p className="
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    text-slate-400
                                ">
                                    Source Ticket
                                </p>

                                <p className="
                                    mt-1 text-sm
                                    font-semibold
                                    text-slate-700
                                ">
                                    {review.sourceTicketTitle ||
                                        review.sourceTicketId}
                                </p>
                            </div>
                        )}

                        <div>
                            <div className="
                                flex flex-wrap
                                gap-2
                            ">
                                <span
                                    className="
                                        rounded-full
                                        px-2 py-1
                                        text-[10px]
                                        font-bold
                                    "
                                    style={{
                                        color:
                                            theme.primaryColor,

                                        backgroundColor:
                                            `${theme.primaryColor}12`
                                    }}
                                >
                                    {review.category ||
                                        'General'}
                                </span>

                                {review.subcategory && (
                                    <span className="
                                        rounded-full
                                        bg-slate-100
                                        px-2 py-1
                                        text-[10px]
                                        font-semibold
                                        text-slate-600
                                    ">
                                        {review.subcategory}
                                    </span>
                                )}
                            </div>

                            <h2 className="
                                mt-2 text-lg
                                font-bold
                                text-slate-800
                            ">
                                {review.title}
                            </h2>
                        </div>

                        {review.question && (
                            <div className="
                                rounded-xl
                                bg-slate-50
                                p-3
                            ">
                                <p className="
                                    text-[10px]
                                    font-bold
                                    uppercase
                                    text-slate-400
                                ">
                                    Farmer Question
                                </p>

                                <p className="
                                    mt-1 text-sm
                                    text-slate-700
                                ">
                                    {review.question}
                                </p>
                            </div>
                        )}

                        <div className="
                            max-h-[260px]
                            overflow-y-auto
                            rounded-xl
                            border
                            border-slate-200
                            p-4
                        ">
                            <p className="
                                text-[10px]
                                font-bold
                                uppercase
                                text-slate-400
                            ">
                                Recommended Solution
                            </p>

                            <p className="
                                mt-2
                                whitespace-pre-wrap
                                text-sm leading-6
                                text-slate-700
                            ">
                                {review.answer}
                            </p>
                        </div>

                        <Field label="Admin Review Notes">
                            <textarea
                                rows={3}
                                value={reviewNote}
                                onChange={e =>
                                    setReviewNote(
                                        e.target.value
                                    )
                                }
                                placeholder="Optional notes or required corrections..."
                                className="
                                    kb-field resize-none
                                "
                            />
                        </Field>

                        {error && (
                            <p className="
                                rounded-lg
                                bg-red-50
                                px-3 py-2
                                text-xs text-red-600
                            ">
                                {error}
                            </p>
                        )}

                        <div className="
                            flex flex-wrap
                            justify-end gap-2
                            border-t
                            border-slate-200
                            pt-4
                        ">
                            <Button
                                variant="ghost"
                                disabled={Boolean(reviewing)}
                                onClick={() =>
                                    setReview(null)
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="secondary"
                                loading={
                                    reviewing === 'reject'
                                }
                                disabled={Boolean(reviewing)}
                                onClick={() =>
                                    validate('reject')
                                }
                            >
                                <MdBlock size={16} />
                                Needs Revision
                            </Button>

                            <Button
                                loading={
                                    reviewing === 'approve'
                                }
                                disabled={Boolean(reviewing)}
                                onClick={() =>
                                    validate('approve')
                                }
                            >
                                <MdVerifiedUser size={16} />
                                Approve & Publish
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            <style>{`
                .kb-field {
                    width: 100%;
                    margin-top: 5px;
                    padding: 10px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #fff;
                    color: #334155;
                    font-size: 14px;
                    outline: none;
                    transition: .15s ease;
                }

                .kb-field:focus {
                    border-color: ${theme.primaryColor};
                    box-shadow:
                        0 0 0 3px
                        ${theme.primaryColor}12;
                }
            `}</style>
        </Layout>
    )
}

const ArticleCard = ({
    entry,
    theme,
    isAdmin,
    onEdit,
    onDelete,
    onReview
}) => {
    const status =
        entry.validationStatus || 'pending'

    const state =
        STATUS[status] || STATUS.pending

    const Icon = state.icon

    return (
        <article className="
            app-card group
            flex flex-col
            p-5
        ">
            <div className="
                flex items-start
                justify-between
                gap-3
            ">
                <div className="min-w-0">
                    <div className="
                        flex flex-wrap
                        items-center gap-2
                    ">
                        <span
                            className="
                                rounded-full
                                px-2 py-1
                                text-[10px]
                                font-bold
                            "
                            style={{
                                color:
                                    theme.primaryColor,

                                backgroundColor:
                                    `${theme.primaryColor}12`
                            }}
                        >
                            {entry.category ||
                                'General'}
                        </span>

                        {entry.subcategory && (
                            <span className="
                                rounded-full
                                bg-slate-100
                                px-2 py-1
                                text-[10px]
                                font-semibold
                                text-slate-600
                            ">
                                {entry.subcategory}
                            </span>
                        )}

                        <span
                            className="
                                flex items-center
                                gap-1 rounded-full
                                px-2 py-1
                                text-[10px]
                                font-semibold
                            "
                            style={{
                                color: state.color,
                                backgroundColor:
                                    state.bg
                            }}
                        >
                            <Icon size={13} />
                            {state.label}
                        </span>
                    </div>

                    <h3 className="
                        mt-3
                        line-clamp-2
                        font-bold
                        text-slate-800
                    ">
                        {entry.title}
                    </h3>
                </div>

                <div className="
                    flex shrink-0 gap-1
                ">
                    <button
                        title="Edit"
                        onClick={onEdit}
                        className="
                            rounded-lg p-2
                            hover:bg-slate-100
                        "
                    >
                        <MdEdit
                            size={17}
                            color={theme.primaryColor}
                        />
                    </button>

                    <button
                        title="Delete"
                        onClick={onDelete}
                        className="
                            rounded-lg p-2
                            hover:bg-red-50
                        "
                    >
                        <MdDelete
                            size={17}
                            color="#dc2626"
                        />
                    </button>
                </div>
            </div>

            {entry.question && (
                <div className="
                    mt-3 rounded-xl
                    bg-slate-50
                    p-3
                ">
                    <p className="
                        text-[10px]
                        font-bold uppercase
                        text-slate-400
                    ">
                        Farmer Question
                    </p>

                    <p className="
                        mt-1 line-clamp-2
                        text-xs text-slate-600
                    ">
                        {entry.question}
                    </p>
                </div>
            )}

            <p className="
                mt-3 line-clamp-4
                text-sm leading-6
                text-slate-600
            ">
                {entry.answer}
            </p>

            {entry.sourceTicketId && (
                <div className="
                    mt-3 flex items-center
                    gap-1.5 text-[11px]
                    text-slate-400
                ">
                    <MdConfirmationNumber size={14} />

                    <span>
                        From ticket:{' '}
                        {entry.sourceTicketTitle ||
                            entry.sourceTicketId}
                    </span>
                </div>
            )}

            <div className="
                mt-auto flex
                items-center
                justify-between
                gap-3
                border-t
                border-slate-200
                pt-4
            ">
                <span className="
                    text-[10px]
                    text-slate-400
                ">
                    {entry.updatedAt
                        ? new Date(
                            entry.updatedAt
                        ).toLocaleDateString(
                            'en-PH',
                            {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            }
                        )
                        : 'Recently added'}
                </span>

                {isAdmin &&
                    status === 'pending' && (
                    <Button
                        size="sm"
                        onClick={onReview}
                    >
                        <MdVerifiedUser size={15} />
                        Review
                    </Button>
                )}
            </div>
        </article>
    )
}

const Stat = ({
    label,
    value,
    icon: Icon,
    color
}) => (
    <div className="app-card p-4">
        <div className="
            flex items-center
            justify-between
        ">
            <p className="
                text-xs font-medium
                text-slate-500
            ">
                {label}
            </p>

            <Icon
                size={20}
                color={color}
            />
        </div>

        <p className="
            mt-2 text-2xl
            font-bold
            text-slate-800
        ">
            {value}
        </p>
    </div>
)

const Field = ({
    label,
    hint,
    children
}) => (
    <label className="
        flex flex-col
        text-xs font-semibold
        text-slate-700
    ">
        <span>
            {label}

            {hint && (
                <span className="
                    ml-2 font-normal
                    text-slate-400
                ">
                    {hint}
                </span>
            )}
        </span>

        {children}
    </label>
)

export default KnowledgeBase