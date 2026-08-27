import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import type { Group, Mesh } from 'three'

import './Beams.css'

type BeamsProps = {
  className?: string
  beamWidth?: number
  beamHeight?: number
  beamNumber?: number
  lightColor?: string
  speed?: number
  rotation?: number
}

type BeamProps = { index: number; x: number; width: number; height: number; color: string; speed: number }

function Beam({ index, x, width, height, color, speed }: BeamProps) {
  const mesh = useRef<Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return
    const elapsed = clock.getElapsedTime() * speed
    mesh.current.position.z = Math.sin(elapsed * 0.7 + index) * 1.8
    mesh.current.position.y = Math.cos(elapsed * 0.55 + index * 0.8) * 0.4
    mesh.current.rotation.z = Math.sin(elapsed * 0.38 + index) * 0.055
    mesh.current.rotation.y += delta * 0.028 * (index % 2 ? 1 : -1)
  })
  return <mesh ref={mesh} position={[x, 0, 0]}>
    <planeGeometry args={[width, height, 1, 1]} />
    <meshPhysicalMaterial color="#07111c" emissive={color} emissiveIntensity={1.7} roughness={0.26} metalness={0.45} transparent opacity={0.7} side={2} />
  </mesh>
}

function BeamField({ beamWidth, beamHeight, beamNumber, lightColor, speed, rotation }: Required<Omit<BeamsProps, 'className'>>) {
  const group = useRef<Group>(null)
  const positions = useMemo(() => Array.from({ length: beamNumber }, (_, index) => (index - (beamNumber - 1) / 2) * beamWidth), [beamNumber, beamWidth])
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.z = rotation * Math.PI / 180 + Math.sin(clock.getElapsedTime() * speed * 0.16) * 0.035
  })
  return <group ref={group}>
    {positions.map((x, index) => <Beam key={index} index={index} x={x} width={beamWidth * 0.72} height={beamHeight} color={lightColor} speed={speed} />)}
    <ambientLight intensity={0.22} />
    <directionalLight color={lightColor} intensity={3.4} position={[0, 3, 10]} />
  </group>
}

/** Adapted from React Bits' Three.js Beams background. */
export default function Beams({ className = '', beamWidth = 1.7, beamHeight = 16, beamNumber = 12, lightColor = '#5dbaff', speed = 0.75, rotation = -8 }: BeamsProps) {
  return <div className={`beams ${className}`.trim()} aria-hidden="true">
    <Canvas dpr={[1, 1.5]} frameloop="always" gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={['#030507']} />
      <fog attach="fog" args={['#030507', 8, 28]} />
      <BeamField beamWidth={beamWidth} beamHeight={beamHeight} beamNumber={beamNumber} lightColor={lightColor} speed={speed} rotation={rotation} />
      <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={30} />
    </Canvas>
  </div>
}
