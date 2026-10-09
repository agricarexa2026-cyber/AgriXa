
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
    FaCheck,
    FaCheckCircle,
    FaChevronDown,
    FaEnvelope,
    FaEye,
    FaEyeSlash,
    FaLeaf,
    FaLock,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaUser,
    FaBriefcase
} from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import api from '../../services/api'
import { sha256 } from '../../utils/crypto'
import {
    deleteCookie,
    getCookie,
    setSessionCookie
} from '../../utils/cookies'

import heroMinecraft from '../../assets/hero-minecraft.jpg'
import heroBackground from '../../assets/hero-background.jpg'

const Register = () => {
    const navigate = useNavigate()
    const theme = useSelector((state) => state.theme)
    const primaryColor = theme?.primaryColor || '#15803d'

    const [step, setStep] = useState(1)
    const [role, setRole] = useState('')
    const [otp, setOtp] = useState('')
    const [positions, setPositions] = useState([])

    const [form, setForm] = useState({
        mobileNumber: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        username: '',
        barangay: '',
        positionId: ''
    })

    const [status, setStatus] = useState({
        mobile: null,
        email: null,
        username: null
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [otpMessage, setOtpMessage] = useState('')
    const [error, setError] = useState('')

    const passwordRules = [
        ['8+ characters', form.password.length >= 8],
        ['Uppercase letter', /[A-Z]/.test(form.password)],
        ['Number', /\d/.test(form.password)],
        ['Special character', /[!@#$%^&*(),.?":{}|<>]/.test(form.password)]
    ]

    const passwordValid = passwordRules.every(([, valid]) => valid)

    const updateForm = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const updateProfile = (e) => {
        const { name, value } = e.target
        setProfile((prev) => ({ ...prev, [name]: value }))
    }

    useEffect(() => {
        if (resendCooldown <= 0) return

        const timer = setTimeout(() => {
            setResendCooldown((prev) => Math.max(0, prev - 1))
        }, 1000)

        return () => clearTimeout(timer)
    }, [resendCooldown])

    useEffect(() => {
        const mobile = getCookie('pendingMobile')
        if (!mobile) return

        api.get(`/auth/check-pending/?mobile=${encodeURIComponent(mobile)}`)
            .then(({ data }) => {
                if (data.status !== 'verified') {
                    if (data.status === 'none') deleteCookie('pendingMobile')
                    return
                }

                setForm((prev) => ({
                    ...prev,
                    mobileNumber: mobile
                }))

                if (data.role === 'farmer') {
                    setRole('farmer')
                }

                if (data.role === 'extension_worker') {
                    setRole('extension')
                }

                setStep(3)
            })
            .catch(() => deleteCookie('pendingMobile'))
    }, [])

    useEffect(() => {
        if (role !== 'extension') {
            setPositions([])
            return
        }

        api.get('/positions/')
            .then(({ data }) => {
                const list = Array.isArray(data) ? data : []
                setPositions(list.filter((x) => x.isActive !== false))
            })
            .catch(() => setPositions([]))
    }, [role])

    useEffect(() => {
        const checks = [
            {
                key: 'mobile',
                value: form.mobileNumber,
                url: `/auth/check-mobile/?mobile=${encodeURIComponent(form.mobileNumber)}`
            },
            {
                key: 'email',
                value: form.email,
                url: `/auth/check-email/?email=${encodeURIComponent(form.email)}`
            },
            {
                key: 'username',
                value: profile.username,
                url: `/auth/check-username/?username=${encodeURIComponent(profile.username)}`
            }
        ]

        const timers = checks.map(({ key, value, url }) => {
            if (!value?.trim()) {
                setStatus((prev) => ({ ...prev, [key]: null }))
                return null
            }

            setStatus((prev) => ({ ...prev, [key]: 'checking' }))

            return setTimeout(async () => {
                try {
                    const { data } = await api.get(url)

                    setStatus((prev) => ({
                        ...prev,
                        [key]: data.available ? 'available' : 'taken'
                    }))
                } catch {
                    setStatus((prev) => ({
                        ...prev,
                        [key]: null
                    }))
                }
            }, 500)
        })

        return () => timers.forEach((timer) => timer && clearTimeout(timer))
    }, [form.mobileNumber, form.email, profile.username])

    const startRegistration = async (e) => {
        e.preventDefault()
        setError('')
        setOtpMessage('')

        if (!role) {
            return setError('Please select an account type.')
        }

        if (!/^09\d{9}$/.test(form.mobileNumber.trim())) {
            return setError('Please enter a valid 11-digit Philippine mobile number.')
        }

        if (!form.email.trim()) {
            return setError('Email address is required.')
        }

        if (status.mobile === 'taken') {
            return setError('Mobile number is already registered.')
        }

        if (status.email === 'taken') {
            return setError('Email address is already registered.')
        }

        if (!passwordValid) {
            return setError('Please complete all password requirements.')
        }

        if (form.password !== form.confirmPassword) {
            return setError('Passwords do not match.')
        }

        setLoading(true)

        try {
            const apiRole = role === 'farmer'
                ? 'farmer'
                : 'extension_worker'

            const password = await sha256(form.password)

            await api.post('/auth/register/', {
                mobileNumber: form.mobileNumber.trim(),
                email: form.email.trim(),
                password,
                role: apiRole
            })

            setSessionCookie('pendingMobile', form.mobileNumber.trim())
            setOtp('')
            setOtpMessage('')
            setResendCooldown(30)
            setStep(2)
        } catch (err) {
            setError(
                err.response?.data?.error ||
                firstApiError(err.response?.data) ||
                'Registration failed. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    const resendOtp = async () => {
        if (resending || loading || resendCooldown > 0) return

        setResending(true)
        setError('')
        setOtpMessage('')

        try {
            await api.post('/auth/send-otp/', {
                mobileNumber: form.mobileNumber.trim()
            })

            setOtp('')
            setResendCooldown(30)
            setOtpMessage('A new verification code has been requested.')
        } catch (err) {
            setError(
                err.response?.data?.error ||
                firstApiError(err.response?.data) ||
                'Unable to resend OTP. Please try again.'
            )
        } finally {
            setResending(false)
        }
    }

    const verifyOtp = async (e) => {
        e.preventDefault()
        setError('')
        setOtpMessage('')

        if (!/^\d{6}$/.test(otp.trim())) {
            return setError('Please enter a valid 6-digit verification code.')
        }

        setLoading(true)

        try {
            await api.post('/auth/verify-otp/', {
                mobileNumber: form.mobileNumber.trim(),
                otp: otp.trim(),
                isRegistration: true
            })

            setOtp('')
            setStep(3)
        } catch (err) {
            setError(
                err.response?.data?.error ||
                firstApiError(err.response?.data) ||
                'Invalid or expired verification code.'
            )
        } finally {
            setLoading(false)
        }
    }

    const completeRegistration = async (e) => {
        e.preventDefault()
        setError('')

        if (!profile.firstName.trim()) return setError('First name is required.')
        if (!profile.lastName.trim()) return setError('Last name is required.')
        if (!profile.username.trim()) return setError('Username is required.')
        if (status.username === 'taken') return setError('Username is already taken.')

        if (role === 'farmer' && !profile.barangay.trim()) {
            return setError('Barangay is required.')
        }

        if (role === 'extension' && !profile.positionId) {
            return setError('Please select your position.')
        }

        setLoading(true)

        try {
            await api.post('/auth/complete-registration/', {
                mobileNumber: form.mobileNumber.trim(),
                firstName: profile.firstName.trim(),
                lastName: profile.lastName.trim(),
                username: profile.username.trim(),
                barangay: role === 'farmer' ? profile.barangay.trim() : '',
                positionId: role === 'extension' ? profile.positionId : ''
            })

            deleteCookie('pendingMobile')
            setStep(4)
        } catch (err) {
            setError(
                err.response?.data?.error ||
                firstApiError(err.response?.data) ||
                'Unable to complete registration.'
            )
        } finally {
            setLoading(false)
        }
    }

    const changeRole = (e) => {
        const value = e.target.value

        setRole(value)
        setProfile((prev) => ({
            ...prev,
            barangay: value === 'farmer' ? prev.barangay : '',
            positionId: value === 'extension' ? prev.positionId : ''
        }))
    }

    const backgroundImage = theme?.minecraftMode
        ? heroMinecraft
        : heroBackground

    return (
        <main
            className='min-h-screen flex items-center justify-center px-4 py-8 relative'
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            <div className='absolute inset-0 bg-black/55' />

            <div className='relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl px-6 py-7 sm:px-9 sm:py-8'>
                <Header primaryColor={primaryColor} />

                {step < 4 && (
                    <Steps step={step} primaryColor={primaryColor} />
                )}

                {error && (
                    <div className='mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600'>
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={startRegistration} className='mt-6 space-y-4'>
                        <Field label='Register As'>
                            <div className='relative'>
                                <FaUser className='field-icon' />
                                <select
                                    value={role}
                                    onChange={changeRole}
                                    className='input appearance-none'
                                    required
                                >
                                    <option value=''>Select account type</option>
                                    <option value='farmer'>Farmer</option>
                                    <option value='extension'>Extension Worker</option>
                                </select>
                                <FaChevronDown className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs' />
                            </div>

                            {role === 'extension' && (
                                <p className='mt-1.5 text-xs text-amber-600'>
                                    Extension Worker accounts require administrator approval.
                                </p>
                            )}
                        </Field>

                        <div className='grid sm:grid-cols-2 gap-4'>
                            <Field label='Mobile Number'>
                                <StatusInput
                                    icon={<FaPhoneAlt />}
                                    type='tel'
                                    value={form.mobileNumber}
                                    status={status.mobile}
                                    placeholder='09XXXXXXXXX'
                                    maxLength={11}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            mobileNumber: e.target.value.replace(/\D/g, '')
                                        }))
                                    }
                                />
                            </Field>

                            <Field label='Email Address'>
                                <StatusInput
                                    icon={<FaEnvelope />}
                                    type='email'
                                    name='email'
                                    value={form.email}
                                    status={status.email}
                                    placeholder='name@example.com'
                                    onChange={updateForm}
                                />
                            </Field>
                        </div>

                        <Field label='Password'>
                            <PasswordInput
                                name='password'
                                value={form.password}
                                show={showPassword}
                                onChange={updateForm}
                                toggle={() => setShowPassword((prev) => !prev)}
                                placeholder='Create a password'
                            />
                        </Field>

                        <div className='grid grid-cols-2 gap-x-4 gap-y-2 bg-gray-50 border border-gray-100 rounded-xl p-3'>
                            {passwordRules.map(([text, valid]) => (
                                <div
                                    key={text}
                                    className={`flex items-center gap-2 text-xs ${
                                        valid ? 'text-green-700' : 'text-gray-400'
                                    }`}
                                >
                                    <FaCheck className={valid ? 'text-green-500' : 'text-gray-300'} />
                                    {text}
                                </div>
                            ))}
                        </div>

                        <Field label='Confirm Password'>
                            <PasswordInput
                                name='confirmPassword'
                                value={form.confirmPassword}
                                show={showConfirm}
                                onChange={updateForm}
                                toggle={() => setShowConfirm((prev) => !prev)}
                                placeholder='Confirm your password'
                            />
                        </Field>

                        {form.confirmPassword &&
                            form.password !== form.confirmPassword && (
                                <p className='text-xs text-red-500'>
                                    Passwords do not match.
                                </p>
                            )}

                        <SubmitButton loading={loading} primaryColor={primaryColor}>
                            Continue
                        </SubmitButton>

                        <p className='text-center text-sm text-gray-500'>
                            Already have an account?{' '}
                            <Link
                                to='/login'
                                className='font-bold hover:underline'
                                style={{ color: primaryColor }}
                            >
                                Sign In
                            </Link>
                        </p>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={verifyOtp} className='mt-7 space-y-5'>
                        <div className='text-center'>
                            <div className='w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center'>
                                <FaPhoneAlt
                                    className='text-2xl'
                                    style={{ color: primaryColor }}
                                />
                            </div>

                            <h2 className='font-bold text-gray-900 mt-4 text-xl'>
                                Verify your mobile number
                            </h2>

                            <p className='text-sm text-gray-500 mt-2'>
                                Enter the 6-digit verification code sent via SMS to
                            </p>

                            <p className='text-base font-bold text-gray-800 mt-2'>
                                {form.mobileNumber}
                            </p>

                            <p className='text-xs text-gray-400 mt-2'>
                                Your verification code is valid for 5 minutes.
                            </p>
                        </div>

                        <div>
                            <input
                                type='text'
                                inputMode='numeric'
                                autoComplete='one-time-code'
                                maxLength={6}
                                value={otp}
                                onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                                    setError('')
                                    setOtpMessage('')
                                }}
                                placeholder='000000'
                                autoFocus
                                required
                                className='w-full h-14 text-center tracking-[0.4em] text-xl font-bold rounded-xl border border-gray-200 bg-gray-50 outline-none focus:bg-white focus:border-green-600 focus:ring-2 focus:ring-green-100'
                            />

                            <p className='text-center text-xs text-gray-400 mt-2'>
                                Enter the code you received on your phone.
                            </p>
                        </div>

                        {otpMessage && (
                            <div className='rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center'>
                                {otpMessage}
                            </div>
                        )}

                        <SubmitButton loading={loading} primaryColor={primaryColor}>
                            Verify & Continue
                        </SubmitButton>

                        <div className='text-center'>
                            <p className='text-sm text-gray-500'>
                                Didn't receive the code?
                            </p>

                            <button
                                type='button'
                                onClick={resendOtp}
                                disabled={resending || resendCooldown > 0 || loading}
                                className='mt-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:underline'
                                style={{ color: primaryColor }}
                            >
                                {resending
                                    ? 'Sending...'
                                    : resendCooldown > 0
                                        ? `Resend code in ${resendCooldown}s`
                                        : 'Resend SMS Code'}
                            </button>
                        </div>

                        <button
                            type='button'
                            onClick={() => {
                                setError('')
                                setOtpMessage('')
                                setOtp('')
                                setStep(1)
                            }}
                            className='w-full text-sm text-gray-400 hover:text-gray-700'
                        >
                            ← Back to Account Setup
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={completeRegistration} className='mt-6 space-y-4'>
                        <div className='grid sm:grid-cols-2 gap-4'>
                            <Field label='First Name'>
                                <Input
                                    icon={<FaUser />}
                                    name='firstName'
                                    value={profile.firstName}
                                    onChange={updateProfile}
                                    placeholder='First name'
                                />
                            </Field>

                            <Field label='Last Name'>
                                <Input
                                    icon={<FaUser />}
                                    name='lastName'
                                    value={profile.lastName}
                                    onChange={updateProfile}
                                    placeholder='Last name'
                                />
                            </Field>
                        </div>

                        <Field label='Username'>
                            <StatusInput
                                icon={<FaUser />}
                                name='username'
                                value={profile.username}
                                status={status.username}
                                onChange={updateProfile}
                                placeholder='Choose a username'
                            />
                        </Field>

                        {role === 'farmer' && (
                            <Field label='Barangay'>
                                <Input
                                    icon={<FaMapMarkerAlt />}
                                    name='barangay'
                                    value={profile.barangay}
                                    onChange={updateProfile}
                                    placeholder='Enter your barangay'
                                />
                            </Field>
                        )}

                        {role === 'extension' && (
                            <Field label='Position'>
                                <div className='relative'>
                                    <FaBriefcase className='field-icon' />
                                    <select
                                        name='positionId'
                                        value={profile.positionId}
                                        onChange={updateProfile}
                                        className='input appearance-none'
                                        required
                                    >
                                        <option value=''>Select your position</option>

                                        {positions.map((position) => (
                                            <option key={position.id} value={position.id}>
                                                {position.name}
                                            </option>
                                        ))}
                                    </select>
                                    <FaChevronDown className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs' />
                                </div>
                            </Field>
                        )}

                        <SubmitButton loading={loading} primaryColor={primaryColor}>
                            Complete Registration
                        </SubmitButton>
                    </form>
                )}

                {step === 4 && (
                    <div className='text-center py-8'>
                        <div className='w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center'>
                            <FaCheckCircle className='text-4xl text-green-600' />
                        </div>

                        <h2 className='text-2xl font-bold text-gray-900 mt-5'>
                            {role === 'farmer'
                                ? 'Account Created!'
                                : 'Registration Submitted!'}
                        </h2>

                        <p className='text-sm text-gray-500 leading-6 mt-3'>
                            {role === 'farmer'
                                ? 'Your AgriCare account is ready. You can now sign in.'
                                : 'Your Extension Worker account is waiting for administrator approval.'}
                        </p>

                        <button
                            type='button'
                            onClick={() =>
                                navigate(
                                    role === 'farmer'
                                        ? '/login'
                                        : '/pending-approval'
                                )
                            }
                            className='w-full h-12 mt-7 rounded-xl text-white text-sm font-semibold hover:opacity-90'
                            style={{ backgroundColor: primaryColor }}
                        >
                            {role === 'farmer'
                                ? 'Go to Login'
                                : 'View Approval Status'}
                        </button>
                    </div>
                )}

                {step < 4 && (
                    <button
                        type='button'
                        onClick={() => navigate('/')}
                        className='w-full h-11 mt-6 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 flex items-center justify-center gap-2 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:scale-[0.99]'
                    >
                        <span className='text-base'>←</span>
                        Back to AgriCare Home
                    </button>
                )}
            </div>

            <style>{`
                .input {
                    width: 100%;
                    height: 3rem;
                    padding-left: 2.75rem;
                    padding-right: 1rem;
                    border: 1px solid #e5e7eb;
                    border-radius: .75rem;
                    background: #f9fafb;
                    font-size: .875rem;
                    outline: none;
                    transition: .15s;
                }

                .input:focus {
                    background: white;
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22,163,74,.10);
                }

                .field-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                    font-size: .875rem;
                }
            `}</style>
        </main>
    )
}

