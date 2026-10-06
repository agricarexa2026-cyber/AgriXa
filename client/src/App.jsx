import { useEffect, useRef } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet
} from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { createWebSocketUrl } from '../../services/websocket'
import { setAppLoading, setSessionExpired } from './store/slices/appSlice'
import { setTheme } from './store/slices/themeSlice'
import { setCredentials } from './store/slices/authSlice'
import { getCookie } from './utils/cookies'

import SessionExpiredDialog from './components/ui/SessionExpiredDialog'
import PageLoader from './components/ui/PageLoader'
import api from './services/api'
import minecraftMusic from './assets/sound-minecraft.mp3'

import LandingPage from './pages/LandingPage'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import PendingApproval from './pages/auth/PendingApproval'

import SharedDashboard from './pages/shared/Dashboard'
import SharedNotifications from './pages/shared/Notifications'

import UsersAccess from './pages/admin/UsersAccess'
import Configuration from './pages/admin/Configuration'
import FarmersAccounts from './pages/admin/FarmersAccounts'
import AdminExtensionWorkers from './pages/admin/ExtensionWorkers'
import AdminKnowledgeRepository from './pages/admin/KnowledgeRepository'
import KnowledgeBase from './pages/admin/KnowledgeBase'
import Reports from './pages/admin/Reports'

import FarmerKnowledgeRepository from './pages/farmer/KnowledgeRepository'
import FarmerAgriXa from './pages/farmer/AgriXa'
import FarmerExtensionWorkers from './pages/farmer/ExtensionWorkers'
import FarmerSubmitTicket from './pages/farmer/SubmitTicket'

import Tickets from './pages/extensionworker/Tickets'

import Init from './pages/system/init'
import Overview from './pages/system/panel/Overview'
import Endpoints from './pages/system/panel/Endpoints'
import SystemControl from './pages/system/panel/SystemControl'
import Templates from './pages/system/panel/Templates'


function RequireAuth() {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated
  )

  const user = useSelector(
    (state) => state.auth.user
  )

  const token = getCookie('token')

  if (!token) {
    return <Navigate to='/login' replace />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#fff9e9]'>
        <div className='text-center'>
          <div className='h-10 w-10 mx-auto rounded-full border-4 border-green-200 border-t-green-700 animate-spin' />

          <p className='mt-4 text-sm font-semibold text-green-900'>
            Restoring your session...
          </p>

          <p className='mt-1 text-xs text-green-700/70'>
            Please wait a moment.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}

function RequireKnowledgeManager() {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated
  )

  const user = useSelector(
    (state) => state.auth.user
  )

  const token = getCookie('token')

  if (!isAuthenticated || !token) {
    return <Navigate to='/login' replace />
  }

  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#fff9e9]'>
        <div className='text-center'>
          <div className='h-10 w-10 mx-auto rounded-full border-4 border-green-200 border-t-green-700 animate-spin' />

          <p className='mt-4 text-sm font-medium text-green-900'>
            Loading your account...
          </p>
        </div>
      </div>
    )
  }

  return [
    'admin',
    'extension_worker',
    'lgu_personnel'
  ].includes(user.role)
    ? <Outlet />
    : <Navigate to='/dashboard' replace />
}


