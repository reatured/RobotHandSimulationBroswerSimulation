import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import HandTrackingCamera from '../components/HandTrackingCamera'
import Scene3D from '../components/Scene3D'
import InspectorPanel from '../components/InspectorPanel'
import DebugPanel from '../components/DebugPanel'
import { CalibrationManager } from '../utils/coordinateMapping'
import { getShortestRotation } from '../utils/handKinematics'
import { applyMetalMaterial } from '../components/URDFHandModel'
import { IKController } from '../ik'
import { gloveClient } from '../utils/gloveClient'
import { convertGloveDataToJoints } from '../utils/gloveMapping'

// Detect if user is on mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768)
}

// Available hand models configuration
const HAND_MODELS = [
  { id: 'ability_left', name: 'Ability Hand (Left)', shortName: 'Ability', path: 'ability_hand', side: 'left' },
  { id: 'ability_right', name: 'Ability Hand (Right)', shortName: 'Ability', path: 'ability_hand', side: 'right' },
  { id: 'shadow_left', name: 'Shadow Hand (Left)', shortName: 'Shadow', path: 'shadow_hand', side: 'left' },
  { id: 'shadow_right', name: 'Shadow Hand (Right)', shortName: 'Shadow', path: 'shadow_hand', side: 'right' },
  { id: 'allegro_left', name: 'Allegro Hand (Left)', shortName: 'Allegro', path: 'allegro_hand', side: 'left' },
  { id: 'allegro_right', name: 'Allegro Hand (Right)', shortName: 'Allegro', path: 'allegro_hand', side: 'right' },
  { id: 'inspire_left', name: 'Inspire Hand (Left)', shortName: 'Inspire', path: 'inspire_hand', side: 'left' },
  { id: 'inspire_right', name: 'Inspire Hand (Right)', shortName: 'Inspire', path: 'inspire_hand', side: 'right' },
  { id: 'leap_left', name: 'Leap Hand (Left)', shortName: 'Leap', path: 'leap_hand', side: 'left' },
  { id: 'leap_right', name: 'Leap Hand (Right)', shortName: 'Leap', path: 'leap_hand', side: 'right' },
  { id: 'schunk_left', name: 'Schunk SVH Hand (Left)', shortName: 'Schunk', path: 'schunk_hand', side: 'left' },
  { id: 'schunk_right', name: 'Schunk SVH Hand (Right)', shortName: 'Schunk', path: 'schunk_hand', side: 'right' },
  { id: 'barrett', name: 'Barrett Hand', shortName: 'Barrett', path: 'barrett_hand', side: null },
  { id: 'dclaw', name: 'DClaw Gripper', shortName: 'DClaw', path: 'dclaw_gripper', side: null },
  { id: 'panda', name: 'Panda Gripper', shortName: 'Panda', path: 'panda_gripper', side: null },
  { id: 'linker_l6_left', name: 'RealHand L6 (Left)', shortName: 'L6', path: 'linker_l6', side: 'left' },
  { id: 'linker_l6_right', name: 'RealHand L6 (Right)', shortName: 'L6', path: 'linker_l6', side: 'right' },
  { id: 'linker_l10_left', name: 'RealHand L10 (Left)', shortName: 'L10', path: 'linker_l10', side: 'left' },
  { id: 'linker_l10_right', name: 'RealHand L10 (Right)', shortName: 'L10', path: 'linker_l10', side: 'right' },
  { id: 'linker_l20_left', name: 'RealHand L20 (Left)', shortName: 'L20', path: 'linker_l20', side: 'left' },
  { id: 'linker_l20_right', name: 'RealHand L20 (Right)', shortName: 'L20', path: 'linker_l20', side: 'right' },
  { id: 'linker_l20pro_right', name: 'RealHand L20 Pro (Right)', shortName: 'L20 Pro', path: 'linker_l20pro', side: 'right' },
  { id: 'linker_l21_left', name: 'RealHand L21 (Left)', shortName: 'L21', path: 'linker_l21', side: 'left' },
  { id: 'linker_l21_right', name: 'RealHand L21 (Right)', shortName: 'L21', path: 'linker_l21', side: 'right' },
  { id: 'linker_l25_left', name: 'RealHand L25 (Left)', shortName: 'L25', path: 'linker_l25', side: 'left' },
  { id: 'linker_l25_right', name: 'RealHand L25 (Right)', shortName: 'L25', path: 'linker_l25', side: 'right' },
  { id: 'linker_l30_right', name: 'RealHand L30 (Right)', shortName: 'L30', path: 'linker_l30', side: 'right' },
  { id: 'linker_o6_left', name: 'RealHand O6 (Left)', shortName: 'O6', path: 'linker_o6', side: 'left' },
  { id: 'linker_o6_right', name: 'RealHand O6 (Right)', shortName: 'O6', path: 'linker_o6', side: 'right' },
  { id: 'linker_o7_left', name: 'RealHand O7 (Left)', shortName: 'O7', path: 'linker_o7', side: 'left' },
  { id: 'linker_o7_right', name: 'RealHand O7 (Right)', shortName: 'O7', path: 'linker_o7', side: 'right' },
]

