import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import './Home.css'
import { Brain, FileText, Layers, BookOpen } from 'lucide-react'

const cards = [
  { icon: <Brain size={20} />, title: 'Ajută-mă să învăț', description: 'Răspunsuri bazate pe cursurile tale.', color: 'card-blue' },
  { icon: <FileText size={20} />, title: 'Testează-mă', description: 'Quiz cu feedback instant.', color: 'card-purple' },
  { icon: <Layers size={20} />, title: 'Creează cartonașe', description: 'Flashcards automate din curs.', color: 'card-green' },
  { icon: <BookOpen size={20} />, title: 'Ghid de studiu', description: 'Plan de recapitulare complet.', color: 'card-yellow' },
]

function AuroraBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    function resize() {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

       const layers = [
      { y: 0.28, col: 'rgba(99,102,241,',  spd: 0.22, amp: 90,  freq: 0.004 },
      { y: 0.48, col: 'rgba(168,85,247,',  spd: 0.16, amp: 75,  freq: 0.0032 },
      { y: 0.66, col: 'rgba(34,197,94,',   spd: 0.19, amp: 60,  freq: 0.005 },
      { y: 0.82, col: 'rgba(99,102,241,',  spd: 0.13, amp: 50,  freq: 0.0038 },
    ]

    let t = 0
    let animId = null

    function draw() {
      t += 0.5
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      layers.forEach(l => {
        const baseY = h * l.y
        ctx.beginPath()
        
      for (let x = -10; x <= w + 10; x += 3) {
          const y = baseY
            + Math.sin(x * l.freq + t * l.spd * 0.05) * l.amp
            + Math.sin(x * l.freq * 1.5 + t * l.spd * 0.035) * l.amp * 0.45
            + Math.sin(x * l.freq * 0.7 + t * l.spd * 0.02) * l.amp * 0.3
 
          if (x === -10) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
 
        ctx.lineTo(w + 10, h + 10)
        ctx.lineTo(-10, h + 10)
        ctx.closePath()
 
        // Gradient vertical - opacitate mai mare pentru val mai vizibil
        const g = ctx.createLinearGradient(0, baseY - l.amp * 1.5, 0, h)
        g.addColorStop(0, l.col + '0.22)')
        g.addColorStop(0.4, l.col + '0.10)')
        g.addColorStop(1, l.col + '0.01)')
        ctx.fillStyle = g
        ctx.fill()
      })
 
      animId = requestAnimationFrame(draw)
    }
 
    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])
 
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',      // 100vw in loc de inset:0 - garanteaza latimea completa
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
 
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}
 
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}
 
export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <AuroraBackground />
      <Header />
 
      <motion.main
        className="home-main"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="hero-section">
          <div className="hero-badge">✨ Asistent academic ULBS</div>
          <motion.h1
            className="hero-title"
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Bine ai venit la <span className="hero-accent">MindCore</span>
          </motion.h1>
          <p className="hero-subtitle">
            Învață mai inteligent cu ajutorul AI-ului antrenat pe cursurile tale.
          </p>
        </div>
 
        <motion.div
          className="cards-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              className={`feature-card ${card.color}`}
              onClick={() => navigate('/chat')}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="card-icon">{card.icon}</div>
              <h2 className="card-title">{card.title}</h2>
              <p className="card-desc">{card.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>
    </div>
  )
}