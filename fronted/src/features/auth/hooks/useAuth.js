import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context
    const [error, setError] = useState(null)

    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        setError(null)
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return { success: true }   // ✅ return success
        } catch (err) {
            const message = err.response?.data?.message || "Invalid email or password"
            setError(message)          // ✅ show exact server message
            return { success: false }  // ✅ return failure
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        setError(null)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
            return { success: true }   // ✅ return success
        } catch (err) {
            const message = err.response?.data?.message || "Registration failed. Please try again."
            setError(message)          // ✅ show exact server message
            return { success: false }  // ✅ return failure
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            await logout()
            setUser(null)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const getAndSetUser = async () => {
            try {
                const data = await getMe()
                setUser(data.user)
            } catch (err) {
                setUser(null)
            } finally {
                setLoading(false)
            }
        }
        getAndSetUser()
    }, [])

    return { user, loading, error, handleRegister, handleLogin, handleLogout }
}