// Model display order and visibility configuration
// Format: [modelId, isVisible]
// - Order in this array determines display order in the modal
// - true = visible in modal, false = hidden
// - Models not listed here will be hidden by default
const MODEL_DISPLAY_ORDER = [

  ['linker_o6_left', true],
  ['linker_o6_right', true],
  ['linker_o7_left', true],
  ['linker_o7_right', true],
  ['linker_l10_left', true],
  ['linker_l10_right', true],
  ['linker_l20_left', true],
  ['linker_l20_right', true],
  ['linker_l20pro_right', true],
  ['linker_l30_right', true],
  ['linker_l6_left', true],
  ['linker_l6_right', true],

  ['linker_l21_left', true],
  ['linker_l21_right', true],
  ['linker_l25_left', true],
  ['linker_l25_right', true],
  ['linker_l30_right', true],
    ['ability_left', true],
  ['ability_right', true],
  ['shadow_left', true],
  ['shadow_right', true],
  ['allegro_left', true],
  ['allegro_right', true],
  ['inspire_left', true],
  ['inspire_right', true],
  ['leap_left', true],
  ['leap_right', true],
  ['schunk_left', true],
  ['schunk_right', true],
  ['barrett', true],
  ['dclaw', true],
  ['panda', true],




]

// Initialize joint rotations for all 21 joints
const createInitialJointRotations = () => {
  const joints = {}
  const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky']
  const segments = ['mcp', 'pip', 'dip', 'tip']

  joints.wrist = 0
  fingers.forEach(finger => {
    segments.forEach(segment => {
      joints[`${finger}_${segment}`] = 0
    })
  })

  // Log joints in detail
  console.log('🦾 [Joint Initialization] Created joint structure:')
  console.log('   Wrist:', joints.wrist)
  console.log('   Total joints:', Object.keys(joints).length)
  console.log('\n   Joint breakdown by finger:')
  fingers.forEach(finger => {
    console.log(`   ${finger.toUpperCase()}:`, {
      mcp: joints[`${finger}_mcp`],
      pip: joints[`${finger}_pip`],
      dip: joints[`${finger}_dip`],
      tip: joints[`${finger}_tip`]
    })
  })
  console.log('\n   Complete joints object:', JSON.stringify(joints, null, 2))

  return joints
}

