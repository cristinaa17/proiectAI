import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateEmail(email)) {
      return setError('Email invalid')
    }

    if (password.length < 4) {
      return setError('Parola prea scurtă')
    }

    setError('')

    localStorage.setItem('user', JSON.stringify({ email }))
    navigate('/')
  }

  return (
    <div className="login-container">
      <motion.form
        className="login-card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        
        <h2 className="brand-title">MindCore</h2>
<p className="subtitle">Login to your account</p>

        <div className="input-group">
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Email</label>
        </div>

        <div className="input-group password">
          <input
            type={show ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label>Password</label>

          <span onClick={() => setShow(!show)}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit">Login</button>
      </motion.form>
    </div>
  )
}