import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SplashScreen({ onFinished }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)

    const N = 120
    const COLORS = ['#6366f1','#818cf8','#22c55e','#a855f7','#c084fc','#38bdf8']
    const DUR = 220

    const stars = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      tx: w * 0.15 + Math.random() * w * 0.7,
      ty: h * 0.15 + Math.random() * h * 0.7,
      r: Math.random() * 2 + 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.012,
    }))

    let t = 0
    let animId = null

    function loop() {
      t++
      const prog = Math.min(t / DUR, 1)
      const ease = 1 - Math.pow(1 - prog, 3)

      ctx.fillStyle = 'rgba(7,7,14,0.25)'
      ctx.fillRect(0, 0, w, h)

      // Desenează liniile de conexiune între stele apropiate
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = stars[j].x - stars[i].x
          const dy = stars[j].y - stars[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(stars[i].x, stars[i].y)
            ctx.lineTo(stars[j].x, stars[j].y)
            ctx.strokeStyle = stars[i].color
            ctx.lineWidth = 0.5
            ctx.globalAlpha = ease * (1 - dist / 120) * 0.45
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
      }

      // Desenează stelele
      stars.forEach(s => {
        s.x += (s.tx - s.x) * s.speed
        s.y += (s.ty - s.y) * s.speed
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.05 + s.phase)

        // Glow în jurul stelei
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5)
        glow.addColorStop(0, s.color + 'aa')
        glow.addColorStop(1, s.color + '00')
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.globalAlpha = ease * twinkle * 0.4
        ctx.fill()
        ctx.globalAlpha = 1

        // Steaua în sine
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * (0.8 + twinkle * 0.4), 0, Math.PI * 2)
        ctx.fillStyle = s.color
        ctx.globalAlpha = ease * (0.6 + twinkle * 0.4)
        ctx.fill()
        ctx.globalAlpha = 1
      })

      // Text MindCore
      const ta = Math.max(0, (prog - 0.55) / 0.45)
      if (ta > 0) {
        // Fundal subtil în spatele textului
        const bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 200)
        bgGrad.addColorStop(0, 'rgba(7,7,14,0.75)')
        bgGrad.addColorStop(1, 'rgba(7,7,14,0)')
        ctx.beginPath()
        ctx.arc(w/2, h/2, 200, 0, Math.PI * 2)
        ctx.fillStyle = bgGrad
        ctx.fill()

        // Titlu
        ctx.save()
        ctx.globalAlpha = ta
        ctx.font = `bold ${Math.min(w * 0.14, 110)}px Caveat, cursive`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const g = ctx.createLinearGradient(w/2 - 180, 0, w/2 + 180, 0)
        g.addColorStop(0, '#6366f1')
        g.addColorStop(0.5, '#22c55e')
        g.addColorStop(1, '#a855f7')
        ctx.fillStyle = g
        ctx.fillText('MindCore', w/2, h/2)
        ctx.restore()

        // Badge
        ctx.save()
        ctx.globalAlpha = ta * 0.65
        ctx.font = '13px Inter, sans-serif'
        ctx.fillStyle = 'rgba(165,180,252,1)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('✦ Asistent academic ULBS', w/2, h/2 + 65)
        ctx.restore()
      }

      if (prog < 1) {
        animId = requestAnimationFrame(loop)
      } else {
        setTimeout(onFinished, 700)
      }
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#07070e',
        }}
      >
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      </motion.div>
    </AnimatePresence>
  )
}