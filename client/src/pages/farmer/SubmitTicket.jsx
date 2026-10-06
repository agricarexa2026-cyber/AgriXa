import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
    MdAttachFile, MdCategory, MdCheckCircle, MdClose,
    MdConfirmationNumber, MdDescription, MdInfoOutline,
    MdLabelOutline, MdPriorityHigh, MdRefresh, MdTitle
} from 'react-icons/md'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import FarmerLayout from '../../components/layout/FarmerLayout'
import TicketCapacity from '../../components/tickets/TicketCapacity'
import AssignedPersonnel from '../../components/tickets/AssignedPersonnel'
import api from '../../services/api'

const priorityClass = {
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    high: 'border-red-200 bg-red-50 text-red-700'
}

const getError = (error, fallback) =>
    error?.response?.data?.error ||
    error?.response?.data?.detail ||
    fallback

export default function SubmitTicket() {
    const location = useLocation()
    const navigate = useNavigate()
    const fileInput = useRef(null)
    const { user } = useSelector(state => state.auth)

    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState('')
    const [subcategoryId, setSubcategoryId] = useState('')
    const [title, setTitle] = useState(location.state?.title || '')
    const [concern, setConcern] = useState(location.state?.concern || '')
    const [attachment, setAttachment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [readingFile, setReadingFile] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [categoryError, setCategoryError] = useState('')
    const [review, setReview] = useState(null)

    const category = useMemo(
        () => categories.find(x => x.id === categoryId),
        [categories, categoryId]
    )

    const subcategories = category?.subcategories || []

    const subcategory = useMemo(
        () => subcategories.find(x => x.id === subcategoryId),
        [subcategories, subcategoryId]
    )

    const priority = (subcategory?.priority || '').toLowerCase()

    const ownsExisting = review?.existing && (
        review.existing.farmerId === user?.id ||
        review.existing.participants?.includes(user?.id)
    )

    const canSubmit =
        categoryId &&
        subcategoryId &&
        category?.available !== false &&
        subcategory?.isActive !== false &&
        title.trim() &&
        concern.trim() &&
        !loading &&
        !readingFile &&
        !busy

    const loadCategories = async () => {
        setLoading(true)
        setCategoryError('')

        try {
            const { data } = await api.get('/tickets/categories/active/')
            setCategories(Array.isArray(data) ? data : [])
        } catch {
            setCategoryError('Ticket categories could not be loaded. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    const selectCategory = value => {
        setCategoryId(value)
        setSubcategoryId('')
        setReview(null)
        setError('')
    }

    const selectSubcategory = value => {
        setSubcategoryId(value)
        setReview(null)
        setError('')
    }

    const readFile = event => {
        const file = event.target.files?.[0]
        event.target.value = ''

        if (!file) return

        if (file.size > 750 * 1024) {
            setError('Please choose a file smaller than 750 KB.')
            return
        }

        setError('')
        setReadingFile(true)

        const reader = new FileReader()

        reader.onload = () => {
            setAttachment({
                data: reader.result,
                name: file.name,
                type: file.type
            })
            setReadingFile(false)
        }

        reader.onerror = () => {
            setError('The file could not be read. Please try again.')
            setReadingFile(false)
        }

        reader.readAsDataURL(file)
    }

    const checkTicket = async event => {
        event.preventDefault()

        if (!canSubmit) return

        setBusy(true)
        setError('')

        try {
            const { data } = await api.post('/tickets/check/', {
                categoryId,
                subcategoryId,
                title: title.trim(),
                concern: concern.trim()
            })

            setReview({
                existing: data.exists ? data.ticket : null
            })
        } catch (error) {
            setError(getError(
                error,
                'Your concern could not be checked. Please try again.'
            ))
        } finally {
            setBusy(false)
        }
    }

    const submitTicket = async (joinExisting = false) => {
        if (busy) return

        setBusy(true)
        setError('')

        try {
            const { data } = await api.post('/tickets/submit/', {
                categoryId,
                subcategoryId,
                title: title.trim(),
                concern: concern.trim(),
                joinExisting,
                ticketId: joinExisting ? review?.existing?.id : null,
                fileData: attachment?.data || '',
                fileName: attachment?.name || '',
                fileType: attachment?.type || ''
            })

            navigate('/farmer/tickets', {
                replace: true,
                state: { ticketId: data.ticketId }
            })
        } catch (error) {
            setError(getError(
                error,
                'Your ticket could not be submitted. Please try again.'
            ))
        } finally {
            setBusy(false)
        }
    }

    return (
        <FarmerLayout>
            <div className="mx-auto w-full max-w-5xl space-y-4">

                <section className="relative overflow-hidden rounded-[26px] border border-white/60 bg-white/90 px-5 py-5 shadow-xl shadow-green-950/5 backdrop-blur-xl sm:px-7">
                    <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-green-200/30 blur-3xl" />

                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-800 text-white shadow-lg shadow-green-900/20">
                            <MdConfirmationNumber size={25} />
                        </div>

                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-green-700">
                                Farmer Support
                            </p>

                            <h1 className="mt-0.5 text-2xl font-extrabold text-green-950 sm:text-3xl">
                                Submit a Ticket
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                                Tell us about your agricultural concern. AgriCare will determine
                                its priority and route it to the appropriate LGU personnel.
                            </p>
                        </div>
                    </div>
                </section>

                {categoryError && (
                    <Alert tone="warning">
                        <span>{categoryError}</span>

                        <button
                            type="button"
                            onClick={loadCategories}
                            className="ml-auto inline-flex items-center gap-1 font-bold underline"
                        >
                            <MdRefresh /> Try again
                        </button>
                    </Alert>
                )}

                {error && <Alert tone="error">{error}</Alert>}

                {review ? (
                    <Review
                        category={category}
                        subcategory={subcategory}
                        title={title}
                        concern={concern}
                        attachment={attachment}
                        existing={review.existing}
                        ownsExisting={ownsExisting}
                        busy={busy}
                        onBack={() => {
                            setReview(null)
                            setError('')
                        }}
                        onSubmit={() => submitTicket(false)}
                        onJoin={() => submitTicket(true)}
                    />
                ) : (
                    <form onSubmit={checkTicket}>
                        <fieldset disabled={busy} className="space-y-4">

                            <section className="rounded-[24px] border border-white/60 bg-white/90 p-5 shadow-lg shadow-green-950/5 sm:p-6">
                                <SectionTitle
                                    number="01"
                                    title="Classify your concern"
                                    text="Choose the category and specific type of concern."
                                />

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <SelectField
                                        label="Category"
                                        icon={MdCategory}
                                        value={categoryId}
                                        disabled={loading || !!categoryError}
                                        onChange={selectCategory}
                                    >
                                        <option value="">
                                            {loading ? 'Loading categories...' : 'Select category'}
                                        </option>

                                        {categories.map(item => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                                disabled={item.available === false}
                                            >
                                                {item.name}
                                                {item.available === false
                                                    ? ' — unavailable'
                                                    : ''}
                                            </option>
                                        ))}
                                    </SelectField>

                                    <SelectField
                                        label="Subcategory"
                                        icon={MdLabelOutline}
                                        value={subcategoryId}
                                        disabled={!categoryId}
                                        onChange={selectSubcategory}
                                    >
                                        <option value="">
                                            {!categoryId
                                                ? 'Select a category first'
                                                : 'Select subcategory'}
                                        </option>

                                        {subcategories
                                            .filter(item => item.isActive !== false)
                                            .map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                    </SelectField>
                                </div>

                                {subcategory && (
                                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-green-100 bg-green-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 rounded-xl bg-white p-2 text-green-700 shadow-sm">
                                                <MdPriorityHigh size={19} />
                                            </span>

                                            <div>
                                                <p className="text-xs font-bold text-green-950">
                                                    Automatic Priority
                                                </p>
                                                <p className="mt-0.5 text-xs text-green-800/70">
                                                    Based on the selected subcategory. You don't need to choose it manually.
                                                </p>
                                            </div>
                                        </div>

                                        <Priority value={priority} />
                                    </div>
                                )}

                                {!loading &&
                                    !categoryError &&
                                    categories.length > 0 &&
                                    !categories.some(x => x.available !== false) && (
                                        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                                            No LGU personnel are currently available to receive concerns.
                                        </p>
                                    )}
                            </section>

                            <section className="rounded-[24px] border border-white/60 bg-white/90 p-5 shadow-lg shadow-green-950/5 sm:p-6">
                                <SectionTitle
                                    number="02"
                                    title="Describe the problem"
                                    text="Provide enough information for the assigned personnel to understand your concern."
                                />

                                <div className="mt-5 space-y-4">
                                    <Field
                                        label="Concern Title"
                                        icon={MdTitle}
                                        value={title}
                                        maxLength={200}
                                        placeholder="e.g. Brown spots appearing on rice leaves"
                                        onChange={setTitle}
                                    />

                                    <label className="block">
                                        <FieldLabel
                                            icon={MdDescription}
                                            text="Description"
                                        />

                                        <textarea
                                            required
                                            rows={5}
                                            value={concern}
                                            onChange={event => setConcern(event.target.value)}
                                            placeholder="Describe what you observed, when it started, and other important details..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                                        />

                                        <p className="mt-1.5 text-[11px] text-gray-400">
                                            Include symptoms, affected crops or animals, and when the problem started.
                                        </p>
                                    </label>
                                </div>
                            </section>

                            <section className="rounded-[24px] border border-white/60 bg-white/90 p-5 shadow-lg shadow-green-950/5 sm:p-6">
                                <SectionTitle
                                    number="03"
                                    title="Supporting attachment"
                                    text="Add a photo or document if it can help LGU personnel assess the concern."
                                    optional
                                />

                                <input
                                    ref={fileInput}
                                    type="file"
                                    className="hidden"
                                    onChange={readFile}
                                    accept="image/*,.pdf,.doc,.docx"
                                />

                                {attachment ? (
                                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50/50 p-4">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-green-700 shadow-sm">
                                            <MdAttachFile size={20} />
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-gray-800">
                                                {attachment.name}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                Attachment ready
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setAttachment(null)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                            aria-label="Remove attachment"
                                        >
                                            <MdClose size={19} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={readingFile}
                                        onClick={() => fileInput.current?.click()}
                                        className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-green-200 bg-green-50/30 px-4 py-7 text-sm font-bold text-green-800 transition hover:border-green-400 hover:bg-green-50"
                                    >
                                        {readingFile ? (
                                            <AiOutlineLoading3Quarters className="animate-spin" />
                                        ) : (
                                            <MdAttachFile size={21} />
                                        )}

                                        {readingFile
                                            ? 'Reading attachment...'
                                            : 'Choose Photo or Document'}
                                    </button>
                                )}

                                <p className="mt-2 text-center text-[11px] text-gray-400">
                                    Optional • JPG, PNG, PDF or document • Maximum 750 KB
                                </p>
                            </section>

                            <div className="flex flex-col-reverse gap-3 rounded-[22px] border border-white/60 bg-white/90 p-4 shadow-lg shadow-green-950/5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-2 text-xs text-gray-500">
                                    <MdInfoOutline
                                        className="mt-0.5 shrink-0 text-green-700"
                                        size={17}
                                    />
                                    <span>
                                        We'll check for similar concerns before creating a new ticket.
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-800 px-6 text-sm font-bold text-white shadow-md shadow-green-900/15 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {busy ? (
                                        <>
                                            <AiOutlineLoading3Quarters className="animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            Continue to Review
                                            <MdCheckCircle size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </fieldset>
                    </form>
                )}
            </div>
        </FarmerLayout>
    )
}

function Review({
    category, subcategory, title, concern, attachment,
    existing, ownsExisting, busy, onBack, onSubmit, onJoin
}) {
    return (
        <section className="overflow-hidden rounded-[26px] border border-white/60 bg-white/95 shadow-xl shadow-green-950/5">
            <div className="border-b border-green-100 bg-green-50/70 px-5 py-5 sm:px-7">
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-green-700">
                    Final Step
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-green-950">
                    {existing
                        ? ownsExisting
                            ? 'You already have a similar ticket'
                            : 'A similar concern already exists'
                        : 'Review your concern'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    {existing
                        ? 'Review the similar ticket before deciding how you want to continue.'
                        : 'Please make sure the information below is correct before submitting.'}
                </p>
            </div>

            <div className="space-y-4 p-5 sm:p-7">
                <div className="grid gap-3 sm:grid-cols-3">
                    <ReviewItem label="Category" value={category?.name} />
                    <ReviewItem label="Subcategory" value={subcategory?.name} />

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            Priority
                        </p>
                        <div className="mt-2">
                            <Priority value={subcategory?.priority} />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Your Concern
                    </p>

                    <h3 className="mt-2 font-bold text-gray-900">
                        {title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {concern}
                    </p>

                    {attachment && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                            <MdAttachFile />
                            {attachment.name}
                        </div>
                    )}
                </div>

                {existing ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                        <div className="flex items-start gap-3">
                            <MdInfoOutline
                                size={21}
                                className="mt-0.5 shrink-0 text-amber-700"
                            />

                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                    Similar Ticket Found
                                </p>

                                <h3 className="mt-1 font-bold text-gray-900">
                                    {existing.title}
                                </h3>

                                <div className="mt-2 text-sm text-gray-600">
                                    Assigned to: <AssignedPersonnel ticket={existing} />
                                </div>

                                <div className="mt-3">
                                    <TicketCapacity ticket={existing} />
                                </div>

                                <p className="mt-3 text-xs leading-5 text-gray-600">
                                    {ownsExisting
                                        ? 'You can continue your existing conversation or create a separate ticket if this is a different case.'
                                        : 'You can join the existing conversation to follow the LGU response, or create a separate ticket if your situation is different.'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50/60 p-4">
                        <MdCheckCircle
                            className="mt-0.5 shrink-0 text-green-700"
                            size={20}
                        />

                        <div>
                            <p className="text-sm font-bold text-green-950">
                                Ready to submit
                            </p>
                            <p className="mt-1 text-xs leading-5 text-green-800/70">
                                AgriCare will automatically assign the appropriate available LGU personnel.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onBack}
                        className="h-10 rounded-xl border border-gray-200 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                        Back
                    </button>

                    <button
                        type="button"
                        disabled={busy}
                        onClick={onSubmit}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-green-800 px-5 text-sm font-bold text-white transition hover:bg-green-900 disabled:opacity-50"
                    >
                        {busy && <AiOutlineLoading3Quarters className="animate-spin" />}
                        {existing ? 'Create New Ticket' : 'Confirm & Submit'}
                    </button>

                    {existing && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onJoin}
                            className="h-10 rounded-xl border border-green-700 bg-green-50 px-5 text-sm font-bold text-green-800 transition hover:bg-green-100 disabled:opacity-50"
                        >
                            {ownsExisting
                                ? 'Continue Existing Ticket'
                                : 'Join Existing Ticket'}
                        </button>
                    )}
                </div>
            </div>
        </section>
    )
}

function SectionTitle({ number, title, text, optional }) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-800 text-[11px] font-extrabold text-white">
                {number}
            </span>

            <div>
                <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-green-950">{title}</h2>

                    {optional && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-400">
                            Optional
                        </span>
                    )}
                </div>

                <p className="mt-0.5 text-xs leading-5 text-gray-400">
                    {text}
                </p>
            </div>
        </div>
    )
}

function SelectField({ label, icon: Icon, value, onChange, disabled, children }) {
    return (
        <label className="block">
            <FieldLabel icon={Icon} text={label} />

            <select
                required
                value={value}
                disabled={disabled}
                onChange={event => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
                {children}
            </select>
        </label>
    )
}

function Field({ label, icon, value, onChange, placeholder, maxLength }) {
    return (
        <label className="block">
            <FieldLabel icon={icon} text={label} />

            <input
                required
                value={value}
                maxLength={maxLength}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
        </label>
    )
}

function FieldLabel({ icon: Icon, text }) {
    return (
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <Icon size={15} className="text-green-700" />
            {text}
            <span className="text-red-500">*</span>
        </span>
    )
}

function Priority({ value = 'low' }) {
    const priority = (value || 'low').toLowerCase()

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
            priorityClass[priority] || priorityClass.low
        }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {priority} priority
        </span>
    )
}

function ReviewItem({ label, value }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-gray-800">
                {value || '—'}
            </p>
        </div>
    )
}

function Alert({ children, tone }) {
    const style = tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-amber-200 bg-amber-50 text-amber-800'

    return (
        <div
            role="alert"
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${style}`}
        >
            <MdInfoOutline className="shrink-0" size={18} />
            {children}
        </div>
    )
}