const getWebSocketBaseUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL.replace(/\/+$/, '')
    }

    if (import.meta.env.DEV) {
        return 'ws://localhost:8000'
    }

    const apiUrl = import.meta.env.VITE_API_URL

    if (apiUrl) {
        return apiUrl
            .replace(/^https:/, 'wss:')
            .replace(/^http:/, 'ws:')
            .replace(/\/api\/?$/, '')
            .replace(/\/+$/, '')
    }

    return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
}

export const createWebSocketUrl = (path) => {
    const base = getWebSocketBaseUrl()
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${base}${normalizedPath}`
}

export default createWebSocketUrl