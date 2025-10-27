import { PivotControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * GimbalControl Component
 * Wraps a hand model with interactive 3D rotation controls (gimbal)
 * Allows user to drag and rotate the entire hand in 3D space
 */
export default function GimbalControl({
  children,
  position = [0, 0, 0],
  rotation = { x: 0, y: 0, z: 0 },
  onRotationChange,
  visible = true,
  scale = 0.15,
  orbitControlsRef
}) {
  const pivotRef = useRef()

  // Handle rotation changes from PivotControls
  const handleDrag = (local, delta, world, eye) => {
    if (onRotationChange && pivotRef.current) {
      // Extract Euler angles from the pivot's matrix
      const euler = new THREE.Euler()
      euler.setFromRotationMatrix(pivotRef.current.matrix, 'XYZ')

      onRotationChange({
        x: euler.x,
        y: euler.y,
        z: euler.z
      })
    }
  }

  // Disable OrbitControls when dragging starts
  const handleDragStart = () => {
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = false
    }
  }

  // Re-enable OrbitControls when dragging ends
  const handleDragEnd = () => {
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = true
    }
  }

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      lineWidth={2}
      axisColors={['#ff2060', '#20df80', '#2080ff']}
      scale={scale}
      visible={false}
      onDrag={handleDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      rotation={[rotation.x, rotation.y, rotation.z]}
      offset={[0, 0, 0]}
      disableRotations={true}
      disableScaling={true}
      disableSliders={true}
    >
      {/* Apply actual rotation to children */}
      <group rotation={[rotation.x, rotation.y, rotation.z]}>
        {children}
      </group>
    </PivotControls>
  )
}
