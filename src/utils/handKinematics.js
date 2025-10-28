/**
 * Hand Kinematics Module
 * Converts MediaPipe hand landmarks (3D positions) to joint rotations (angles)
 *
 * MediaPipe provides 21 3D landmarks per hand:
 * 0: WRIST
 * 1-4: THUMB (CMC, MCP, IP, TIP)
 * 5-8: INDEX (MCP, PIP, DIP, TIP)
 * 9-12: MIDDLE (MCP, PIP, DIP, TIP)
 * 13-16: RING (MCP, PIP, DIP, TIP)
 * 17-20: PINKY (MCP, PIP, DIP, TIP)
 */

import * as THREE from 'three'

// MediaPipe landmark indices
const LANDMARKS = {
  WRIST: 0,

  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,

  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,

  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,

  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,

  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
}

/**
 * Calculate angle between three points (joint angle)
 * @param {Object} p1 - Point 1 {x, y, z}
 * @param {Object} p2 - Point 2 (joint center) {x, y, z}
 * @param {Object} p3 - Point 3 {x, y, z}
 * @returns {number} - Angle in radians
 */
function calculateAngleBetweenPoints(p1, p2, p3) {
  const v1 = new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z)
  const v2 = new THREE.Vector3(p3.x - p2.x, p3.y - p2.y, p3.z - p2.z)

  v1.normalize()
  v2.normalize()

  // Get angle between vectors
  let angle = v1.angleTo(v2)

  // The angle from angleTo is always positive, but we want to preserve direction
  // For finger flexion, we want 0 = straight, positive = bent
  // This is a simplification - more sophisticated methods would use cross products
  return angle
}

/**
 * Calculate curl angle for a finger (flexion/extension)
 * Returns 0 for straight finger, positive for bent finger
 * @param {Array} landmarks - All hand landmarks
 * @param {number} baseIdx - Base landmark index
 * @param {number} midIdx - Middle landmark index
 * @param {number} tipIdx - Tip landmark index
 * @returns {number} - Curl angle in radians
 */
function calculateFingerCurl(landmarks, baseIdx, midIdx, tipIdx) {
  const base = landmarks[baseIdx]
  const mid = landmarks[midIdx]
  const tip = landmarks[tipIdx]

  // Calculate angle - when finger is straight, angle ≈ π (180°)
  // When bent, angle decreases
  const angle = calculateAngleBetweenPoints(base, mid, tip)

  // Convert to curl: 0 = straight, positive = curled
  // π - angle gives us the curl amount
  const curl = Math.PI - angle

  return Math.max(0, curl) // Clamp to prevent negative values
}

/**
 * Calculate finger spread/abduction angle
 * @param {Array} landmarks - All hand landmarks
 * @param {number} fingerMcpIdx - Finger MCP landmark index
 * @param {number} referenceMcpIdx - Reference finger MCP landmark index
 * @returns {number} - Spread angle in radians
 */
function calculateFingerSpread(landmarks, fingerMcpIdx, referenceMcpIdx) {
  const wrist = landmarks[LANDMARKS.WRIST]
  const fingerMcp = landmarks[fingerMcpIdx]
  const referenceMcp = landmarks[referenceMcpIdx]

  const v1 = new THREE.Vector3(
    fingerMcp.x - wrist.x,
    fingerMcp.y - wrist.y,
    fingerMcp.z - wrist.z
  )

  const v2 = new THREE.Vector3(
    referenceMcp.x - wrist.x,
    referenceMcp.y - wrist.y,
    referenceMcp.z - wrist.z
  )

  v1.normalize()
  v2.normalize()

  return v1.angleTo(v2)
}

/**
 * Calculate thumb yaw angle
 * Measures the angle between thumb direction and hand width in a plane perpendicular to hand forward
 * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
 * @returns {number} - Yaw angle in radians
 */
