import { useCallback, useEffect, useRef, type ReactNode } from 'react'

type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
type Spark = { x: number; y: number; angle: number; startTime: number }

type ClickSparkProps = {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
  easing?: Easing
  extraScale?: number
  children: ReactNode
}

/** Adapted from React Bits' Click Spark component. */
export default function ClickSpark({ sparkColor = '#533aed', sparkSize = 10, sparkRadius = 15, sparkCount = 8, duration = 400, easing = 'ease-out', extraScale = 1, children }: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sparksRef = useRef<Spark[]>([])
  const ease = useCallback((value: number) => {
    if (easing === 'linear') return value
    if (easing === 'ease-in') return value * value
    if (easing === 'ease-in-out') return value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value
    return value * (2 - value)
  }, [easing])

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !parent || !context) return
    let frame = 0
    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.ceil(rect.width * dpr)
      canvas.height = Math.ceil(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = (timestamp: number) => {
      const rect = canvas.getBoundingClientRect()
      context.clearRect(0, 0, rect.width, rect.height)
      sparksRef.current = sparksRef.current.filter(spark => {
        const elapsed = timestamp - spark.startTime
        if (elapsed >= duration) return false
        const eased = ease(elapsed / duration)
        const distance = eased * sparkRadius * extraScale
        const length = sparkSize * (1 - eased)
        context.strokeStyle = sparkColor
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(spark.x + distance * Math.cos(spark.angle), spark.y + distance * Math.sin(spark.angle))
        context.lineTo(spark.x + (distance + length) * Math.cos(spark.angle), spark.y + (distance + length) * Math.sin(spark.angle))
        context.stroke()
        return true
      })
      frame = window.requestAnimationFrame(draw)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    frame = window.requestAnimationFrame(draw)
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame) }
  }, [duration, ease, extraScale, sparkColor, sparkRadius, sparkSize])

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const now = performance.now()
    sparksRef.current.push(...Array.from({ length: sparkCount }, (_, index) => ({ x: event.clientX - rect.left, y: event.clientY - rect.top, angle: 2 * Math.PI * index / sparkCount, startTime: now })))
  }

  return <div className="click-spark" onClick={onClick}>
    <canvas ref={canvasRef} className="click-spark__canvas" aria-hidden="true" />
    {children}
  </div>
}
