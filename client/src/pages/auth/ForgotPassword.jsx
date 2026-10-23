
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import api from '../../services/api'
import heroMinecraft from '../../assets/hero-minecraft.jpg'
import heroBackground from '../../assets/hero-background.jpg'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'

const ForgotPassword = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const role = searchParams.get('role')
    const loginPath = role === 'admin'
        ? '/admin-login'
        : `/login?role=${role === 'extension' ? 'extension' : 'farmer'}`

    const theme = useSelector(state => state.theme)

    const [loadingMessage, setLoadingMessage] = useState(null)
    const [step, setStep] = useState(1)
    const [identifier, setIdentifier] = useState('')
    const [mobileNumber, setMobileNumber] = useState('')
    const [otp, setOtp] = useState('')
    const [form, setForm] = useState({
        password: '',
        confirmPassword: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState(null)

    const normalizeInput = value =>
        String(value || '').replace(/\D/g, '').slice(0, 11)

    const isValidMobile = value => /^09\d{9}$/.test(value)

    const getErrorMessage = (err, fallback) => {
        const data = err.response?.data

        if (typeof data?.error === 'string') return data.error
        if (typeof data?.detail === 'string') return data.detail

        if (data && typeof data === 'object') {
            const first = Object.values(data)[0]
            if (Array.isArray(first)) return first.join(' ')
            if (typeof first === 'string') return first
        }

        return fallback
    }

    const handleStep1 = async e => {
        e?.preventDefault?.()

        const mobile = normalizeInput(identifier)

        if (!isValidMobile(mobile)) {
            setError('Please enter a valid 11-digit Philippine mobile number.')
            return
        }

        setLoadingMessage('Sending OTP...')
        setError(null)

        try {
            const res = await api.post('/auth/forgot-password/', {
                mobileNumber: mobile
            })

            setMobileNumber(res.data.mobileNumber || mobile)
            setOtp('')
            setStep(2)
        } catch (err) {
            setError(getErrorMessage(
                err,
                'Unable to send SMS verification code. Please try again.'
            ))
        } finally {
            setLoadingMessage(null)
        }
    }

    const handleStep2 = async e => {
        e.preventDefault()

        const code = otp.trim()

        if (!/^\d{4,8}$/.test(code)) {
            setError('Please enter a valid OTP code.')
            return
        }

        setLoadingMessage('Verifying OTP...')
        setError(null)

        try {
            await api.post('/auth/verify-otp/', {
                mobileNumber,
                otp: code,
                isRegistration: false
            })

            setStep(3)
        } catch (err) {
            setError(getErrorMessage(
                err,
                'Invalid or expired OTP. Please try again.'
            ))
        } finally {
            setLoadingMessage(null)
        }
    }

    const handleStep3 = async e => {
        e.preventDefault()
        setError(null)

        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoadingMessage('Resetting password...')

        try {
            await api.post('/auth/reset-password/', {
                mobileNumber,
                newPassword: form.password
            })

            setForm({
                password: '',
                confirmPassword: ''
            })
            setOtp('')
            setStep(4)
        } catch (err) {
            setError(getErrorMessage(
                err,
                'Failed to reset password. Please try again.'
            ))
        } finally {
            setLoadingMessage(null)
        }
    }

    const inputStyle = {
        borderRadius: theme.borderRadius,
        borderColor: theme.secondaryColor,
        backgroundColor: '#fff',
        color: theme.textColor,
        fontSize: '16px'
    }

    return (
        <div
            className='min-h-screen flex items-center justify-center relative px-4 py-8'
            style={{
                backgroundImage: `url(${theme.minecraftHero ? heroMinecraft : heroBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '100dvh'
            }}
        >
            <div
                className='absolute inset-0'
                style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            />

            <div className='relative z-10 w-full max-w-md'>
                <div className='flex flex-col items-center gap-2 mb-6'>
                    <span className='text-5xl md:text-7xl font-bold text-white tracking-wide'>
                        Agri
                        <span style={{ color: theme.secondaryColor }}>
                            Care
                        </span>
                    </span>
                </div>

                <div
                    className='rounded-xl p-6 sm:p-8 shadow-2xl'
                    style={{ backgroundColor: theme.backgroundColor }}
                >
                    <h1
                        className='text-3xl sm:text-4xl font-semibold mb-3 text-center'
                        style={{ color: theme.textColor }}
                    >
                        Forgot Password
                    </h1>

                    {step !== 4 && (
                        <p
                            className='text-sm text-center mb-6 opacity-70'
                            style={{ color: theme.textColor }}
                        >
                            {step === 1
                                ? 'Enter your registered mobile number to receive an SMS verification code.'
                                : step === 2
                                    ? 'Enter the verification code sent to your mobile number.'
                                    : 'Create a new password for your account.'}
                        </p>
                    )}

                    {step !== 4 && (
                        <div className='flex items-center justify-center gap-2 mb-6'>
                            {[1, 2, 3].map(number => (
                                <div
                                    key={number}
                                    className='h-1.5 flex-1 rounded-full'
                                    style={{
                                        backgroundColor: step >= number
                                            ? theme.primaryColor
                                            : '#d1d5db'
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div
                            role='alert'
                            className='mb-4 p-3 rounded text-sm text-red-700'
                            style={{ backgroundColor: '#fee2e2' }}
                        >
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form
                            onSubmit={handleStep1}
                            className='flex flex-col gap-4'
                        >
                            <div className='flex flex-col gap-1.5'>
                                <label
                                    htmlFor='recovery-mobile'
                                    className='text-sm font-medium'
                                    style={{ color: theme.textColor }}
                                >
                                    Mobile Number
                                </label>

                                <input
                                    id='recovery-mobile'
                                    type='tel'
                                    inputMode='numeric'
                                    autoComplete='tel-national'
                                    value={identifier}
                                    onChange={e => {
                                        setIdentifier(
                                            normalizeInput(e.target.value)
                                        )
                                        if (error) setError(null)
                                    }}
                                    placeholder='09XXXXXXXXX'
                                    pattern='09[0-9]{9}'
                                    title='Enter a valid 11-digit Philippine mobile number'
                                    maxLength={11}
                                    required
                                    className='w-full px-4 py-3 text-sm outline-none border'
                                    style={inputStyle}
                                />

                                <p
                                    className='text-xs opacity-60'
                                    style={{ color: theme.textColor }}
                                >
                                    Use the mobile number registered with your AgriCare account.
                                </p>
                            </div>

                            <Button
                                type='submit'
                                disabled={!!loadingMessage}
                            >
                                Send OTP
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form
                            onSubmit={handleStep2}
                            className='flex flex-col gap-4'
                        >
                            <div
                                className='rounded-lg p-3 text-center'
                                style={{
                                    backgroundColor: `${theme.primaryColor}12`
                                }}
                            >
                                <p
                                    className='text-xs mb-1 opacity-70'
                                    style={{ color: theme.textColor }}
                                >
                                    Verification code sent to
                                </p>
                                <p
                                    className='text-sm font-semibold'
                                    style={{ color: theme.primaryColor }}
                                >
                                    {mobileNumber}
                                </p>
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label
                                    htmlFor='recovery-otp'
                                    className='text-sm font-medium'
                                    style={{ color: theme.textColor }}
                                >
                                    Enter OTP
                                </label>

                                <input
                                    id='recovery-otp'
                                    type='text'
                                    inputMode='numeric'
                                    autoComplete='one-time-code'
                                    value={otp}
                                    onChange={e => {
                                        setOtp(
                                            e.target.value
                                                .replace(/\D/g, '')
                                                .slice(0, 8)
                                        )
                                        if (error) setError(null)
                                    }}
                                    placeholder='Enter verification code'
                                    required
                                    maxLength={8}
                                    className='w-full px-4 py-3 text-center tracking-[0.3em] outline-none border'
                                    style={inputStyle}
                                />
                            </div>

                            <Button
                                type='submit'
                                disabled={!!loadingMessage || !otp.trim()}
                            >
                                Verify OTP
                            </Button>

                            <div className='flex items-center justify-between gap-3'>
                                <button
                                    type='button'
                                    disabled={!!loadingMessage}
                                    onClick={() => {
                                        setStep(1)
                                        setOtp('')
                                        setError(null)
                                    }}
                                    className='text-xs font-semibold underline'
                                    style={{ color: theme.primaryColor }}
                                >
                                    Change Number
                                </button>

                                <button
                                    type='button'
                                    disabled={!!loadingMessage}
                                    onClick={() => handleStep1()}
                                    className='text-xs font-semibold underline'
                                    style={{ color: theme.primaryColor }}
                                >
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form
                            onSubmit={handleStep3}
                            className='flex flex-col gap-4'
                        >
                            <div
                                className='rounded-lg p-3 text-sm text-center'
                                style={{
                                    color: '#15803d',
                                    backgroundColor: '#dcfce7'
                                }}
                            >
                                Mobile number verified successfully.
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label
                                    htmlFor='new-password'
                                    className='text-sm font-medium'
                                    style={{ color: theme.textColor }}
                                >
                                    New Password
                                </label>

                                <div className='relative'>
                                    <input
                                        id='new-password'
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e =>
                                            setForm(prev => ({
                                                ...prev,
                                                password: e.target.value
                                            }))
                                        }
                                        placeholder='At least 8 characters'
                                        autoComplete='new-password'
                                        required
                                        minLength={8}
                                        className='w-full px-4 py-3 outline-none border pr-12'
                                        style={inputStyle}
                                    />

                                    <button
                                        type='button'
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className='absolute right-3 top-1/2 -translate-y-1/2 opacity-60'
                                    >
                                        {showPassword
                                            ? <FaEyeSlash size={17} />
                                            : <FaEye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label
                                    htmlFor='confirm-password'
                                    className='text-sm font-medium'
                                    style={{ color: theme.textColor }}
                                >
                                    Confirm Password
                                </label>

                                <div className='relative'>
                                    <input
                                        id='confirm-password'
                                        type={showConfirm ? 'text' : 'password'}
                                        value={form.confirmPassword}
                                        onChange={e =>
                                            setForm(prev => ({
                                                ...prev,
                                                confirmPassword: e.target.value
                                            }))
                                        }
                                        placeholder='Confirm new password'
                                        autoComplete='new-password'
                                        required
                                        minLength={8}
                                        className='w-full px-4 py-3 outline-none border pr-12'
                                        style={inputStyle}
                                    />

                                    <button
                                        type='button'
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                        onClick={() =>
                                            setShowConfirm(!showConfirm)
                                        }
                                        className='absolute right-3 top-1/2 -translate-y-1/2 opacity-60'
                                    >
                                        {showConfirm
                                            ? <FaEyeSlash size={17} />
                                            : <FaEye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type='submit'
                                disabled={!!loadingMessage}
                            >
                                Reset Password
                            </Button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className='flex flex-col items-center gap-4 text-center'>
                            <div
                                className='w-16 h-16 rounded-full flex items-center justify-center text-3xl'
                                style={{
                                    backgroundColor: '#dcfce7',
                                    border: '2px solid #16a34a'
                                }}
                            >
                                ✓
                            </div>

                            <h2
                                className='text-xl font-semibold'
                                style={{ color: theme.textColor }}
                            >
                                Password Reset Successful!
                            </h2>

                            <p
                                className='text-sm opacity-70'
                                style={{ color: theme.textColor }}
                            >
                                Your password has been updated. You can now sign in using your new password.
                            </p>

                            <Button
                                onClick={() => navigate(loginPath)}
                            >
                                Back to Login
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
                            color={theme.primaryColor}
                        />
                    </div>
                </Dialog>

                <button
                    type='button'
                    className='block mx-auto text-center text-sm text-white opacity-70 hover:opacity-100 mt-5 mb-8'
                    onClick={() => navigate('/')}
                >
                    ← Back to Home
                </button>
            </div>
        </div>
    )
}

export default ForgotPassword
