import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Zap } from 'lucide-react'

import './aether-flow-hero.css'

type AetherFlowHeroProps = { className?: string; showContent?: boolean }
type Particle = { x: number; y: number; directionX: number; directionY: number; size: number }

/** Adapted for FlagBox from the supplied Aether Flow Hero component. */
export default function AetherFlowHero({ className = '', showContent = true }: AetherFlowHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const mouse = { x: -1000, y: -1000, radius: 200 }
    let particles: Particle[] = []
    let width = 0, height = 0, frame = 0
    const init = () => {
      const count = Math.max(34, Math.min(88, Math.round((width * height) / 9000)))
      particles = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, directionX: Math.random() * .4 - .2, directionY: Math.random() * .4 - .2, size: Math.random() * 2 + 1 }))
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      width = rect.width; height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      init()
    }
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top
    }
    const onPointerLeave = () => { mouse.x = -1000; mouse.y = -1000 }
    const animate = () => {
      frame = requestAnimationFrame(animate)
      context.fillStyle = '#02030a'; context.fillRect(0, 0, width, height)
      for (const particle of particles) {
        if (particle.x > width || particle.x < 0) particle.directionX = -particle.directionX
        if (particle.y > height || particle.y < 0) particle.directionY = -particle.directionY
        const dx = mouse.x - particle.x, dy = mouse.y - particle.y, distance = Math.hypot(dx, dy)
        if (distance > 0 && distance < mouse.radius + particle.size) { const force = (mouse.radius - distance) / mouse.radius; particle.x -= dx / distance * force * 5; particle.y -= dy / distance * force * 5 }
        particle.x += particle.directionX; particle.y += particle.directionY
      }
      for (let a = 0; a < particles.length; a += 1) {
        const first = particles[a]
        for (let b = a + 1; b < particles.length; b += 1) {
          const second = particles[b], distanceSquared = (first.x - second.x) ** 2 + (first.y - second.y) ** 2
          if (distanceSquared > 20000) continue
          const opacity = Math.max(0, 1 - distanceSquared / 20000)
          const nearMouse = Math.hypot(first.x - mouse.x, first.y - mouse.y) < mouse.radius
          context.strokeStyle = nearMouse ? `rgba(255, 255, 255, ${opacity * .8})` : `rgba(207, 160, 255, ${opacity * .62})`
          context.lineWidth = 1.15; context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.stroke()
        }
      }
      for (const particle of particles) { context.fillStyle = 'rgba(223, 198, 255, .96)'; context.beginPath(); context.arc(particle.x, particle.y, particle.size * 1.15, 0, Math.PI * 2); context.fill() }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas); canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerleave', onPointerLeave)
    resize(); animate()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointermove', onPointerMove); canvas.removeEventListener('pointerleave', onPointerLeave) }
  }, [])

  return <div className={`aether-flow-hero ${className}`.trim()}><canvas ref={canvasRef} className="aether-flow-hero__canvas" />{showContent && <div className="aether-flow-hero__content"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5, duration: .8 }}><span className="aether-flow-hero__badge"><Zap size={16} /> Dynamic Rendering Engine</span><h1>Aether Flow</h1><p>An adaptive framework for fluid digital experiences.</p><button type="button">Explore the Engine <ArrowRight size={18} /></button></motion.div></div>}</div>
}
