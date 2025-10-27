/**
 * DraggableFingertip.jsx
 *
 * Interactive draggable sphere for manual IK testing
 * Allows user to drag fingertip positions to test IK solver
 */

import React, { useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function DraggableFingertip({
  position,
  color,
  fingerName,
  landmarkIndex,
  onDrag,
  handSide
}) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const { camera, gl, raycaster, pointer } = useThree()
  const planeRef = useRef(new THREE.Plane())
  const intersectionPoint = useRef(new THREE.Vector3())
  const offset = useRef(new THREE.Vector3())

  // Handle pointer down - start dragging
  const handlePointerDown = (event) => {
    event.stopPropagation()
    setIsDragging(true)

    // Create a plane perpendicular to camera at the sphere's position
    const worldPosition = new THREE.Vector3()
    meshRef.current.getWorldPosition(worldPosition)

    planeRef.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      worldPosition
    )

    // Calculate offset from mesh position to click point
    if (raycaster.ray.intersectPlane(planeRef.current, intersectionPoint.current)) {
      offset.current.copy(intersectionPoint.current).sub(worldPosition)
    }

    gl.domElement.style.cursor = 'grabbing'
  }

  // Handle pointer up - stop dragging
  const handlePointerUp = () => {
    setIsDragging(false)
    gl.domElement.style.cursor = isHovered ? 'grab' : 'default'
  }

  // Handle pointer move - update position while dragging
  useFrame(() => {
    if (!isDragging || !meshRef.current) return

    // Update plane normal to always face camera
    const worldPosition = new THREE.Vector3()
    meshRef.current.getWorldPosition(worldPosition)

    planeRef.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      worldPosition
    )

    // Raycast from camera through pointer
    raycaster.setFromCamera(pointer, camera)

    if (raycaster.ray.intersectPlane(planeRef.current, intersectionPoint.current)) {
      // Subtract offset to get actual target position
      const newPosition = intersectionPoint.current.clone().sub(offset.current)

      // Call callback with new position
      if (onDrag) {
        onDrag({
          handSide,
          landmarkIndex,
          fingerName,
          position: {
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z
          }
        })
      }
    }
  })

  // Handle hover events
  const handlePointerEnter = () => {
    setIsHovered(true)
    gl.domElement.style.cursor = 'grab'
  }

  const handlePointerLeave = () => {
    setIsHovered(false)
    if (!isDragging) {
      gl.domElement.style.cursor = 'default'
    }
  }

  // Size changes based on state
  const size = isDragging ? 0.020 : isHovered ? 0.015 : 0.012
  const opacity = isDragging ? 1.0 : isHovered ? 0.95 : 0.9

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      // onPointerDown={handlePointerDown}
      // onPointerUp={handlePointerUp}
      // onPointerEnter={handlePointerEnter}
      // onPointerLeave={handlePointerLeave}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial
        color={isDragging ? '#FFFF00' : isHovered ? '#FFFFFF' : color}
        depthTest={false}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}
