/**
 * IKVisualization.jsx
 *
 * Renders 3D debug visualization for all 21 MediaPipe hand landmarks
 * Shows spheres at landmark positions and lines for hand skeleton
 * Wrist locked at (0,0,0) for consistent reference frame
 * Fingertips are draggable for manual IK testing
 */

import React from 'react'
import * as THREE from 'three'
import DraggableFingertip from '../ik/DraggableFingertip'

// Fingertip landmark indices (draggable)
const FINGERTIP_INDICES = {
  4: 'thumb',
  8: 'index',
  12: 'middle',
  16: 'ring',
  20: 'pinky'
}

// MediaPipe hand connections (bone structure)
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17]
]

// Color scheme for different fingers
const LANDMARK_COLORS = [
  '#FFFFFF',  // 0: Wrist - White

  // Thumb - Red shades
  '#FF0000', '#FF3333', '#FF6666', '#FF9999',

  // Index - Orange shades
  '#FF8800', '#FFAA00', '#FFCC00', '#FFEE00',

  // Middle - Yellow shades
  '#FFFF00', '#FFFF44', '#FFFF88', '#FFFFCC',

  // Ring - Green shades
  '#00FF00', '#44FF44', '#88FF88', '#CCFFCC',

  // Pinky - Blue shades
  '#0088FF', '#44AAFF', '#88CCFF', '#CCEEFF'
]

// Scale factor to convert MediaPipe normalized coordinates to world space
const WORLD_SCALE = 0.5

/**
 * Transform landmarks so wrist is at origin (0,0,0)
 * Handles coordinate system conversion from MediaPipe to Three.js:
 * - MediaPipe: Y increases downward (0=top, 1=bottom)
 * - Three.js: Y increases upward
 */
function transformLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 21) {
    return null
  }

  const wrist = landmarks[0]

  // Transform all landmarks relative to wrist
  return landmarks.map(landmark => ({
    x: (landmark.x - wrist.x) * WORLD_SCALE,
    y: -(landmark.y - wrist.y) * WORLD_SCALE,  // Invert Y-axis
    z: (landmark.z - wrist.z) * WORLD_SCALE
  }))
}

/**
 * Renders a sphere at a 3D position
 */
function LandmarkSphere({ position, color, index }) {
  const size = index === 0 ? 0.015 : 0.008  // Wrist larger

  return (
    <mesh position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial
        color={color}
        depthTest={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

/**
 * Renders a line between two 3D positions
 */
function ConnectionLine({ start, end, color = '#FFFFFF' }) {
  const points = [
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z)
  ]

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial
        color={color}
        linewidth={2}
        transparent
        opacity={0.5}
        depthTest={false}
      />
    </line>
  )
}

/**
 * Renders complete hand landmark visualization
 */
function HandLandmarkVisualization({ landmarks, handSide, onDrag }) {
  if (!landmarks || landmarks.length !== 21) {
    return null
  }

  // Transform so wrist is at (0,0,0)
  const transformed = transformLandmarks(landmarks)

  if (!transformed) {
    return null
  }

  return (
    <group name={`hand-landmarks-${handSide}`}>
      {/* Render spheres at each landmark - draggable for fingertips */}
      {transformed.map((position, index) => {
        const isFingertip = FINGERTIP_INDICES.hasOwnProperty(index)

        // Render draggable fingertip
        if (isFingertip) {
          return (
            <DraggableFingertip
              key={`${handSide}-fingertip-${index}`}
              position={position}
              color={LANDMARK_COLORS[index]}
              fingerName={FINGERTIP_INDICES[index]}
              landmarkIndex={index}
              handSide={handSide}
              onDrag={onDrag}
            />
          )
        }

        // Render regular sphere for non-fingertips
        return (
          <LandmarkSphere
            key={`${handSide}-landmark-${index}`}
            position={position}
            color={LANDMARK_COLORS[index]}
            index={index}
          />
        )
      })}

      {/* Render hand skeleton connections */}
      {HAND_CONNECTIONS.map(([startIdx, endIdx], connectionIdx) => (
        <ConnectionLine
          key={`${handSide}-connection-${connectionIdx}`}
          start={transformed[startIdx]}
          end={transformed[endIdx]}
          color='#AAAAAA'
        />
      ))}

      {/* Render coordinate axes at wrist for reference */}
      <axesHelper args={[0.1]} position={[0, 0, 0]} />
    </group>
  )
}

/**
 * Main IK Visualization Component
 *
 * @param {Object} ikDebugData - Debug data { left: { rawLandmarks: [...] }, right: { rawLandmarks: [...] } }
 * @param {Function} onDrag - Callback when fingertip is dragged
 */
export default function IKVisualization({ ikDebugData, onDrag, isMobile = false }) {
  if (!ikDebugData) {
    return null
  }

  // Hand spacing: mobile uses 1 unit apart, desktop uses 0.6 units apart
  const handSpacing = isMobile ? 0.5 : 0.3

  return (
    <group name="ik-visualization">
      {/* Left hand visualization */}
      {ikDebugData.left && ikDebugData.left.rawLandmarks && (
        <group position={[handSpacing, 0, 0]}>
          <HandLandmarkVisualization
            landmarks={ikDebugData.left.rawLandmarks}
            handSide="left"
            onDrag={onDrag}
          />
        </group>
      )}

      {/* Right hand visualization */}
      {ikDebugData.right && ikDebugData.right.rawLandmarks && (
        <group position={[-handSpacing, 0, 0]}>
          <HandLandmarkVisualization
            landmarks={ikDebugData.right.rawLandmarks}
            handSide="right"
            onDrag={onDrag}
          />
        </group>
      )}
    </group>
  )
}