function App() {
  const dispatch = useDispatch()

  const theme = useSelector(
    (state) => state.theme
  )

  const isLoading = useSelector(
    (state) => state.app.isLoading
  )

  const audioRef = useRef(null)


  /*
   * Minecraft/theme music
   */
  useEffect(() => {
    if (!theme.minecraftMusic) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      return
    }

    const audio = new Audio(minecraftMusic)

    audio.loop = true
    audio.volume = 0.3

    audioRef.current = audio

    audio.play().catch(() => {
      const playOnClick = () => {
        audio.play().catch(() => {})

        document.removeEventListener(
          'click',
          playOnClick,
          true
        )
      }

      document.addEventListener(
        'click',
        playOnClick,
        true
      )
    })

    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [theme.minecraftMusic])


  /*
   * Load theme.
   *
   * IMPORTANT:
   * Failure here must NOT prevent the application
   * from rendering. Redux already contains the
   * default AgriCare theme.
   */
  useEffect(() => {
    let mounted = true

    const loadTheme = async () => {
      try {
        const res = await api.get('/theme/')

        if (mounted && res?.data) {
          dispatch(
            setTheme(res.data)
          )
        }
      } catch (error) {
        console.warn(
          'Theme API unavailable. Using default theme.'
        )
      }
    }

    loadTheme()

    return () => {
      mounted = false
    }
  }, [dispatch])


  /*
   * Load system configuration.
   *
   * Again, this is optional startup information.
   * It must never block Login/Landing pages.
   */
  useEffect(() => {
    let mounted = true

    const loadSystemConfig = async () => {
      try {
        const res = await api.get(
          '/system/config/'
        )

        if (!mounted) {
          return
        }

        dispatch(
          setTheme({
            dashboardTemplates:
              res.data?.dashboardTemplates ?? {
                admin: 1,
                farmer: 1,
                extension_worker: 1
              }
          })
        )
      } catch (error) {
        console.warn(
          'System configuration API unavailable.'
        )
      }
    }

    loadSystemConfig()

    return () => {
      mounted = false
    }
  }, [dispatch])


  /*
   * Restore logged-in user.
   *
   * Only run this when a token actually exists.
   */
  useEffect(() => {
    const token = getCookie('token')

    if (!token) {
      return
    }

    let mounted = true

    const restoreUser = async () => {
      try {
        const res = await api.get(
          '/auth/me/'
        )

        if (
          mounted &&
          getCookie('token') === token
        ) {
          dispatch(
            setCredentials({
              user: res.data,
              token
            })
          )
        }
      } catch (error) {
        if (
          mounted &&
          getCookie('token') === token
        ) {
          dispatch(
            setSessionExpired(true)
          )
        }
      }
    }

    restoreUser()

    return () => {
      mounted = false
    }
  }, [dispatch])


  /*
   * System WebSocket.
   *
   * This is optional real-time functionality.
   * If Django Channels/WebSocket is unavailable,
   * the rest of AgriCare must continue working.
   */
  useEffect(() => {
    const ws = new WebSocket(
    `${protocol}://${websocketHost}/ws/system/`
)

    try {
      ws = new WebSocket(
        `${protocol}://${websocketHost}/ws/system/`
      )

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(
            event.data
          )

          if (data.type === 'theme') {
            const themeData =
              Object.fromEntries(
                Object.entries(data).filter(
                  ([key]) => key !== 'type'
                )
              )

            dispatch(
              setTheme(themeData)
            )
          }

          if (data.type === 'config') {
            dispatch(
              setTheme({
                dashboardTemplates:
                  data.dashboardTemplates ?? {
                    admin: 1,
                    farmer: 1,
                    extension_worker: 1
                  }
              })
            )
          }
        } catch (error) {
          console.warn(
            'Invalid WebSocket message:',
            error
          )
        }
      }

      ws.onerror = () => {
        console.warn(
          'System WebSocket unavailable.'
        )
      }
    } catch (error) {
      console.warn(
        'Unable to create system WebSocket.'
      )
    }

    return () => {
      if (
        ws &&
        (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        )
      ) {
        ws.close()
      }
    }
  }, [dispatch])


  return (
    <div
      className='min-h-screen'
      style={{
        backgroundColor:
          theme.backgroundColor || '#fff9e9',

        fontFamily:
          theme.minecraftMode
            ? 'Minecraft'
            : 'sans-serif'
      }}
    >
      {isLoading && (
        <PageLoader
          onDone={() => {
            dispatch(
              setAppLoading(false)
            )
          }}
        />
      )}

      <BrowserRouter>
        <Routes>

          {/* =========================
              PUBLIC ROUTES
          ========================= */}

          <Route
            path='/'
            element={<LandingPage />}
          />

          <Route
            path='/login'
            element={<Login />}
          />

          <Route
            path='/backdoor'
            element={
              <Navigate
                to='/login'
                replace
              />
            }
          />

          <Route
            path='/register'
            element={<Register />}
          />

          <Route
            path='/forgot-password'
            element={<ForgotPassword />}
          />

          <Route
            path='/reset-password'
            element={<ResetPassword />}
          />

          <Route
            path='/pending-approval'
            element={<PendingApproval />}
          />


          {/* =========================
              AUTHENTICATED ROUTES
          ========================= */}

          <Route element={<RequireAuth />}>

            <Route
              path='/dashboard'
              element={<SharedDashboard />}
            />

            <Route
              path='/notifications'
              element={<SharedNotifications />}
            />


            {/* =========================
                ADMIN
            ========================= */}

            <Route
              path='/admin/farmers'
              element={<FarmersAccounts />}
            />

            <Route
              path='/admin/extension-workers'
              element={<AdminExtensionWorkers />}
            />

            <Route
              path='/admin/users'
              element={<UsersAccess />}
            />

            <Route
              path='/admin/configuration'
              element={<Configuration />}
            />

            <Route
              path='/admin/reports'
              element={<Reports />}
            />

            <Route
              path='/admin/knowledge-repository'
              element={
                <AdminKnowledgeRepository />
              }
            />


            {/* =========================
                KNOWLEDGE MANAGEMENT
            ========================= */}

            <Route
              element={
                <RequireKnowledgeManager />
              }
            >
              <Route
                path='/admin/knowledge-base'
                element={<KnowledgeBase />}
              />

              <Route
                path='/extension-worker/knowledge-base'
                element={<KnowledgeBase />}
              />
            </Route>


            {/* =========================
                FARMER
            ========================= */}

            <Route
              path='/farmer/submit-ticket'
              element={<FarmerSubmitTicket />}
            />

            <Route
              path='/farmer/knowledge-repository'
              element={<FarmerAgriXa />}
            />

            <Route
              path='/farmer/tickets'
              element={
                <FarmerKnowledgeRepository
                  ticketOnly
                />
              }
            />

            <Route
              path='/farmer/extension-workers'
              element={
                <FarmerExtensionWorkers />
              }
            />


            {/* =========================
                EXTENSION WORKER
            ========================= */}

            <Route
              path='/extension-worker/tickets'
              element={<Tickets />}
            />

          </Route>


          {/* =========================
              SYSTEM ROUTES
          ========================= */}

          <Route
            path='/system/init'
            element={<Init />}
          />

          <Route
            path='/system/panel/overview'
            element={<Overview />}
          />

          <Route
            path='/system/panel/endpoints'
            element={<Endpoints />}
          />

          <Route
            path='/system/panel/control'
            element={<SystemControl />}
          />

          <Route
            path='/system/panel/templates'
            element={<Templates />}
          />


          {/* =========================
              FALLBACK
          ========================= */}

          <Route
            path='*'
            element={
              <Navigate
                to='/'
                replace
              />
            }
          />

        </Routes>

        <SessionExpiredDialog />
      </BrowserRouter>
    </div>
  )
}


export default App