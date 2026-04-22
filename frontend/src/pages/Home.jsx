import { motion } from 'framer-motion'
import Header from '../components/Header'
import './Home.css'

export default function Home() {
  const handleLogin = () => {
    alert('Login clicked 🚀')
  }

  return (
    <div className="home">
      <Header />

      <motion.main
        className="home-main"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >

      </motion.main>
    </div>
  )
}