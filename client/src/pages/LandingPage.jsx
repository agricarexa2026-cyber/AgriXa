import {
    useRef,
    useState
} from 'react'

import {
    useNavigate
} from 'react-router-dom'

import {
    useSelector
} from 'react-redux'

import {
    GiWheat
} from 'react-icons/gi'

import {
    MdArrowForward,
    MdCheckCircle,
    MdMenuBook,
    MdSupportAgent,
    MdSearch,
    MdBugReport,
    MdGrass,
    MdAgriculture
} from 'react-icons/md'

import heroMinecraft from '../assets/hero-minecraft.jpg'
import heroBackground from '../assets/hero-background.jpg'
import logoMinecraft from '../assets/logo-minecraft.png'
import steveImg from '../assets/running-steve.png'

import Button from '../components/ui/Button'
import KnowledgeSearch from '../components/knowledge/KnowledgeSearch'


const LandingPage = () => {
    const navigate = useNavigate()

    const theme = useSelector(
        (state) => state.theme
    )

    const agrixaRef = useRef(null)

    const [search, setSearch] = useState('')
    const [agrixaQuery, setAgrixaQuery] = useState('')

    const primaryColor =
        theme?.primaryColor ||
        '#15803d'


    const goToLogin = () => {
        navigate('/login')
    }


    const goToRegister = () => {
        navigate('/register')
    }


    const scrollToAgriXa = () => {
        setTimeout(() => {
            agrixaRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }, 50)
    }


    const openAgriXa = (value = '') => {
        const question =
            String(value || '').trim()

        if (question) {
            /*
             * Clear first so clicking the same
             * popular topic twice can run it again.
             */
            setAgrixaQuery('')

            setTimeout(() => {
                setAgrixaQuery(question)
            }, 0)
        }

        scrollToAgriXa()
    }


    const handleHeroSearch = (e) => {
        e.preventDefault()

        const question =
            search.trim()

        if (!question) {
            openAgriXa()
            return
        }

        openAgriXa(question)
    }


    const submitConcern = () => {
        navigate(
            '/login',
            {
                state: {
                    returnTo:
                        '/farmer/submit-ticket'
                }
            }
        )
    }


    const popularTopics = [
        {
            label: 'Pests',
            icon: MdBugReport,
            query: 'pests'
        },
        {
            label: 'Crop Disease',
            icon: MdGrass,
            query: 'crop disease'
        },
        {
            label: 'Crop Care',
            icon: MdAgriculture,
            query: 'crop care'
        }
    ]


    const steps = [
        {
            number: '01',
            icon: MdSearch,
            title: 'Ask AgriXa',
            body:
                'Search trusted agricultural information in English or Tagalog.'
        },
        {
            number: '02',
            icon: MdMenuBook,
            title: 'Find guidance',
            body:
                'Read practical answers published in the AgriCare knowledge repository.'
        },
        {
            number: '03',
            icon: MdSupportAgent,
            title: 'Ask for support',
            body:
                'If you cannot find an answer, sign in and submit your concern to your local extension team.'
        }
    ]


    const backgroundImage =
        theme?.minecraftHero
            ? heroMinecraft
            : heroBackground


    return (
        <div
            className='min-h-screen'
            style={{
                backgroundColor:
                    theme.backgroundColor,
                color:
                    theme.textColor
            }}
        >

            {/* HEADER */}
            <header
                className='relative z-10'
                style={{
                    backgroundColor:
                        primaryColor
                }}
            >
                <nav className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8'>

                    <button
                        type='button'
                        onClick={() =>
                            window.scrollTo({
                                top: 0,
                                behavior: 'smooth'
                            })
                        }
                        className='flex items-center gap-2 text-white'
                        aria-label='AgriCare home'
                    >
                        {theme.minecraftLogo ? (
                            <img
                                src={logoMinecraft}
                                alt='AgriCare'
                                className='h-9 w-9 object-contain'
                            />
                        ) : (
                            <span className='flex h-9 w-9 items-center justify-center rounded-xl bg-white/15'>
                                <GiWheat
                                    size={22}
                                />
                            </span>
                        )}

                        <span className='text-xl font-extrabold tracking-tight'>
                            Agri
                            <span
                                style={{
                                    color:
                                        theme.secondaryColor
                                }}
                            >
                                Care
                            </span>
                        </span>
                    </button>


                    <div className='flex items-center gap-2 sm:gap-3'>

                        <button
                            type='button'
                            onClick={goToLogin}
                            className='rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10'
                        >
                            Log in
                        </button>

                        <Button
                            size='sm'
                            onClick={
                                goToRegister
                            }
                            style={{
                                backgroundColor:
                                    '#fff',
                                color:
                                    primaryColor
                            }}
                        >
                            Create account

                            <MdArrowForward
                                size={16}
                            />
                        </Button>

                    </div>
                </nav>
            </header>


            <main>

                {/* HERO */}
                <section
                    className='relative isolate flex min-h-[560px] items-center overflow-hidden px-5 py-20 md:min-h-[620px] md:px-8'
                    style={{
                        backgroundImage:
                            `url(${backgroundImage})`,
                        backgroundSize:
                            'cover',
                        backgroundPosition:
                            'center'
                    }}
                >
                    <div
                        className='absolute inset-0 -z-10'
                        style={{
                            background:
                                `linear-gradient(
                                    90deg,
                                    ${primaryColor}f2 0%,
                                    ${primaryColor}d9 45%,
                                    rgba(9,33,15,.35) 100%
                                )`
                        }}
                    />


                    <div className='mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_.85fr]'>

                        {/* LEFT */}
                        <div className='max-w-2xl'>

                            <span className='inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white'>
                                <GiWheat
                                    size={14}
                                />

                                Agricultural guidance,
                                closer to home
                            </span>


                            <h1 className='mt-6 text-4xl font-extrabold leading-[1.07] tracking-tight text-white sm:text-5xl md:text-6xl'>

                                Answers for your farm.
                                <br />

                                <span
                                    style={{
                                        color:
                                            '#d6f4b2'
                                    }}
                                >
                                    People when you
                                    need them.
                                </span>

                            </h1>


                            <p className='mt-6 max-w-xl text-base leading-7 text-white/85 md:text-lg'>
                                Search AgriXa for trusted
                                agricultural guidance.
                                If your concern needs
                                personal assistance,
                                sign in and connect with
                                your local extension team.
                            </p>


                            <div className='mt-8 flex flex-wrap gap-3'>

                                <Button
                                    size='lg'
                                    onClick={() =>
                                        openAgriXa()
                                    }
                                    style={{
                                        backgroundColor:
                                            '#fff',
                                        color:
                                            primaryColor
                                    }}
                                >
                                    Ask AgriXa

                                    <MdArrowForward
                                        size={18}
                                    />
                                </Button>


                                <Button
                                    size='lg'
                                    onClick={
                                        submitConcern
                                    }
                                    style={{
                                        backgroundColor:
                                            'rgba(255,255,255,.12)',
                                        border:
                                            '1px solid rgba(255,255,255,.5)'
                                    }}
                                >
                                    Submit a Concern
                                </Button>

                            </div>


                            <div className='mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/75'>

                                <span className='flex items-center gap-1.5'>
                                    <MdCheckCircle
                                        size={16}
                                    />
                                    Fast answers
                                </span>

                                <span className='flex items-center gap-1.5'>
                                    <MdCheckCircle
                                        size={16}
                                    />
                                    Local support
                                </span>

                                <span className='flex items-center gap-1.5'>
                                    <MdCheckCircle
                                        size={16}
                                    />
                                    Ticket updates
                                </span>

                            </div>

                        </div>


                        {/* QUICK AGRIXA */}
                        <div className='hidden rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-sm lg:block'>

                            <div
                                className='flex items-center gap-3 border-b pb-5'
                                style={{
                                    borderColor:
                                        `${theme.secondaryColor}55`
                                }}
                            >
                                <span
                                    className='flex h-12 w-12 items-center justify-center rounded-xl'
                                    style={{
                                        backgroundColor:
                                            `${primaryColor}14`,
                                        color:
                                            primaryColor
                                    }}
                                >
                                    <MdMenuBook
                                        size={26}
                                    />
                                </span>

                                <div>
                                    <p
                                        className='font-bold'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Ask AgriXa
                                    </p>

                                    <p className='mt-0.5 text-xs text-slate-500'>
                                        Search agricultural
                                        guidance instantly
                                    </p>
                                </div>
                            </div>


                            <form
                                onSubmit={
                                    handleHeroSearch
                                }
                                className='mt-5'
                            >
                                <label className='mb-2 block text-xs font-semibold text-slate-600'>
                                    What do you need
                                    help with?
                                </label>

                                <div className='flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-green-500 focus-within:bg-white'>

                                    <div className='flex items-center pl-4 text-slate-400'>
                                        <MdSearch
                                            size={20}
                                        />
                                    </div>

                                    <input
                                        type='text'
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(
                                                e.target.value
                                            )
                                        }
                                        placeholder='e.g. How do I control pests?'
                                        className='min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-slate-700 outline-none placeholder:text-slate-400'
                                    />

                                    <button
                                        type='submit'
                                        className='m-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:opacity-90'
                                        style={{
                                            backgroundColor:
                                                primaryColor
                                        }}
                                        aria-label='Search AgriXa'
                                    >
                                        <MdArrowForward
                                            size={19}
                                        />
                                    </button>

                                </div>
                            </form>


                            <div className='mt-5'>

                                <p className='text-[11px] font-bold uppercase tracking-wider text-slate-400'>
                                    Popular topics
                                </p>


                                <div className='mt-3 flex flex-wrap gap-2'>

                                    {popularTopics.map(
                                        ({
                                            label,
                                            icon: Icon,
                                            query
                                        }) => (
                                            <button
                                                key={
                                                    label
                                                }
                                                type='button'
                                                onClick={() =>
                                                    openAgriXa(
                                                        query
                                                    )
                                                }
                                                className='flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 hover:shadow-sm'
                                                style={{
                                                    borderColor:
                                                        `${primaryColor}35`,
                                                    backgroundColor:
                                                        `${primaryColor}0a`,
                                                    color:
                                                        primaryColor
                                                }}
                                            >
                                                <Icon
                                                    size={14}
                                                />

                                                {label}
                                            </button>
                                        )
                                    )}

                                </div>
                            </div>


                            <button
                                type='button'
                                onClick={
                                    submitConcern
                                }
                                className='mt-5 flex w-full items-start gap-3 rounded-xl p-4 text-left transition hover:brightness-95'
                                style={{
                                    backgroundColor:
                                        `${primaryColor}0f`
                                }}
                            >
                                <MdSupportAgent
                                    size={21}
                                    className='mt-0.5 shrink-0'
                                    color={
                                        primaryColor
                                    }
                                />

                                <div>
                                    <p
                                        className='text-sm font-semibold'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Can't find
                                        the answer?
                                    </p>

                                    <p className='mt-1 text-xs leading-5 text-slate-600'>
                                        Sign in to
                                        submit your
                                        concern and
                                        receive help
                                        from an
                                        extension
                                        worker.
                                    </p>
                                </div>

                            </button>

                        </div>

                    </div>
                </section>


                {/* REAL PUBLIC AGRIXA */}
                <section
                    ref={agrixaRef}
                    className='scroll-mt-6 px-5 py-16 md:px-8 md:py-20'
                    style={{
                        backgroundColor:
                            theme.backgroundColor
                    }}
                >
                    <div className='mx-auto max-w-7xl'>

                        <div className='mb-8 max-w-2xl'>

                            <p
                                className='text-xs font-bold uppercase tracking-[0.18em]'
                                style={{
                                    color:
                                        primaryColor
                                }}
                            >
                                AgriXa Knowledge
                                Assistant
                            </p>

                            <h2
                                className='mt-2 text-3xl font-bold tracking-tight md:text-4xl'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Search before
                                submitting a concern
                            </h2>

                            <p className='mt-3 text-sm leading-6 text-slate-600'>
                                Search the AgriCare
                                knowledge repository
                                without signing in.
                                If no useful answer is
                                available, you can
                                sign in and contact
                                your local extension
                                team.
                            </p>

                        </div>


                        <KnowledgeSearch
                            publicMode
                            initialQuery={
                                agrixaQuery
                            }
                        />

                    </div>
                </section>


                {/* HOW IT WORKS */}
                <section
                    className='px-5 py-16 md:px-8 md:py-20'
                    style={{
                        backgroundColor:
                            `${primaryColor}07`
                    }}
                >
                    <div className='mx-auto max-w-7xl'>

                        <div className='mb-9 max-w-2xl'>

                            <p
                                className='text-xs font-bold uppercase tracking-[0.18em]'
                                style={{
                                    color:
                                        primaryColor
                                }}
                            >
                                Simple support
                                journey
                            </p>

                            <h2 className='mt-2 text-3xl font-bold tracking-tight md:text-4xl'>
                                From question to
                                solution
                            </h2>

                            <p className='mt-3 text-sm leading-6 opacity-70'>
                                Start with AgriXa
                                for agricultural
                                information. When
                                your concern needs
                                personal assistance,
                                your local extension
                                team is available
                                to help.
                            </p>

                        </div>


                        <div className='grid gap-4 md:grid-cols-3'>

                            {steps.map(
                                (step) => {
                                    const Icon =
                                        step.icon

                                    return (
                                        <div
                                            key={
                                                step.number
                                            }
                                            className='rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md'
                                            style={{
                                                borderColor:
                                                    `${theme.secondaryColor}55`
                                            }}
                                        >
                                            <div className='flex items-center justify-between'>

                                                <span
                                                    className='flex h-12 w-12 items-center justify-center rounded-xl'
                                                    style={{
                                                        backgroundColor:
                                                            `${primaryColor}12`,
                                                        color:
                                                            primaryColor
                                                    }}
                                                >
                                                    <Icon
                                                        size={25}
                                                    />
                                                </span>

                                                <span className='text-3xl font-black opacity-10'>
                                                    {
                                                        step.number
                                                    }
                                                </span>

                                            </div>

                                            <h3 className='mt-6 text-lg font-bold'>
                                                {
                                                    step.title
                                                }
                                            </h3>

                                            <p className='mt-2 text-sm leading-6 opacity-65'>
                                                {
                                                    step.body
                                                }
                                            </p>

                                        </div>
                                    )
                                }
                            )}

                        </div>

                    </div>
                </section>


                {/* CTA */}
                <section
                    className='px-5 py-14 md:px-8'
                    style={{
                        backgroundColor:
                            `${primaryColor}0c`
                    }}
                >
                    <div className='mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row'>

                        <div className='flex items-center gap-4'>

                            {theme.minecraftSteve && (
                                <img
                                    src={steveImg}
                                    alt=''
                                    className='hidden h-24 w-24 object-contain sm:block'
                                />
                            )}

                            <div>
                                <p
                                    className='text-xs font-bold uppercase tracking-wider'
                                    style={{
                                        color:
                                            primaryColor
                                    }}
                                >
                                    Here to help
                                    you grow
                                </p>

                                <h2 className='mt-1 text-2xl font-bold'>
                                    Need personalized
                                    agricultural
                                    support?
                                </h2>

                                <p className='mt-1 max-w-lg text-sm opacity-65'>
                                    Create an AgriCare
                                    account to submit
                                    concerns,
                                    communicate with
                                    extension workers,
                                    and track your
                                    tickets.
                                </p>
                            </div>

                        </div>


                       
                    </div>
                </section>

            </main>


            {/* FOOTER */}
            <footer
                className='px-5 py-6 text-xs'
                style={{
                    backgroundColor:
                        primaryColor,
                    color:
                        '#ffffffb8'
                }}
            >
                <div className='mx-auto max-w-7xl text-center'>
                    <span>
                        ©{' '}
                        {new Date().getFullYear()}{' '}
                        AgriCare. Helping farmers
                        grow smarter.
                    </span>
                </div>
            </footer>

        </div>
    )
}


export default LandingPage