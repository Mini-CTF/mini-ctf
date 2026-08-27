import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { gsap } from 'gsap'

import './StrokeText.css'

type StrokeTextBox = { x: number; y: number; width: number; height: number }

type StrokeTextProps = {
  text: string
  strokeColor?: string
  fillColor?: string
  strokeWidth?: number
  drawDuration?: number
  fillDelay?: number
  fillDuration?: number
  stagger?: number
  fontSize?: number
  fontWeight?: number | string
  letterSpacing?: number
  className?: string
}

/** Adapted from React Bits' Stroke Text component. */
export default function StrokeText({ text, strokeColor = '#ffffff', fillColor = '#ffffff', strokeWidth = 1.25, drawDuration = 1.55, fillDelay = 0.18, fillDuration, stagger = 0.055, fontSize = 220, fontWeight = 800, letterSpacing = -16, className = '' }: StrokeTextProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const strokeTextRef = useRef<SVGTextElement | null>(null)
  const wipeRectRef = useRef<SVGRectElement | null>(null)
  const [box, setBox] = useState<StrokeTextBox | null>(null)
  const rawId = useId()
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const characters = useMemo(() => Array.from(text), [text])
  const dash = Math.max(fontSize * 7, 200)
  const fontStyle = useMemo<CSSProperties>(() => ({ fontSize: `${fontSize}px`, fontWeight, letterSpacing: `${letterSpacing}px` }), [fontSize, fontWeight, letterSpacing])

  useLayoutEffect(() => {
    const measure = () => {
      const node = strokeTextRef.current
      if (!node) return
      try {
        const bounds = node.getBBox()
        if (!bounds.width) return
        const padding = Math.max(strokeWidth, fontSize * 0.1)
        setBox({ x: bounds.x - padding, y: bounds.y - padding, width: bounds.width + padding * 2, height: bounds.height + padding * 2 })
      } catch {
        // The SVG can be temporarily unavailable during layout changes.
      }
    }
    measure()
    document.fonts?.ready.then(measure).catch(() => undefined)
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth])

  useEffect(() => {
    const root = rootRef.current
    const wipe = wipeRectRef.current
    if (!root || !box) return
    const strokes = gsap.utils.toArray<SVGElement>(root.querySelectorAll('[data-stroke-char]'))
    const fills = gsap.utils.toArray<SVGElement>(root.querySelectorAll('[data-fill-char]'))
    const targets = [...strokes, ...fills, wipe].filter(Boolean)
    const end = () => {
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 })
      gsap.set(fills, { opacity: 1 })
      if (wipe) gsap.set(wipe, { attr: { width: box.width } })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      end()
      return () => gsap.killTweensOf(targets)
    }
    gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash })
    gsap.set(fills, { opacity: 1 })
    if (wipe) gsap.set(wipe, { attr: { width: 0 } })
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
    timeline.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease: 'power2.out', stagger }, 0)
    if (wipe) timeline.to(wipe, { attr: { width: box.width }, duration: fillDuration ?? Math.max(0.4, drawDuration * 0.5), ease: 'power2.inOut' }, drawDuration + fillDelay)
    return () => { timeline.kill(); gsap.killTweensOf(targets) }
  }, [box, dash, drawDuration, fillDelay, fillDuration, stagger])

  const viewBox = box ? `${box.x} ${box.y} ${box.width} ${box.height}` : `0 ${-fontSize} 600 ${fontSize * 1.3}`
  return <span ref={rootRef} className={`stroke-text ${className}`.trim()} style={{ '--stroke-text-height': `${Math.round(fontSize * 1.3)}px` } as CSSProperties} role="img" aria-label={text}>
    <svg className="stroke-text__svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {box && <defs><clipPath id={wipeId} clipPathUnits="userSpaceOnUse"><rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} /></clipPath></defs>}
      <text ref={strokeTextRef} className="stroke-text__stroke" x="0" y="0" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" style={fontStyle}>{characters.map((character, index) => <tspan data-stroke-char key={`stroke-${index}`}>{character}</tspan>)}</text>
      <text className="stroke-text__fill" x="0" y="0" fill={fillColor} stroke="none" style={fontStyle} clipPath={box ? `url(#${wipeId})` : undefined}>{characters.map((character, index) => <tspan data-fill-char key={`fill-${index}`}>{character}</tspan>)}</text>
    </svg>
  </span>
}
