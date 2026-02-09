import { useEffect, useState, useRef } from "react"
import { logout, logoutAllDevices } from "../api/authApi"
import { useAuth } from "../auth/useAuth"

export const NavBar = () => {
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef(null)
    const { setUser } = useAuth()
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    async function handleLogout() {
        await logout()
        setUser(null)
    }
    async function handleLogoutAllDevice() {
        await logoutAllDevices()
        setUser(null)
    }
    return (
        <nav
            className="flex items-center justify-center gap-20 px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b text-white text-semibold relative transition-all"
            style={{
                backgroundColor: '#18181F',
                borderColor: 'rgba(229, 231, 235, 0.1)'
            }}
        >
            <a href="/queues">My Queues</a>
            <a href="/tickets">My Tickets</a>
            {/* <a href="/positions">Profile</a> */}

            {/* Logout dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => { setOpen(prev => !prev) }

                    }
                    className="hover:text-gray-300 transition"
                >
                    Logout
                </button>

                {open && (
                    <div className="absolute right-0 mt-3 w-52 bg-[#1f1f28] border border-gray-700 rounded-xl shadow-lg p-1 z-50">
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-sm"
                        >
                            Logout this device
                        </button>

                        <button
                            onClick={handleLogoutAllDevice}
                            className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-800 text-sm text-red-400"
                        >
                            Logout all devices
                        </button>
                    </div>
                )}
            </div>
        </nav>
    )
}
