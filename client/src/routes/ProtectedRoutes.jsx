
import { useAuth } from "../auth/useAuth"
import { Navigate, Outlet } from "react-router-dom"


export default function ProtectedRoute() {
    const { user, loading } = useAuth()

    if (loading) return <div>Loading...</div>

    return user ? <Outlet /> : <Navigate to="/login" replace />
}