import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { GiWheat } from 'react-icons/gi'
import { IoNotificationsOutline } from 'react-icons/io5'
import { MdSettings } from 'react-icons/md'

import logoMinecraft from '../../assets/logo-minecraft.png'
import ProfilePanel from './ProfilePanel'

const Header = ({
    notificationCount = 0,
    navLinks = []
}) => {
    const theme = useSelector((state) => state.theme)
    const { user } = useSelector((state) => state.auth)

    const navigate = useNavigate()
    const location = useLocation()

    const [profileOpen, setProfileOpen] = useState(false)

    const initials = user
        ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
        : 'U'

    const isLinkActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard'
        }

        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        )
    }

    return (
        <>
            <header
                className='
                    sticky top-0 z-50
                    border-b border-white/10
                    shadow-[0_4px_18px_rgba(0,0,0,0.10)]
                    backdrop-blur-xl
                '
                style={{
                    backgroundColor: `${theme.primaryColor}F7`
                }}
            >
                <div
                    className='
                        mx-auto
                        flex h-[70px]
                        w-full max-w-[1600px]
                        items-center
                        px-4
                        md:px-6
                        xl:px-8
                    '
                >
                    {/* Logo */}
                    <button
                        type='button'
                        onClick={() => navigate('/dashboard')}
                        className='
                            flex shrink-0 items-center gap-2
                            rounded-xl
                            transition-opacity
                            hover:opacity-90
                        '
                        aria-label='Go to dashboard'
                    >
                        {theme.minecraftLogo ? (
                            <img
                                src={logoMinecraft}
                                alt='AgriCare'
                                className='h-8 w-8 object-contain'
                            />
                        ) : (
                            <GiWheat
                                size={25}
                                color='#fff'
                            />
                        )}

                        <span className='text-lg font-extrabold tracking-wide text-white'>
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

                    {/* Desktop Navigation */}
                    <nav
                        className='
                            hidden min-w-0 flex-1
                            items-center justify-center
                            gap-1
                            px-5
                            lg:flex
                        '
                        aria-label='Primary navigation'
                    >
                        {navLinks.map(
                            ({
                                label,
                                path,
                                icon: Icon,
                                tone
                            }) => {
                                const isActive =
                                    isLinkActive(path)

                                return (
                                    <button
                                        key={path}
                                        type='button'
                                        onClick={() =>
                                            navigate(path)
                                        }
                                        aria-current={
                                            isActive
                                                ? 'page'
                                                : undefined
                                        }
                                        className={`
                                            relative
                                            flex h-10
                                            shrink-0
                                            items-center gap-2
                                            rounded-xl
                                            px-3.5
                                            text-[13px]
                                            font-semibold
                                            transition-all
                                            duration-200

                                            ${
                                                isActive
                                                    ? 'bg-white/15 text-white shadow-sm'
                                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                            }
                                        `}
                                        
                                    >
                                        {Icon && (
                                            <Icon
                                                size={17}
                                                className='shrink-0'
                                            />
                                        )}

                                        <span className='whitespace-nowrap'>
                                            {label}
                                        </span>

                                        {isActive && (
                                            <span
                                                className='
                                                    absolute
                                                    -bottom-[15px]
                                                    left-1/2
                                                    h-[3px]
                                                    w-7
                                                    -translate-x-1/2
                                                    rounded-full
                                                    bg-white
                                                '
                                            />
                                        )}
                                    </button>
                                )
                            }
                        )}
                    </nav>

                    {/* Right Side */}
                    <div className='ml-auto flex shrink-0 items-center gap-1.5'>
                        {/* Notifications */}
                        <button
                            type='button'
                            onClick={() =>
                                navigate('/notifications')
                            }
                            aria-label='Notifications'
                            className='
                                relative
                                flex h-10 w-10
                                items-center justify-center
                                rounded-xl
                                text-white
                                transition-all
                                hover:bg-white/10
                            '
                        >
                            <IoNotificationsOutline
                                size={21}
                            />

                            {notificationCount > 0 && (
                                <span
                                    className='
                                        absolute
                                        right-0.5 top-0.5
                                        flex h-[17px]
                                        min-w-[17px]
                                        items-center justify-center
                                        rounded-full
                                        px-1
                                        text-[9px]
                                        font-bold
                                        text-white
                                        shadow
                                    '
                                    style={{
                                        backgroundColor:
                                            theme.dangerColor
                                    }}
                                >
                                    {notificationCount > 99
                                        ? '99+'
                                        : notificationCount}
                                </span>
                            )}
                        </button>

                        {/* Divider */}
                        <div className='mx-1 hidden h-7 w-px bg-white/15 sm:block' />

                        {/* Account */}
                        <button
                            type='button'
                            onClick={() =>
                                setProfileOpen(true)
                            }
                            aria-label='Open account settings'
                            className='
                                flex h-11
                                items-center gap-2
                                rounded-xl
                                px-1.5 pr-2
                                text-white
                                transition-all
                                hover:bg-white/10
                            '
                        >
                            <span
                                className='
                                    flex h-8 w-8
                                    shrink-0
                                    items-center justify-center
                                    rounded-full
                                    bg-white/20
                                    text-xs font-extrabold
                                    text-white
                                    ring-1 ring-white/10
                                '
                            >
                                {initials}
                            </span>

                            <div className='hidden min-w-0 text-left xl:block'>
                                <p className='max-w-[85px] truncate text-xs font-semibold leading-4 text-white'>
                                    {user?.firstName ||
                                        'Account'}
                                </p>

                                <p className='text-[10px] capitalize leading-3 text-white/55'>
                                    {user?.role === 'admin'
                                        ? 'LGU Admin'
                                        : user?.role ||
                                          'User'}
                                </p>
                            </div>

                            <MdSettings
                                size={18}
                                className='text-white/85'
                            />
                        </button>
                    </div>
                </div>
            </header>

            <ProfilePanel
                isOpen={profileOpen}
                onClose={() =>
                    setProfileOpen(false)
                }
            />
        </>
    )
}

export default Header