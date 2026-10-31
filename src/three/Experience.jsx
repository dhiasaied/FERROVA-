import { Component, Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import Lights from './Lights'
import Room from './Room'
import Rail from './Rail'
import RailControls from './RailControls'
import CameraRig from './CameraRig'
import { useCloset } from '../store/useCloset'
import { useMediaQuery } from '../lib/useMediaQuery'
import { prepareScene, hasWebGL, STAGES } from '../lib/preload'

const BG = '#e7e1d7'

/**
 * Flags the scene as ready once every shader is compiled and the first frames have
 * rendered. A timer backs up requestAnimationFrame, which pauses in background tabs.
 */
function ReadySignal() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let cancelled = false
    let raf = 0
    let fallback = 0
    const done = () => !cancelled && useCloset.getState().setSceneReady()
    ;(async () => {
      performance.mark('ferrova:compile-start')
      try {
        // Compile up front so the reveal doesn't hitch on the first visible frame.
        await gl.compileAsync?.(scene, camera)
      } catch {
        // Compilation still happens lazily on first render.
      }
      if (cancelled) return
      performance.mark('ferrova:compile-end')
      useCloset.getState().setProgress(STAGES.compiled)
      raf = requestAnimationFrame(() => (raf = requestAnimationFrame(done)))
      fallback = setTimeout(done, 1200)
    })()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
  }, [gl, scene, camera])
  return null
}

/** Any error inside the 3D scene degrades to the plain backdrop instead of an endless loader. */
class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('[FERROVA] 3D scene failed to load:', error)
    useCloset.getState().setSceneError(error)
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children
  }
}

function SceneFallback() {
  return <p className="stage__fallback">The interactive 3D rail isn't available on this device.</p>
}

function Scene() {
  const compact = useMediaQuery('(max-width: 820px), (pointer: coarse)')
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, compact ? 1.5 : 1.75))
  const [high, setHigh] = useState(!compact)
  const [prepared, setPrepared] = useState(false)

  useEffect(() => {
    let alive = true
    prepareScene()
      .then(() => alive && setPrepared(true))
      .catch((error) => {
        console.error('[FERROVA] Failed to prepare the scene:', error)
        useCloset.getState().setSceneError(error)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ fov: 35, near: 0.1, far: 60, position: [1.6, 3.4, 11] }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => {
        // Let the browser restore the context instead of leaving a dead canvas.
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
      }}
    >
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(window.devicePixelRatio, compact ? 1.5 : 2))}
        onDecline={() => {
          setDpr(1)
          setHigh(false)
        }}
      />
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 9, 26]} />

      {prepared && (
        <Suspense fallback={null}>
          <Lights shadowSize={compact ? 1024 : 2048} />
          <Room reflect={high} />
          <Rail />
          <Sparkles count={compact ? 30 : 70} scale={[9, 2.6, 3]} position={[0, 1.5, 0.6]} size={1.6} speed={0.25} opacity={0.45} color="#fff3df" />
          <ReadySignal />
        </Suspense>
      )}

      <RailControls />
      <CameraRig />
    </Canvas>
  )
}

export default function Experience() {
  const [supported] = useState(hasWebGL)

  useEffect(() => {
    if (!supported) useCloset.getState().setSceneError(new Error('WebGL is not supported'))
  }, [supported])

  if (!supported) return <SceneFallback />
  return (
    <SceneBoundary>
      <Scene />
    </SceneBoundary>
  )
}