const Header = ({ primaryColor }) => (
    <div className='text-center'>
        <div
            className='w-12 h-12 mx-auto rounded-2xl flex items-center justify-center shadow-sm'
            style={{ backgroundColor: primaryColor }}
        >
            <FaLeaf className='text-white text-xl' />
        </div>

        <h1
            className='text-2xl font-bold mt-3'
            style={{ color: primaryColor }}
        >
            AgriCare
        </h1>

        <h2 className='text-lg font-bold text-gray-900 mt-4'>
            Create your AgriCare Account
        </h2>

        <p className='text-xs text-gray-400 mt-1'>
            Register to access AgriCare services.
        </p>
    </div>
)

const Steps = ({ step, primaryColor }) => (
    <div className='flex items-center justify-center mt-6'>
        {['Account', 'Verify', 'Profile'].map((label, index) => {
            const number = index + 1
            const active = step >= number

            return (
                <div key={label} className='flex items-center last:flex-none'>
                    <div className='flex flex-col items-center'>
                        <div
                            className='w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2'
                            style={{
                                backgroundColor: active ? primaryColor : 'white',
                                borderColor: active ? primaryColor : '#e5e7eb',
                                color: active ? 'white' : '#9ca3af'
                            }}
                        >
                            {step > number ? <FaCheck /> : number}
                        </div>

                        <span className='text-[10px] text-gray-500 mt-1'>
                            {label}
                        </span>
                    </div>

                    {index < 2 && (
                        <div
                            className='w-12 sm:w-20 h-0.5 mx-2 mb-4'
                            style={{
                                backgroundColor:
                                    step > number ? primaryColor : '#e5e7eb'
                            }}
                        />
                    )}
                </div>
            )
        })}
    </div>
)

