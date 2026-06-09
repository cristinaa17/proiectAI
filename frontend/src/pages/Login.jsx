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
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!/\S+@\S+\.\S+/.test(email)) return setError('Email invalid')
    if (password.length < 4) return setError('Parola prea scurtă')

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.detail || 'Login eșuat')

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('email', email)
      navigate('/chat')
    } catch {
      setError('Eroare de server. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <motion.form
        className="login-card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="brand-title">MindCore</h2>
        <p className="subtitle">Intră în contul tău</p>

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
          <label>Parolă</label>
          <span onClick={() => setShow(!show)}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Se procesează...' : 'Login'}
        </button>
      </motion.form>
    </div>
  )
}
