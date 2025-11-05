import { useRef, useEffect, useState } from 'react'
import { Hands } from '@mediapipe/hands'
import { drawConnectors } from '@mediapipe/drawing_utils'
import { landmarksToJointRotations } from '../utils/handKinematics'
import { MotionFilter } from '../utils/motionFilter'
import { landmarksToQuaternions } from '../utils/handKinematicsQuaternion'
import { quaternionsToURDFJoints } from '../utils/quaternionToAxisAngles'
import { createQuaternionFilter } from '../utils/quaternionMotionFilter'
import { applyThumb3DoFAddon, shouldApplyThumb3DoF, mergeThumbOverrides } from '../utils/thumbAddon3DoF'

export default function HandTrackingCamera({ onHandResults, onJointRotations, onHandPositions, onRawLandmarks, calibrationManager, showPreview = true, useQuaternionTracking = false, useThumb3DoF = false, robotRefs = { left: null, right: null } }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onHandResultsRef = useRef(onHandResults)
  const onJointRotationsRef = useRef(onJointRotations)
  const onHandPositionsRef = useRef(onHandPositions)
  const onRawLandmarksRef = useRef(onRawLandmarks)

  // State to track horizontal flip
  const [isFlipped, setIsFlipped] = useState(false)

  // Initialize motion filter (persistent across renders)
  const motionFilterRef = useRef(new MotionFilter({
    alpha: 0.3, // Smoothing strength (lower = smoother but more lag)
    maxVelocity: 5.0, // Max radians per second
    enableSmoothing: true,
    enableVelocityLimiting: true,
    enableConstraints: true
  }))

  // Initialize quaternion filter (persistent across renders)
  const quaternionFilterRef = useRef(createQuaternionFilter(0.3))

  // Keep the refs updated without triggering re-initialization
  useEffect(() => {
    onHandResultsRef.current = onHandResults
  }, [onHandResults])

  useEffect(() => {
    onJointRotationsRef.current = onJointRotations
  }, [onJointRotations])

  useEffect(() => {
    onHandPositionsRef.current = onHandPositions
  }, [onHandPositions])

  useEffect(() => {
    onRawLandmarksRef.current = onRawLandmarks
  }, [onRawLandmarks])

  useEffect(() => {
    let hands = null
    let animationId = null
    let canvasSizeSet = false

    // Initialize MediaPipe Hands
    const initializeHandTracking = () => {
      hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      hands.onResults(onResults)
    }

    // Handle hand detection results
    const onResults = (results) => {
      const canvas = canvasRef.current
      const video = videoRef.current

      if (!canvas || !video) return

      const ctx = canvas.getContext('2d')

      // Set canvas size to match video (only once)
      if (!canvasSizeSet && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvasSizeSet = true
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw hand landmarks and connections
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
          // Draw connections between landmarks
          drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
          })

          // Draw landmark points with depth-based size, color, and opacity
          landmarks.forEach(landmark => {
            // Get depth value (z coordinate)
            // MediaPipe z: negative = toward camera, positive = away from camera
            // Typical range: [-0.2, 0.2]
            const depth = landmark.z

            // Normalize depth to 0-1 range (0 = close, 1 = far)
            // Clamp depth to reasonable range and invert so closer = higher value
            const normalizedDepth = Math.max(0, Math.min(1, (-depth + 0.2) / 0.4))

            // Map depth to size (closer = larger: 2-15px)
            const radius = 2 + normalizedDepth * 11

            // Map depth to color brightness (closer = brighter red 255, further = darker red 100)
            const redValue = Math.floor(100 + normalizedDepth * 155)

            // Map depth to opacity (closer = opaque 1.0, further = transparent 0.3)
            const opacity = 0.3 + normalizedDepth * 0.7

            // Convert normalized coordinates to canvas coordinates
            const x = landmark.x * canvas.width
            const y = landmark.y * canvas.height

            // Draw the landmark point
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, 2 * Math.PI)
            ctx.fillStyle = `rgba(${redValue}, 0, 0, ${opacity})`
            ctx.fill()
            ctx.strokeStyle = `rgba(${Math.max(0, redValue - 50)}, 0, 0, ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          })

          // Draw hand label above the highest point
          // Use handedness-based labels: Left = HAND 1, Right = HAND 2
          const handedness = results.multiHandedness?.[index]?.label || 'Right'
          const handLabel = handedness === 'Left' ? 'HAND 1' : 'HAND 2'

          // Find the highest point (minimum y-coordinate) among all 21 landmarks
          let highestY = landmarks[0].y
          let highestX = landmarks[0].x
          for (let i = 1; i < landmarks.length; i++) {
            if (landmarks[i].y < highestY) {
              highestY = landmarks[i].y
              highestX = landmarks[i].x
            }
          }

          // Convert normalized coordinates to canvas coordinates
          const labelX = highestX * canvas.width
          const labelY = highestY * canvas.height - 30 // Position 30px above highest point

          // Save the current canvas state
          ctx.save()

          // Apply horizontal flip to compensate for CSS transform: scaleX(-1)
          // This makes text readable when the canvas element itself is flipped
          ctx.scale(-1, 1)
          ctx.translate(-canvas.width, 0)

          // Mirror the x-coordinate for the flipped coordinate system
          const flippedLabelX = canvas.width - labelX

          // Draw label with background
          ctx.font = 'bold 20px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          // Measure text for background
          const textMetrics = ctx.measureText(handLabel)
          const padding = 8
          const bgWidth = textMetrics.width + padding * 2
          const bgHeight = 28

          // Draw semi-transparent background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(
            flippedLabelX - bgWidth / 2,
            labelY - bgHeight / 2,
            bgWidth,
            bgHeight
          )

          // Draw text - different colors for each hand based on handedness
          ctx.fillStyle = handedness === 'Left' ? '#00BFFF' : '#00FF00'
          ctx.fillText(handLabel, flippedLabelX, labelY)

          // Restore the canvas state
          ctx.restore()
        })
      }

      // Pass results to parent component if callback provided
      if (onHandResultsRef.current) {
        onHandResultsRef.current(results)
      }

      // Process landmarks to joint rotations and positions
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const handRotations = { left: null, right: null }
        const handPositions = { left: null, right: null }
        const rawLandmarks = { left: null, right: null }

        // Process each detected hand
        results.multiHandLandmarks.forEach((landmarks, index) => {
          const handedness = results.multiHandedness?.[index]?.label || 'Right'

          // console.log(`Processing hand ${index}: ${handedness}`)

          let rotations

          // Choose processing path based on useQuaternionTracking flag
          if (useQuaternionTracking) {
            // QUATERNION PATH: Convert landmarks → quaternions → axis angles
            const quaternions = landmarksToQuaternions(landmarks, handedness)

            // Apply quaternion filtering (SLERP)
            const filteredQuaternions = quaternionFilterRef.current.filter(quaternions, Date.now())

            // Decompose quaternions to URDF joint angles
            rotations = quaternionsToURDFJoints(filteredQuaternions)

            // 🔥 THUMB 3DOF ADDON: Override thumb joints with full 3-axis decomposition
            const handSide = handedness === 'Left' ? 'left' : 'right'
            const robot = robotRefs[handSide]?.current

            if (shouldApplyThumb3DoF(useThumb3DoF, useQuaternionTracking, robot)) {
              const thumbOverrides = applyThumb3DoFAddon(filteredQuaternions, robot, handedness)
              rotations = mergeThumbOverrides(rotations, thumbOverrides)
              console.log('🔧 [Thumb3DoF] Applied thumb overrides for', handedness, 'hand')
            }

            console.log('🔄 Quaternion tracking:', handedness, rotations)
          } else {
            // ORIGINAL PATH: Convert landmarks to joint rotations (1-DOF)
            rotations = landmarksToJointRotations(landmarks, handedness)

            // Create hand prefix for filter (lowercase for consistency)
            const handPrefix = handedness === 'Left' ? 'left' : 'right'

            // Apply motion filtering with hand-specific prefix
            rotations = motionFilterRef.current.filter(rotations, Date.now(), handPrefix)
          }

          // Extract wrist position (landmark 0 is always the wrist)
          const wristLandmark = landmarks[0]
          // Convert MediaPipe coordinates to Three.js space
          // MediaPipe: x right, y down, z toward camera (negative = away)
          // Three.js: x right, y up, z toward viewer (positive = toward)
          // Scale and center the position
          const position = {
            x: (wristLandmark.x - 0.5) * 2,  // Center around 0, scale to -1 to 1
            y: -(wristLandmark.y - 0.5) * 2, // Invert Y and center
            z: -wristLandmark.z * 2           // Invert Z and scale
          }

          // Apply calibration if available
          if (calibrationManager) {
            rotations = calibrationManager.applyCalibration(rotations)
          }

          // Apply hand-specific orientation corrections for right hand
          // Right hand needs 180-degree flip to correct inverted orientation
          if (handedness === 'Right' && rotations.wristOrientation) {
            rotations.wristOrientation = {
              x: -rotations.wristOrientation.x,
              y: rotations.wristOrientation.y,
              z: -rotations.wristOrientation.z
            }
          }

          // Store rotations, positions, and raw landmarks by hand side
          if (handedness === 'Left') {
            handRotations.left = rotations
            handPositions.left = position
            rawLandmarks.left = landmarks
          } else {
            handRotations.right = rotations
            handPositions.right = position
            rawLandmarks.right = landmarks
          }
        })

        // Send rotations to parent component
        if (onJointRotationsRef.current) {
          onJointRotationsRef.current(handRotations)
        }

        // Send positions to parent component
        if (onHandPositionsRef.current) {
          onHandPositionsRef.current(handPositions)
        }

        // Send raw landmarks to parent component
        if (onRawLandmarksRef.current) {
          onRawLandmarksRef.current(rawLandmarks)
        }
      } else {
        // No hands detected - reset positions and landmarks but preserve rotations
        if (onHandPositionsRef.current) {
          onHandPositionsRef.current({ left: null, right: null })
        }
        if (onRawLandmarksRef.current) {
          onRawLandmarksRef.current({ left: null, right: null })
        }
        // Note: We don't reset onJointRotations - this preserves the last known pose
      }
    }

    // Process video frames
    const detectHands = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        await hands.send({ image: videoRef.current })
      }
      animationId = requestAnimationFrame(detectHands)
    }

    // Access the user's camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream

          // Wait for video to load before starting hand detection
          videoRef.current.onloadedmetadata = () => {
            initializeHandTracking()
            detectHands()
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
      }
    }

    startCamera()

    // Cleanup function to stop camera and hand detection when component unmounts
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      if (hands) {
        hands.close()
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, []) // Empty dependency array - only initialize once

  // Don't render preview if showPreview is false, but keep processing
  if (!showPreview) {
    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </>
    )
  }

  // Toggle flip state when preview is clicked
  const handlePreviewClick = () => {
    setIsFlipped(prev => !prev)
  }

  return (
    <div
      onClick={handlePreviewClick}
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: '320px',
        height: '240px',
        border: '2px solid white',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 10,
        cursor: 'pointer'
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          transform: isFlipped ? 'scaleX(1)' : 'scaleX(-1)'
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: isFlipped ? 'scaleX(1)' : 'scaleX(-1)'
        }}
      />
    </div>
  )
}
