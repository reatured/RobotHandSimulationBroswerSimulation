import { useState, useEffect } from 'react'
import { landmarksToJointRotations } from '../utils/handKinematics'

/**
 * DebugPanel Component
 * Displays joint angles (curl values) in real-time from hand landmark positions
 */
export default function DebugPanel({
  onReset,
  onClose,
  handTrackingData // Raw landmark position data from MediaPipe
}) {
  // State for selected hand (secondary tab)
  const [selectedHand, setSelectedHand] = useState('left')

  // State for selected tab (primary tab)
  const [selectedTab, setSelectedTab] = useState('angles')

  // State for selected semantic joint for highlighting
  const [selectedJoint, setSelectedJoint] = useState(null)

  // State to persist last valid joint angles
  const [lastValidJoints, setLastValidJoints] = useState(null)

  // State to persist last valid scaled landmarks
  const [lastValidLandmarks, setLastValidLandmarks] = useState(null)

  // Convert radians to degrees and format (1 decimal place)
  const formatDeg = (radians) => ((radians || 0) * 180 / Math.PI).toFixed(1)

  // Convert position data to joint rotations using handKinematics
  const convertedJoints = (() => {
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

  // MediaPipe landmark names (21 points)
  const landmarkNames = [
    'Wrist',
    'Thumb CMC', 'Thumb MCP', 'Thumb IP', 'Thumb Tip',
    'Index MCP', 'Index PIP', 'Index DIP', 'Index Tip',
    'Middle MCP', 'Middle PIP', 'Middle DIP', 'Middle Tip',
    'Ring MCP', 'Ring PIP', 'Ring DIP', 'Ring Tip',
    'Pinky MCP', 'Pinky PIP', 'Pinky DIP', 'Pinky Tip'
  ]

  // Semantic joint to landmark index mapping
  const semanticJointMap = {
    'wrist': [0],
    'thumb_cmc': [1], 'thumb_mcp': [2], 'thumb_ip': [3], 'thumb_tip': [4],
    'index_mcp': [5], 'index_pip': [6], 'index_dip': [7], 'index_tip': [8],
    'middle_mcp': [9], 'middle_pip': [10], 'middle_dip': [11], 'middle_tip': [12],
    'ring_mcp': [13], 'ring_pip': [14], 'ring_dip': [15], 'ring_tip': [16],
    'pinky_mcp': [17], 'pinky_pip': [18], 'pinky_dip': [19], 'pinky_tip': [20]
  }

  // Get landmark colors based on finger group
  const getLandmarkColor = (index) => {
    if (index === 0) return '#ffffff' // Wrist - white
    if (index >= 1 && index <= 4) return '#ff6b6b' // Thumb - red
    if (index >= 5 && index <= 8) return '#4ecdc4' // Index - cyan
    if (index >= 9 && index <= 12) return '#ffe66d' // Middle - yellow
    if (index >= 13 && index <= 16) return '#95e1d3' // Ring - mint
    if (index >= 17 && index <= 20) return '#f38181' // Pinky - pink
    return '#ffffff'
  }

  // Check if a landmark should be highlighted
  const isLandmarkHighlighted = (index) => {
    if (!selectedJoint) return false
    const indices = semanticJointMap[selectedJoint]
    return indices && indices.includes(index)
  }

  // Calculate scaled and rotated landmark positions
  const getScaledLandmarks = () => {
    if (!handTrackingData || !handTrackingData.multiHandLandmarks) {
      return null
    }

    // Find the landmarks for the selected hand
    let selectedLandmarks = null

    handTrackingData.multiHandLandmarks.forEach((landmarks, index) => {
      const handedness = handTrackingData.multiHandedness?.[index]?.label || 'Right'
      const isLeft = handedness === 'Left'
      const isRight = handedness === 'Right'

      if ((selectedHand === 'left' && isLeft) || (selectedHand === 'right' && isRight)) {
        selectedLandmarks = landmarks
      }
    })

    if (!selectedLandmarks) {
      return null
    }

    // Get wrist position (landmark 0)
    const wrist = selectedLandmarks[0]

    // Get pinky MCP position (landmark 17)
    const pinkyMCP = selectedLandmarks[17]

    // Calculate distance from wrist to pinky MCP for scaling
    const dx = pinkyMCP.x - wrist.x
    const dy = pinkyMCP.y - wrist.y
    const dz = pinkyMCP.z - wrist.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // Calculate scale factor (normalize so wrist-to-pinky = 1.0)
    const scale = distance > 0 ? 1.0 / distance : 1.0

    // Calculate scaled relative positions (before rotation)
    const relativeScaled = selectedLandmarks.map(landmark => ({
      x: (landmark.x - wrist.x) * scale,
      y: (landmark.y - wrist.y) * scale,
      z: (landmark.z - wrist.z) * scale
    }))

    // Calculate palm forward vector (wrist to middle MCP - landmark 9)
    const middleMCP = relativeScaled[9]
    const palmForward = {
      x: middleMCP.x,
      y: middleMCP.y,
      z: middleMCP.z
    }
    const pfLen = Math.sqrt(palmForward.x ** 2 + palmForward.y ** 2 + palmForward.z ** 2)
    if (pfLen > 0) {
      palmForward.x /= pfLen
      palmForward.y /= pfLen
      palmForward.z /= pfLen
    }

    // Calculate palm right vector (wrist to index MCP - landmark 5)
    const indexMCP = relativeScaled[5]
    const palmRight = {
      x: indexMCP.x,
      y: indexMCP.y,
      z: indexMCP.z
    }

    // Calculate palm normal (cross product: palmRight × palmForward)
    const palmNormal = {
      x: palmRight.y * palmForward.z - palmRight.z * palmForward.y,
      y: palmRight.z * palmForward.x - palmRight.x * palmForward.z,
      z: palmRight.x * palmForward.y - palmRight.y * palmForward.x
    }
    const pnLen = Math.sqrt(palmNormal.x ** 2 + palmNormal.y ** 2 + palmNormal.z ** 2)
    if (pnLen > 0) {
      palmNormal.x /= pnLen
      palmNormal.y /= pnLen
      palmNormal.z /= pnLen
    }

    // Build rotation matrix where:
    // New Z-axis = palm normal (forward)
    // New Y-axis = palm forward (up)
    // New X-axis = recalculated right vector (palmNormal × palmForward)
    const newRight = {
      x: palmNormal.y * palmForward.z - palmNormal.z * palmForward.y,
      y: palmNormal.z * palmForward.x - palmNormal.x * palmForward.z,
      z: palmNormal.x * palmForward.y - palmNormal.y * palmForward.x
    }

    // Apply rotation to all landmarks
    return relativeScaled.map(point => ({
      x: point.x * newRight.x + point.y * newRight.y + point.z * newRight.z,
      y: point.x * palmForward.x + point.y * palmForward.y + point.z * palmForward.z,
      z: point.x * palmNormal.x + point.y * palmNormal.y + point.z * palmNormal.z
    }))
  }

  const scaledLandmarks = getScaledLandmarks()

  // Update persisted landmarks when new valid data is available
  useEffect(() => {
    if (scaledLandmarks) {
      setLastValidLandmarks(scaledLandmarks)
    }
  }, [scaledLandmarks])

  // Use persisted landmarks if current data is not available
  const displayLandmarks = scaledLandmarks || lastValidLandmarks

  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
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
      {/* Primary Tab Navigation and Close Button */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '6px',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setSelectedTab('angles')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: selectedTab === 'angles'
              ? 'rgba(100, 150, 255, 0.9)'
              : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: selectedTab === 'angles'
              ? '2px solid rgba(100, 150, 255, 1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: selectedTab === 'angles' ? 'bold' : 'normal',
            fontFamily: 'monospace'
          }}
        >
          Joint Angles
        </button>
        <button
          onClick={() => setSelectedTab('landmarks')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: selectedTab === 'landmarks'
              ? 'rgba(100, 150, 255, 0.9)'
              : 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: selectedTab === 'landmarks'
              ? '2px solid rgba(100, 150, 255, 1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: selectedTab === 'landmarks' ? 'bold' : 'normal',
            fontFamily: 'monospace'
          }}
        >
          Landmarks
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 100, 100, 0.5)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)'
            e.currentTarget.style.borderColor = 'rgba(255, 100, 100, 0.8)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'
            e.currentTarget.style.borderColor = 'rgba(255, 100, 100, 0.5)'
          }}
        >
          ✕
        </button>
      </div>

      {/* Secondary Tab Navigation - Hand Selection */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '6px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '4px'
      }}>
        <button
          onClick={() => setSelectedHand('left')}
          style={{
            flex: 1,
            padding: '3px 8px',
            fontSize: '9px',
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
            padding: '3px 8px',
            fontSize: '9px',
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

      {/* Tab Content */}
      {selectedTab === 'angles' && (
        <>
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
        </>
      )}

      {/* Landmarks Tab */}
      {selectedTab === 'landmarks' && (
        <>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '4px',
            fontSize: '11px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            paddingBottom: '2px'
          }}>
            Camera Landmarks - Rotated & Scaled
          </div>

          {/* Semantic Joint Selector */}
          <div style={{
            marginBottom: '6px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}>
            <label style={{
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.8)',
              whiteSpace: 'nowrap'
            }}>
              Highlight:
            </label>
            <select
              value={selectedJoint || ''}
              onChange={(e) => setSelectedJoint(e.target.value || null)}
              style={{
                flex: 1,
                padding: '3px 6px',
                fontSize: '9px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              <option value="">None</option>
              <optgroup label="Wrist">
                <option value="wrist">Wrist</option>
              </optgroup>
              <optgroup label="Thumb">
                <option value="thumb_cmc">Thumb CMC</option>
                <option value="thumb_mcp">Thumb MCP</option>
                <option value="thumb_ip">Thumb IP</option>
                <option value="thumb_tip">Thumb Tip</option>
              </optgroup>
              <optgroup label="Index">
                <option value="index_mcp">Index MCP</option>
                <option value="index_pip">Index PIP</option>
                <option value="index_dip">Index DIP</option>
                <option value="index_tip">Index Tip</option>
              </optgroup>
              <optgroup label="Middle">
                <option value="middle_mcp">Middle MCP</option>
                <option value="middle_pip">Middle PIP</option>
                <option value="middle_dip">Middle DIP</option>
                <option value="middle_tip">Middle Tip</option>
              </optgroup>
              <optgroup label="Ring">
                <option value="ring_mcp">Ring MCP</option>
                <option value="ring_pip">Ring PIP</option>
                <option value="ring_dip">Ring DIP</option>
                <option value="ring_tip">Ring Tip</option>
              </optgroup>
              <optgroup label="Pinky">
                <option value="pinky_mcp">Pinky MCP</option>
                <option value="pinky_pip">Pinky PIP</option>
                <option value="pinky_dip">Pinky DIP</option>
                <option value="pinky_tip">Pinky Tip</option>
              </optgroup>
            </select>
          </div>

          {displayLandmarks ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '9px'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '2px 4px',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '8px',
                      width: '30px'
                    }}>#</th>
                    <th style={{
                      padding: '2px 4px',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>Landmark</th>
                    <th style={{
                      padding: '2px 4px',
                      textAlign: 'right',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>X</th>
                    <th style={{
                      padding: '2px 4px',
                      textAlign: 'right',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>Y</th>
                    <th style={{
                      padding: '2px 4px',
                      textAlign: 'right',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>Z</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLandmarks.map((landmark, index) => {
                    const isHighlighted = isLandmarkHighlighted(index)
                    return (
                      <tr
                        key={index}
                        style={{
                          border: isHighlighted ? '2px solid rgba(100, 200, 255, 1)' : 'none',
                          backgroundColor: isHighlighted ? 'rgba(100, 200, 255, 0.2)' : 'transparent'
                        }}
                      >
                        <td style={{
                          padding: '2px 4px',
                          fontWeight: isHighlighted ? 'bold' : 'bold',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: isHighlighted ? '9px' : '8px',
                          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {index}
                        </td>
                        <td style={{
                          padding: '2px 4px',
                          fontSize: isHighlighted ? '10px' : '9px',
                          color: getLandmarkColor(index),
                          fontWeight: 'bold'
                        }}>
                          {landmarkNames[index]}
                        </td>
                        <td style={{
                          padding: '2px 4px',
                          textAlign: 'right',
                          fontSize: isHighlighted ? '11px' : '10px',
                          color: '#4ecdc4',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          {landmark.x.toFixed(3)}
                        </td>
                        <td style={{
                          padding: '2px 4px',
                          textAlign: 'right',
                          fontSize: isHighlighted ? '11px' : '10px',
                          color: '#ffe66d',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          {landmark.y.toFixed(3)}
                        </td>
                        <td style={{
                          padding: '2px 4px',
                          textAlign: 'right',
                          fontSize: isHighlighted ? '11px' : '10px',
                          color: '#ff6b6b',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          {landmark.z.toFixed(3)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px'
            }}>
              No hand detected
            </div>
          )}
        </>
      )}

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
