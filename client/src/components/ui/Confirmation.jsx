import {
    MdCheckCircle,
    MdDeleteOutline,
    MdInfoOutline,
    MdOutlineWarningAmber
} from 'react-icons/md'

import Dialog from './Dialog'

const Confirmation = ({
    isOpen,
    title,
    message,
    icon: CustomIcon,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false
}) => {
    const variants = {
        success: {
            icon: MdCheckCircle,
            iconBox: 'bg-emerald-50 text-emerald-600',
            button:
                'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-100'
        },

        warning: {
            icon: MdOutlineWarningAmber,
            iconBox: 'bg-amber-50 text-amber-600',
            button:
                'bg-amber-600 hover:bg-amber-700 focus:ring-amber-100'
        },

        danger: {
            icon: MdDeleteOutline,
            iconBox: 'bg-red-50 text-red-600',
            button:
                'bg-red-600 hover:bg-red-700 focus:ring-red-100'
        },

        info: {
            icon: MdInfoOutline,
            iconBox: 'bg-blue-50 text-blue-600',
            button:
                'bg-blue-600 hover:bg-blue-700 focus:ring-blue-100'
        }
    }

    const selected =
        variants[variant] || variants.danger

    const Icon = CustomIcon || selected.icon

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onCancel}
            showClose={false}
            width='max-w-[430px]'
            mobileMaxH='max-h-[90dvh]'
        >
            <div className='px-1 py-1 text-center'>
                <div
                    className={`
                        mx-auto
                        flex h-16 w-16
                        items-center justify-center
                        rounded-2xl
                        ${selected.iconBox}
                    `}
                >
                    <Icon size={31} />
                </div>

                {title && (
                    <h2 className='mt-5 text-xl font-extrabold tracking-tight text-gray-900'>
                        {title}
                    </h2>
                )}

                {message && (
                    <p className='mx-auto mt-2 max-w-[340px] text-sm leading-6 text-gray-500'>
                        {message}
                    </p>
                )}

                <div className='mt-7 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5'>
                    <button
                        type='button'
                        disabled={loading}
                        onClick={onCancel}
                        className='h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {cancelText}
                    </button>

                    <button
                        type='button'
                        disabled={loading}
                        onClick={onConfirm}
                        className={`
                            h-11 rounded-xl
                            px-4
                            text-sm font-bold
                            text-white
                            shadow-sm
                            transition-all
                            hover:-translate-y-0.5
                            hover:shadow-md
                            focus:outline-none
                            focus:ring-4
                            active:translate-y-0
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            ${selected.button}
                        `}
                    >
                        {loading
                            ? 'Please wait...'
                            : confirmText}
                    </button>
                </div>
            </div>
        </Dialog>
    )
}

export default Confirmation