function calculateThumbYaw(landmarks) {
  const wrist = landmarks[LANDMARKS.WRIST]           // Point 0
  const thumbCmc = landmarks[LANDMARKS.THUMB_CMC]    // Point 1
  const thumbMcp = landmarks[LANDMARKS.THUMB_MCP]    // Point 2
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP]    // Point 5
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP]  // Point 9
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP]    // Point 17

  // Plane normal: hand forward direction (WRIST to MIDDLE_MCP)
  const planeNormal = new THREE.Vector3(
    middleMcp.x - wrist.x,
    middleMcp.y - wrist.y,
    middleMcp.z - wrist.z
  )
  planeNormal.normalize()

  // Vector 1: Thumb direction (THUMB_CMC to THUMB_MCP)
  const thumbVector = new THREE.Vector3(
    thumbMcp.x - wrist.x,
    thumbMcp.y - wrist.y,
    thumbMcp.z - wrist.z
  )

  // Vector 2: Hand width direction (PINKY_MCP to INDEX_MCP)
  const handWidthVector = new THREE.Vector3(
    indexMcp.x - pinkyMcp.x,
    indexMcp.y - pinkyMcp.y,
    indexMcp.z - pinkyMcp.z
  )

  // Project both vectors onto the plane perpendicular to the normal
  // v_projected = v - (v · n)n
  const thumbDot = thumbVector.dot(planeNormal)
  const projectedThumb = thumbVector.clone().sub(planeNormal.clone().multiplyScalar(thumbDot))
  projectedThumb.normalize()

  const widthDot = handWidthVector.dot(planeNormal)
  const projectedWidth = handWidthVector.clone().sub(planeNormal.clone().multiplyScalar(widthDot))
  projectedWidth.normalize()

  // Calculate angle between the two projected vectors
  return projectedThumb.angleTo(projectedWidth) * 2.5
}

/**
 * Calculate thumb roll angle
 * Measures the rotation of the thumb around its longitudinal axis
 * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
 * @returns {number} - Roll angle in radians
 */
function calculateThumbRoll(landmarks) {
  // First check thumb yaw - if thumb is not abducted enough, roll is unreliable
  const thumbYaw = calculateThumbYaw(landmarks)
  const yawThreshold = 30 * Math.PI / 180  // 30 degrees in radians (≈0.524)

  if (thumbYaw < yawThreshold) {
    return 0  // Thumb not abducted enough to measure roll
  }

  // Define palm plane using WRIST, INDEX_MCP, PINKY_MCP
  const wrist = landmarks[1]        // Point 0
  const thumbIp = landmarks[4]   // Point 3
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP] // Point 5
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP] // Point 17

  // Calculate palm plane normal
  const v1 = new THREE.Vector3(
    indexMcp.x - wrist.x,
    indexMcp.y - wrist.y,
    indexMcp.z - wrist.z
  )

  const v2 = new THREE.Vector3(
    pinkyMcp.x - wrist.x,
    pinkyMcp.y - wrist.y,
    pinkyMcp.z - wrist.z
  )

  const palmNormal = new THREE.Vector3().crossVectors(v1, v2).normalize()

  // Vector 1: WRIST to THUMB_IP
  const thumbVector = new THREE.Vector3(
    thumbIp.x - wrist.x,
    thumbIp.y - wrist.y,
    thumbIp.z - wrist.z
  )

  // Project thumb vector onto palm plane
  const thumbDot = thumbVector.dot(palmNormal)
  const projectedThumb = thumbVector.clone().sub(palmNormal.clone().multiplyScalar(thumbDot))
  projectedThumb.normalize()

  // Vector 2: WRIST to INDEX_MCP (already in palm plane)
  const indexVector = new THREE.Vector3(
    indexMcp.x - wrist.x,
    indexMcp.y - wrist.y,
    indexMcp.z - wrist.z
  )
  indexVector.normalize()

  // Calculate angle between projected thumb and index direction
  return projectedThumb.angleTo(indexVector)
}

/**
 * Calculate finger MCP roll angle
 * Measures the angle between finger direction and its base direction from wrist
 * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
 * @param {number} mcpIdx - MCP landmark index
 * @param {number} tipIdx - TIP landmark index
 * @returns {number} - Roll angle in radians
 */
