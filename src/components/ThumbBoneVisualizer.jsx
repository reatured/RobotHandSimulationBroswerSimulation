/**
 * ThumbBoneVisualizer.jsx
 *
 * Generic thumb bone and joint axis visualizer for URDF models
 * Reads thumb joints directly from the URDF robot and displays:
 * - Colored spheres at joint positions
 * - Cylinders along rotation axes
 */

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Visualizes a single joint with position sphere and rotation axis cylinder
 */
function JointAxisHelper({ joint, jointName, color, parentGroup }) {
  const cylinderRef = useRef()
  const sphereRef = useRef()

  useFrame(() => {
    if (!joint || !cylinderRef.current || !sphereRef.current || !parentGroup) return

    // Update joint's world matrix
    joint.updateWorldMatrix(true, false)

    // Get joint position in world space
    const worldPos = new THREE.Vector3()
    joint.getWorldPosition(worldPos)

    // Convert world position to local space relative to parent group
    parentGroup.worldToLocal(worldPos)
    sphereRef.current.position.copy(worldPos)

    // Get joint axis (default to [0, 0, 1] if not specified)
    const axis = joint.axis || new THREE.Vector3(0, 0, 1)

    // Convert array to Vector3 if needed
    const localAxis = Array.isArray(axis)
      ? new THREE.Vector3(...axis)
      : axis.clone()

    // Transform axis to world space using joint's world quaternion
    const worldQuat = new THREE.Quaternion()
    joint.getWorldQuaternion(worldQuat)
    const worldAxis = localAxis.applyQuaternion(worldQuat)
    worldAxis.normalize()

    // Convert world axis direction to local space
    const parentWorldQuat = new THREE.Quaternion()
    parentGroup.getWorldQuaternion(parentWorldQuat)
    const parentWorldQuatInv = parentWorldQuat.clone().invert()
    const localAxisDirection = worldAxis.clone().applyQuaternion(parentWorldQuatInv)

    // Position cylinder at joint position (in local space)
    cylinderRef.current.position.copy(worldPos)

    // Orient cylinder to point along axis (in local space)
    // Cylinder geometry is along Y axis by default
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, localAxisDirection)
    cylinderRef.current.setRotationFromQuaternion(quaternion)
  })

  return (
    <group>
      {/* Joint position sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.01, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Rotation axis cylinder */}
      <mesh ref={cylinderRef}>
        <cylinderGeometry args={[0.003, 0.003, 0.05, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

/**
 * Main thumb bone visualizer component
 * Automatically finds and displays all thumb joints from the URDF robot
 */
export default function ThumbBoneVisualizer({
  robot,
  visible = true,
  scale = 1,
  rotation = [0, 0, 0]
}) {
  const thumbJointsRef = useRef([])
  const groupRef = useRef()

  // Find thumb joints when robot loads
  useEffect(() => {
    if (!robot) {
      thumbJointsRef.current = []
      return
    }

    // Search for thumb joints in the robot
    const thumbJoints = []
    Object.entries(robot.joints).forEach(([name, joint]) => {
      if (name.toLowerCase().includes('thumb')) {
        thumbJoints.push({ name, joint })
        console.log(`Found thumb joint: ${name}`)
      }
    })

    thumbJointsRef.current = thumbJoints
    console.log(`✅ ThumbBoneVisualizer found ${thumbJoints.length} thumb joints`)
  }, [robot])

  if (!visible || !robot || thumbJointsRef.current.length === 0) {
    return null
  }

  // Color mapping for different joint types
  const getJointColor = (jointName) => {
    const name = jointName.toLowerCase()
    if (name.includes('roll')) return '#FF0000' // Red
    if (name.includes('yaw')) return '#00FF00' // Green
    if (name.includes('pitch')) return '#0000FF' // Blue
    if (name.includes('mcp')) return '#FFFF00' // Yellow
    if (name.includes('ip')) return '#00FFFF' // Cyan
    return '#FFFFFF' // White (fallback)
  }

  return (
    <group ref={groupRef} rotation={rotation} scale={scale}>
      {thumbJointsRef.current.map(({ name, joint }) => (
        <JointAxisHelper
          key={name}
          joint={joint}
          jointName={name}
          color={getJointColor(name)}
          parentGroup={groupRef.current}
        />
      ))}
    </group>
  )
}
