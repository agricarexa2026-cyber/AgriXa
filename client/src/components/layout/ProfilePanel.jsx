import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import {
    MdLock,
    MdLogout,
    MdDashboard,
    MdViewSidebar,
    MdCameraAlt,
    MdPerson,
    MdCheckCircle,
    MdArrowBack,
    MdSecurity,
    MdTune
} from 'react-icons/md'

import { AiOutlineLoading3Quarters } from 'react-icons/ai'

import {
    clearCredentials,
    updateProfilePicture
} from '../../store/slices/authSlice'

import { deleteCookie } from '../../utils/cookies'
import useLayout from '../../hooks/useLayout'

import Confirmation from '../ui/Confirmation'
import SidePanel from '../ui/SidePanel'

import api from '../../services/api'

import {
    setAppLoading,
    setSessionExpired,
    setUnauthorized
} from '../../store/slices/appSlice'


const ProfilePanel = ({ isOpen, onClose }) => {
    const theme = useSelector(state => state.theme)
    const { user } = useSelector(state => state.auth)

    const dispatch = useDispatch()
    const navigate = useNavigate()

  
    const [logoutConfirm, setLogoutConfirm] = useState(false)
    const [changePassOpen, setChangePassOpen] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const fileInputRef = useRef(null)


    /* =========================================================
       USER DISPLAY
    ========================================================= */

    const initials = user
        ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
            .toUpperCase()
        : 'U'


    const fullName = [
        user?.firstName,
        user?.lastName
    ]
        .filter(Boolean)
        .join(' ') || 'User'


    const roleLabel =
        user?.role
            ?.replace(/_/g, ' ')
            ?.replace(/\b\w/g, letter =>
                letter.toUpperCase()
            ) || 'User'


    /* =========================================================
       LOGOUT
    ========================================================= */

    const handleLogout = () => {
        setLogoutConfirm(false)

        onClose()

        dispatch(clearCredentials())

        deleteCookie('token')

        dispatch(setSessionExpired(false))
        dispatch(setUnauthorized(false))
        dispatch(setAppLoading(false))

        navigate(
            '/login',
            {
                replace: true
            }
        )
    }


    /* =========================================================
       CHANGE PASSWORD
    ========================================================= */

    const handleChangePassword = () => {
        setError(null)
        setSuccess(null)

        setChangePassOpen(true)
    }


    const closePasswordForm = () => {
        if (loading) return

        setChangePassOpen(false)

        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')

        setError(null)
    }


    const handleResetPassword = async () => {
        if (!currentPassword) {
            return setError(
                'Enter your current password.'
            )
        }

        if (newPassword.length < 8) {
            return setError(
                'New password must be at least 8 characters.'
            )
        }

        if (newPassword === currentPassword) {
            return setError(
                'Choose a different new password.'
            )
        }

        if (newPassword !== confirmPassword) {
            return setError(
                'Passwords do not match.'
            )
        }

        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            await api.post(
                '/auth/change-password/',
                {
                    currentPassword,
                    newPassword
                }
            )

            setSuccess(
                'Password changed successfully!'
            )

            setChangePassOpen(false)

            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setError(
                err.response?.data?.error ||
                'Failed to change password.'
            )
        } finally {
            setLoading(false)
        }
    }


    /* =========================================================
       PROFILE PICTURE
    ========================================================= */

    const handleAvatarClick = () => {
        if (uploadingPhoto) return

        fileInputRef.current?.click()
    }


    const handleFileChange = async event => {
        const file = event.target.files?.[0]

        if (!file) return

        setUploadingPhoto(true)
        setError(null)
        setSuccess(null)

        try {
            const bitmap =
                await createImageBitmap(file)

            const size = 200

            const canvas =
                document.createElement('canvas')

            canvas.width = size
            canvas.height = size

            const ctx =
                canvas.getContext('2d')

            const scale = Math.max(
                size / bitmap.width,
                size / bitmap.height
            )

            const x =
                (size - bitmap.width * scale) / 2

            const y =
                (size - bitmap.height * scale) / 2

            ctx.drawImage(
                bitmap,
                x,
                y,
                bitmap.width * scale,
                bitmap.height * scale
            )

            const base64 =
                canvas.toDataURL(
                    'image/jpeg',
                    0.7
                )

            await api.post(
                '/users/profile-picture/',
                {
                    profilePicture: base64
                }
            )

            dispatch(
                updateProfilePicture(base64)
            )

            setSuccess(
                'Profile picture updated.'
            )
        } catch (err) {
            console.error(
                'Profile picture upload failed:',
                err
            )

            setError(
                'Could not upload profile picture.'
            )
        } finally {
            setUploadingPhoto(false)

            event.target.value = ''
        }
    }


    /* =========================================================
       PANEL HEADER
    ========================================================= */

    const profileHeader = (
        <div
            className='relative overflow-hidden'
            style={{
                background:
                    `linear-gradient(
                        135deg,
                        ${theme.primaryColor}10,
                        ${theme.primaryColor}04
                    )`
            }}
        >
            <div className='p-5'>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleFileChange}
                />

                <div className='flex items-center gap-4'>

                    {/* AVATAR */}
                    <button
                        type='button'
                        onClick={handleAvatarClick}
                        disabled={uploadingPhoto}
                        className='relative shrink-0 group'
                        title='Change profile picture'
                    >
                        {user?.profilePicture ? (
                            <img
                                src={user.profilePicture}
                                alt='Profile'
                                className='w-16 h-16 rounded-2xl object-cover shadow-sm'
                                style={{
                                    border:
                                        '3px solid #fff'
                                }}
                            />
                        ) : (
                            <div
                                className='w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm'
                                style={{
                                    backgroundColor:
                                        theme.primaryColor,

                                    color: '#fff',

                                    border:
                                        '3px solid #fff'
                                }}
                            >
                                {initials}
                            </div>
                        )}

                        <div
                            className='absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-105'
                            style={{
                                backgroundColor:
                                    theme.primaryColor,

                                border:
                                    '2px solid #fff'
                            }}
                        >
                            {uploadingPhoto ? (
                                <AiOutlineLoading3Quarters
                                    size={13}
                                    color='#fff'
                                    className='animate-spin'
                                />
                            ) : (
                                <MdCameraAlt
                                    size={14}
                                    color='#fff'
                                />
                            )}
                        </div>
                    </button>


                    {/* USER */}
                    <div className='min-w-0 flex-1'>

                        <div className='flex items-center gap-2'>

                            <h3
                                className='text-base font-bold truncate'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                {fullName}
                            </h3>

                            <MdCheckCircle
                                size={15}
                                color={
                                    theme.primaryColor
                                }
                                className='shrink-0'
                            />

                        </div>

                        <p
                            className='text-xs mt-0.5 capitalize opacity-55'
                            style={{
                                color:
                                    theme.textColor
                            }}
                        >
                            {roleLabel}
                        </p>

                        <div
                            className='inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[10px] font-semibold'
                            style={{
                                backgroundColor:
                                    `${theme.primaryColor}12`,

                                color:
                                    theme.primaryColor
                            }}
                        >
                            <span
                                className='w-1.5 h-1.5 rounded-full'
                                style={{
                                    backgroundColor:
                                        '#22c55e'
                                }}
                            />

                            Active account
                        </div>

                    </div>

                </div>
            </div>
        </div>
    )


    /* =========================================================
       PANEL FOOTER
    ========================================================= */

    const profileFooter =
        !changePassOpen ? (
            <div
                className='p-4'
                style={{
                    backgroundColor:
                        '#fffdf8'
                }}
            >
                <button
                    type='button'
                    onClick={() =>
                        setLogoutConfirm(true)
                    }
                    className='group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-all hover:-translate-y-[1px]'
                    style={{
                        backgroundColor:
                            `${theme.dangerColor}08`,

                        border:
                            `1px solid ${theme.dangerColor}30`
                    }}
                >
                    <div className='flex items-center gap-3'>

                        <div
                            className='w-9 h-9 rounded-lg flex items-center justify-center'
                            style={{
                                backgroundColor:
                                    `${theme.dangerColor}10`
                            }}
                        >
                            <MdLogout
                                size={18}
                                color={
                                    theme.dangerColor
                                }
                            />
                        </div>

                        <div className='text-left'>

                            <p
                                className='text-sm font-semibold'
                                style={{
                                    color:
                                        theme.dangerColor
                                }}
                            >
                                Logout
                            </p>

                            <p
                                className='text-[10px] opacity-55'
                                style={{
                                    color:
                                        theme.textColor
                                }}
                            >
                                Sign out of your account
                            </p>

                        </div>

                    </div>

                    <span
                        className='text-lg opacity-40 transition-transform group-hover:translate-x-0.5'
                        style={{
                            color:
                                theme.dangerColor
                        }}
                    >
                        ›
                    </span>

                </button>
            </div>
        ) : null


    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <>

            <SidePanel
                isOpen={isOpen}
                onClose={onClose}
                title='Profile'
                header={profileHeader}
                footer={profileFooter}
            >

                <div className='flex flex-col gap-4'>

                    {/* SUCCESS */}
                    {success && (
                        <div
                            className='flex items-start gap-2.5 px-3.5 py-3 rounded-xl'
                            style={{
                                color: '#15803d',
                                backgroundColor:
                                    '#f0fdf4',
                                border:
                                    '1px solid #bbf7d0'
                            }}
                        >
                            <MdCheckCircle
                                size={17}
                                className='shrink-0 mt-0.5'
                            />

                            <p className='text-xs leading-relaxed'>
                                {success}
                            </p>
                        </div>
                    )}


                    {/* ERROR */}
                    {error && (
                        <div
                            className='flex items-start gap-2.5 px-3.5 py-3 rounded-xl'
                            style={{
                                color: '#b91c1c',
                                backgroundColor:
                                    '#fef2f2',
                                border:
                                    '1px solid #fecaca'
                            }}
                        >
                            <MdCancel
                                size={17}
                                className='shrink-0 mt-0.5'
                            />

                            <p className='text-xs leading-relaxed'>
                                {error}
                            </p>
                        </div>
                    )}


                    {!changePassOpen ? (
                        <>

                            {/* ACCOUNT */}
                            <section>

                                <SectionTitle
                                    icon={MdPerson}
                                    title='Account'
                                    subtitle='Profile and security settings'
                                    theme={theme}
                                />

                                <button
                                    type='button'
                                    onClick={
                                        handleChangePassword
                                    }
                                    disabled={loading}
                                    className='group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-all hover:-translate-y-[1px] hover:shadow-sm'
                                    style={{
                                        backgroundColor:
                                            '#fff',

                                        border:
                                            `1px solid ${theme.secondaryColor}`
                                    }}
                                >

                                    <div className='flex items-center gap-3'>

                                        <div
                                            className='w-10 h-10 rounded-xl flex items-center justify-center'
                                            style={{
                                                backgroundColor:
                                                    `${theme.primaryColor}10`
                                            }}
                                        >
                                            <MdLock
                                                size={19}
                                                color={
                                                    theme.primaryColor
                                                }
                                            />
                                        </div>

                                        <div className='text-left'>

                                            <p
                                                className='text-sm font-semibold'
                                                style={{
                                                    color:
                                                        theme.textColor
                                                }}
                                            >
                                                Change Password
                                            </p>

                                            <p
                                                className='text-[10px] opacity-45 mt-0.5'
                                                style={{
                                                    color:
                                                        theme.textColor
                                                }}
                                            >
                                                Update your account password
                                            </p>

                                        </div>

                                    </div>

                                    <span
                                        className='text-xl opacity-30 transition-transform group-hover:translate-x-0.5'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        ›
                                    </span>

                                </button>

                            </section>


                         

                            {/* SECURITY NOTE */}
                            <div
                                className='flex gap-3 p-4 rounded-2xl'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}06`,

                                    border:
                                        `1px solid ${theme.primaryColor}15`
                                }}
                            >

                                <div
                                    className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0'
                                    style={{
                                        backgroundColor:
                                            `${theme.primaryColor}10`
                                    }}
                                >
                                    <MdSecurity
                                        size={18}
                                        color={
                                            theme.primaryColor
                                        }
                                    />
                                </div>

                                <div>

                                    <p
                                        className='text-xs font-semibold'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Account Security
                                    </p>

                                    <p
                                        className='text-[10px] leading-relaxed opacity-45 mt-1'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Keep your password private and
                                        sign out when using a shared
                                        device.
                                    </p>

                                </div>

                            </div>

                        </>
                    ) : (

                        /* =============================================
                           CHANGE PASSWORD
                        ============================================= */

                        <form
                            onSubmit={event => {
                                event.preventDefault()

                                handleResetPassword()
                            }}
                            className='flex flex-col gap-4'
                        >

                            {/* FORM HEADER */}
                            <div className='flex items-center gap-3'>

                                <button
                                    type='button'
                                    onClick={
                                        closePasswordForm
                                    }
                                    disabled={loading}
                                    className='w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-black/[0.04]'
                                    style={{
                                        border:
                                            `1px solid ${theme.secondaryColor}`
                                    }}
                                >
                                    <MdArrowBack
                                        size={18}
                                        color={
                                            theme.textColor
                                        }
                                    />
                                </button>

                                <div>

                                    <p
                                        className='text-sm font-bold'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Change Password
                                    </p>

                                    <p
                                        className='text-[10px] opacity-45 mt-0.5'
                                        style={{
                                            color:
                                                theme.textColor
                                        }}
                                    >
                                        Secure your account with a new password
                                    </p>

                                </div>

                            </div>


                            {/* SECURITY BOX */}
                            <div
                                className='flex gap-3 p-3.5 rounded-xl'
                                style={{
                                    backgroundColor:
                                        `${theme.primaryColor}07`,

                                    border:
                                        `1px solid ${theme.primaryColor}18`
                                }}
                            >

                                <MdSecurity
                                    size={18}
                                    color={
                                        theme.primaryColor
                                    }
                                    className='shrink-0 mt-0.5'
                                />

                                <p
                                    className='text-[10px] leading-relaxed opacity-60'
                                    style={{
                                        color:
                                            theme.textColor
                                    }}
                                >
                                    Enter your current password to
                                    confirm this change. Your new
                                    password must contain at least
                                    8 characters.
                                </p>

                            </div>


                            <PasswordField
                                label='Current Password'
                                value={currentPassword}
                                onChange={
                                    setCurrentPassword
                                }
                                autoComplete='current-password'
                                placeholder='Enter current password'
                                theme={theme}
                            />


                            <PasswordField
                                label='New Password'
                                value={newPassword}
                                onChange={
                                    setNewPassword
                                }
                                autoComplete='new-password'
                                placeholder='Enter new password'
                                theme={theme}
                            />


                            <PasswordField
                                label='Confirm New Password'
                                value={confirmPassword}
                                onChange={
                                    setConfirmPassword
                                }
                                autoComplete='new-password'
                                placeholder='Re-enter new password'
                                theme={theme}
                            />


                            {/* PASSWORD INDICATOR */}
                            {newPassword && (
                                <div className='flex gap-1.5'>

                                    {[1, 2, 3, 4].map(
                                        level => {

                                            const strength =
                                                newPassword.length >= 12
                                                    ? 4
                                                    : newPassword.length >= 10
                                                        ? 3
                                                        : newPassword.length >= 8
                                                            ? 2
                                                            : 1

                                            return (
                                                <div
                                                    key={level}
                                                    className='h-1 flex-1 rounded-full'
                                                    style={{
                                                        backgroundColor:
                                                            level <= strength
                                                                ? theme.primaryColor
                                                                : `${theme.secondaryColor}80`
                                                    }}
                                                />
                                            )
                                        }
                                    )}

                                </div>
                            )}


                            {/* ACTIONS */}
                            <div
                                className='grid grid-cols-2 gap-2 pt-3 mt-1'
                                style={{
                                    borderTop:
                                        `1px solid ${theme.secondaryColor}60`
                                }}
                            >

                                <button
                                    type='button'
                                    onClick={
                                        closePasswordForm
                                    }
                                    disabled={loading}
                                    className='py-2.5 rounded-xl text-xs font-semibold transition-colors'
                                    style={{
                                        border:
                                            `1px solid ${theme.secondaryColor}`,

                                        color:
                                            theme.textColor,

                                        backgroundColor:
                                            '#fff'
                                    }}
                                >
                                    Cancel
                                </button>


                                <button
                                    type='submit'
                                    disabled={loading}
                                    className='py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60'
                                    style={{
                                        backgroundColor:
                                            theme.primaryColor
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <AiOutlineLoading3Quarters
                                                size={15}
                                                className='animate-spin'
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <MdLock size={15} />

                                            Save Password
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    )}

                </div>

            </SidePanel>


            {/* LOGOUT CONFIRMATION */}
            <Confirmation
                isOpen={logoutConfirm}
                title='Logout'
                message='Are you sure you want to logout? You will need to login again to access your account.'
                onConfirm={handleLogout}
                onCancel={() =>
                    setLogoutConfirm(false)
                }
                confirmText='Logout'
            />

        </>
    )
}


/* =========================================================
   SECTION TITLE
========================================================= */

const SectionTitle = ({
    icon: Icon,
    title,
    subtitle,
    theme
}) => (
    <div className='flex items-center gap-2.5 mb-2.5'>

        <div
            className='w-7 h-7 rounded-lg flex items-center justify-center'
            style={{
                backgroundColor:
                    `${theme.primaryColor}0d`
            }}
        >
            <Icon
                size={14}
                color={
                    theme.primaryColor
                }
            />
        </div>

        <div>
            <p
                className='text-xs font-bold'
                style={{
                    color:
                        theme.textColor
                }}
            >
                {title}
            </p>

            <p
                className='text-[9px] opacity-40'
                style={{
                    color:
                        theme.textColor
                }}
            >
                {subtitle}
            </p>
        </div>

    </div>
)


/* =========================================================
   LAYOUT OPTION
========================================================= */

const LayoutOption = ({
    active,
    icon: Icon,
    title,
    description,
    onClick,
    theme
}) => (
    <button
        type='button'
        onClick={onClick}
        className='relative flex flex-col items-start gap-3 p-3.5 rounded-xl text-left transition-all hover:-translate-y-[1px]'
        style={{
            backgroundColor:
                active
                    ? theme.primaryColor
                    : '#fff',

            color:
                active
                    ? '#fff'
                    : theme.textColor,

            border:
                `1px solid ${
                    active
                        ? theme.primaryColor
                        : theme.secondaryColor
                }`,

            boxShadow:
                active
                    ? `0 6px 16px ${theme.primaryColor}18`
                    : 'none'
        }}
    >

        <div className='flex items-center justify-between w-full'>

            <Icon size={18} />

            {active && (
                <MdCheckCircle
                    size={15}
                    color='#fff'
                />
            )}

        </div>

        <div>
            <p className='text-xs font-semibold'>
                {title}
            </p>

            <p
                className='text-[9px] mt-0.5'
                style={{
                    opacity:
                        active
                            ? 0.7
                            : 0.45
                }}
            >
                {description}
            </p>
        </div>

    </button>
)


/* =========================================================
   PASSWORD FIELD
========================================================= */

const PasswordField = ({
    label,
    value,
    onChange,
    autoComplete,
    placeholder,
    theme
}) => (
    <label className='flex flex-col gap-1.5'>

        <span
            className='text-[11px] font-semibold'
            style={{
                color:
                    theme.textColor
            }}
        >
            {label}
        </span>

        <div className='relative'>

            <MdLock
                size={15}
                className='absolute left-3 top-1/2 -translate-y-1/2 opacity-30'
                color={
                    theme.textColor
                }
            />

            <input
                type='password'
                autoComplete={autoComplete}
                value={value}
                onChange={event =>
                    onChange(
                        event.target.value
                    )
                }
                minLength={
                    autoComplete === 'new-password'
                        ? 8
                        : undefined
                }
                required
                placeholder={placeholder}
                className='w-full pl-9 pr-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2'
                style={{
                    borderRadius:
                        theme.borderRadius,

                    border:
                        `1px solid ${theme.secondaryColor}`,

                    backgroundColor:
                        '#fff',

                    color:
                        theme.textColor,

                    '--tw-ring-color':
                        `${theme.primaryColor}20`
                }}
            />

        </div>

    </label>
)


export default ProfilePanel