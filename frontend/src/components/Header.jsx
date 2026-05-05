import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './Header.css'
import { useState, useEffect } from 'react'

export default function Header() {
  const navigate = useNavigate()
const [token, setToken] = useState(null)

const storedUser = localStorage.getItem('user')
const user = storedUser ? JSON.parse(storedUser) : null

useEffect(() => {
  const storedToken = localStorage.getItem('token')
  if (storedToken) {
    setToken(storedToken)
  }
}, [])


const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  setToken(null)
  navigate('/')
}

  return (
    <motion.header
      className="header"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="logo">MindCore</div>

      <div className="header-right">
        {token ? (
          <>
          <span className="user">{user?.email}</span>
          <button onClick={handleLogout} className="login-btn small">
      Logout
    </button>
    </>
        ) : (
          <button onClick={() => navigate('/login')} className="login-btn small">
            Login
          </button>
        )}
      </div>
    </motion.header>
  )
}