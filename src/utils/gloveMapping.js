/**
 * Maps glove data from backend to joint rotation format
 *
 * Glove data format (30 Vector3Float):
 * - Left hand: 15 joints (Thumb1-3, Index1-3, Middle1-3, Ring1-3, Pinky1-3)
 * - Right hand: 15 joints (same structure)
 * - Each joint has {x, y, z} rotation values
 *
 * Output format matches cameraJointRotations:
 * {
 *   left: { thumb_mcp: x, thumb_pip: y, ... },
 *   right: { thumb_mcp: x, thumb_pip: y, ... }
 * }
 */

// Mapping from glove joint indices to semantic joint names
const GLOVE_JOINT_MAPPING = {
  // Left hand (indices 0-14)
  left: {
    0: 'thumb_mcp',   // LeftThumb1
    1: 'thumb_pip',   // LeftThumb2
    2: 'thumb_dip',   // LeftThumb3
    3: 'index_mcp',   // LeftIndex1
    4: 'index_pip',   // LeftIndex2
    5: 'index_dip',   // LeftIndex3
    6: 'middle_mcp',  // LeftMiddle1
    7: 'middle_pip',  // LeftMiddle2
    8: 'middle_dip',  // LeftMiddle3
    9: 'ring_mcp',    // LeftRing1
    10: 'ring_pip',   // LeftRing2
    11: 'ring_dip',   // LeftRing3
    12: 'pinky_mcp',  // LeftPinky1
    13: 'pinky_pip',  // LeftPinky2
    14: 'pinky_dip'   // LeftPinky3
  },
  // Right hand (indices 15-29)
  right: {
    15: 'thumb_mcp',   // RightThumb1
    16: 'thumb_pip',   // RightThumb2
    17: 'thumb_dip',   // RightThumb3
    18: 'index_mcp',   // RightIndex1
    19: 'index_pip',   // RightIndex2
    20: 'index_dip',   // RightIndex3
    21: 'middle_mcp',  // RightMiddle1
    22: 'middle_pip',  // RightMiddle2
    23: 'middle_dip',  // RightMiddle3
    24: 'ring_mcp',    // RightRing1
    25: 'ring_pip',    // RightRing2
    26: 'ring_dip',    // RightRing3
    27: 'pinky_mcp',   // RightPinky1
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
      // For now, use the x-axis rotation as the primary joint angle
      // TODO: Determine which axis (x, y, or z) is the correct flexion angle
      jointRotations.left[jointName] = joint.x
    }
  })

  // Process right hand (indices 15-29, but array starts at 0)
  rightHand.forEach((joint, index) => {
    const globalIndex = index + 15
    const jointName = GLOVE_JOINT_MAPPING.right[globalIndex]
    if (jointName && joint) {
      // For now, use the x-axis rotation as the primary joint angle
      jointRotations.right[jointName] = joint.x
    }
  })

  console.log('🔄 [GloveMapping] Converted glove data to joints:')
  console.log('   Left hand joints:', Object.keys(jointRotations.left).length)
  console.log('   Right hand joints:', Object.keys(jointRotations.right).length)
  console.log('   Sample left thumb_mcp:', jointRotations.left.thumb_mcp)
  console.log('   Sample right index_pip:', jointRotations.right.index_pip)
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
