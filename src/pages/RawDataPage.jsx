import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gloveClient } from '../utils/gloveClient'
import { convertGloveDataToJoints } from '../utils/gloveMapping'

// Joint names for raw sensor data display
const LEFT_HAND_JOINTS = [
  'LeftThumb1', 'LeftThumb2', 'LeftThumb3',
  'LeftIndex1', 'LeftIndex2', 'LeftIndex3',
  'LeftMiddle1', 'LeftMiddle2', 'LeftMiddle3',
  'LeftRing1', 'LeftRing2', 'LeftRing3',
  'LeftPinky1', 'LeftPinky2', 'LeftPinky3'
]

const RIGHT_HAND_JOINTS = [
  'RightThumb1', 'RightThumb2', 'RightThumb3',
  'RightIndex1', 'RightIndex2', 'RightIndex3',
  'RightMiddle1', 'RightMiddle2', 'RightMiddle3',
  'RightRing1', 'RightRing2', 'RightRing3',
  'RightPinky1', 'RightPinky2', 'RightPinky3'
]

// Converted joint names for 3D model control
const CONVERTED_JOINT_NAMES = [
  'thumb_cmc', 'thumb_yaw', 'thumb_roll', 'thumb_mcp', 'thumb_ip',
  'index_mcp', 'index_roll', 'index_pip', 'index_dip',
  'middle_mcp', 'middle_roll', 'middle_pip', 'middle_dip',
  'ring_mcp', 'ring_roll', 'ring_pip', 'ring_dip',
  'pinky_mcp', 'pinky_roll', 'pinky_pip', 'pinky_dip'
]

