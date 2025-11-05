import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Select, Html, Text, Center } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import HandModel from './HandModel'
import GimbalControl from './GimbalControl'
import DebugLabels from './DebugLabels'
import IKVisualization from './IKVisualization'
import { useSceneGraph } from '../editor/useSceneGraph'
import { ThumbJointVisualizer } from '../ik'

// Custom gradient ground plane
function GradientGround() {
  // Create gradient texture for directional reference
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Create gradient from front (darker blue) to back (lighter blue/white)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#1a1a2e')    // Dark blue at front (negative Z)
    gradient.addColorStop(0.5, '#16213e')  // Mid blue at center
    gradient.addColorStop(1, '#0f3460')    // Lighter blue at back (positive Z)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [])

  return (
    <group position={[0, -0.3, 0]}>
      {/* Gradient base plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Grid overlay for better spatial reference */}
      <Grid
        position={[0, 0.001, 0]}
        args={[10, 10]}
        cellSize={0.1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={0.5}
        sectionThickness={1}
        sectionColor="#4a90e2"
        fadeDistance={5}
        fadeStrength={1}
        followCamera={false}
      />
    </group>
  )
}

// Camera controller component - sets camera position when mirror mode changes
// No lerping or restrictions - just instant position update on toggle
function CameraController({ position }) {
  const { camera } = useThree()
  const previousPosition = useRef(position)

  useEffect(() => {
    // Only update if position actually changed (mirror mode toggled)
    if (previousPosition.current[0] !== position[0] ||
        previousPosition.current[1] !== position[1] ||
        previousPosition.current[2] !== position[2]) {
      // Instantly set camera to new position (no lerping)
      camera.position.set(...position)
      camera.updateProjectionMatrix()
      previousPosition.current = position
    }
  }, [camera, position])

  return null
}

// Scene graph reporter - collects scene hierarchy and sends to parent
function SceneGraphReporter({ onSceneGraphUpdate }) {
  const sceneGraph = useSceneGraph()

  useEffect(() => {
    if (onSceneGraphUpdate) {
      onSceneGraphUpdate(sceneGraph)
    }
  }, [sceneGraph, onSceneGraphUpdate])

  return null
}

export default function Scene3D({
  leftModel,
  rightModel,
  handTrackingData,
  leftJointRotations,
  rightJointRotations,
  leftHandPosition,
  rightHandPosition,
  leftHandGimbal,
  rightHandGimbal,
  onLeftGimbalChange,
  onRightGimbalChange,
  showGimbals,
  enableCameraPosition,
  showAxes = true,
  leftHandZRotation = 0,
  rightHandZRotation = 0,
  showDebugLabels = false,
  disableWristRotation = false,
  onLeftRobotLoaded = null,
  onRightRobotLoaded = null,
  useMultiDoF = false,
  showJointGimbals = false,
  onSceneGraphUpdate = null,
  selectedObject = null,
  onSelectObject = null,
  controlMode = 'camera',
  ikDebugData = { left: null, right: null },
  showIKVisualization = true,
  show3DCursor = false,
  onManualLandmarkDrag = null,
  cameraLandmarks = { left: null, right: null },
  showThumbBones = false,
  leftModelShortName = '',
  rightModelShortName = '',
  isMobile = false
}) {
  // Ref for OrbitControls to pass to gimbals
  const orbitControlsRef = useRef()

  // Camera position - back view (looking from behind, natural perspective)
  const cameraPosition = [0, 0.5, -1]

  // Hand spacing: mobile uses 1 unit apart, desktop uses 0.6 units apart
  const handSpacing = isMobile ? 0.1 : 0.3

  // Ensure we always have valid objects for joint rotations
  const safeLeftRotations = leftJointRotations || {}
  const safeRightRotations = rightJointRotations || {}

  // Default gimbal values
  const safeLeftGimbal = leftHandGimbal || { x: 0, y: 0, z: 0 }
  const safeRightGimbal = rightHandGimbal || { x: 0, y: 0, z: 0 }

  // Camera wrist rotation - now applied at gimbal level (Level 2), not hand mesh group
  const leftWristRotation = disableWristRotation
    ? { x: 0, y: 0, z: 0 }
    : (safeLeftRotations.wristOrientation || { x: 0, y: 0, z: 0 })
  const rightWristRotation = disableWristRotation
    ? { x: 0, y: 0, z: 0 }
    : (safeRightRotations.wristOrientation || { x: 0, y: 0, z: 0 })

  // Combine camera wrist rotation with manual gimbal rotation
  // Camera rotation is the base, manual gimbal is applied on top
  const leftCombinedRotation = {
    x: leftWristRotation.x + safeLeftGimbal.x,
    y: leftWristRotation.y + safeLeftGimbal.y,
    z: leftWristRotation.z + safeLeftGimbal.z
  }
  const rightCombinedRotation = {
    x: rightWristRotation.x + safeRightGimbal.x,
    y: rightWristRotation.y + safeRightGimbal.y,
    z: rightWristRotation.z + safeRightGimbal.z
  }
  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Camera position controller - updates when mirror mode changes */}
      <CameraController position={cameraPosition} />

      {/* Scene graph reporter - sends hierarchy to parent */}
      <SceneGraphReporter onSceneGraphUpdate={onSceneGraphUpdate} />

      {/* Enhanced lighting setup */}
      <ambientLight intensity={2} />

      {/* Key light - main illumination from front-top */}
      <directionalLight position={[5, 5, 5]} intensity={2} castShadow />

      {/* Fill light - soften shadows from the side */}
      <directionalLight position={[-5, 3, 2]} intensity={1.5} />

      {/* Back light - highlight edges and depth */}
      <directionalLight position={[0, 2, -5]} intensity={1} />

      {/* Rim light from below to show underside details */}
      <pointLight position={[0, -2, 0]} intensity={1} />

      {/* Additional side lights for better structure visibility */}
      <pointLight position={[3, 0, 0]} intensity={0.8} />
      <pointLight position={[-3, 0, 0]} intensity={0.8} />

      {/* Environment map for realistic reflections */}
      <Environment preset="studio" />

      {/* Gradient ground plane with grid overlay - helps understand world direction */}
      <GradientGround />

      {/* Global coordinate system axes - shows scene orientation */}
      {showAxes && (
        <axesHelper args={[0.5]} position={[0, -0.29, 0]} />
      )}

      {/* RealHand 3D text logo on the ground */}
      <group position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, -Math.PI ]}>
        {/* Debug sphere at origin of this group */}


        <Text
          position={[0, 0, 0]}
          fontSize={0.18}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#4a90e2"
        >
          REALHAND
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.7}
            roughness={0.2}
            emissive="#4a90e2"
            emissiveIntensity={0.3}
          />
        </Text>
      </group>

      {/* Left Hand Model with Gimbal Control */}
      {leftModel && (
        <group position={[handSpacing, 0, 0]}>
          {/* Hand mesh group rotation locked to [0, 0, 0] */}
          {/* Local axes at hand mesh group level - does not rotate */}
          {showAxes && <axesHelper args={[0.15]} />}



          <GimbalControl
            position={[0, 0, 0]}
            rotation={leftCombinedRotation}
            onRotationChange={onLeftGimbalChange}
            visible={showGimbals}
            orbitControlsRef={orbitControlsRef}
          >
            <HandModel
              key={`left-${leftModel.id}`}
              position={[0, 0, 0]}
              modelPath={leftModel.path}
              side={leftModel.side}
              handTrackingData={handTrackingData}
              jointRotations={safeLeftRotations}
              cameraPosition={enableCameraPosition ? leftHandPosition : null}
              zRotationOffset={leftHandZRotation}
              onRobotLoaded={onLeftRobotLoaded}
              useMultiDoF={useMultiDoF}
              showJointGimbals={showJointGimbals}
              cameraLandmarks={cameraLandmarks.right}
              show3DCursor={show3DCursor}
              showThumbBones={showThumbBones}
              thumbBonesRotation={[Math.PI /2, -Math.PI /2, 0]}
            />
          </GimbalControl>

          {/* Model name label below left hand */}
          {leftModelShortName && (
            <Html position={[0, -0.15, 0]} center>
              <div style={{
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '6px 14px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {leftModelShortName}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Right Hand Model with Gimbal Control */}
      {rightModel && (
        <group position={[-handSpacing, 0, 0]}>
          {/* Hand mesh group rotation locked to [0, 0, 0] */}
          {/* Local axes at hand mesh group level - does not rotate */}
          {showAxes && <axesHelper args={[0.15]} />}
          <GimbalControl
            position={[0, 0, 0]}
            rotation={rightCombinedRotation}
            onRotationChange={onRightGimbalChange}
            visible={showGimbals}
            orbitControlsRef={orbitControlsRef}
          >
            <HandModel
              key={`right-${rightModel.id}`}
              position={[0, 0, 0]}
              modelPath={rightModel.path}
              side={rightModel.side}
              handTrackingData={handTrackingData}
              jointRotations={safeRightRotations}
              cameraPosition={enableCameraPosition ? rightHandPosition : null}
              zRotationOffset={rightHandZRotation}
              onRobotLoaded={onRightRobotLoaded}
              useMultiDoF={useMultiDoF}
              showJointGimbals={showJointGimbals}
              cameraLandmarks={cameraLandmarks.left}
              show3DCursor={show3DCursor}
              showThumbBones={showThumbBones}
              thumbBonesRotation={[0, 0, 0]}
            />
          </GimbalControl>

          {/* Model name label below right hand */}
          {rightModelShortName && (
            <Html position={[0, -0.15, 0]} center>
              <div style={{
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '6px 14px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {rightModelShortName}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Debug labels for hand identification and scene orientation */}
      <DebugLabels visible={showDebugLabels} />

      {/* IK Debug Visualization - shows IK solver results */}
      {/* {controlMode === 'ik' && showIKVisualization && (
        <IKVisualization
          ikDebugData={ikDebugData}
          onDrag={onManualLandmarkDrag}
          isMobile={isMobile}
        />
      )} */}

      {/* Thumb Joint Visualizer - shows L10 thumb joints and axes */}
      {/* <ThumbJointVisualizer /> */}

      <OrbitControls ref={orbitControlsRef} makeDefault />
    </Canvas>
  )
}