function calculateFingerMcpRoll(landmarks, mcpIdx, tipIdx) {
  const wrist = landmarks[LANDMARKS.WRIST]          // Point 0
  const mcp = landmarks[mcpIdx]
  const tip = landmarks[tipIdx]
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP]   // Point 5
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP] // Point 9
  const ringMcp = landmarks[LANDMARKS.RING_MCP]     // Point 13
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP]   // Point 17

  // Calculate palm plane normal
  const v1 = new THREE.Vector3(
    indexMcp.x - wrist.x,
    indexMcp.y - wrist.y,
    indexMcp.z - wrist.z
  )

  const v2 = new THREE.Vector3(
    pinkyMcp.x - wrist.x,
    pinkyMcp.y - wrist.y,
    pinkyMcp.z - wrist.z
  )

  const palmNormal = new THREE.Vector3().crossVectors(v1, v2).normalize()

  // Vector 1: MCP to TIP (finger direction)
  const fingerVector = new THREE.Vector3(
    tip.x - mcp.x,
    tip.y - mcp.y,
    tip.z - mcp.z
  )

  // Vector 2: WRIST to midpoint of MIDDLE_MCP and RING_MCP (centered reference)
  const midX = (middleMcp.x + ringMcp.x) / 2
  const midY = (middleMcp.y + ringMcp.y) / 2
  const midZ = (middleMcp.z + ringMcp.z) / 2

  const baseVector = new THREE.Vector3(
    midX - wrist.x,
    midY - wrist.y,
    midZ - wrist.z
  )

  // Project both vectors onto palm plane
  const fingerDot = fingerVector.dot(palmNormal)
  const projectedFinger = fingerVector.clone().sub(palmNormal.clone().multiplyScalar(fingerDot))
  projectedFinger.normalize()

  const baseDot = baseVector.dot(palmNormal)
  const projectedBase = baseVector.clone().sub(palmNormal.clone().multiplyScalar(baseDot))
  projectedBase.normalize()

  // Calculate signed angle between the two projected vectors
  const angle = projectedFinger.angleTo(projectedBase)

  // Use cross product to determine sign (direction of rotation)
  const cross = new THREE.Vector3().crossVectors(projectedBase, projectedFinger)
  const sign = cross.dot(palmNormal)

  // Return signed angle (positive or negative based on rotation direction)
  return sign >= 0 ? angle : -angle
}

/**
 * Calculate combined joint angles for a finger using palm plane projection for MCP
 *
 * MCP Calculation Approach:
 * 1. Define palm plane using landmarks 0 (WRIST), 5 (INDEX_MCP), and 17 (PINKY_MCP)
 * 2. Calculate palm plane normal vector using cross product
 * 3. Create a second plane perpendicular to the palm plane using:
 *    - The palm plane normal vector
 *    - The vector from WRIST to MCP
 * 4. Project the vector from MCP to PIP onto this second plane
 * 5. Calculate the angle between:
 *    - The projected MCP→PIP vector
 *    - The WRIST→MCP vector
 *
 * PIP and DIP use standard 3-point angle calculations
 *
 * @param {Array} landmarks - All hand landmarks (21 points)
 * @param {number} mcpIdx - MCP landmark index (PIP=mcpIdx+1, DIP=mcpIdx+2, TIP=mcpIdx+3)
 * @returns {Object} - Joint angles {mcp: number, pip: number, dip: number} in radians
 */