export default function RawDataPage() {
  const [rawGloveData, setRawGloveData] = useState(null)
  const [convertedJoints, setConvertedJoints] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    console.log('🧤 [RawDataPage] Initializing glove connection...')

    const backendUrl = process.env.REACT_APP_GLOVE_BACKEND_URL || 'http://localhost:5000'

    // Handle incoming glove data
    const handleGloveData = (rawData) => {
      console.log('📦 [RawDataPage] Raw glove data received:', rawData)
      setRawGloveData(rawData)

      // Convert raw data to joint rotations for 3D model
      const converted = convertGloveDataToJoints(rawData)
      setConvertedJoints(converted)
    }

    // Handle connection status changes
    const handleGloveStatus = (status) => {
      console.log('🔌 [RawDataPage] Glove connection status:', status)
      setConnectionStatus(status)
    }

    // Connect to backend
    gloveClient.connect(backendUrl, handleGloveData, handleGloveStatus)

    // Cleanup on unmount
    return () => {
      console.log('🧤 [RawDataPage] Cleaning up glove connection...')
      gloveClient.disconnect()
    }
  }, [])

  const renderTable = (handData, jointNames, handLabel) => {
    if (!handData || handData.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No data available
        </div>
      )
    }

    return (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#2a2a2a' }}>
            <th style={tableHeaderStyle}>Joint Name</th>
            <th style={tableHeaderStyle}>X (deg)</th>
            <th style={tableHeaderStyle}>Y (deg)</th>
            <th style={tableHeaderStyle}>Z (deg)</th>
          </tr>
        </thead>
        <tbody>
          {handData.map((joint, index) => (
            <tr
              key={index}
              style={{
                backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222',
                borderBottom: '1px solid #333'
              }}
            >
              <td style={tableCellStyle}>{jointNames[index]}</td>
              <td style={tableCellNumericStyle}>{joint?.x?.toFixed(2) || '0.00'}</td>
              <td style={tableCellNumericStyle}>{joint?.y?.toFixed(2) || '0.00'}</td>
              <td style={tableCellNumericStyle}>{joint?.z?.toFixed(2) || '0.00'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const renderConvertedJointsTable = (jointData, jointNames) => {
    if (!jointData || Object.keys(jointData).length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No data available
        </div>
      )
    }

    return (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#2a2a2a' }}>
            <th style={tableHeaderStyle}>Joint Name</th>
            <th style={tableHeaderStyle}>Rotation (deg)</th>
          </tr>
        </thead>
        <tbody>
          {jointNames.map((jointName, index) => {
            const radValue = jointData[jointName]
            const degValue = radValue !== undefined ? (radValue * 180 / Math.PI).toFixed(2) : '0.00'

            return (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222',
                  borderBottom: '1px solid #333'
                }}
              >
                <td style={tableCellStyle}>{jointName}</td>
                <td style={tableCellNumericStyle}>{degValue}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const tableHeaderStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '700',
    color: '#fff',
    borderBottom: '2px solid #444'
  }

  const tableCellStyle = {
    padding: '10px 16px',
    color: '#ddd',
    fontWeight: '600'
  }

  const tableCellNumericStyle = {
    ...tableCellStyle,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    color: '#4fc3f7'
  }

  const leftHandData = rawGloveData?.glove?.leftHand || []
  const rightHandData = rawGloveData?.glove?.rightHand || []
  const leftConvertedData = convertedJoints?.left || {}
  const rightConvertedData = convertedJoints?.right || {}

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#fff',
      overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#1e1e1e',
        borderBottom: '2px solid #333',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            Raw Glove Sensor Data
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '13px',
            color: connectionStatus === 'connected' ? '#4caf50' : '#f44336',
            fontWeight: '600'
          }}>
            {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
          </p>
        </div>
        <Link
          to="/"
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            backgroundColor: 'rgba(100, 150, 200, 0.9)',
            color: 'white',
            border: '1px solid rgba(150, 200, 255, 0.5)',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          ← Back to Main
        </Link>
      </div>

      {/* Content */}
      <div style={{
        padding: '40px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* RAW SENSOR DATA SECTION */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          '@media (max-width: 1200px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          {/* Left Hand Table */}
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#fff',
              borderBottom: '2px solid #4caf50',
              paddingBottom: '8px'
            }}>
              Left Hand ({leftHandData.length} joints)
            </h2>
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #333'
            }}>
              {renderTable(leftHandData, LEFT_HAND_JOINTS, 'Left')}
            </div>
          </div>

          {/* Right Hand Table */}
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#fff',
              borderBottom: '2px solid #2196f3',
              paddingBottom: '8px'
            }}>
              Right Hand ({rightHandData.length} joints)
            </h2>
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #333'
            }}>
              {renderTable(rightHandData, RIGHT_HAND_JOINTS, 'Right')}
            </div>
          </div>
        </div>

        {/* Footer Info for Raw Data */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            marginBottom: '12px',
            color: '#fff'
          }}>
            Raw Sensor Data Format
          </h3>
          <ul style={{
            fontSize: '12px',
            color: '#bbb',
            lineHeight: '1.8',
            margin: 0,
            paddingLeft: '20px'
          }}>
            <li>30 Vector3Float joints total (15 per hand)</li>
            <li>X-axis: Pitch (flexion/extension)</li>
            <li>Y-axis: Roll (abduction/adduction)</li>
            <li>Z-axis: Yaw (spreading)</li>
            <li>Values are in degrees</li>
            <li>Updates in real-time from WebSocket backend</li>
          </ul>
        </div>

        {/* CONVERTED JOINT ROTATIONS SECTION */}
        <div style={{
          marginTop: '60px',
          paddingTop: '40px',
          borderTop: '3px solid #444'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#fff'
          }}>
            Converted Joint Rotations
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#999',
            marginBottom: '32px'
          }}>
            Processed rotation values used for controlling the 3D hand models
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            '@media (max-width: 1200px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            {/* Left Hand Converted Joints */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#fff',
                borderBottom: '2px solid #4caf50',
                paddingBottom: '8px'
              }}>
                Left Hand ({Object.keys(leftConvertedData).length} joints)
              </h3>
              <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #333'
              }}>
                {renderConvertedJointsTable(leftConvertedData, CONVERTED_JOINT_NAMES)}
              </div>
            </div>

            {/* Right Hand Converted Joints */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#fff',
                borderBottom: '2px solid #2196f3',
                paddingBottom: '8px'
              }}>
                Right Hand ({Object.keys(rightConvertedData).length} joints)
              </h3>
              <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #333'
              }}>
                {renderConvertedJointsTable(rightConvertedData, CONVERTED_JOINT_NAMES)}
              </div>
            </div>
          </div>

          {/* Footer Info for Converted Data */}
          <div style={{
            marginTop: '40px',
            marginBottom: '40px',
            padding: '20px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            border: '1px solid #333'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#fff'
            }}>
              Converted Joint Data Format
            </h3>
            <ul style={{
              fontSize: '12px',
              color: '#bbb',
              lineHeight: '1.8',
              margin: 0,
              paddingLeft: '20px'
            }}>
              <li>23 semantic joint rotations per hand (expanded from 15 raw joints)</li>
              <li>Multi-axis joints split into separate entries (thumb_cmc, thumb_yaw, thumb_roll)</li>
              <li>Finger MCPs include roll values (2-DoF: pitch + roll)</li>
              <li>Thumb has 5 DoF (cmc, yaw, roll, mcp, ip)</li>
              <li>Values converted from radians to degrees for display</li>
              <li>Sign corrections and offsets applied per joint configuration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
