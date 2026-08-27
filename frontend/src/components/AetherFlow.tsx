import { useEffect, useRef } from 'react'

type Particle = { x: number; y: number; vx: number; vy: number; phase: number }

/** Lightweight cursor-reactive constellation field for the login showcase. */
export default function AetherFlow({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const particles: Particle[] = []
    const pointer = { x: -1000, y: -1000 }
    let width = 0, height = 0, frame = 0

    const seed = () => {
      const count = Math.max(38, Math.min(82, Math.round((width * height) / 10500)))
      particles.length = 0
      for (let index = 0; index < count; index += 1) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, phase: Math.random() * Math.PI * 2 })
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      width = rect.width; height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top
    }
    const onPointerLeave = () => { pointer.x = -1000; pointer.y = -1000 }
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw)
      context.clearRect(0, 0, width, height)
      const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 260)
      glow.addColorStop(0, 'rgba(111, 89, 255, .12)'); glow.addColorStop(1, 'rgba(111, 89, 255, 0)')
      context.fillStyle = glow; context.fillRect(0, 0, width, height)
      for (const particle of particles) {
        const dx = pointer.x - particle.x, dy = pointer.y - particle.y, distance = Math.hypot(dx, dy)
        if (distance < 180) { particle.vx -= dx * .000008; particle.vy -= dy * .000008 }
        particle.vx += Math.cos(time * .00035 + particle.phase) * .00035; particle.vy += Math.sin(time * .00028 + particle.phase) * .00035
        particle.vx *= .987; particle.vy *= .987; particle.x += particle.vx; particle.y += particle.vy
        if (particle.x < -20) particle.x = width + 20; if (particle.x > width + 20) particle.x = -20
        if (particle.y < -20) particle.y = height + 20; if (particle.y > height + 20) particle.y = -20
      }
      for (let a = 0; a < particles.length; a += 1) {
        const first = particles[a]
        for (let b = a + 1; b < particles.length; b += 1) {
          const second = particles[b], dx = first.x - second.x, dy = first.y - second.y, distance = Math.hypot(dx, dy)
          if (distance > 135) continue
          context.strokeStyle = `rgba(144, 126, 255, ${.18 * (1 - distance / 135)})`; context.lineWidth = .7
          context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.stroke()
        }
      }
      particles.forEach((particle) => { context.fillStyle = 'rgba(226, 222, 255, .78)'; context.beginPath(); context.arc(particle.x, particle.y, 1.25, 0, Math.PI * 2); context.fill() })
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas); resize(); frame = requestAnimationFrame(draw)
    canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerleave', onPointerLeave)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointermove', onPointerMove); canvas.removeEventListener('pointerleave', onPointerLeave) }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
