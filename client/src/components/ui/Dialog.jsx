
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
    const theme = useSelector(state => state.theme)
    const [visible, setVisible] = useState(isOpen)
    const [animate, setAnimate] = useState(false)
    const onCloseRef = useRef(onClose)

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        let timer

        if (isOpen) {
            setVisible(true)
            timer = setTimeout(() => setAnimate(true), 10)
        } else {
            setAnimate(false)
            timer = setTimeout(() => setVisible(false), 220)
        }

        return () => clearTimeout(timer)
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = event => {
            if (event.key === 'Escape') {
                onCloseRef.current?.()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    if (!visible) return null

    const handleBackdropClick = () => {
        if (closeOnBackdrop) onCloseRef.current?.()
    }

    return createPortal(
        <div
            className='fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden p-0 transition-all duration-200 sm:items-center sm:p-5'
            style={{
                backgroundColor: animate
                    ? 'rgba(10, 28, 17, 0.62)'
                    : 'rgba(10, 28, 17, 0)',
                backdropFilter: animate ? 'blur(6px)' : 'blur(0px)',
                WebkitBackdropFilter: animate ? 'blur(6px)' : 'blur(0px)'
            }}
            onMouseDown={handleBackdropClick}
        >
            <div
                role='dialog'
                aria-modal='true'
                aria-labelledby={title ? 'dialog-title' : undefined}
                onMouseDown={event => event.stopPropagation()}
                className={`
                    relative flex w-full min-h-0 min-w-0 max-w-full flex-col
                    overflow-hidden rounded-t-[28px]
                    border border-white/60 bg-white
                    shadow-[0_30px_90px_rgba(0,0,0,0.28)]
                    transition-all duration-200
                    sm:rounded-[24px]
                    ${width}
                    ${mobileMaxH}
                    sm:max-h-[88dvh]
                    ${className}
                `}
                style={{
                    transform: animate
                        ? 'translateY(0) scale(1)'
                        : 'translateY(24px) scale(0.97)',
                    opacity: animate ? 1 : 0,
                    marginBottom: 0
                }}
            >
                <div
                    className='h-1 w-full shrink-0'
                    style={{
                        background: `linear-gradient(90deg, ${theme.primaryColor}, #79b56e, ${theme.secondaryColor || '#cde99c'})`
                    }}
                />

                {(title || Icon || showClose) && (
                    <div className='relative shrink-0 border-b border-gray-100 bg-white/95 px-4 py-3.5 backdrop-blur-xl sm:px-6 sm:py-4'>
                        <div className='flex min-w-0 items-center gap-3 pr-10'>
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

                            <div className='min-w-0 flex-1'>
                                {title && (
                                    <h2
                                        id='dialog-title'
                                        className='m-0 break-words text-base font-extrabold tracking-tight text-gray-900 sm:text-lg'
                                    >
                                        {title}
                                    </h2>
                                )}

                                {subtitle && (
                                    <p className='mt-0.5 break-words text-xs leading-5 text-gray-500'>
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {showClose && (
                            <button
                                type='button'
                                onClick={() => onCloseRef.current?.()}
                                aria-label='Close dialog'
                                className='absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95 sm:right-4'
                            >
                                <MdClose size={21} />
                            </button>
                        )}
                    </div>
                )}

                <div
                    className='min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6'
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    <div className='w-full min-w-0 max-w-full text-gray-800'>
                        {children}
                    </div>
                </div>

                {actions && (
                    <div
                        className='shrink-0 border-t border-gray-100 bg-white/95 px-3 pt-3 sm:px-6 sm:py-4'
                        style={{
                            paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
                        }}
                    >
                        <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
                            {actions}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

export default Dialog
