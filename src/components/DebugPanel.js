import { useState, useEffect } from 'react'
import { landmarksToJointRotations } from '../utils/handKinematics'

/**
 * DebugPanel Component
 * Displays joint angles (curl values) in real-time from hand landmark positions
 */
export default function DebugPanel({
  onReset,
  handTrackingData, // Raw landmark position data from MediaPipe
  gloveJointRotations, // Joint rotations from glove backend
  gloveConnectionStatus // Connection status: 'connected' | 'disconnected' | 'error'
}) {
  // State for selected hand
  const [selectedHand, setSelectedHand] = useState('left')

  // State for data source (camera or glove)
  const [dataSource, setDataSource] = useState('camera')

  // State to persist last valid joint angles
  const [lastValidJoints, setLastValidJoints] = useState(null)

  // Convert radians to degrees and format (1 decimal place)
  const formatDeg = (radians) => ((radians || 0) * 180 / Math.PI).toFixed(1)

  // Convert position data to joint rotations using handKinematics (for camera data)
  const convertedJoints = (() => {
    if (dataSource === 'glove') {
      // Use glove data
      return gloveJointRotations?.[selectedHand] || null
    }

    // Use camera data
    if (!handTrackingData || !handTrackingData.multiHandLandmarks) {
      return null
    }

    // Find the landmarks for the selected hand
    let selectedLandmarks = null
    let selectedHandedness = null

    handTrackingData.multiHandLandmarks.forEach((landmarks, index) => {
      const handedness = handTrackingData.multiHandedness?.[index]?.label || 'Right'
      const isLeft = handedness === 'Left'
      const isRight = handedness === 'Right'

      if ((selectedHand === 'left' && isLeft) || (selectedHand === 'right' && isRight)) {
        selectedLandmarks = landmarks
        selectedHandedness = handedness
      }
    })

    if (!selectedLandmarks) {
      return null
    }

    // Convert landmarks to joint rotations and extract joints object
    const result = landmarksToJointRotations(selectedLandmarks, selectedHandedness)
    return result.joints
  })()

  // Update last valid joints when new valid data is available
  useEffect(() => {
    if (convertedJoints) {
      setLastValidJoints(convertedJoints)
    }
  }, [convertedJoints])

  // Finger names and segments
  const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky']
  const segments = ['tip', 'dip', 'pip', 'mcp']

  return (
    <div style={{
      position: 'absolute',
      bottom: 60,
      left: 10,
      zIndex: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '6px',
      fontFamily: 'monospace',
      fontSize: '10px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      minWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
      {/* Data Source Toggle (Camera vs Glove) */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '6px',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setDataSource('camera')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: dataSource === 'camera'
              ? 'rgba(34, 197, 94, 0.9)'
              : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: dataSource === 'camera'
              ? '2px solid rgba(34, 197, 94, 1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: dataSource === 'camera' ? 'bold' : 'normal',
            fontFamily: 'monospace'
          }}
        >
          📹 CAMERA
        </button>
        <button
          onClick={() => setDataSource('glove')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: dataSource === 'glove'
              ? 'rgba(168, 85, 247, 0.9)'
              : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: dataSource === 'glove'
              ? '2px solid rgba(168, 85, 247, 1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: dataSource === 'glove' ? 'bold' : 'normal',
            fontFamily: 'monospace'
          }}
        >
          🧤 GLOVE {gloveConnectionStatus === 'connected' ? '🟢' : '🔴'}
        </button>
      </div>

      {/* Hand Selection Toggle */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '6px',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setSelectedHand('left')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: selectedHand === 'left'
              ? 'rgba(251, 191, 36, 0.9)'
              : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: selectedHand === 'left'
              ? '2px solid rgba(251, 191, 36, 1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: selectedHand === 'left' ? 'bold' : 'normal',
            fontFamily: 'monospace'
          }}
        >
          LEFT
        </button>
        <button
          onClick={() => setSelectedHand('right')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: selectedHand === 'right'
              ? 'rgba(96, 213, 244, 0.9)'
              : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: selectedHand === 'right'
              ? '2px solid rgba(96, 213, 244, 1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: selectedHand === 'right' ? 'bold' : 'normal',
            fontFamily: 'monospace'
          }}
        >
          RIGHT
        </button>
      </div>

      {/* Joint Angles - Main Display */}
      {/* Joint Angles Grid */}
      <div style={{
        fontWeight: 'bold',
        marginBottom: '4px',
        fontSize: '11px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
        paddingBottom: '2px'
      }}>
        Joint Angles (deg) - Curl Values
      </div>

          {/* Grid Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '9px'
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '2px',
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '8px'
                  }}></th>
                  {fingers.map(finger => (
                    <th key={finger} style={{
                      padding: '2px',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: 'bold',
                      fontSize: '9px',
                      textTransform: 'uppercase'
                    }}>
                      {finger}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map(segment => {
                  const segmentUpper = segment.toUpperCase()
                  return (
                    <tr key={segment}>
                      <td style={{
                        padding: '2px',
                        fontWeight: 'bold',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '8px',
                        borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        {segmentUpper}
                      </td>
                      {fingers.map(finger => {
                        const jointName = `${finger}_${segment}`
                        const jointAngle = lastValidJoints?.[jointName] || 0

                        return (
                          <td key={jointName} style={{
                            padding: '4px',
                            textAlign: 'center',
                            borderLeft: finger !== 'thumb' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            fontSize: '11px',
                            color: '#4ecdc4',
                            fontWeight: 'bold'
                          }}>
                            {formatDeg(jointAngle)}°
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* MCP_ROLL row - show roll angles for fingers that have them */}
                <tr>
                  <td style={{
                    padding: '2px',
                    fontWeight: 'bold',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '8px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    MCP_ROLL
                  </td>
                  {fingers.map(finger => {
                    const rollKey = `${finger}_roll`
                    const rollAngle = lastValidJoints?.[rollKey] || 0

                    return (
                      <td key={rollKey} style={{
                        padding: '4px',
                        textAlign: 'center',
                        borderLeft: finger !== 'thumb' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                        fontSize: '11px',
                        color: '#ffe66d',
                        fontWeight: 'bold'
                      }}>
                        {formatDeg(rollAngle)}°
                      </td>
                    )
                  })}
                </tr>

                {/* MCP_YAW row - only thumb has yaw */}
                <tr>
                  <td style={{
                    padding: '2px',
                    fontWeight: 'bold',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '8px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    MCP_YAW
                  </td>
                  {fingers.map(finger => {
                    const yawKey = `${finger}_yaw`
                    const hasYaw = finger === 'thumb'
                    const yawAngle = hasYaw ? (lastValidJoints?.[yawKey] || 0) : null

                    return (
                      <td key={yawKey} style={{
                        padding: '4px',
                        textAlign: 'center',
                        borderLeft: finger !== 'thumb' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        fontSize: '11px',
                        color: hasYaw ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                        fontWeight: hasYaw ? 'bold' : 'normal'
                      }}>
                        {hasYaw ? `${formatDeg(yawAngle)}°` : 'N/A'}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Wrist Data */}
          <div style={{
            marginTop: '6px',
            paddingTop: '4px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              fontWeight: 'bold',
              marginBottom: '2px',
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              WRIST
            </div>
            <div style={{ paddingLeft: '4px', lineHeight: '1.3', fontSize: '11px' }}>
              {(() => {
                const wristAngle = lastValidJoints?.wrist || 0
                return (
                  <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>
                    {formatDeg(wristAngle)}°
                  </span>
                )
              })()}
            </div>
          </div>

      {/* Reset Button */}
      {/* <button
        onClick={onReset}
        style={{
          width: '100%',
          padding: '4px',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '3px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '10px',
          fontFamily: 'monospace',
          marginTop: '6px'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'}
      >
        Reset Rotation
      </button> */}
    </div>
  )
}
