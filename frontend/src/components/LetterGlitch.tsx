import { useEffect, useRef } from 'react'

type RgbColor = { r: number; g: number; b: number }

type Letter = {
  char: string
  color: RgbColor
  targetColor: RgbColor
  colorProgress: number
}

type LetterGlitchProps = {
  glitchColors?: string[]
  className?: string
  glitchSpeed?: number
  centerVignette?: boolean
  outerVignette?: boolean
  smooth?: boolean
  characters?: string
}

const fontSize = 16
const charWidth = 10
const charHeight = 20

function toRgb(hex: string): RgbColor {
  const value = hex.replace('#', '')
  const normalized = value.length === 3 ? value.split('').map(char => char + char).join('') : value
  return { r: Number.parseInt(normalized.slice(0, 2), 16), g: Number.parseInt(normalized.slice(2, 4), 16), b: Number.parseInt(normalized.slice(4, 6), 16) }
}

function colorString({ r, g, b }: RgbColor) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

function interpolateColor(start: RgbColor, end: RgbColor, factor: number): RgbColor {
  return { r: start.r + (end.r - start.r) * factor, g: start.g + (end.g - start.g) * factor, b: start.b + (end.b - start.b) * factor }
}

export default function LetterGlitch({
  glitchColors = ['#0b2942', '#1767a8', '#75d4ff'],
  className = '',
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789',
}: LetterGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !parent || !context) return

    const palette = glitchColors.map(toRgb)
    const alphabet = Array.from(characters)
    let columns = 0
    let letters: Letter[] = []
    let animationFrame = 0
    let lastGlitchTime = Date.now()

    const randomChar = () => alphabet[Math.floor(Math.random() * alphabet.length)]
    const randomColor = () => palette[Math.floor(Math.random() * palette.length)]

    const drawLetters = () => {
      const rect = canvas.getBoundingClientRect()
      context.clearRect(0, 0, rect.width, rect.height)
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
      context.textBaseline = 'top'
      letters.forEach((letter, index) => {
        context.fillStyle = colorString(letter.color)
        context.fillText(letter.char, (index % columns) * charWidth, Math.floor(index / columns) * charHeight)
      })
    }

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      columns = Math.max(1, Math.ceil(rect.width / charWidth))
      const rows = Math.max(1, Math.ceil(rect.height / charHeight))
      letters = Array.from({ length: columns * rows }, () => ({ char: randomChar(), color: randomColor(), targetColor: randomColor(), colorProgress: 1 }))
      drawLetters()
    }

    const animate = () => {
      const now = Date.now()
      let needsRedraw = false
      if (now - lastGlitchTime >= glitchSpeed) {
        const updateCount = Math.max(1, Math.floor(letters.length * 0.05))
        for (let index = 0; index < updateCount; index += 1) {
          const letter = letters[Math.floor(Math.random() * letters.length)]
          if (!letter) continue
          letter.char = randomChar()
          letter.targetColor = randomColor()
          letter.colorProgress = smooth ? 0 : 1
          if (!smooth) letter.color = letter.targetColor
        }
        lastGlitchTime = now
        needsRedraw = true
      }
      if (smooth) {
        letters.forEach(letter => {
          if (letter.colorProgress >= 1) return
          letter.colorProgress = Math.min(1, letter.colorProgress + 0.05)
          letter.color = interpolateColor(letter.color, letter.targetColor, letter.colorProgress)
          needsRedraw = true
        })
      }
      if (needsRedraw) drawLetters()
      animationFrame = window.requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(parent)
    return () => { window.cancelAnimationFrame(animationFrame); observer.disconnect() }
  }, [characters, glitchColors, glitchSpeed, smooth])

  return <div className={`letter-glitch ${className}`.trim()} aria-hidden="true">
    <canvas ref={canvasRef} className="letter-glitch__canvas" />
    {outerVignette && <div className="letter-glitch__outer-vignette" />}
    {centerVignette && <div className="letter-glitch__center-vignette" />}
  </div>
}
