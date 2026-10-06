import { useEffect, useMemo, useRef, useState } from 'react'
import {
    MdArrowForward,
    MdClose,
    MdLightbulb,
    MdMenuBook,
    MdSearch,
    MdVerified,
} from 'react-icons/md'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import api from '../../services/api'
import KnowledgeSource from './KnowledgeSource'

const KnowledgeSearch = ({ publicMode = false, initialQuery = '' }) => {
    const theme = useSelector((state) => state.theme)
    const location = useLocation()

    const searchInput = useRef(null)
    const requestId = useRef(0)
    const lastInitialQuery = useRef('')

    const [query, setQuery] = useState(initialQuery || '')
    const [submittedQuery, setSubmittedQuery] = useState('')
    const [articles, setArticles] = useState([])
    const [results, setResults] = useState([])
    const [category, setCategory] = useState('All topics')
    const [selectedArticle, setSelectedArticle] = useState(null)
    const [showAll, setShowAll] = useState(false)
    const [loading, setLoading] = useState(false)
    const [libraryLoading, setLibraryLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        api.get('/knowledge/')
            .then((res) => {
                if (active) setArticles(res.data)
            })
            .catch(() => {
                if (active) {
                    setError(
                        'Articles are temporarily unavailable. Please try again.'
                    )
                }
            })
            .finally(() => {
                if (active) setLibraryLoading(false)
            })

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (location.state?.focusSearch) {
            searchInput.current?.focus()
        }
    }, [location.key, location.state?.focusSearch])

    const categories = useMemo(
        () => [
            'All topics',
            ...new Set(
                articles
                    .map((article) => article.category)
                    .filter(Boolean)
            ),
        ],
        [articles]
    )

    const visibleArticles = submittedQuery
        ? results
        : articles.filter(
              (article) =>
                  category === 'All topics' ||
                  article.category === category
          )

    const displayedArticles = showAll
        ? visibleArticles
        : visibleArticles.slice(0, 4)

    const matchStyle = (percentage) => {
        if (percentage >= 81) {
            return {
                label: 'Highest match',
                color: '#166534',
                background: '#dcfce7',
                border: '#86efac',
            }
        }

        if (percentage >= 50) {
            return {
                label: 'Moderate match',
                color: '#1d4ed8',
                background: '#dbeafe',
                border: '#93c5fd',
            }
        }

        return {
            label: 'Low match',
            color: '#b91c1c',
            background: '#fee2e2',
            border: '#fca5a5',
        }
    }

    const search = async (value = query) => {
        const question = String(value || '').trim()

        if (!question) {
            searchInput.current?.focus()
            return
        }

        const id = ++requestId.current

        setQuery(question)
        setLoading(true)
        setError('')
        setSelectedArticle(null)
        setShowAll(false)

        try {
            const res = await api.get('/knowledge/', {
                params: { q: question },
            })

            if (id === requestId.current) {
                setResults(res.data)
                setSubmittedQuery(question)
            }
        } catch {
            if (id === requestId.current) {
                setError('We could not search AgriXa. Please try again.')
            }
        } finally {
            if (id === requestId.current) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        const value = String(initialQuery || '').trim()

        if (!value || lastInitialQuery.current === value) return

        lastInitialQuery.current = value
        setQuery(value)
        search(value)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialQuery])

    const reset = () => {
        requestId.current += 1

        setSubmittedQuery('')
        setQuery('')
        setResults([])
        setSelectedArticle(null)
        setShowAll(false)
        setError('')
        setLoading(false)

        searchInput.current?.focus()
    }

    const closeArticleModal = () => {
        setSelectedArticle(null)
    }

    useEffect(() => {
        if (!selectedArticle) return

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeArticleModal()
            }
        }

        const previousOverflow = document.body.style.overflow

        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [selectedArticle])

    const reloadLibrary = async () => {
        try {
            setError('')
            setLibraryLoading(true)

            const res = await api.get('/knowledge/')
            setArticles(res.data)
        } catch {
            setError(
                'Articles are temporarily unavailable. Please try again.'
            )
        } finally {
            setLibraryLoading(false)
        }
    }

    return (
        <>
            <section
                aria-labelledby='agr-ixa-title'
                className='overflow-hidden rounded-[26px] border bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)]'
                style={{
                    borderColor: `${theme.secondaryColor}45`,
                }}
            >
                {/* HERO */}
                <div
                    className='relative overflow-hidden px-5 py-6 sm:px-7 md:px-8 md:py-7'
                    style={{
                        background: `linear-gradient(
                            120deg,
                            ${theme.primaryColor} 0%,
                            ${theme.primaryColor}ee 60%,
                            ${theme.secondaryColor} 135%
                        )`,
                    }}
                >
                    {/* decoration */}
                    <div className='pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.07]' />

                    <div className='pointer-events-none absolute -bottom-28 right-[12%] h-48 w-48 rounded-full bg-white/[0.05]' />

                    <div className='relative z-10 mx-auto max-w-5xl'>
                        <div className='flex items-center gap-3'>
                            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/15 text-white shadow-sm'>
                                <MdLightbulb size={24} />
                            </div>

                            <div>
                                <p className='text-[11px] font-bold uppercase tracking-[0.2em] text-white/70'>
                                    AgriXa Answers
                                </p>

                                <h2
                                    id='agr-ixa-title'
                                    className='mt-0.5 text-2xl font-bold tracking-tight text-white md:text-[28px]'
                                >
                                    What would you like to know?
                                </h2>
                            </div>
                        </div>

                        <p className='mt-3 max-w-2xl text-sm leading-6 text-white/80'>
                            Search trusted agricultural guidance from your
                            community knowledge base.
                        </p>

                        {/* SEARCH */}
                        <form
                            className='mt-5 flex max-w-4xl flex-col gap-2.5 sm:flex-row'
                            onSubmit={(event) => {
                                event.preventDefault()
                                search()
                            }}
                        >
                            <label className='relative min-w-0 flex-1'>
                                <span className='sr-only'>
                                    Ask AgriXa a question
                                </span>

                                <MdSearch
                                    className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                                    size={20}
                                />

                                <input
                                    ref={searchInput}
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder='Ask in English or Tagalog, e.g. Bakit naninilaw ang dahon ng palay?'
                                    className='h-[50px] w-full rounded-xl border border-white/30 bg-white pl-11 pr-10 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-white/70'
                                />

                                {query && (
                                    <button
                                        type='button'
                                        aria-label='Clear question'
                                        onClick={reset}
                                        className='absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600'
                                    >
                                        <MdClose size={17} />
                                    </button>
                                )}
                            </label>

                            <button
                                type='submit'
                                disabled={loading}
                                className='flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#153d19] px-6 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f3213] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60'
                            >
                                {loading
                                    ? 'Finding...'
                                    : 'Search'}

                                {!loading && (
                                    <MdArrowForward size={18} />
                                )}
                            </button>
                        </form>

                        {/* POPULAR */}
                        {!submittedQuery && articles.length > 0 && (
                            <div className='mt-3.5 flex flex-wrap items-center gap-2'>
                                <span className='text-[11px] font-medium text-white/65'>
                                    Popular
                                </span>

                                {articles
                                    .slice(0, 3)
                                    .map((article) => (
                                        <button
                                            key={article.id}
                                            type='button'
                                            onClick={() =>
                                                search(
                                                    article.question ||
                                                        article.title
                                                )
                                            }
                                            className='max-w-[230px] truncate rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20'
                                        >
                                            {article.question ||
                                                article.title}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* LIBRARY */}
                <div className='px-5 py-5 sm:px-7 md:px-8 md:py-6'>
                    {error && (
                        <div
                            role='alert'
                            className='mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
                        >
                            <span>{error}</span>

                            <button
                                type='button'
                                onClick={() =>
                                    submittedQuery
                                        ? search(submittedQuery)
                                        : reloadLibrary()
                                }
                                className='font-bold underline'
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* LIBRARY HEADER */}
                    <div className='flex flex-wrap items-end justify-between gap-3'>
                        <div>
                            <p
                                className='text-[11px] font-bold uppercase tracking-[0.16em]'
                                style={{
                                    color: theme.primaryColor,
                                }}
                            >
                                {submittedQuery
                                    ? 'Search results'
                                    : 'Explore the library'}
                            </p>

                            <h3
                                className='mt-1 text-lg font-bold tracking-tight'
                                style={{
                                    color: theme.textColor,
                                }}
                            >
                                {submittedQuery
                                    ? results.length
                                        ? `${results.length} ${
                                              results.length === 1
                                                  ? 'answer'
                                                  : 'answers'
                                          } found`
                                        : 'No matching answer found'
                                    : 'Browse practical answers'}
                            </h3>

                            <p className='mt-1 text-xs leading-5 text-slate-500'>
                                {submittedQuery
                                    ? `Results for “${submittedQuery}”`
                                    : 'Choose a topic and open an answer without leaving this page.'}
                            </p>
                        </div>

                        {submittedQuery && (
                            <button
                                type='button'
                                onClick={reset}
                                className='rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-slate-50'
                                style={{
                                    color: theme.primaryColor,
                                }}
                            >
                                Clear search
                            </button>
                        )}
                    </div>

                    {/* CATEGORY FILTERS */}
                    {!submittedQuery &&
                        categories.length > 1 && (
                            <div
                                className='mt-4 flex gap-2 overflow-x-auto pb-1'
                                role='group'
                                aria-label='Filter articles by topic'
                            >
                                {categories.map((topic) => {
                                    const active =
                                        category === topic

                                    return (
                                        <button
                                            key={topic}
                                            type='button'
                                            aria-pressed={active}
                                            onClick={() => {
                                                setCategory(topic)
                                                setShowAll(false)
                                                setSelectedArticle(
                                                    null
                                                )
                                            }}
                                            className='shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition'
                                            style={{
                                                borderColor: active
                                                    ? theme.primaryColor
                                                    : `${theme.primaryColor}18`,
                                                backgroundColor:
                                                    active
                                                        ? theme.primaryColor
                                                        : `${theme.primaryColor}08`,
                                                color: active
                                                    ? '#fff'
                                                    : theme.primaryColor,
                                            }}
                                        >
                                            {topic}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                    {/* NO SEARCH RESULT */}
                    {submittedQuery &&
                        results.length === 0 &&
                        !loading &&
                        !error && (
                            <div
                                className='mt-5 flex flex-col items-center rounded-2xl border border-dashed px-5 py-8 text-center'
                                style={{
                                    borderColor: `${theme.primaryColor}30`,
                                    backgroundColor: `${theme.primaryColor}04`,
                                }}
                            >
                                <div
                                    className='flex h-11 w-11 items-center justify-center rounded-xl'
                                    style={{
                                        backgroundColor: `${theme.primaryColor}10`,
                                        color: theme.primaryColor,
                                    }}
                                >
                                    <MdSearch size={23} />
                                </div>

                                <h4
                                    className='mt-3 text-sm font-bold'
                                    style={{
                                        color: theme.textColor,
                                    }}
                                >
                                    No matching answer found
                                </h4>

                                <p className='mt-1 max-w-md text-xs leading-5 text-slate-500'>
                                    Try another keyword or browse
                                    the available agricultural
                                    topics.
                                </p>

                                <button
                                    type='button'
                                    onClick={reset}
                                    className='mt-3 text-xs font-bold'
                                    style={{
                                        color:
                                            theme.primaryColor,
                                    }}
                                >
                                    Browse all knowledge
                                </button>
                            </div>
                        )}

                    {/* ARTICLES */}
                    {displayedArticles.length > 0 && (
                        <div
                            className={`mt-5 grid gap-3 ${
                                displayedArticles.length === 1
                                    ? 'grid-cols-1'
                                    : 'md:grid-cols-2'
                            }`}
                        >
                            {displayedArticles.map(
                                (article, index) => {
                                    const percentage = Number(
                                        article.matchPercentage
                                    )

                                    const match =
                                        submittedQuery &&
                                        Number.isFinite(
                                            percentage
                                        )
                                            ? matchStyle(
                                                  percentage
                                              )
                                            : null

                                    const isTopMatch = Boolean(
                                        match && index === 0
                                    )

                                    const preview =
                                        article.answer
                                            ? article.answer
                                                  .length > 180
                                                ? `${article.answer.slice(
                                                      0,
                                                      180
                                                  )}...`
                                                : article.answer
                                            : 'Open this article to read the full agricultural guidance.'

                                    return (
                                        <article
                                            key={article.id}
                                            onClick={() =>
                                                setSelectedArticle(
                                                    article
                                                )
                                            }
                                            className='group cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5'
                                            style={{
                                                borderColor:
                                                    match
                                                        ? match.border
                                                        : `${theme.secondaryColor}50`,
                                                boxShadow:
                                                    isTopMatch
                                                        ? `0 0 0 1px ${match.border}55`
                                                        : undefined,
                                            }}
                                        >
                                            <div className='flex items-start justify-between gap-3'>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                    <span
                                                        className='rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]'
                                                        style={{
                                                            backgroundColor: `${theme.primaryColor}0d`,
                                                            color:
                                                                theme.primaryColor,
                                                        }}
                                                    >
                                                        {article.category ||
                                                            'General'}
                                                    </span>

                                                    {isTopMatch && (
                                                        <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700'>
                                                            Best result
                                                        </span>
                                                    )}
                                                </div>

                                                {match && (
                                                    <span
                                                        className='shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold'
                                                        style={{
                                                            color:
                                                                match.color,
                                                            backgroundColor:
                                                                match.background,
                                                        }}
                                                    >
                                                        {percentage}%
                                                    </span>
                                                )}
                                            </div>

                                            <h4
                                                className='mt-3 text-base font-bold leading-6'
                                                style={{
                                                    color:
                                                        theme.textColor,
                                                }}
                                            >
                                                {article.title}
                                            </h4>

                                            {article.question &&
                                                article.question !==
                                                    article.title && (
                                                    <p className='mt-1 text-xs text-slate-400'>
                                                        {
                                                            article.question
                                                        }
                                                    </p>
                                                )}

                                            <p className='mt-2 line-clamp-2 text-sm leading-6 text-slate-500'>
                                                {preview}
                                            </p>

                                            <div className='mt-4 flex items-center justify-between border-t border-slate-100 pt-3'>
                                                <span
                                                    className='text-xs font-semibold'
                                                    style={{
                                                        color:
                                                            theme.primaryColor,
                                                    }}
                                                >
                                                    Agricultural
                                                    guidance
                                                </span>

                                                <button
                                                    type='button'
                                                    onClick={(
                                                        event
                                                    ) => {
                                                        event.stopPropagation()
                                                        setSelectedArticle(
                                                            article
                                                        )
                                                    }}
                                                    className='flex items-center gap-1.5 text-sm font-bold transition-all group-hover:gap-2.5'
                                                    style={{
                                                        color:
                                                            theme.primaryColor,
                                                    }}
                                                >
                                                    View answer
                                                    <MdArrowForward
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </article>
                                    )
                                }
                            )}
                        </div>
                    )}

                    {/* LOADING */}
                    {!submittedQuery &&
                        libraryLoading && (
                            <div className='mt-5 grid gap-3 md:grid-cols-2'>
                                {[1, 2].map((item) => (
                                    <div
                                        key={item}
                                        className='h-36 animate-pulse rounded-2xl bg-slate-100'
                                    />
                                ))}
                            </div>
                        )}

                    {/* EMPTY LIBRARY */}
                    {!submittedQuery &&
                        !libraryLoading &&
                        articles.length === 0 &&
                        !error && (
                            <div
                                className='mt-5 rounded-2xl border border-dashed px-5 py-8 text-center'
                                style={{
                                    borderColor: `${theme.secondaryColor}70`,
                                }}
                            >
                                <MdMenuBook
                                    size={28}
                                    className='mx-auto'
                                    color={
                                        theme.primaryColor
                                    }
                                />

                                <p
                                    className='mt-3 text-sm font-bold'
                                    style={{
                                        color: theme.textColor,
                                    }}
                                >
                                    The knowledge library is
                                    being prepared
                                </p>

                                <p className='mt-1 text-xs text-slate-500'>
                                    Check back when your local
                                    team has published answers.
                                </p>
                            </div>
                        )}

                    {/* SHOW MORE */}
                    {visibleArticles.length > 4 && (
                        <div className='mt-5 flex justify-center'>
                            <button
                                type='button'
                                onClick={() =>
                                    setShowAll(!showAll)
                                }
                                className='rounded-xl border px-4 py-2 text-xs font-semibold transition hover:bg-slate-50'
                                style={{
                                    borderColor: `${theme.primaryColor}25`,
                                    color: theme.primaryColor,
                                }}
                            >
                                {showAll
                                    ? 'Show fewer'
                                    : `Show all ${visibleArticles.length} articles`}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* ANSWER MODAL */}
            {selectedArticle && (
                <div
                    className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[3px]'
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeArticleModal()
                        }
                    }}
                >
                    <div
                        role='dialog'
                        aria-modal='true'
                        aria-labelledby='knowledge-modal-title'
                        className='relative flex max-h-[86vh] w-full max-w-[610px] flex-col overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.4)]'
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        {/* MODAL HEADER */}
                        <div
                            className='relative overflow-hidden px-5 py-5 text-white sm:px-6'
                            style={{
                                background: `linear-gradient(
                                    125deg,
                                    ${theme.primaryColor},
                                    ${
                                        theme.secondaryColor ||
                                        theme.primaryColor
                                    }
                                )`,
                            }}
                        >
                            <div className='pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full border-[26px] border-white/[0.07]' />

                            <button
                                type='button'
                                aria-label='Close answer'
                                onClick={closeArticleModal}
                                className='absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20'
                            >
                                <MdClose size={20} />
                            </button>

                            <div className='relative z-10 pr-12'>
                                <div className='flex items-center gap-3'>
                                    <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15'>
                                        <MdMenuBook
                                            size={20}
                                        />
                                    </span>

                                    <div>
                                        <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-white/70'>
                                            AgriXa Knowledge
                                        </p>

                                        <span className='mt-1 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]'>
                                            {selectedArticle.category ||
                                                'General'}
                                        </span>
                                    </div>
                                </div>

                                <h2
                                    id='knowledge-modal-title'
                                    className='mt-4 text-xl font-bold leading-tight tracking-tight sm:text-2xl'
                                >
                                    {selectedArticle.title}
                                </h2>

                                {selectedArticle.question &&
                                    selectedArticle.question !==
                                        selectedArticle.title && (
                                        <p className='mt-1.5 text-xs leading-5 text-white/75'>
                                            {
                                                selectedArticle.question
                                            }
                                        </p>
                                    )}
                            </div>
                        </div>

                        {/* MODAL BODY */}
                        <div className='overflow-y-auto bg-slate-50 px-4 py-4 sm:px-5 sm:py-5'>
                            {/* ANSWER */}
                            <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                                <div className='flex items-center gap-3'>
                                    <span
                                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'
                                        style={{
                                            backgroundColor: `${theme.primaryColor}10`,
                                            color:
                                                theme.primaryColor,
                                        }}
                                    >
                                        <MdLightbulb
                                            size={19}
                                        />
                                    </span>

                                    <div>
                                        <p
                                            className='text-[10px] font-bold uppercase tracking-[0.16em]'
                                            style={{
                                                color:
                                                    theme.primaryColor,
                                            }}
                                        >
                                            AgriXa Answer
                                        </p>

                                        <p className='text-xs font-semibold text-slate-600'>
                                            Recommended
                                            agricultural guidance
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className='mt-4 rounded-xl border-l-[3px] bg-slate-50 px-4 py-3.5'
                                    style={{
                                        borderLeftColor:
                                            theme.primaryColor,
                                    }}
                                >
                                    <p className='whitespace-pre-wrap text-sm leading-6 text-slate-700'>
                                        {
                                            selectedArticle.answer
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* SOURCE */}
                            <div className='mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                                <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3'>
                                    <div className='flex items-center gap-2.5'>
                                        <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600'>
                                            <MdVerified
                                                size={18}
                                            />
                                        </span>

                                        <div>
                                            <p className='text-xs font-bold text-slate-800'>
                                                Verified guidance
                                            </p>

                                            <p className='text-[10px] text-slate-400'>
                                                Review and source
                                                information
                                            </p>
                                        </div>
                                    </div>

                                    <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700'>
                                        Validated
                                    </span>
                                </div>

                                <div className='p-4'>
                                    <KnowledgeSource
                                        article={
                                            selectedArticle
                                        }
                                    />
                                </div>
                            </div>

                            <div className='mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400'>
                                <MdMenuBook size={14} />
                                <span>
                                    AgriCare Knowledge Library
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default KnowledgeSearch