import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setTheme } from '../store/slices/themeSlice'
import { setAppLoading } from '../store/slices/appSlice'
import { createWebSocketUrl } from '../../services/websocket'
const useTheme = () => {
    const dispatch = useDispatch()
    const theme = useSelector((state) => state.theme)

   useEffect(() => {
    const ws = new WebSocket(
        createWebSocketUrl('/ws/system/')
    )

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data)

        if (data.type === 'theme') {
            const { type, ...themeData } = data
            dispatch(setTheme(themeData))
        }
    }

    ws.onerror = () => {
        ws.close()
    }

    return () => {
        ws.close()
    }
}, [dispatch])

    return theme
}

export default useTheme
