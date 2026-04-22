import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user'))

  return (
    <motion.header
      className="header"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="logo">MindCore</div>

      <div className="header-right">
        {user ? (
          <span className="user">{user.email}</span>
        ) : (
          <button onClick={() => navigate('/login')} className="login-btn small">
            Login
          </button>
        )}
      </div>
    </motion.header>
  )
}