import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi'
import { useAuth } from "../auth/useAuth";
import { tokenStore } from "../auth/token";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { setUser } = useAuth()
    const handleRedirect = (e) => {
        e.preventDefault();
        navigate('/register');
    };
    const handleLogin = async (e) => {

        e.preventDefault();
        try {
            const res = await login({ email, password })
            console.log(res.data.data)
            setUser(res.data.data)
            tokenStore.set(res.data.data.accessToken)
            console.log(res.data.message)
            navigate('/queues');
        } catch (error) {
            console.error('Error logging in:', error);
            alert('Something went wrong. Please try again.');
        }
    };



    return (
        <div
            className="w-full h-screen flex items-center justify-center text-white"
            style={{
                background: `linear-gradient(135deg, #0F0F14 0%, #18181F 100%)`
            }}
        >
            <div
                className="w-full max-w-md p-10 rounded-xl border"
                style={{
                    backgroundColor: '#18181F',
                    borderColor: 'rgba(229, 231, 235, 0.1)'
                }}
            >
                <h1 className="text-3xl font-bold mb-2">WaitWise</h1>
                <p
                    className="text-sm mb-8"
                    style={{ color: '#9CA3AF' }}
                >
                    Virtual Queue Management System
                </p>

                <form onSubmit={handleLogin}>

                    <div className="mb-6">
                        <label className="text-xs font-semibold block mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)',
                                '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                            }}
                        />
                    </div>

                    <div className="mb-5">
                        <label className="text-xs font-semibold block mb-2">
                            password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                            style={{
                                backgroundColor: '#0F0F14',
                                color: '#E5E7EB',
                                borderColor: 'rgba(229, 231, 235, 0.2)',
                                '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                        style={{
                            backgroundColor: '#22C55E',
                            color: '#0F0F14'
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={handleRedirect}
                        className="w-full py-3 mt-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                        style={{
                            backgroundColor: '#22C55E',
                            color: '#0F0F14'
                        }}
                    >
                        Register
                    </button>
                </form>

                <div
                    className="mt-6 p-4 rounded-lg text-xs"
                    style={{
                        backgroundColor: 'rgba(156, 163, 175, 0.1)',
                        color: '#9CA3AF'
                    }}
                >
                    <p className="font-semibold mb-1">Demo Accounts:</p>
                    <p>Email: test@test.com</p>
                    <p>Password: 123456</p>
                </div>
            </div>
        </div>
    );
}