const Field = ({ label, children }) => (
    <div>
        <label className='block text-sm font-semibold text-gray-700 mb-1.5'>
            {label} <span className='text-red-500'>*</span>
        </label>
        {children}
    </div>
)

const Input = ({ icon, ...props }) => (
    <div className='relative'>
        <span className='field-icon'>{icon}</span>
        <input {...props} className='input' required />
    </div>
)

const StatusInput = ({ icon, status, ...props }) => (
    <div>
        <div className='relative'>
            <span className='field-icon'>{icon}</span>

            <input
                {...props}
                className={`input ${
                    status === 'taken'
                        ? '!border-red-400'
                        : status === 'available'
                            ? '!border-green-500'
                            : ''
                }`}
                required
            />

            <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                {status === 'checking' && (
                    <AiOutlineLoading3Quarters className='animate-spin text-gray-400' />
                )}

                {status === 'available' && (
                    <FaCheckCircle className='text-green-500' />
                )}

                {status === 'taken' && (
                    <span className='text-red-500 font-bold'>!</span>
                )}
            </div>
        </div>

        {status === 'taken' && (
            <p className='text-xs text-red-500 mt-1'>
                Already registered or unavailable.
            </p>
        )}
    </div>
)

const PasswordInput = ({ show, toggle, ...props }) => (
    <div className='relative'>
        <FaLock className='field-icon' />

        <input
            {...props}
            type={show ? 'text' : 'password'}
            className='input !pr-12'
            required
        />

        <button
            type='button'
            onClick={toggle}
            className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700'
        >
            {show ? <FaEyeSlash /> : <FaEye />}
        </button>
    </div>
)

const SubmitButton = ({ loading, primaryColor, children }) => (
    <button
        type='submit'
        disabled={loading}
        className='w-full h-12 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[.99] disabled:opacity-60 transition'
        style={{ backgroundColor: primaryColor }}
    >
        {loading && (
            <AiOutlineLoading3Quarters className='animate-spin' />
        )}
        {loading ? 'Please wait...' : children}
    </button>
)

const firstApiError = (data) => {
    if (!data || typeof data !== 'object') return ''

    for (const value of Object.values(data)) {
        if (Array.isArray(value) && value.length) {
            return String(value[0])
        }

        if (typeof value === 'string') {
            return value
        }
    }

    return ''
}

export default Register
