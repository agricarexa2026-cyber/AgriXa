import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FaEye, FaEyeSlash, FaLeaf, FaLock, FaUser } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import api from '../../services/api'
import {
    setCookie,
    REMEMBER_ME_DAYS,
    setSessionCookie
} from '../../utils/cookies'
import { setCredentials } from '../../store/slices/authSlice'
import { setAppLoading } from '../../store/slices/appSlice'

import heroMinecraft from '../../assets/hero-minecraft.jpg'
import heroBackground from '../../assets/hero-background.jpg'


const Login = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const theme = useSelector(
        (state) => state.theme
    )

    const isAuthenticated = useSelector(
        (state) => state.auth.isAuthenticated
    )

    const [form, setForm] = useState({
        identifier: '',
        password: '',
        rememberMe: false
    })

    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const primaryColor =
        theme?.primaryColor || '#15803d'

    if (isAuthenticated) {
        return (
            <Navigate
                to='/dashboard'
                replace
            />
        )
    }

    const updateForm = (e) => {
        const {
            name,
            value,
            checked,
            type
        } = e.target

        setForm((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }))
    }

    const handleLogin = async (e) => {
        e.preventDefault()

        setError('')
        setLoading(true)

        try {
            const identifier =
                form.identifier.trim()

            if (!identifier) {
                setError(
                    'Enter your username, email, or mobile number.'
                )
                return
            }

            if (!form.password) {
                setError(
                    'Enter your password.'
                )
                return
            }

            const res = await api.post(
                '/auth/login/',
                {
                    identifier,
                    password: form.password,
                    rememberMe: form.rememberMe
                }
            )

            const {
                access,
                user
            } = res.data

            if (!access || !user) {
                setError(
                    'Unable to sign in. Please try again.'
                )
                return
            }

            if (form.rememberMe) {
                setCookie(
                    'token',
                    access,
                    REMEMBER_ME_DAYS
                )
            } else {
                setSessionCookie(
                    'token',
                    access
                )
            }

            dispatch(
                setCredentials({
                    user,
                    token: access
                })
            )

            dispatch(
                setAppLoading(true)
            )

            navigate(
                '/dashboard',
                {
                    replace: true
                }
            )
        } catch (err) {
            const data =
                err.response?.data

            if (data?.isPending) {
                navigate(
                    '/pending-approval',
                    {
                        replace: true
                    }
                )
                return
            }

            if (data?.isIncomplete) {
                if (data.mobileNumber) {
                    setSessionCookie(
                        'pendingMobile',
                        data.mobileNumber
                    )
                }

                navigate(
                    '/register',
                    {
                        replace: true
                    }
                )
                return
            }

            setError(
                data?.error ||
                'Invalid username, email, mobile number, or password.'
            )
        } finally {
            setLoading(false)
        }
    }

    const backgroundImage =
        theme?.minecraftMode
            ? heroMinecraft
            : heroBackground

    return (
        <main
            className='min-h-screen flex items-center justify-center px-4 py-8 relative'
            style={{
                backgroundImage:
                    `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            <div className='absolute inset-0 bg-black/55' />

            <div className='relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl px-6 py-8 sm:px-9 sm:py-10'>
                <div className='text-center mb-8'>
                    <div
                        className='w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-sm mb-4'
                        style={{
                            backgroundColor:
                                primaryColor
                        }}
                    >
                        <FaLeaf className='text-white text-2xl' />
                    </div>

                    <h1
                        className='text-3xl font-bold'
                        style={{
                            color: primaryColor
                        }}
                    >
                        AgriCare
                    </h1>

                    <p className='text-xs text-gray-400 mt-1'>
                        Agricultural Assistance Platform
                    </p>
                </div>

                <div className='mb-6'>
                    <h2 className='text-xl font-bold text-gray-900'>
                        Welcome back
                    </h2>

                    <p className='text-sm text-gray-500 mt-1'>
                        Sign in to continue to your
                        AgriCare account.
                    </p>
                </div>

                {error && (
                    <div className='mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600'>
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleLogin}
                    className='space-y-5'
                >
                    <div>
                        <label className='block text-sm font-semibold text-gray-700 mb-2'>
                            Username, Email or Mobile Number
                        </label>

                        <div className='relative'>
                            <FaUser className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />

                            <input
                                type='text'
                                name='identifier'
                                value={form.identifier}
                                onChange={updateForm}
                                placeholder='Enter your account'
                                autoComplete='username'
                                required
                                className='w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none transition focus:bg-white focus:border-green-600 focus:ring-2 focus:ring-green-100'
                            />
                        </div>
                    </div>

                    <div>
                        <div className='flex justify-between items-center mb-2'>
                            <label className='text-sm font-semibold text-gray-700'>
                                Password
                            </label>

                            <Link
                                to='/forgot-password'
                                className='text-xs font-semibold hover:underline'
                                style={{
                                    color: primaryColor
                                }}
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <div className='relative'>
                            <FaLock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />

                            <input
                                type={
                                    showPassword
                                        ? 'text'
                                        : 'password'
                                }
                                name='password'
                                value={form.password}
                                onChange={updateForm}
                                placeholder='Enter your password'
                                autoComplete='current-password'
                                required
                                className='w-full h-12 pl-11 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none transition focus:bg-white focus:border-green-600 focus:ring-2 focus:ring-green-100'
                            />

                            <button
                                type='button'
                                onClick={() =>
                                    setShowPassword(
                                        (prev) => !prev
                                    )
                                }
                                className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700'
                                aria-label={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                            >
                                {showPassword
                                    ? <FaEyeSlash />
                                    : <FaEye />
                                }
                            </button>
                        </div>
                    </div>

                    <label className='flex items-center gap-2.5 w-fit cursor-pointer'>
                        <input
                            type='checkbox'
                            name='rememberMe'
                            checked={form.rememberMe}
                            onChange={updateForm}
                            className='w-4 h-4 rounded'
                            style={{
                                accentColor:
                                    primaryColor
                            }}
                        />

                        <span className='text-sm text-gray-600'>
                            Remember me
                        </span>
                    </label>

                    <button
                        type='submit'
                        disabled={loading}
                        className='w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60'
                        style={{
                            backgroundColor:
                                primaryColor
                        }}
                    >
                        {loading ? (
                            <>
                                <AiOutlineLoading3Quarters className='animate-spin' />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className='relative flex items-center my-7'>
                    <div className='flex-grow border-t border-gray-200' />

                    <span className='mx-4 text-xs text-gray-400'>
                        OR
                    </span>

                    <div className='flex-grow border-t border-gray-200' />
                </div>

                <p className='text-center text-sm text-gray-500'>
                    Don't have an account?{' '}

                    <Link
                        to='/register'
                        className='font-bold hover:underline'
                        style={{
                            color: primaryColor
                        }}
                    >
                        Create Account
                    </Link>
                </p>

                <button
                type='button'
                onClick={() => navigate('/')}
                className='w-full h-11 mt-6 rounded-xl border border-gray-200 bg-white
                        text-sm font-medium text-gray-600
                        flex items-center justify-center gap-2
                        transition-all duration-200
                        hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900
                        active:scale-[0.99]'
            >
                <span className='text-base'>←</span>
                Back to AgriCare Home
            </button>
            </div>
        </main>
    )
}

export default Login