import { useEffect, useState, useRef } from "react"
import { refreshToken, logout as logoutApi } from "../api/authApi"
import { tokenStore } from "./token"
import { AuthContext } from "./useAuth"
import { socket } from "../socket"

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const didRun = useRef(false)
    useEffect(() => {
        if (didRun.current) return
        didRun.current = true
        const initAuth = async () => {
            try {
                const res = await refreshToken()
                tokenStore.set(res.data.data.accessToken);
                setUser(res.data.data)
            } catch {
                tokenStore.clear()
                setUser(null)
            } finally {
                setLoading(false)
            }
        }

        initAuth()
    }, [])
    useEffect(() => {
        if (!loading && user) {
            socket.connect();
        }

        if (!user) {
            socket.disconnect();
        }
    }, [loading, user]);
    const logout = async () => {
        await logoutApi()
        tokenStore.clear()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
            {children}
        </AuthContext.Provider>
    )
}