export default function MainPage() {
  // Detect if mobile and set initial panel visibility
  const isMobile = useMemo(() => isMobileDevice(), [])

  // Separate models for left and right hands
  const [selectedLeftModel, setSelectedLeftModel] = useState('linker_l10_left')
  const [selectedRightModel, setSelectedRightModel] = useState('linker_l10_right')

  const [handTrackingData, setHandTrackingData] = useState(null)

  // Separate joint rotations for left and right hands
  const [manualJointRotations, setManualJointRotations] = useState(() => ({
    left: createInitialJointRotations(),
    right: createInitialJointRotations()
  }))
  const [cameraJointRotations, setCameraJointRotations] = useState({
    left: {},
    right: {}
  })

  // IK joint rotations (computed by IK solver from camera data)
  const [ikJointRotations, setIkJointRotations] = useState({
    left: {},
    right: {}
  })

  // Glove joint rotations (from external WebSocket backend)
  const [gloveJointRotations, setGloveJointRotations] = useState({
    left: {},
    right: {}
  })

  // Glove connection status
  const [gloveConnectionStatus, setGloveConnectionStatus] = useState('disconnected')

  // Hand positions from camera tracking
  const [cameraHandPositions, setCameraHandPositions] = useState({
    left: null,
    right: null
  })

  // Raw camera landmarks (MediaPipe 21 points per hand)
  const [cameraLandmarks, setCameraLandmarks] = useState({
    left: null,
    right: null
  })

  // Persisted landmarks - keeps last known positions even when tracking lost
  const [persistedLandmarks, setPersistedLandmarks] = useState({
    left: null,
    right: null
  })

  // Manual landmark overrides - user-dragged fingertip positions
  const [manualLandmarkOverrides, setManualLandmarkOverrides] = useState({
    left: {},
    right: {}
  })

  // Tracking lock - freeze landmarks for manual dragging
  const [isTrackingLocked, setIsTrackingLocked] = useState(false)

  // Gimbal rotation offsets for each hand
  // Default: 90 degrees (π/2 radians) on X-axis for both hands
  const [leftHandGimbal, setLeftHandGimbal] = useState({ x: -Math.PI / 2, y: 0, z: 0 })
  const [rightHandGimbal, setRightHandGimbal] = useState({ x: -Math.PI / 2, y: 0, z: 0 })

  // Manual Z-axis rotation offsets for each hand (in radians)
  // Default: Left hand +90°, Right hand -90°
  const [leftHandZRotation, setLeftHandZRotation] = useState(Math.PI / 2)  // 90 degrees
  const [rightHandZRotation, setRightHandZRotation] = useState(-Math.PI / 2)  // -90 degrees

  // Gimbal visibility toggle
  const [showGimbals, setShowGimbals] = useState(false)

  // Joint gimbals visibility toggle (default: disabled)
  const [showJointGimbals, setShowJointGimbals] = useState(false)

  // Coordinate axes visibility toggle (default: disabled)
  const [showAxes, setShowAxes] = useState(false)

  // Debug labels visibility toggle (default: disabled)
  const [showDebugLabels, setShowDebugLabels] = useState(false)

  // Camera position tracking toggle (default: disabled)
  const [enableCameraPosition, setEnableCameraPosition] = useState(false)

  // Wrist rotation toggle (disable wrist rotation to keep hand orientation fixed)
  const [disableWristRotation, setDisableWristRotation] = useState(false)

  // IK debug data (3D positions from IK solver)
  const [ikDebugData, setIkDebugData] = useState({
    left: null,
    right: null
  })

  // IK visualization toggle (default: disabled)
  const [showIKVisualization, setShowIKVisualization] = useState(false)

  // 3D cursor visibility toggle (default: disabled)
  const [show3DCursor, setShow3DCursor] = useState(false)

  const [selectedJoint, setSelectedJoint] = useState('wrist')
  const [selectedHand, setSelectedHand] = useState('left') // Which hand to control in manual mode
  const [controlMode, setControlMode] = useState('camera') // 'manual' or 'camera' - default to camera
  const [calibrationStatus, setCalibrationStatus] = useState({ isCalibrated: false })

  // Panel visibility states - camera preview always visible, control panel only on desktop, debug enabled
  const [showCameraPreview, setShowCameraPreview] = useState(true)
  const [showControlPanel, setShowControlPanel] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false) // Debug panel toggle

  // Robot references for applying material changes
  const leftRobotRef = useRef(null)
  const rightRobotRef = useRef(null)

  // 🔥 STEP 9: Joint config state for multi-DoF support
  const [leftHandJointConfig, setLeftHandJointConfig] = useState(null)
  const [rightHandJointConfig, setRightHandJointConfig] = useState(null)
  const [useMultiDoF, setUseMultiDoF] = useState(true)

  // Quaternion tracking system toggle (default: disabled)
  const [useQuaternionTracking, setUseQuaternionTracking] = useState(false)

  // Thumb 3DOF addon toggle (default: disabled, only works with quaternion tracking)
  const [useThumb3DoF, setUseThumb3DoF] = useState(false)

  // Thumb FK enable/disable toggle (default: enabled)
  const [enableThumbFK, setEnableThumbFK] = useState(true)

  // Hierarchy panel state - for editor tools
  const [sceneGraph, setSceneGraph] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)

  // Initialize calibration manager (persistent across renders)
  // Use lazy initialization to avoid creating new instance on every render
  const calibrationManagerRef = useRef(null)
  if (calibrationManagerRef.current === null) {
    calibrationManagerRef.current = new CalibrationManager()
  }

  // Update calibration status on mount
  useEffect(() => {
    setCalibrationStatus(calibrationManagerRef.current.getStatus())
  }, [])

  // TEST: Connect to glove backend on mount
  useEffect(() => {
    console.log('🧤 [MainPage] Initializing glove connection test...')

    const backendUrl = process.env.REACT_APP_GLOVE_BACKEND_URL || 'http://localhost:5000'

    // Handle incoming glove data
    const handleGloveData = (rawData) => {
      console.log('📦 [MainPage] Raw glove data received:', rawData)

      // Convert to joint rotations
      const convertedJoints = convertGloveDataToJoints(rawData)
      console.log('🔄 [MainPage] Converted to joints:', convertedJoints)

      // Store in state for DebugPanel and future use
      setGloveJointRotations(convertedJoints)
    }

    // Handle connection status changes
    const handleGloveStatus = (status) => {
      console.log('🔌 [MainPage] Glove connection status:', status)
      setGloveConnectionStatus(status)
    }

    // Connect to backend
    gloveClient.connect(backendUrl, handleGloveData, handleGloveStatus)

    // Cleanup on unmount
    return () => {
      console.log('🧤 [MainPage] Cleaning up glove connection...')
      gloveClient.disconnect()
    }
  }, [])

  const currentLeftModel = useMemo(() =>
    HAND_MODELS.find(m => m.id === selectedLeftModel),
    [selectedLeftModel]
  )

  const currentRightModel = useMemo(() =>
    HAND_MODELS.find(m => m.id === selectedRightModel),
    [selectedRightModel]
  )

  // Filter and sort models based on MODEL_DISPLAY_ORDER
  const visibleModels = useMemo(() => {
    // Create a map for quick lookup of order and visibility
    const orderMap = new Map(MODEL_DISPLAY_ORDER)

    // Filter visible models and sort by order
    return HAND_MODELS
      .filter(model => orderMap.get(model.id) === true)
      .sort((a, b) => {
        const indexA = MODEL_DISPLAY_ORDER.findIndex(([id]) => id === a.id)
        const indexB = MODEL_DISPLAY_ORDER.findIndex(([id]) => id === b.id)
        return indexA - indexB
      })
  }, [])

  // Determine which joint rotations to use based on control mode
  const finalJointRotations = useMemo(() => {
    if (controlMode === 'camera') {
      // Camera mode: Swap hands for back view (camera looking from behind)
      // This makes the virtual hands mirror your real hands naturally
      return {
        left: cameraJointRotations.right || {},
        right: cameraJointRotations.left || {}
      }
    } else if (controlMode === 'ik') {
      // IK mode: Use IK solver output, no hand swapping
      // Camera continues running, but IK solver processes the data
      return {
        left: ikJointRotations.left || {},
        right: ikJointRotations.right || {}
      }
    } else if (controlMode === 'glove') {
      // Glove mode: Use glove sensor data, no hand swapping
      // Direct control from glove sensors
      return {
        left: gloveJointRotations.left || {},
        right: gloveJointRotations.right || {}
      }
    } else {
      // Manual mode: No swapping - direct control
      // Left controls left hand, right controls right hand
      return {
        left: manualJointRotations.left || {},
        right: manualJointRotations.right || {}
      }
    }
  }, [controlMode, cameraJointRotations, manualJointRotations, ikJointRotations, gloveJointRotations])

  const handleJointRotationChange = useCallback((rotation) => {
    setManualJointRotations(prev => ({
      ...prev,
      [selectedHand]: {
        ...prev[selectedHand],
        [selectedJoint]: rotation
      }
    }))
  }, [selectedJoint, selectedHand])

  // Handler for multi-DoF joint axis changes
  const handleMultiDoFChange = useCallback((hand, jointName, axis, value) => {
    console.log(`🎛️ [MainPage.jsx] Multi-DoF change: ${hand}.${jointName}.${axis} = ${value}`)
    setManualJointRotations(prev => ({
      ...prev,
      [hand]: {
        ...prev[hand],
        [jointName]: {
          ...(typeof prev[hand][jointName] === 'object' ? prev[hand][jointName] : {}),
          [axis]: value
        }
      }
    }))
  }, [])

  const handleHandResults = useCallback((results) => {
    setHandTrackingData(results)
  }, [])

  const handleCameraJointRotations = useCallback((rotations) => {
    setCameraJointRotations(rotations)
  }, [])

  const handleCameraHandPositions = useCallback((positions) => {
    setCameraHandPositions(positions)
  }, [])

  const handleCameraLandmarks = useCallback((landmarks) => {
    setCameraLandmarks(landmarks)

    // Update persisted landmarks if tracking is not locked
    if (!isTrackingLocked) {
      setPersistedLandmarks(prev => ({
        left: landmarks.left || prev.left,
        right: landmarks.right || prev.right
      }))
    }
  }, [isTrackingLocked])

  const handleManualLandmarkDrag = useCallback((dragData) => {
    const { handSide, landmarkIndex, position } = dragData

    setManualLandmarkOverrides(prev => ({
      ...prev,
      [handSide]: {
        ...prev[handSide],
        [landmarkIndex]: position
      }
    }))
  }, [])

  const handleResetHandPose = useCallback(() => {
    setManualLandmarkOverrides({ left: {}, right: {} })
    setPersistedLandmarks({ left: null, right: null })
  }, [])

  const handleIKJointRotations = useCallback((rotations) => {
    setIkJointRotations(rotations)
  }, [])

  const handleIKDebugData = useCallback((debugData) => {
    setIkDebugData(debugData)
  }, [])

  const handleControlModeChange = useCallback((mode) => {
    setControlMode(mode)
  }, [])

  const handleCalibrate = useCallback(() => {
    // For now, calibrate using right hand (or first available)
    const calibrationData = cameraJointRotations.right || cameraJointRotations.left
    if (!calibrationData || Object.keys(calibrationData).length === 0) {
      alert('No hand detected. Please show your hand to the camera first.')
      return
    }

    const success = calibrationManagerRef.current.calibrate(calibrationData)
    if (success) {
      setCalibrationStatus(calibrationManagerRef.current.getStatus())
      // console.log('Calibration successful!')
    }
  }, [cameraJointRotations])

  // Handlers for manual Z-axis rotation (90 degree increments)
  const handleLeftHandRotateZ = useCallback((direction) => {
    const increment = direction * (Math.PI / 2) // 90 degrees in radians
    setLeftHandZRotation(prev => getShortestRotation(prev, increment))
  }, [])

  const handleRightHandRotateZ = useCallback((direction) => {
    const increment = direction * (Math.PI / 2) // 90 degrees in radians
    setRightHandZRotation(prev => getShortestRotation(prev, increment))
  }, [])

  // Handlers for robot loaded callbacks
  const handleLeftRobotLoaded = useCallback((robot, config) => {
    leftRobotRef.current = robot

    // 🔥 STEP 10: Store parsed joint config
    if (config) {
      console.log('✅ [MainPage.jsx] Left hand joint config received:', config)
      console.log('   - Joint config:', config.jointConfig)
      console.log('   - Semantic mapping:', config.semanticMapping)
      setLeftHandJointConfig(config)
    }
  }, [])

  const handleRightRobotLoaded = useCallback((robot, config) => {
    rightRobotRef.current = robot

    // 🔥 STEP 10: Store parsed joint config
    if (config) {
      console.log('✅ [MainPage.jsx] Right hand joint config received:', config)
      console.log('   - Joint config:', config.jointConfig)
      console.log('   - Semantic mapping:', config.semanticMapping)
      setRightHandJointConfig(config)
    }
  }, [])

  // Handler for applying metal material to both hand models
  const handleApplyMetalMaterial = useCallback(() => {
    let applied = false

    if (leftRobotRef.current) {
      applyMetalMaterial(leftRobotRef.current)
      applied = true
    }

    if (rightRobotRef.current) {
      applyMetalMaterial(rightRobotRef.current)
      applied = true
    }

    if (!applied) {
      console.warn('No robot models loaded to apply metal material')
    }
  }, [])

  // Handler to reset both hand gimbals and wrist orientation to zero rotation
  const handleResetGimbals = useCallback(() => {
    setLeftHandGimbal(leftHandZRotation)
    setRightHandGimbal(rightHandZRotation)

    // Reset wrist orientation in camera joint rotations
    setCameraJointRotations(prev => ({
      left: {
        ...prev.left,
        wristOrientation: { x: 0, y: 0, z: 0 }
      },
      right: {
        ...prev.right,
        wristOrientation: { x: 0, y: 0, z: 0 }
      }
    }))
  }, [])

  // Handler for scene graph updates from Scene3D
  const handleSceneGraphUpdate = useCallback((graph) => {
    setSceneGraph(graph)
  }, [])

  // Handler for object selection from hierarchy panel
  const handleSelectObject = useCallback((object) => {
    setSelectedObject(object)
  }, [])

  // Merge persisted landmarks with manual overrides for IK
  const finalLandmarksForIK = useMemo(() => {
    const merged = {
      left: persistedLandmarks.left ? [...persistedLandmarks.left] : null,
      right: persistedLandmarks.right ? [...persistedLandmarks.right] : null
    }

    // Apply manual overrides
    if (merged.left) {
      Object.entries(manualLandmarkOverrides.left).forEach(([index, position]) => {
        if (merged.left[index]) {
          merged.left[index] = { ...position }
        }
      })
    }

    if (merged.right) {
      Object.entries(manualLandmarkOverrides.right).forEach(([index, position]) => {
        if (merged.right[index]) {
          merged.right[index] = { ...position }
        }
      })
    }

    return merged
  }, [persistedLandmarks, manualLandmarkOverrides])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Scene3D
        leftModel={currentLeftModel}
        rightModel={currentRightModel}
        handTrackingData={handTrackingData}
        leftJointRotations={finalJointRotations.left}
        rightJointRotations={finalJointRotations.right}
        leftHandPosition={controlMode === 'camera' ? cameraHandPositions.left : null}
        rightHandPosition={controlMode === 'camera' ? cameraHandPositions.right : null}
        leftHandGimbal={leftHandGimbal}
        rightHandGimbal={rightHandGimbal}
        onLeftGimbalChange={setLeftHandGimbal}
        onRightGimbalChange={setRightHandGimbal}
        showGimbals={showGimbals}
        showJointGimbals={showJointGimbals}
        showAxes={showAxes}
        showDebugLabels={showDebugLabels}
        enableCameraPosition={enableCameraPosition}
        leftHandZRotation={leftHandZRotation}
        rightHandZRotation={rightHandZRotation}
        disableWristRotation={disableWristRotation}
        onLeftRobotLoaded={handleLeftRobotLoaded}
        onRightRobotLoaded={handleRightRobotLoaded}
        useMultiDoF={useMultiDoF}
        onSceneGraphUpdate={handleSceneGraphUpdate}
        selectedObject={selectedObject}
        onSelectObject={handleSelectObject}
        controlMode={controlMode}
        ikDebugData={ikDebugData}
        showIKVisualization={showIKVisualization}
        show3DCursor={show3DCursor}
        onManualLandmarkDrag={handleManualLandmarkDrag}
        cameraLandmarks={cameraLandmarks}
        leftModelShortName={currentLeftModel?.shortName || ''}
        rightModelShortName={currentRightModel?.shortName || ''}
        enableThumbFK={enableThumbFK}
      />

      <HandTrackingCamera
        onHandResults={handleHandResults}
        onJointRotations={handleCameraJointRotations}
        onHandPositions={handleCameraHandPositions}
        onRawLandmarks={handleCameraLandmarks}
        calibrationManager={calibrationManagerRef.current}
        showPreview={showCameraPreview}
        useQuaternionTracking={useQuaternionTracking}
        useThumb3DoF={useThumb3DoF}
        robotRefs={{ left: leftRobotRef, right: rightRobotRef }}
      />

      {/* IK Controller - processes camera data through IK solver when in IK mode */}
      {controlMode === 'ik' && (
        <IKController
          cameraLandmarks={finalLandmarksForIK}
          onIKJointRotations={handleIKJointRotations}
          onIKDebugData={handleIKDebugData}
          ikOptions={{
            maxIterations: 10,
            convergenceThreshold: 0.001,
            damping: 0.5
          }}
        />
      )}

      {process.env.REACT_APP_ENABLE_INSPECTOR !== 'false' && showControlPanel && (
        <InspectorPanel
          jointRotations={finalJointRotations}
          cameraJointRotations={cameraJointRotations}
          selectedJoint={selectedJoint}
          onSelectedJointChange={setSelectedJoint}
          onJointRotationChange={handleJointRotationChange}
          selectedHand={selectedHand}
          onSelectedHandChange={setSelectedHand}
          selectedLeftModel={selectedLeftModel}
          selectedRightModel={selectedRightModel}
          onLeftModelChange={setSelectedLeftModel}
          onRightModelChange={setSelectedRightModel}
          models={visibleModels}
          controlMode={controlMode}
          onControlModeChange={handleControlModeChange}
          onCalibrate={handleCalibrate}
          calibrationStatus={calibrationStatus}
          showGimbals={showGimbals}
          onShowGimbalsChange={setShowGimbals}
          showJointGimbals={showJointGimbals}
          onShowJointGimbalsChange={setShowJointGimbals}
          showAxes={showAxes}
          onShowAxesChange={setShowAxes}
          showDebugLabels={showDebugLabels}
          onShowDebugLabelsChange={setShowDebugLabels}
          enableCameraPosition={enableCameraPosition}
          onEnableCameraPositionChange={setEnableCameraPosition}
          leftHandZRotation={leftHandZRotation}
          rightHandZRotation={rightHandZRotation}
          onLeftHandRotateZ={handleLeftHandRotateZ}
          onRightHandRotateZ={handleRightHandRotateZ}
          disableWristRotation={disableWristRotation}
          onDisableWristRotationChange={setDisableWristRotation}
          onApplyMetalMaterial={handleApplyMetalMaterial}
          useMultiDoF={useMultiDoF}
          onUseMultiDoFChange={setUseMultiDoF}
          leftHandJointConfig={leftHandJointConfig}
          rightHandJointConfig={rightHandJointConfig}
          onMultiDoFChange={handleMultiDoFChange}
          useQuaternionTracking={useQuaternionTracking}
          onUseQuaternionTrackingChange={setUseQuaternionTracking}
          useThumb3DoF={useThumb3DoF}
          onUseThumb3DoFChange={setUseThumb3DoF}
          showIKVisualization={showIKVisualization}
          onShowIKVisualizationChange={setShowIKVisualization}
          show3DCursor={show3DCursor}
          onShow3DCursorChange={setShow3DCursor}
          isTrackingLocked={isTrackingLocked}
          onTrackingLockChange={setIsTrackingLocked}
          onResetHandPose={handleResetHandPose}
          sceneGraph={sceneGraph}
          selectedObject={selectedObject}
          onSelectObject={handleSelectObject}
          enableThumbFK={enableThumbFK}
          onEnableThumbFKChange={setEnableThumbFK}
          gloveConnectionStatus={gloveConnectionStatus}
        />
      )}

      {/* Mobile camera toggle button */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 30
        }}>
          <button
            onClick={() => setShowCameraPreview(!showCameraPreview)}
            style={{
              padding: '10px 12px',
              fontSize: '12px',
              backgroundColor: showCameraPreview ? 'rgba(100, 200, 100, 0.9)' : 'rgba(60, 60, 60, 0.8)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            {showCameraPreview ? '📹 Hide' : '📹 Show'} Camera
          </button>
        </div>
      )}

      {/* Debug Panel - shows 3-axis rotation data from position conversion (disabled on mobile) */}
      {process.env.REACT_APP_ENABLE_DEBUG !== 'false' && showDebugPanel && !isMobile && (
        <DebugPanel
          handTrackingData={handTrackingData}
          gloveJointRotations={gloveJointRotations}
          gloveConnectionStatus={gloveConnectionStatus}
          onReset={handleResetGimbals}
        />
      )}

      {/* Navigation link to Raw Data page */}
      <Link
        to="/raw-data"
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          padding: '8px 12px',
          fontSize: '11px',
          backgroundColor: 'rgba(100, 150, 200, 0.9)',
          color: 'white',
          border: '1px solid rgba(150, 200, 255, 0.5)',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: '600',
          fontFamily: 'monospace',
          zIndex: 20,
          transition: 'all 0.2s'
        }}
      >
        📊 Raw Data
      </Link>

      {/* Debug Panel Toggle Button - Always visible */}
      {process.env.REACT_APP_ENABLE_DEBUG !== 'false' && (
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            padding: '8px 12px',
            fontSize: '11px',
            backgroundColor: showDebugPanel ? 'rgba(255, 100, 100, 0.9)' : 'rgba(100, 150, 255, 0.9)',
            color: 'white',
            border: showDebugPanel ? '1px solid rgba(255, 150, 150, 0.5)' : '1px solid rgba(150, 200, 255, 0.5)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600',
            fontFamily: 'monospace',
            zIndex: 20,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (showDebugPanel) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 1)'
              e.currentTarget.style.borderColor = 'rgba(255, 150, 150, 0.8)'
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(100, 150, 255, 1)'
              e.currentTarget.style.borderColor = 'rgba(150, 200, 255, 0.8)'
            }
          }}
          onMouseOut={(e) => {
            if (showDebugPanel) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(255, 150, 150, 0.5)'
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(100, 150, 255, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(150, 200, 255, 0.5)'
            }
          }}
        >
          {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
        </button>
      )}

      {/* Inspector Panel Toggle Button */}
      {process.env.REACT_APP_ENABLE_INSPECTOR !== 'false' && (
        <button
          onClick={() => setShowControlPanel(!showControlPanel)}
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '120px',
            padding: '8px 12px',
            fontSize: '11px',
            backgroundColor: showControlPanel ? 'rgba(255, 100, 100, 0.9)' : 'rgba(100, 200, 100, 0.9)',
            color: 'white',
            border: showControlPanel ? '1px solid rgba(255, 150, 150, 0.5)' : '1px solid rgba(150, 255, 150, 0.5)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600',
            fontFamily: 'monospace',
            zIndex: 20,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (showControlPanel) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 1)'
              e.currentTarget.style.borderColor = 'rgba(255, 150, 150, 0.8)'
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(100, 200, 100, 1)'
              e.currentTarget.style.borderColor = 'rgba(150, 255, 150, 0.8)'
            }
          }}
          onMouseOut={(e) => {
            if (showControlPanel) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(255, 150, 150, 0.5)'
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(100, 200, 100, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(150, 255, 150, 0.5)'
            }
          }}
        >
          {showControlPanel ? 'Hide Inspector' : 'Show Inspector'}
        </button>
      )}
    </div>
  )
}
