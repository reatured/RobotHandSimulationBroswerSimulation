import { useEffect, useState, useRef } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import URDFLoader from 'urdf-loader'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { getURDFPath } from '../utils/urdfConfig'
import { mapUIJointToURDF, clampJointValue } from '../utils/urdfJointMapping'
import { parseJointConfig, createSemanticMapping } from '../utils/urdfParser'
import JointGimbalVisualizer from './JointGimbalVisualizer'

/**
 * URDFHandModel Component
 * Loads and displays URDF hand models with optional joint control
 */
export default function URDFHandModel({
  modelPath,
  side = 'left',
  jointRotations = {},
  position = [0, 0, 0],
  cameraPosition = null,
  onRobotLoaded = null,
  useMultiDoF = false,
  showJointGimbals = false,
  onPalmLengthCalculated = null
}) {
  const [robot, setRobot] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [semanticMapping, setSemanticMapping] = useState(null)
  const [meshesLoaded, setMeshesLoaded] = useState(false)
  const groupRef = useRef()

  // Load URDF model
  useEffect(() => {
    const urdfPath = getURDFPath(modelPath, side)

    if (!urdfPath) {
      setError(`No URDF found for ${modelPath} (${side})`)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setMeshesLoaded(false) // Reset mesh loaded state

    const loader = new URDFLoader()

    // Set up loading manager for better error handling and mesh loading tracking
    const manager = new THREE.LoadingManager()

    manager.onLoad = () => {
      console.log('✅ All meshes loaded for model!')
      setMeshesLoaded(true)
    }

    manager.onError = (url) => {
      console.error('Error loading:', url)
      setError(`Failed to load: ${url}`)
    }

    loader.manager = manager

    // Register loaders for different mesh file types
    // Using loadMeshCb as documented in urdf-loader
    const gltfLoader = new GLTFLoader(manager)
    const stlLoader = new STLLoader(manager)

    loader.loadMeshCb = (path, manager, onComplete) => {
      const extension = path.split('.').pop().toLowerCase()

      if (extension === 'stl') {
        // Load STL file
        stlLoader.load(
          path,
          (geometry) => {
            // STL loader returns geometry, need to create mesh
            const material = new THREE.MeshStandardMaterial({
              color: 0xcccccc,
              metalness: 0.3,
              roughness: 0.7
            })
            const mesh = new THREE.Mesh(geometry, material)
            onComplete(mesh)
          },
          undefined,
          (err) => {
            console.error('Error loading STL mesh:', path, err)
            onComplete(null, err)
          }
        )
      } else {
        // Load GLB/GLTF file (existing behavior)
        gltfLoader.load(
          path,
          (result) => {
            onComplete(result.scene)
          },
          undefined,
          (err) => {
            console.error('Error loading GLTF mesh:', path, err)
            onComplete(null, err)
          }
        )
      }
    }

    // Set the working path for resolving relative mesh paths
    // Extract the directory from the URDF path
    const urdfDir = urdfPath.substring(0, urdfPath.lastIndexOf('/'))
    loader.workingPath = urdfDir + '/'

    // console.log(`Loading URDF from: ${urdfPath}`)
    // console.log(`Working path set to: ${urdfDir}/`)

    // Load the URDF file
    loader.load(
      urdfPath,
      (loadedRobot) => {
        console.log('URDF loaded successfully:', urdfPath)
        console.log('Robot joints:', Object.keys(loadedRobot.joints))

        // Apply default rotation and scale adjustments if needed
        loadedRobot.rotation.set(0, 0, 0)
        loadedRobot.position.set(0, 0, 0)

        // 🔥 STEP 3: Parse URDF to extract joint configuration
        console.log('\n🚀 ========== STARTING URDF PARSING ==========');
        const jointConfig = parseJointConfig(loadedRobot)
        const parsedSemanticMapping = createSemanticMapping(jointConfig)
        console.log('🚀 ========== PARSING COMPLETE ==========\n');

        // Calculate palm length (wrist to pinky MCP) for cursor scaling
        if (onPalmLengthCalculated) {
          // Find pinky MCP joint (case insensitive search)
          const jointNames = Object.keys(loadedRobot.joints)
          const pinkyMcpJointName = jointNames.find(name =>
            name.toLowerCase().includes('pinky') && name.toLowerCase().includes('mcp')
          )

          if (pinkyMcpJointName) {
            const pinkyMcpJoint = loadedRobot.joints[pinkyMcpJointName]
            if (pinkyMcpJoint) {
              // Get world position of the joint
              const worldPos = new THREE.Vector3()
              pinkyMcpJoint.getWorldPosition(worldPos)

              // Calculate distance from wrist (origin at 0,0,0)
              const palmLength = worldPos.length()
              console.log(`📏 Palm length calculated: ${palmLength.toFixed(4)} (from wrist to ${pinkyMcpJointName})`)
              onPalmLengthCalculated(palmLength)
            }
          } else {
            console.warn('⚠️ Could not find pinky MCP joint for palm length calculation')
          }
        }

        setRobot(loadedRobot)
        setSemanticMapping(parsedSemanticMapping)
        setLoading(false)

        // Notify parent component that robot is loaded
        if (onRobotLoaded) {
          onRobotLoaded(loadedRobot, { jointConfig, semanticMapping: parsedSemanticMapping })
        }
      },
      (progress) => {
        // Optional: track loading progress
        // Progress can be null or undefined in some cases
        // if (progress && progress.lengthComputable) {
        //   const percent = (progress.loaded / progress.total) * 100
        //   console.log(`Loading ${urdfPath}: ${percent.toFixed(2)}%`)
        // }
      },
      (err) => {
        console.error('Failed to load URDF:', err)
        setError(`Failed to load URDF: ${err.message || 'Unknown error'}`)
        setLoading(false)
      }
    )

    // Cleanup
    return () => {
      if (robot) {
        robot.traverse((child) => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
    }
  }, [modelPath, side])

  // Auto-apply metal material when robot AND all meshes are loaded
  useEffect(() => {
    if (robot && meshesLoaded) {
      console.log('🤖 Robot and all meshes loaded, applying metal material...')
      applyMetalMaterial(robot)
    }
  }, [robot, meshesLoaded])

  // Apply joint rotations and position when they change
  useEffect(() => {
    if (!robot || !groupRef.current) return

    // Handle both old format (flat object) and new format (with joints property)
    const joints = jointRotations.joints || jointRotations

    // Wrist orientation is now handled by GimbalControl in Scene3D
    // Do not apply wrist rotation here to avoid double rotation
    robot.rotation.set(0, 0, 0)

    // Apply position offset from camera if available
    if (cameraPosition) {
      groupRef.current.position.set(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z
      )
    } else {
      // Reset to origin
      groupRef.current.position.set(0, 0, 0)
    }

    // Apply each joint rotation
    if (Object.keys(joints).length > 0) {
      Object.entries(joints).forEach(([uiJointName, angleData]) => {
        // Check if this is multi-DoF data (object with pitch/yaw/roll)
        const isMultiDoF = typeof angleData === 'object' &&
                           (angleData.pitch !== undefined ||
                            angleData.yaw !== undefined ||
                            angleData.roll !== undefined)

        if (isMultiDoF && useMultiDoF && semanticMapping) {
          // Multi-DoF mode: apply each axis separately
          const jointMapping = semanticMapping[uiJointName]

          if (jointMapping) {
            jointMapping.axes.forEach(axis => {
              const urdfJointName = jointMapping.urdfJoints[axis]
              const axisValue = angleData[axis] || 0
              const [lower, upper] = jointMapping.limits[axis]

              // Apply with dynamic limits
              const joint = robot.joints[urdfJointName]
              if (joint) {
                const clampedValue = Math.max(lower, Math.min(upper, axisValue))
                try {
                  joint.setJointValue(clampedValue)
                  console.log(`🔧 [URDFHandModel] Set ${urdfJointName} = ${clampedValue.toFixed(3)}`)
                } catch (error) {
                  console.error(`Error setting multi-DoF joint ${urdfJointName}:`, error)
                }
              }
            })
          }
        } else {
          // Single-axis mode: use traditional mapping
          const angle = typeof angleData === 'object' ? 0 : angleData
          const urdfJointName = mapUIJointToURDF(uiJointName, modelPath)

          if (!urdfJointName) {
            return
          }

          const joint = robot.joints[urdfJointName]
          if (!joint) {
            return
          }

          const clampedAngle = clampJointValue(angle, urdfJointName, modelPath)

          try {
            joint.setJointValue(clampedAngle)
            if(urdfJointName.includes('index')) {
            console.log(`🔧 [URDFHandModel] Set ${urdfJointName} = ${clampedAngle.toFixed(3)}`)
            }
          } catch (error) {
            console.error(`Error setting joint value for ${urdfJointName}:`, error)
          }
        }
      })
    }
  }, [robot, jointRotations, modelPath, cameraPosition, useMultiDoF, semanticMapping])

  // Render loading state
  if (loading) {
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="gray" opacity={0.5} transparent />
        </mesh>
      </group>
    )
  }

  // Render error state
  if (error) {
    console.error('URDFHandModel error:', error)
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="red" opacity={0.5} transparent />
        </mesh>
      </group>
    )
  }

  // Render loaded robot
  if (robot) {
    return (
      <group ref={groupRef} position={position}>
        <primitive object={robot} />
        <JointGimbalVisualizer robot={robot} visible={showJointGimbals} scale={0.05} />
      </group>
    )
  }

  return null
}

/**
 * Apply metal material to all meshes in a robot model
 * @param {Object} robotModel - The URDF robot model object
 */
export function applyMetalMaterial(robotModel) {
  if (!robotModel) {
    console.warn('Cannot apply metal material: robot model is null')
    return
  }

  console.log('🎨 Applying metal material to robot model...')

  // Create a stainless steel-like metal material
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0, // Light gray/silver color
    metalness: 0.95, // Very metallic
    roughness: 0.1, // Polished/smooth surface
    envMapIntensity: 1.0
  })

  let meshCount = 0

  // Traverse all children and replace materials
  robotModel.traverse((child) => {
    if (child.isMesh) {
      meshCount++
      console.log(`  → Found mesh: ${child.name || 'unnamed'}`)

      // Dispose old material to prevent memory leaks
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }

      // Apply new metal material
      child.material = metalMaterial
      child.material.needsUpdate = true
    }
  })

  console.log(`✅ Metal material applied to ${meshCount} meshes`)
}
