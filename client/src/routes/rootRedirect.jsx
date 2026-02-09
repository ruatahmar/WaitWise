
import { Navigate } from "react-router-dom"
import { useAuth } from "../auth/useAuth"

export default function RootRedirect() {
    const { user, loading } = useAuth

    if (loading) return null

    return user
        ? <Navigate to="/queues" replace />
        : <Navigate to="/login" replace />
}