function calculateFingerJointAngles(landmarks, mcpIdx) {
  const pipIdx = mcpIdx + 1
  const dipIdx = mcpIdx + 2
  const tipIdx = mcpIdx + 3

  // Get required landmarks
  const wrist = landmarks[LANDMARKS.WRIST]           // Point 0
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP]    // Point 5
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP]    // Point 17
  const mcp = landmarks[mcpIdx]
  const pip = landmarks[pipIdx]
  const dip = landmarks[dipIdx]
  const tip = landmarks[tipIdx]

  // MCP CALCULATION with palm plane projection
  // Step 1: vec1 = normal of palm plane (cross product of vectors from wrist)
  const wristToIndex = new THREE.Vector3(
    indexMcp.x - wrist.x,
    indexMcp.y - wrist.y,
    indexMcp.z - wrist.z
  )
  const wristToPinky = new THREE.Vector3(
    pinkyMcp.x - wrist.x,
    pinkyMcp.y - wrist.y,
    pinkyMcp.z - wrist.z
  )
  const vec1 = new THREE.Vector3().crossVectors(wristToIndex, wristToPinky).normalize()

  // Step 2: vec2 = vector from wrist to MCP
  const vec2 = new THREE.Vector3(
    mcp.x - wrist.x,
    mcp.y - wrist.y,
    mcp.z - wrist.z
  )

  // Step 3: plane normal = cross product of vec1 and vec2
  const planeNormal = new THREE.Vector3().crossVectors(vec1, vec2).normalize()

  // Step 4: vec3 = project (pip - mcp) onto this plane
  const pipToMcp = new THREE.Vector3(
    pip.x - mcp.x,
    pip.y - mcp.y,
    pip.z - mcp.z
  )
  const dot = pipToMcp.dot(planeNormal)
  const vec3 = pipToMcp.clone().sub(planeNormal.clone().multiplyScalar(dot))
  vec3.normalize()

  // Step 5: angle between vec3 and vec2
  const vec2Normalized = vec2.clone().normalize()
  const mcpAngle = vec3.angleTo(vec2Normalized)
  console.log(`MCP Angle Calculation: vec3=${vec3.toArray().map(v => v.toFixed(2))}, vec2=${vec2Normalized.toArray().map(v => v.toFixed(2))}, angle=${mcpAngle.toFixed(2)}`)

  // PIP CALCULATION using same plane
  // Project (DIP - PIP) onto the plane
  const pipToDip = new THREE.Vector3(
    dip.x - pip.x,
    dip.y - pip.y,
    dip.z - pip.z
  )
  const pipToDipDot = pipToDip.dot(planeNormal)
  const projectedPipToDip = pipToDip.clone().sub(planeNormal.clone().multiplyScalar(pipToDipDot))
  projectedPipToDip.normalize()

  // Project (PIP - MCP) onto the plane
  const mcpToPip = new THREE.Vector3(
    pip.x - mcp.x,
    pip.y - mcp.y,
    pip.z - mcp.z
  )
  const mcpToPipDot = mcpToPip.dot(planeNormal)
  const projectedMcpToPip = mcpToPip.clone().sub(planeNormal.clone().multiplyScalar(mcpToPipDot))
  projectedMcpToPip.normalize()

  // Calculate angle between projected vectors
  const pipAngle = projectedPipToDip.angleTo(projectedMcpToPip)

  // DIP CALCULATION using same plane
  // Project (TIP - DIP) onto the plane
  const dipToTip = new THREE.Vector3(
    tip.x - dip.x,
    tip.y - dip.y,
    tip.z - dip.z
  )
  const dipToTipDot = dipToTip.dot(planeNormal)
  const projectedDipToTip = dipToTip.clone().sub(planeNormal.clone().multiplyScalar(dipToTipDot))
  projectedDipToTip.normalize()

  // Project (DIP - PIP) onto the plane
  const pipToDipForDip = new THREE.Vector3(
    dip.x - pip.x,
    dip.y - pip.y,
    dip.z - pip.z
  )
  const pipToDipForDipDot = pipToDipForDip.dot(planeNormal)
  const projectedPipToDipForDip = pipToDipForDip.clone().sub(planeNormal.clone().multiplyScalar(pipToDipForDipDot))
  projectedPipToDipForDip.normalize()

  // Calculate angle between projected vectors
  const dipAngle = projectedDipToTip.angleTo(projectedPipToDipForDip)

  return {
    mcp: mcpAngle,
    pip: pipAngle,
    dip: dipAngle
  }
}

/**
 * Calculate wrist orientation from hand landmarks
 * Uses palm plane to determine hand rotation in 3D space
 * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
 * @param {string} handedness - 'Left' or 'Right'
 * @returns {Object} - Euler angles {x, y, z} in radians
 */
export function calculateWristOrientation(landmarks, handedness = 'Right') {
  if (!landmarks || landmarks.length !== 21) {
    return { x: 0, y: 0, z: 0 }
  }

  // Key palm landmarks for orientation calculation
  const wrist = landmarks[LANDMARKS.WRIST]
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP]
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP]
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP]

  // Create vectors for palm plane
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const indexVec = new THREE.Vector3(indexMcp.x, indexMcp.y, indexMcp.z)
  const middleVec = new THREE.Vector3(middleMcp.x, middleMcp.y, middleMcp.z)
  const pinkyVec = new THREE.Vector3(pinkyMcp.x, pinkyMcp.y, pinkyMcp.z)

  // Calculate palm forward vector (from wrist to middle finger base)
  const palmForward = new THREE.Vector3().subVectors(middleVec, wristVec).normalize()

  // Calculate palm right vector (from pinky to index)
  const palmRight = new THREE.Vector3().subVectors(indexVec, pinkyVec).normalize()

  // Calculate palm normal (perpendicular to palm surface)
  const palmNormal = new THREE.Vector3().crossVectors(palmForward, palmRight).normalize()

  // Recalculate right to ensure orthogonality
  palmRight.crossVectors(palmNormal, palmForward).normalize()

  // Build rotation matrix from these vectors
  // In MediaPipe: Y is down, Z is toward camera (negative = away), X is right
  // In Three.js: Y is up, Z is toward viewer (positive = toward), X is right
  //
  // Default pose: middle finger up, palm facing camera
  // - palmForward points from wrist toward middle finger (up in camera view)
  // - palmRight points from pinky to index (right in camera view)
  // - palmNormal points toward camera (out of palm)
  //
  // Target in Three.js:
  // - Z-axis (blue) should point up = palmForward direction
  // - X-axis (red) should point right = palmRight direction
  // - Y-axis (green) should point toward user = palmNormal direction (flipped)
  const rotationMatrix = new THREE.Matrix4()

  // Map: X = palmRight, Y = -palmNormal (toward camera/user), Z = palmForward (up the hand)
  rotationMatrix.makeBasis(
    palmRight,                    // X-axis = right
    palmNormal.clone().negate(),  // Y-axis = toward user (flip normal)
    palmForward                   // Z-axis = up the hand (blue axis)
  )

  // Extract Euler angles from rotation matrix
  const euler = new THREE.Euler()
  euler.setFromRotationMatrix(rotationMatrix, 'XYZ')

  // Apply hand-specific transformations
  // MediaPipe's coordinate system needs adjustment for Three.js
  let { x, y, z } = euler

  // Apply transformation only to left hand
  if (handedness === 'Left') {
    z = -z
    x = -x
  }

  // Lock to Z-axis rotation only (1 DoF) - fingertips always point upward
  x = 0
  y = 0

  // console.log(`Wrist orientation (${handedness}): z=${z.toFixed(2)} [Z-axis only mode]`)

  return { x, y, z }
}

