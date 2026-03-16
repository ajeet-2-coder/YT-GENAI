// src/features/auth/components/Navbar.jsx
import React from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import "./Navbar.scss"

const Navbar = () => {

    const { user, handleLogout } = useAuth()
    const navigate = useNavigate()

    const onLogout = async () => {
        await handleLogout()
        navigate("/login")
    }

    return (
        <nav className="navbar">
            <div className="navbar__logo">
                <Link to="/">InterviewAI</Link>
            </div>

            <div className="navbar__right">
                {user && (
                    <>
                        <span className="navbar__username"></span>
                        <button onClick={onLogout} className="navbar__logout-btn">
                            Logout
                        </button>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar