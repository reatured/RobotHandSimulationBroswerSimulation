/**
 * Maps glove data from backend to joint rotation format
 *
 * Glove data format (30 Vector3Float):
 * - Left hand: 15 joints (Thumb1-3, Index1-3, Middle1-3, Ring1-3, Pinky1-3)
 * - Right hand: 15 joints (same structure)
 * - Each joint has {x, y, z} rotation values
 * - Axis mapping: x=pitch (flexion), y=roll (abduction), z=yaw (spreading)
 *
 * Output format (flat structure with multi-axis support):
 * {
 *   left: {
 *     thumb_cmc: x, thumb_yaw: z, thumb_roll: y,  // 3-DoF thumb base
 *     thumb_mcp: x, thumb_ip: x,                  // thumb segments
 *     index_mcp: x, index_roll: y,                 // 2-DoF finger base
 *     index_pip: x, index_dip: x,                  // finger segments
 *     ...
 *   },
 *   right: { ... }
 * }
 */

// Mapping from glove joint indices to semantic joint names
const GLOVE_JOINT_MAPPING = {
  // Left hand (indices 0-14)
  left: {
    0: 'thumb_cmc',   // LeftThumb1 - base joint (CMC) with yaw/roll/pitch
    1: 'thumb_mcp',   // LeftThumb2 - middle joint (MCP)
    2: 'thumb_ip',    // LeftThumb3 - tip joint (IP)
    3: 'index_mcp',   // LeftIndex1 - has pitch + roll
    4: 'index_pip',   // LeftIndex2
    5: 'index_dip',   // LeftIndex3
    6: 'middle_mcp',  // LeftMiddle1 - has pitch + roll
    7: 'middle_pip',  // LeftMiddle2
    8: 'middle_dip',  // LeftMiddle3
    9: 'ring_mcp',    // LeftRing1 - has pitch + roll
    10: 'ring_pip',   // LeftRing2
    11: 'ring_dip',   // LeftRing3
    12: 'pinky_mcp',  // LeftPinky1 - has pitch + roll
    13: 'pinky_pip',  // LeftPinky2
    14: 'pinky_dip'   // LeftPinky3
  },
  // Right hand (indices 15-29)
  right: {
    15: 'thumb_cmc',   // RightThumb1 - base joint (CMC) with yaw/roll/pitch
    16: 'thumb_mcp',   // RightThumb2 - middle joint (MCP)
    17: 'thumb_ip',    // RightThumb3 - tip joint (IP)
    18: 'index_mcp',   // RightIndex1 - has pitch + roll
    19: 'index_pip',   // RightIndex2
    20: 'index_dip',   // RightIndex3
    21: 'middle_mcp',  // RightMiddle1 - has pitch + roll
    22: 'middle_pip',  // RightMiddle2
    23: 'middle_dip',  // RightMiddle3
    24: 'ring_mcp',    // RightRing1 - has pitch + roll
    25: 'ring_pip',    // RightRing2
    26: 'ring_dip',    // RightRing3
    27: 'pinky_mcp',   // RightPinky1 - has pitch + roll
    28: 'pinky_pip',   // RightPinky2
    29: 'pinky_dip'    // RightPinky3
  }
}

/**
 * Convert glove data to joint rotations
 * @param {Object} gloveData - Raw glove data from backend
 * @returns {Object} Joint rotations in format { left: {...}, right: {...} }
 */
export function convertGloveDataToJoints(gloveData) {
  if (!gloveData || !gloveData.glove) {
    console.warn('⚠️ [GloveMapping] Invalid glove data:', gloveData)
    return { left: {}, right: {} }
  }

  const { leftHand, rightHand } = gloveData.glove

  if (!leftHand || !rightHand) {
    console.warn('⚠️ [GloveMapping] Missing hand data')
    return { left: {}, right: {} }
  }

  const jointRotations = {
    left: {},
    right: {}
  }

  // Process left hand (indices 0-14)
  leftHand.forEach((joint, index) => {
    const jointName = GLOVE_JOINT_MAPPING.left[index]
    if (jointName && joint) {
      // Axis mapping: x=pitch (flexion), y=roll (abduction), z=yaw (spreading)
      // Convert from degrees to radians and negate (glove sends negative values)

      // Thumb CMC (index 0): thumb_cmc pitch and thumb_yaw from LeftThumb1
      if (index === 0) {
        jointRotations.left.thumb_cmc = -joint.x/2 * (Math.PI / 180)    // pitch (flexion)
        jointRotations.left.thumb_yaw = joint.z * 1.5 *(Math.PI / 180)     // yaw from z - NO NEGATION, NO OFFSET
        // thumb_roll comes from LeftThumb2 (index 1)
      }
      // Thumb MCP (index 1): thumb_mcp pitch and thumb_roll from LeftThumb2
      else if (index === 1) {

        jointRotations.left.thumb_roll = -joint.x / 2 * (Math.PI / 180)   // roll from x - NEGATED
        jointRotations.left.thumb_mcp = -joint.x/1.6* (Math.PI / 180)    // pitch (flexion)
      }
     
      // Finger MCPs (indices 3, 6, 9, 12): 2-axis joints with pitch and roll
      else if ([3, 6, 9, 12].includes(index)) {
        const finger = jointName.split('_')[0] // extract 'index', 'middle', 'ring', 'pinky'
        jointRotations.left[jointName] = -joint.x * (Math.PI / 180)           // pitch (flexion)
        // Ring and pinky roll: do NOT negate; index and middle: negate
        if (finger === 'ring' || finger === 'pinky') {
          jointRotations.left[`${finger}_roll`] = joint.y * (Math.PI / 180)   // NO negation
        } else {
          jointRotations.left[`${finger}_roll`] = -joint.y * (Math.PI / 180)  // negated
        }
      }
      // All other joints: single-axis (pitch/flexion only)
      else {
        jointRotations.left[jointName] = -joint.x * (Math.PI / 180)
      }
    }
  })

  // Process right hand (indices 15-29, but array starts at 0)
  rightHand.forEach((joint, index) => {
    const globalIndex = index + 15
    const jointName = GLOVE_JOINT_MAPPING.right[globalIndex]
    if (jointName && joint) {
      // Axis mapping: x=pitch (flexion), y=roll (abduction), z=yaw (spreading)
      // Convert from degrees to radians and negate (glove sends negative values)

      // Thumb CMC (index 0 in array, globalIndex 15): thumb_cmc pitch and thumb_yaw from RightThumb1
      if (index === 0) {
        jointRotations.right.thumb_cmc = -joint.x/2 * (Math.PI / 180)    // pitch (flexion) with /2 scaling
        jointRotations.right.thumb_yaw = joint.z * 1.5 * (Math.PI / 180)     // yaw from z with *1.5 scaling
        // thumb_roll comes from RightThumb2 (index 1)
      }
      // Thumb MCP (index 1 in array, globalIndex 16): thumb_mcp pitch and thumb_roll from RightThumb2
      else if (index === 1) {
        jointRotations.right.thumb_mcp = -joint.x/1.3 * (Math.PI / 180)    // pitch (flexion) with /1.3 scaling
        jointRotations.right.thumb_roll = -joint.x/1.3 * (Math.PI / 180)   // roll from x with /1.3 scaling
      }
      // Finger MCPs (indices 3, 6, 9, 12 in array): 2-axis joints with pitch and roll
      else if ([3, 6, 9, 12].includes(index)) {
        const finger = jointName.split('_')[0] // extract 'index', 'middle', 'ring', 'pinky'
        jointRotations.right[jointName] = -joint.x * (Math.PI / 180)           // pitch (flexion)
        // Ring and pinky roll: do NOT negate; index and middle: negate
        if (finger === 'ring' || finger === 'pinky') {
          jointRotations.right[`${finger}_roll`] = joint.y * (Math.PI / 180)   // NO negation
        } else {
          jointRotations.right[`${finger}_roll`] = -joint.y * (Math.PI / 180)  // negated
        }
      }
      // All other joints: single-axis (pitch/flexion only)
      else {
        jointRotations.right[jointName] = -joint.x * (Math.PI / 180)
      }
    }
  })

  console.log('🔄 [GloveMapping] Converted glove data to joints (multi-axis):')
  console.log('   Left hand joints:', Object.keys(jointRotations.left).length)
  console.log('   Right hand joints:', Object.keys(jointRotations.right).length)
  console.log('   Sample left thumb_cmc:', jointRotations.left.thumb_cmc)
  console.log('   Sample left thumb_yaw:', jointRotations.left.thumb_yaw)
  console.log('   Sample left thumb_roll:', jointRotations.left.thumb_roll)
  console.log('   Sample left index_mcp:', jointRotations.left.index_mcp)
  console.log('   Sample left index_roll:', jointRotations.left.index_roll)
  console.log('   Full data:', jointRotations)

  return jointRotations
}

/**
 * Get a human-readable summary of glove data for debugging
 * @param {Object} gloveData - Raw glove data from backend
 * @returns {string} Summary string
 */
export function getGloveDataSummary(gloveData) {
  if (!gloveData || !gloveData.glove) {
    return 'No glove data'
  }

  const { leftHand, rightHand } = gloveData.glove
  return `Left: ${leftHand?.length || 0} joints, Right: ${rightHand?.length || 0} joints`
}
