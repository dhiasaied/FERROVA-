import { garments, RAIL_Y } from '../data/garments'
import Garment from './Garment'

const steel = { color: '#cfcfcf', metalness: 1, roughness: 0.28 }
const BRACKETS = [-8.5, -5.1, -1.7, 1.7, 5.1, 8.5]

export default function Rail() {
  return (
    <group position={[0, RAIL_Y, 0]}>
      {/* Brushed steel rail */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.016, 0.016, 40, 20]} />
        <meshStandardMaterial {...steel} />
      </mesh>

      {/* Wall brackets */}
      {BRACKETS.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0, -0.37]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.74, 12]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <mesh position={[0, 0, -0.735]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.012, 24]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}

      {garments.map((item, i) => (
        <Garment key={item.id} item={item} index={i} />
      ))}
    </group>
  )
}
