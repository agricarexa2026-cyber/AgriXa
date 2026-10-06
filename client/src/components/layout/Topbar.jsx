import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoNotificationsOutline } from 'react-icons/io5'

import Header from './Header'
import Footer from './Footer'
import heroBackground from '../../assets/hero-background.jpg'

const Topbar = ({
    children,
    notificationCount = 0,
    navLinks = []
}) => {
    const theme = useSelector((state) => state.theme)
    const navigate = useNavigate()
    const location = useLocation()

    const allLinks = [
        ...navLinks,
        {
            label: 'Notifications',
            path: '/notifications',
            icon: IoNotificationsOutline,
            badge: notificationCount
        }
    ]

    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard'
        }

        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        )
    }

    const shortLabel = (label) => {
        const labels = {
            Notifications: 'Notifs',
            'Extension Workers': 'Workers',
            AgriXa: 'Knowledge',
            'Ticket Repository': 'Tickets',
            'Users & Access': 'Users',
            Configuration: 'Config'
        }

        return labels[label] || label
    }

    return (
        <div className="relative min-h-screen overflow-x-hidden">

            {/* Background */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${heroBackground})`
                }}
            />

            {/* Green overlay */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background:
                        'linear-gradient(110deg,' +
                        'rgba(31,111,52,.84) 0%,' +
                        'rgba(59,130,72,.68) 32%,' +
                        'rgba(246,241,222,.68) 72%,' +
                        'rgba(25,74,35,.56) 100%)'
                }}
            />

            <div className="fixed inset-0 pointer-events-none backdrop-blur-[2px]" />

            {/* Readability */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background:
                        'linear-gradient(to bottom,' +
                        'rgba(255,255,255,.04) 0%,' +
                        'rgba(255,250,240,.28) 40%,' +
                        'rgba(255,250,240,.52) 100%)'
                }}
            />

            <div className="relative z-10 flex min-h-screen flex-col">

                <Header
                    notificationCount={notificationCount}
                    navLinks={navLinks}
                />

                <main className="flex-1 px-4 py-7 pb-24 md:px-8 md:py-9 md:pb-10">
                    <div
                        key={location.pathname}
                        className="page-transition mx-auto w-full max-w-[1380px]"
                    >
                        {children}
                    </div>
                </main>

                <div className="hidden md:block">
                    <Footer />
                </div>

                {/* Mobile Navigation */}
                <div
                    className="
                        fixed bottom-0 left-0 right-0 z-[60]
                        flex items-center gap-1
                        overflow-x-auto
                        border-t border-white/15
                        px-2 py-2
                        shadow-[0_-8px_30px_rgba(0,0,0,.18)]
                        backdrop-blur-xl
                        lg:hidden
                    "
                    style={{
                        backgroundColor:
                            `${theme.primaryColor}F5`
                    }}
                >
                    {allLinks.map((link) => {
                        const Icon = link.icon
                        const active = isActive(link.path)

                        return (
                            <button
                                key={link.path}
                                type="button"
                                onClick={() =>
                                    navigate(link.path)
                                }
                                aria-label={link.label}
                                aria-current={
                                    active
                                        ? 'page'
                                        : undefined
                                }
                                className={`
                                    relative
                                    flex min-w-[64px] flex-1
                                    flex-col items-center gap-1
                                    rounded-xl px-2 py-1.5
                                    transition-all duration-200
                                    ${
                                        active
                                            ? 'bg-white/15 text-white'
                                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                                    }
                                `}
                            >
                                <div className="relative">
                                    {Icon && (
                                        <Icon size={20} />
                                    )}

                                    {link.badge > 0 && (
                                        <span
                                            className="
                                                absolute -right-2.5 -top-2
                                                flex h-[17px] min-w-[17px]
                                                items-center justify-center
                                                rounded-full px-1
                                                text-[9px] font-bold text-white
                                            "
                                            style={{
                                                backgroundColor:
                                                    theme.dangerColor
                                            }}
                                        >
                                            {link.badge > 99
                                                ? '99+'
                                                : link.badge}
                                        </span>
                                    )}
                                </div>

                                <span className="max-w-[72px] truncate text-[10px] font-medium">
                                    {shortLabel(link.label)}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default Topbar