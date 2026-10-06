import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { MdClose } from 'react-icons/md'

const Dialog = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    children,
    actions,
    className = '',
    width = 'max-w-2xl',
    mobileMaxH = 'max-h-[92dvh]',
    closeOnBackdrop = true,
    showClose = true
}) => {
    const theme = useSelector((state) => state.theme)

    const [visible, setVisible] = useState(false)
    const [animate, setAnimate] = useState(false)
    const [frozenChildren, setFrozenChildren] = useState(null)

    const dialogRef = useRef(null)

    useEffect(() => {
        let timer

        if (isOpen) {
            setFrozenChildren(children)
            setVisible(true)

            document.body.style.overflow = 'hidden'

            timer = setTimeout(() => {
                setAnimate(true)
            }, 10)
        } else {
            setAnimate(false)
            document.body.style.overflow = ''

            timer = setTimeout(() => {
                setVisible(false)
                setFrozenChildren(null)
            }, 220)
        }

        return () => {
            clearTimeout(timer)
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            setFrozenChildren(children)
        }
    }, [children, isOpen])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!visible) return null

    const handleBackdropClick = () => {
        if (closeOnBackdrop) {
            onClose?.()
        }
    }

    return (
        <div
            className={`
                fixed inset-0 z-[100]
                flex items-end justify-center
                p-0
                transition-all duration-200
                sm:items-center
                sm:p-5
            `}
            style={{
                backgroundColor: animate
                    ? 'rgba(10, 28, 17, 0.62)'
                    : 'rgba(10, 28, 17, 0)',
                backdropFilter: animate
                    ? 'blur(6px)'
                    : 'blur(0px)',
                WebkitBackdropFilter: animate
                    ? 'blur(6px)'
                    : 'blur(0px)'
            }}
            onMouseDown={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                role='dialog'
                aria-modal='true'
                aria-labelledby={title ? 'dialog-title' : undefined}
                onMouseDown={(event) => event.stopPropagation()}
                className={`
                    relative
                    flex w-full flex-col
                    overflow-hidden
                    rounded-t-[28px]
                    border border-white/60
                    bg-white
                    shadow-[0_30px_90px_rgba(0,0,0,0.28)]
                    transition-all duration-200
                    sm:rounded-[24px]
                    ${width}
                    ${mobileMaxH}
                    sm:max-h-[88vh]
                    ${className}
                `}
                style={{
                    transform: animate
                        ? 'translateY(0) scale(1)'
                        : 'translateY(24px) scale(0.97)',
                    opacity: animate ? 1 : 0
                }}
            >
                {/* Decorative top accent */}
                <div
                    className='h-1 w-full shrink-0'
                    style={{
                        background:
                            `linear-gradient(90deg, ${theme.primaryColor}, #79b56e, ${theme.secondaryColor || '#cde99c'})`
                    }}
                />

                {/* Header */}
                {(title || Icon || showClose) && (
                    <div className='relative shrink-0 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-6'>
                        <div className='flex items-center gap-3 pr-10'>
                            {Icon && (
                                <div
                                    className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm'
                                    style={{
                                        backgroundColor: theme.primaryColor
                                    }}
                                >
                                    <Icon size={20} />
                                </div>
                            )}

                            <div className='min-w-0'>
                                {title && (
                                    <h2
                                        id='dialog-title'
                                        className='m-0 text-lg font-extrabold tracking-tight text-gray-900'
                                    >
                                        {title}
                                    </h2>
                                )}

                                {subtitle && (
                                    <p className='mt-0.5 text-xs leading-5 text-gray-500'>
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {showClose && (
                            <button
                                type='button'
                                onClick={onClose}
                                aria-label='Close dialog'
                                className='absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95'
                            >
                                <MdClose size={21} />
                            </button>
                        )}
                    </div>
                )}

                {/* Scrollable content only */}
                <div
                    className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6'
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent'
                    }}
                >
                    <div className='text-gray-800'>
                        {frozenChildren}
                    </div>
                </div>

                {/* Optional footer actions */}
                {actions && (
                    <div className='shrink-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-6'>
                        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
                            {actions}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dialog