/**
 * Convert MediaPipe landmarks to joint rotations
 * @param {Array} landmarks - MediaPipe hand landmarks (21 points)
 * @param {string} handedness - 'Left' or 'Right'
 * @returns {Object} - Joint rotations and wrist orientation
 */
export function landmarksToJointRotations(landmarks, handedness = 'Right') {
  if (!landmarks || landmarks.length !== 21) {
    console.warn('Invalid landmarks: expected 21 points')
    return { wristOrientation: { x: 0, y: 0, z: 0 }, joints: {} }
  }

  const joints = {}

  // THUMB - Special handling due to different anatomy
  // Thumb has CMC (carpometacarpal) which provides opposition
  const thumbCmcCurl = calculateFingerCurl(
    landmarks,
    LANDMARKS.WRIST,
    LANDMARKS.THUMB_CMC,
    LANDMARKS.THUMB_MCP
  )
  const thumbMcpCurl = calculateFingerCurl(
    landmarks,
    LANDMARKS.THUMB_CMC,
    LANDMARKS.THUMB_MCP,
    LANDMARKS.THUMB_IP
  )
  const thumbIpCurl = calculateFingerCurl(
    landmarks,
    LANDMARKS.THUMB_MCP,
    LANDMARKS.THUMB_IP,
    LANDMARKS.THUMB_TIP
  )

  // Thumb opposition/abduction (angle relative to index finger)
  const thumbAbduction = calculateFingerSpread(
    landmarks,
    LANDMARKS.THUMB_MCP,
    LANDMARKS.INDEX_MCP
  )
  // Calculate thumb yaw from hand landmarks
  joints.thumb_yaw = calculateThumbYaw(landmarks)

  // Calculate thumb roll from hand landmarks
  joints.thumb_roll = 0.56 - calculateThumbRoll(landmarks)

  joints.thumb_mcp = thumbCmcCurl
  joints.thumb_pip = thumbMcpCurl
  joints.thumb_dip = thumbIpCurl // DIP typically follows IP
  joints.thumb_tip = thumbIpCurl * 0.8

  

  // INDEX FINGER
  const { mcp, pip, dip } = calculateFingerJointAngles(landmarks, LANDMARKS.INDEX_MCP)
  joints.index_mcp = mcp
  joints.index_pip = pip
  joints.index_dip = dip
  joints.index_tip = dip * 0.7
  joints.index_roll = 0.11 - calculateFingerMcpRoll(landmarks, LANDMARKS.INDEX_MCP, LANDMARKS.INDEX_TIP)


  // MIDDLE FINGER
  const { mcp: middleMcp, pip: middlePip, dip: middleDip } = calculateFingerJointAngles(landmarks, LANDMARKS.MIDDLE_MCP)
  joints.middle_mcp = middleMcp
  joints.middle_pip = middlePip
  joints.middle_dip = middleDip
  joints.middle_tip = middleDip * 0.7
  joints.middle_roll = calculateFingerMcpRoll(landmarks, LANDMARKS.MIDDLE_MCP, LANDMARKS.MIDDLE_TIP)

  // RING FINGER
  const { mcp: ringMcp, pip: ringPip, dip: ringDip } = calculateFingerJointAngles(landmarks, LANDMARKS.RING_MCP)
  joints.ring_mcp = ringMcp
  joints.ring_pip = ringPip
  joints.ring_dip = ringDip
  joints.ring_tip = ringDip * 0.7
  joints.ring_roll = calculateFingerMcpRoll(landmarks, LANDMARKS.RING_MCP, LANDMARKS.RING_TIP)

  // PINKY FINGER
  const { mcp: pinkyMcp, pip: pinkyPip, dip: pinkyDip } = calculateFingerJointAngles(landmarks, LANDMARKS.PINKY_MCP)
  joints.pinky_mcp = pinkyMcp
  joints.pinky_pip = pinkyPip
  joints.pinky_dip = pinkyDip
  joints.pinky_tip = pinkyDip * 0.7
  joints.pinky_roll = calculateFingerMcpRoll(landmarks, LANDMARKS.PINKY_MCP, LANDMARKS.PINKY_TIP)

  // WRIST - legacy single-axis rotation (kept for compatibility)
  joints.wrist = 0

  // Calculate wrist orientation
  const wristOrientation = calculateWristOrientation(landmarks, handedness)

  return {
    wristOrientation,
    joints
  }
}

