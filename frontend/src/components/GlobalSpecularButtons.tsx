import { useEffect } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

const PAD = 20
const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uCenter, uHalfSize; uniform float uRadius, uAngle, uPx, uIntensity, uShineSize, uShineFade, uThickness, uBaseWidth;
uniform vec3 uLineColor, uBaseColor; out vec4 fragColor;
float sdRoundedRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float gaussianLine(float d, float sigma) { float x = d / (sigma + 1e-6); float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x)); return exp(-k * x * x); }
void main() { vec2 p = gl_FragCoord.xy - uCenter; float d = sdRoundedRect(p, uHalfSize, uRadius); vec2 L = vec2(cos(uAngle), sin(uAngle)); float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * .45; vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6); float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0)); float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi); float line = gaussianLine(d, uThickness); float edgeClamp = 1.0 - smoothstep(.5 * uPx, 3.0 * uPx, abs(d)); float hi = line * rim * edgeClamp * uIntensity; fragColor = vec4(uBaseColor * base + uLineColor * hi, clamp(base + hi, 0.0, 1.0)); }`

function rgb(value: string, fallback: [number, number, number]) {
  const match = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (!match || /rgba\([^)]*,\s*0\s*\)/i.test(value)) return fallback
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255] as [number, number, number]
}

function colors(button: HTMLButtonElement) {
  const style = getComputedStyle(button)
  const text = rgb(style.color, [0.96, 0.96, 0.98])
  return { edge: rgb(style.borderTopColor, text), base: rgb(style.backgroundColor, text) }
}

function excluded(button: HTMLButtonElement) {
  return Boolean(button.closest('header, [data-no-specular], .ranking-tabs, .friends-page, .pinned-notices'))
}

/** A single shared WebGL rim follows the hovered button, preserving every button's own layout. */
export default function GlobalSpecularButtons() {
  useEffect(() => {
    const fx = document.createElement('span')
    fx.className = 'global-specular-button__fx'
    fx.setAttribute('aria-hidden', 'true')
    fx.hidden = true
    document.body.append(fx)

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr: window.devicePixelRatio || 1 })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    const geometry = new Triangle(gl)
    delete geometry.attributes.uv
    const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms: {
      uCenter: { value: [0, 0] }, uHalfSize: { value: [1, 1] }, uRadius: { value: 0 }, uAngle: { value: 2.4 }, uPx: { value: 1 },
      uLineColor: { value: [1, 1, 1] }, uBaseColor: { value: [.3, .3, .3] }, uIntensity: { value: 1 }, uShineSize: { value: .17 }, uShineFade: { value: .7 }, uThickness: { value: 1 }, uBaseWidth: { value: 1 }
    } })
    const mesh = new Mesh(gl, { geometry, program })
    fx.append(gl.canvas)

    let active: HTMLButtonElement | null = null
    let pointerX = 0, pointerY = 0, angle = 2.4, last = performance.now(), width = 0, height = 0
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX; pointerY = event.clientY
      const target = event.target instanceof Element ? event.target.closest('button') : null
      active = target instanceof HTMLButtonElement && !target.disabled && !excluded(target) ? target : null
      fx.hidden = !active
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    let raf = 0
    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const dt = Math.min((now - last) / 1000, .05)
      last = now
      if (!active || !active.isConnected) { fx.hidden = true; return }
      const rect = active.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) { fx.hidden = true; return }
      const dpr = window.devicePixelRatio || 1
      fx.style.left = `${rect.left - PAD}px`; fx.style.top = `${rect.top - PAD}px`
      if (width !== rect.width || height !== rect.height) {
        width = rect.width; height = rect.height
        fx.style.width = `${width + PAD * 2}px`; fx.style.height = `${height + PAD * 2}px`
        renderer.setSize(width + PAD * 2, height + PAD * 2)
        program.uniforms.uCenter.value = [(PAD + width / 2) * dpr, (PAD + height / 2) * dpr]
        program.uniforms.uHalfSize.value = [(width / 2) * dpr, (height / 2) * dpr]
        program.uniforms.uPx.value = dpr
      }
      const centerX = rect.left + width / 2, centerY = rect.top + height / 2
      const target = Math.atan2(centerY - pointerY, pointerX - centerX)
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      angle += diff * (1 - Math.exp(-dt * 8))
      const current = colors(active)
      const radius = Math.min(Number.parseFloat(getComputedStyle(active).borderRadius) || 12, Math.min(width, height) / 2)
      program.uniforms.uAngle.value = angle
      program.uniforms.uRadius.value = radius * dpr
      program.uniforms.uLineColor.value = current.edge
      program.uniforms.uBaseColor.value = current.base
      program.uniforms.uThickness.value = dpr
      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onPointerMove); fx.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext() }
  }, [])
  return null
}
