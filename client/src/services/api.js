
import axios from 'axios'
import { getCookie } from '../utils/cookies'
import store from '../store/index'
import { setSessionExpired, setUnauthorized } from '../store/slices/appSlice'

const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000/api'

const api = axios.create({
    baseURL: API_URL.replace(/\/+$/, ''),
})

api.interceptors.request.use((config) => {
    const token = getCookie('token')

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status
        const url = error.config?.url || ''

        if (status !== 401) {
            return Promise.reject(error)
        }

        const ignoredPaths = [
            '/auth/',
            '/system/login/',
            '/positions/'
        ]

        if (ignoredPaths.some(path => url.includes(path))) {
            return Promise.reject(error)
        }

        const token = getCookie('token')
        const authHeader = error.config?.headers?.Authorization

        if (!token || !authHeader) {
            return Promise.reject(error)
        }

        const data = error.response?.data || {}
        const detail = String(
            data.detail ||
            data.message ||
            data.error ||
            ''
        ).toLowerCase()

        const tokenExpired =
            detail.includes('token is expired') ||
            detail.includes('token has expired') ||
            detail.includes('token expired') ||
            detail.includes('token_not_valid') ||
            detail.includes('invalid token') ||
            detail.includes('token is invalid') ||
            detail.includes('authentication token is invalid')

        if (tokenExpired) {
            store.dispatch(setSessionExpired(true))
        }

        return Promise.reject(error)
    }
)

export default api