/**
 * Get hand pose name based on joint angles (for debugging/visualization)
 * @param {Object} rotationData - Joint rotations data (can be old or new format)
 * @returns {string} - Pose name
 */
export function detectHandPose(rotationData) {
  // Handle both old format (flat object) and new format (with joints property)
  const joints = rotationData.joints || rotationData

  const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky']
  const curls = fingers.map(finger => joints[`${finger}_mcp`] || 0)

  const avgCurl = curls.reduce((sum, curl) => sum + curl, 0) / curls.length

  if (avgCurl < 0.2) return 'OPEN_HAND'
  if (avgCurl > 2.5) return 'FIST'
  if (curls[1] < 0.3 && avgCurl > 1.5) return 'POINTING'

  return 'CUSTOM'
}

/**
 * Normalize an angle to the range [-π, π]
 * This prevents angles from accumulating beyond ±180° and ensures
 * rotations always take the shortest path across the 180°/-180° boundary
 * @param {number} angle - Angle in radians
 * @returns {number} - Normalized angle in range [-π, π]
 */
export function normalizeAngle(angle) {
  // Wrap angle to [-π, π] range
  let normalized = angle % (2 * Math.PI)

  // Handle wrap-around at boundaries
  if (normalized > Math.PI) {
    normalized -= 2 * Math.PI
  } else if (normalized < -Math.PI) {
    normalized += 2 * Math.PI
  }

  return normalized
}

/**
 * Calculate the shortest rotation path from current angle to target angle
 * When rotating across the 180°/-180° boundary, this ensures we take the short path
 * @param {number} currentAngle - Current angle in radians
 * @param {number} increment - Rotation increment in radians (e.g., π/2 for 90°)
 * @returns {number} - New angle that takes the shortest rotation path
 */
export function getShortestRotation(currentAngle, increment) {
  // Calculate the direct addition
  const option1 = currentAngle + increment

  // Calculate the alternative path (going the other way around the circle)
  // If increment is positive, the alternative is negative and vice versa
  const option2 = currentAngle + increment - (Math.sign(increment) * 2 * Math.PI)

  // Normalize both options to [-π, π]
  const normalized1 = normalizeAngle(option1)
  const normalized2 = normalizeAngle(option2)

  // Calculate angular distance for each option
  const distance1 = Math.abs(normalized1 - currentAngle)
  const distance2 = Math.abs(normalized2 - currentAngle)

  // Return the option with shorter distance
  return distance1 <= distance2 ? normalized1 : normalized2
}

/**
 * Interpolate between two rotation states (for smooth transitions)
 * @param {Object} from - Starting rotations
 * @param {Object} to - Target rotations
 * @param {number} alpha - Interpolation factor (0-1)
 * @returns {Object} - Interpolated rotations
 */
export function interpolateRotations(from, to, alpha) {
  const result = {}

  for (const joint in to) {
    const fromValue = from[joint] || 0
    const toValue = to[joint] || 0
    result[joint] = fromValue + (toValue - fromValue) * alpha
  }

  return result
}
