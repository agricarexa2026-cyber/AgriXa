import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import heroMinecraft from '../../assets/hero-minecraft.jpg'
import heroBackground from '../../assets/hero-background.jpg'

import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'

import api from '../../services/api'
import { sha256 } from '../../utils/crypto'
import {
    getCookie,
    deleteCookie
} from '../../utils/cookies'


const ResetPassword = () => {
    const navigate = useNavigate()

    const theme = useSelector(
        (state) => state.theme
    )

    const [mobileNumber, setMobileNumber] = useState('')
    const [ready, setReady] = useState(false)

    const [form, setForm] = useState({
        password: '',
        confirmPassword: ''
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const [loadingMessage, setLoadingMessage] = useState(null)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)


    useEffect(() => {
        const mobile =
            getCookie('resetMobile') ||
            getCookie('pendingMobile')

        if (!mobile) {
            setError(
                'Invalid or expired password reset session. Please request a new verification code.'
            )

            setReady(true)
            return
        }

        setMobileNumber(mobile)
        setReady(true)
    }, [])


    const handleSubmit = async (e) => {
        e.preventDefault()

        setError(null)

        if (!mobileNumber) {
            setError(
                'Invalid or expired password reset session. Please request a new verification code.'
            )
            return
        }

        if (form.password.length < 8) {
            setError(
                'Password must be at least 8 characters.'
            )
            return
        }

        if (!/[A-Z]/.test(form.password)) {
            setError(
                'Password must contain at least one uppercase letter.'
            )
            return
        }

        if (!/\d/.test(form.password)) {
            setError(
                'Password must contain at least one number.'
            )
            return
        }

        if (
            !/[!@#$%^&*(),.?":{}|<>]/.test(
                form.password
            )
        ) {
            setError(
                'Password must contain at least one special character.'
            )
            return
        }

        if (
            form.password !==
            form.confirmPassword
        ) {
            setError(
                'Passwords do not match.'
            )
            return
        }

        setLoadingMessage(
            'Resetting password...'
        )

        try {
            const newPassword =
                await sha256(form.password)

            await api.post(
                '/auth/reset-password/',
                {
                    mobileNumber,
                    newPassword
                }
            )

            deleteCookie('resetMobile')
            deleteCookie('pendingMobile')

            setSuccess(true)
        } catch (err) {
            setError(
                err.response?.data?.error ||
                err.message ||
                'Failed to reset password. Please try again.'
            )
        } finally {
            setLoadingMessage(null)
        }
    }


    const backgroundImage =
        theme.minecraftMode
            ? heroMinecraft
            : heroBackground


    return (
        <div
            className='min-h-screen flex items-center justify-center relative'
            style={{
                backgroundImage:
                    `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            <div
                className='absolute inset-0'
                style={{
                    backgroundColor:
                        'rgba(0,0,0,0.55)'
                }}
            />

            <div className='relative z-10 w-full max-w-md mx-4'>

                <div className='flex flex-col items-center gap-2 mb-6 mt-8'>
                    <span className='text-5xl md:text-8xl font-bold text-white tracking-wide'>
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
                </div>


                <div
                    className='rounded-xl p-8 shadow-2xl'
                    style={{
                        backgroundColor:
                            theme.backgroundColor
                    }}
                >
                    <span
                        className='text-4xl font-semibold mb-4 block text-center'
                        style={{
                            color:
                                theme.textColor
                        }}
                    >
                        Reset Password
                    </span>


                    {error && (
                        <div
                            className='mb-4 p-3 rounded text-sm text-red-600'
                            style={{
                                backgroundColor:
                                    '#fee2e2'
                            }}
                        >
                            {error}
                        </div>
                    )}


                    {success ? (
                        <div className='flex flex-col items-center gap-4 text-center'>

                            <div
                                className='w-16 h-16 rounded-full flex items-center justify-center text-3xl'
                                style={{
                                    backgroundColor:
                                        '#dcfce7',
                                    border:
                                        '2px solid #16a34a'
                                }}
                            >
                                ✅
                            </div>

                            <p
                                className='text-sm'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Password reset successfully!
                            </p>

                            <Button
                                onClick={() =>
                                    navigate(
                                        '/login',
                                        {
                                            replace: true
                                        }
                                    )
                                }
                            >
                                Back to Login
                            </Button>

                        </div>
                    ) : ready && mobileNumber ? (

                        <form
                            onSubmit={handleSubmit}
                            className='flex flex-col gap-4'
                        >

                            <div className='flex flex-col gap-1'>

                                <label
                                    className='text-sm font-medium'
                                    style={{
                                        color:
                                            theme.textColor
                                    }}
                                >
                                    New Password
                                </label>

                                <div className='relative'>

                                    <input
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={
                                            form.password
                                        }
                                        onChange={(e) =>
                                            setForm(
                                                (prev) => ({
                                                    ...prev,
                                                    password:
                                                        e.target.value
                                                })
                                            )
                                        }
                                        placeholder='Enter new password'
                                        autoComplete='new-password'
                                        required
                                        className='w-full px-4 py-2.5 text-sm outline-none border pr-10'
                                        style={{
                                            borderRadius:
                                                theme.borderRadius,
                                            borderColor:
                                                theme.secondaryColor,
                                            backgroundColor:
                                                '#fff',
                                            color:
                                                theme.textColor
                                        }}
                                    />

                                    <button
                                        type='button'
                                        onClick={() =>
                                            setShowPassword(
                                                (prev) =>
                                                    !prev
                                            )
                                        }
                                        className='absolute right-3 top-1/2 -translate-y-1/2 opacity-50 cursor-pointer'
                                    >
                                        {showPassword
                                            ? (
                                                <FaEyeSlash
                                                    size={16}
                                                />
                                            )
                                            : (
                                                <FaEye
                                                    size={16}
                                                />
                                            )
                                        }
                                    </button>

                                </div>
                            </div>


                            <div className='flex flex-col gap-1'>

                                <label
                                    className='text-sm font-medium'
                                    style={{
                                        color:
                                            theme.textColor
                                    }}
                                >
                                    Confirm Password
                                </label>

                                <div className='relative'>

                                    <input
                                        type={
                                            showConfirm
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={
                                            form.confirmPassword
                                        }
                                        onChange={(e) =>
                                            setForm(
                                                (prev) => ({
                                                    ...prev,
                                                    confirmPassword:
                                                        e.target.value
                                                })
                                            )
                                        }
                                        placeholder='Confirm new password'
                                        autoComplete='new-password'
                                        required
                                        className='w-full px-4 py-2.5 text-sm outline-none border pr-10'
                                        style={{
                                            borderRadius:
                                                theme.borderRadius,
                                            borderColor:
                                                theme.secondaryColor,
                                            backgroundColor:
                                                '#fff',
                                            color:
                                                theme.textColor
                                        }}
                                    />

                                    <button
                                        type='button'
                                        onClick={() =>
                                            setShowConfirm(
                                                (prev) =>
                                                    !prev
                                            )
                                        }
                                        className='absolute right-3 top-1/2 -translate-y-1/2 opacity-50 cursor-pointer'
                                    >
                                        {showConfirm
                                            ? (
                                                <FaEyeSlash
                                                    size={16}
                                                />
                                            )
                                            : (
                                                <FaEye
                                                    size={16}
                                                />
                                            )
                                        }
                                    </button>

                                </div>
                            </div>


                            <div className='text-xs opacity-60'>
                                Password must contain at least
                                8 characters, one uppercase
                                letter, one number, and one
                                special character.
                            </div>


                            <Button
                                type='submit'
                                disabled={
                                    !!loadingMessage
                                }
                            >
                                Reset Password
                            </Button>

                        </form>

                    ) : !ready ? (

                        <div className='flex justify-center py-4'>
                            <AiOutlineLoading3Quarters
                                className='animate-spin'
                                size={28}
                                color={
                                    theme.primaryColor
                                }
                            />
                        </div>

                    ) : (

                        <div className='text-center mt-5'>
                            <Button
                                onClick={() =>
                                    navigate(
                                        '/forgot-password'
                                    )
                                }
                            >
                                Request New Code
                            </Button>
                        </div>

                    )}
                </div>


                <Dialog
                    isOpen={!!loadingMessage}
                    title={loadingMessage}
                >
                    <div className='flex justify-center py-2'>
                        <AiOutlineLoading3Quarters
                            size={28}
                            className='animate-spin'
                            color={
                                theme.primaryColor
                            }
                        />
                    </div>
                </Dialog>


            

            </div>
        </div>
    )
}


export default ResetPassword