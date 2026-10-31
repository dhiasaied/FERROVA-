import { Environment, Lightformer } from '@react-three/drei'

/** Gallery lighting: warm key with soft shadows, a cool fill and a studio environment built from light cards. */
export default function Lights({ shadowSize = 2048 }) {
  return (
    <>
      <hemisphereLight args={['#fff8ef', '#c9bba7', 0.55]} />
      <directionalLight
        position={[-3.2, 6, 5]}
        intensity={2.4}
        color="#fff1df"
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <spotLight position={[2.5, 3.6, 3.2]} angle={0.7} penumbra={1} intensity={22} color="#dfe8ff" distance={12} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff3e2" position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[14, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[-6, 2, 3]} rotation-y={Math.PI / 2.4} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1} color="#e6eeff" position={[6, 2, 3]} rotation-y={-Math.PI / 2.4} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#ffe7c7" position={[0, 2, 8]} scale={3} />
      </Environment>
    </>
  )
}
