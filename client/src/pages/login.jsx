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
    const handleRedirect = () => {
        navigate('/register');
    };
    const handleLogin = async (e) => {

        e.preventDefault();
        try {
            const res = await login({ email, password })
            setUser(res.data.data.data)
            tokenStore.set(res.data.data.accessToken)
            console.log(res.data.message)
            navigate('/queues');
        } catch (error) {
            console.error('Error logging in:', error);
            alert('Something went wrong. Please try again.');
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center flex-col">
            <form
                onSubmit={handleLogin}
                className="bg-white p-6 rounded-xl shadow-md w-80 flex flex-col gap-4"
            >
                <h1 className="text-xl font-semibold text-center">Login</h1>

                <input
                    type="email"
                    placeholder="Email"
                    className="border p-2 rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="border p-2 rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    type="submit"
                    className="bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                >
                    Login
                </button>
                <button
                    onClick={handleRedirect}
                    className="bg-purple-600 text-white py-2 m rounded hover:bg-purple-700"
                >
                    Register
                </button>
            </form>

        </div>
    );
}