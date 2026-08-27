import { useEffect } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

const PAD = 20

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;
out vec4 fragColor;
float sdRoundedRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float gaussianLine(float d, float sigma) { float x = d / (sigma + 1e-6); float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x)); return exp(-k * x * x); }
void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = sdRoundedRect(p, uHalfSize, uRadius);
  vec2 L = vec2(cos(uAngle), sin(uAngle));
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;
  vec3 col = uBaseColor * base + uLineColor * hi;
  fragColor = vec4(col, clamp(base + hi, 0.0, 1.0));
}`

type Effect = {
  button: HTMLButtonElement
  fx: HTMLSpanElement
  renderer: Renderer
  gl: Renderer['gl']
  program: Program
  mesh: Mesh
  observer: ResizeObserver
  width: number
  height: number
  angle: number
  idleAngle: number
  originalPosition: string
  changedPosition: boolean
}

function rgb(value: string, fallback: [number, number, number]) {
  const match = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (!match || /rgba\([^)]*,\s*0\s*\)/i.test(value)) return fallback
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255] as [number, number, number]
}

function buttonColors(button: HTMLButtonElement) {
  const style = getComputedStyle(button)
  const text = rgb(style.color, [0.96, 0.96, 0.98])
  const edge = rgb(style.borderTopColor, text)
  return { edge, base: rgb(style.backgroundColor, edge) }
}

/** Adds the supplied OGL specular rim without replacing existing button styling. */
export default function GlobalSpecularButtons() {
  useEffect(() => {
    const effects = new Map<HTMLButtonElement, Effect>()
    let pointerX = -10000
    let pointerY = -10000
    let last = performance.now()
    let raf = 0

    const remove = (effect: Effect) => {
      effect.observer.disconnect()
      effect.fx.remove()
      effect.gl.getExtension('WEBGL_lose_context')?.loseContext()
      if (effect.changedPosition) effect.button.style.position = effect.originalPosition
      delete effect.button.dataset.specularFx
      effects.delete(effect.button)
    }

    const add = (button: HTMLButtonElement) => {
      if (button.dataset.specularFx || button.closest('[data-no-specular]')) return
      button.dataset.specularFx = 'true'
      const originalPosition = button.style.position
      const changedPosition = getComputedStyle(button).position === 'static'
      if (changedPosition) button.style.position = 'relative'

      const fx = document.createElement('span')
      fx.className = 'global-specular-button__fx'
      fx.setAttribute('aria-hidden', 'true')
      button.append(fx)

      const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr: window.devicePixelRatio || 1 })
      const gl = renderer.gl
      gl.clearColor(0, 0, 0, 0)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      const geometry = new Triangle(gl)
      delete geometry.attributes.uv
      const colors = buttonColors(button)
      const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms: {
        uCenter: { value: [0, 0] }, uHalfSize: { value: [1, 1] }, uRadius: { value: 0 }, uAngle: { value: 2.4 }, uPx: { value: window.devicePixelRatio || 1 },
        uLineColor: { value: colors.edge }, uBaseColor: { value: colors.base }, uIntensity: { value: 0 }, uShineSize: { value: 0.17 }, uShineFade: { value: 0.7 }, uThickness: { value: window.devicePixelRatio || 1 }, uBaseWidth: { value: window.devicePixelRatio || 1 }
      } })
      const mesh = new Mesh(gl, { geometry, program })
      fx.append(renderer.gl.canvas)
      const effect: Effect = { button, fx, renderer, gl, program, mesh, observer: new ResizeObserver(() => resize(effect)), width: 1, height: 1, angle: 2.4, idleAngle: 2.4, originalPosition, changedPosition }
      const resize = (item: Effect) => {
        const rect = item.button.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        item.width = rect.width; item.height = rect.height
        item.renderer.setSize(rect.width + PAD * 2, rect.height + PAD * 2)
        item.program.uniforms.uCenter.value = [(PAD + rect.width / 2) * dpr, (PAD + rect.height / 2) * dpr]
        item.program.uniforms.uHalfSize.value = [(rect.width / 2) * dpr, (rect.height / 2) * dpr]
        item.program.uniforms.uPx.value = dpr
      }
      effect.observer.observe(button)
      resize(effect)
      effects.set(button, effect)
    }

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLButtonElement) add(root)
      root.querySelectorAll?.('button').forEach(add)
    }
    scan(document)
    const mutationObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof HTMLElement) scan(node) })))
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    const onPointerMove = (event: PointerEvent) => { pointerX = event.clientX; pointerY = event.clientY }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      effects.forEach(effect => {
        if (!effect.button.isConnected) return remove(effect)
        const rect = effect.button.getBoundingClientRect()
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
        const dx = Math.max(rect.left - pointerX, 0, pointerX - rect.right)
        const dy = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom)
        const distance = Math.hypot(dx, dy)
        const proximity = Math.max(0, 1 - distance / 250)
        const brightness = proximity * proximity * (3 - 2 * proximity)
        let target = effect.idleAngle += 0.35 * dt
        if (distance === 0) {
          const nx = (pointerX - cx) / Math.max(rect.width / 2, 1), ny = (cy - pointerY) / Math.max(rect.height / 2, 1)
          target = Math.atan2(2 / Math.max(rect.height, 1), -2 / Math.max(rect.width, 1)) + nx * 0.3 + ny * 0.15
        } else if (brightness > 0) target = Math.atan2(cy - pointerY, pointerX - cx)
        const diff = ((target - effect.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        effect.angle += diff * (1 - Math.exp(-dt * 7))
        const colors = buttonColors(effect.button)
        const radius = Math.min(Number.parseFloat(getComputedStyle(effect.button).borderRadius) || 12, Math.min(effect.width, effect.height) / 2)
        effect.program.uniforms.uAngle.value = effect.angle
        effect.program.uniforms.uRadius.value = radius * (window.devicePixelRatio || 1)
        effect.program.uniforms.uLineColor.value = colors.edge
        effect.program.uniforms.uBaseColor.value = colors.base
        effect.program.uniforms.uIntensity.value = effect.button.disabled ? 0 : brightness
        effect.renderer.render({ scene: effect.mesh })
      })
    }
    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); mutationObserver.disconnect(); window.removeEventListener('pointermove', onPointerMove); [...effects.values()].forEach(remove) }
  }, [])
  return null
}
