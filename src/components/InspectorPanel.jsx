import React, { useState, memo } from 'react'
import { RotateCw, Move, Box, Focus, ChevronDown, Eye, EyeOff, List } from 'lucide-react'
import { Card } from './ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ScrollArea } from './ui/scroll-area'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import ModelSelectorModal from './ModelSelectorModal'
import HierarchyPanel from '../editor/HierarchyPanel'

// Joint Button Component
const JointButton = memo(({ jointName, label, isAvailable, selectedJoint, onSelectedJointChange }) => {
  const isSelected = selectedJoint === jointName
  const isDisabled = !isAvailable

  return (
    <button
      onClick={() => {
        if (!isDisabled) {
          onSelectedJointChange(jointName)
        }
      }}
      disabled={isDisabled}
      className={cn(
        "px-1 py-1.5 text-[9px] font-normal uppercase rounded transition-all",
        isSelected && "font-bold border-2",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        !isDisabled && !isSelected && "border",
        isSelected
          ? "bg-panel-primary text-panel-primary-foreground border-panel-primary"
          : isDisabled
          ? "bg-panel-muted/30 text-panel-muted-foreground border-muted"
          : "bg-secondary/20 text-panel-foreground border-border hover:bg-secondary/40"
      )}
    >
      {label}
    </button>
  )
})

JointButton.displayName = 'JointButton'

// Define which joints are available for each model
const MODEL_JOINT_AVAILABILITY = {
  ability_hand: {
    wrist: true,
    thumb_mcp: true, thumb_pip: true, thumb_dip: false, thumb_tip: false,
    index_mcp: true, index_pip: true, index_dip: false, index_tip: false,
    middle_mcp: true, middle_pip: true, middle_dip: false, middle_tip: false,
    ring_mcp: true, ring_pip: true, ring_dip: false, ring_tip: false,
    pinky_mcp: true, pinky_pip: true, pinky_dip: false, pinky_tip: false,
  },
  linker_l6: {
    wrist: false,
    thumb_mcp: true, thumb_pip: true, thumb_dip: true, thumb_tip: false,
    index_mcp: true, index_pip: true, index_dip: true, index_tip: false,
    middle_mcp: true, middle_pip: true, middle_dip: true, middle_tip: false,
    ring_mcp: true, ring_pip: true, ring_dip: true, ring_tip: false,
    pinky_mcp: true, pinky_pip: true, pinky_dip: true, pinky_tip: false,
  },
  linker_o6: {
    wrist: false,
    thumb_mcp: true, thumb_pip: true, thumb_dip: true, thumb_tip: false,
    index_mcp: true, index_pip: true, index_dip: true, index_tip: false,
    middle_mcp: true, middle_pip: true, middle_dip: true, middle_tip: false,
    ring_mcp: true, ring_pip: true, ring_dip: true, ring_tip: false,
    pinky_mcp: true, pinky_pip: true, pinky_dip: true, pinky_tip: false,
  },
  default: {
    wrist: false,
    thumb_mcp: false, thumb_pip: false, thumb_dip: false, thumb_tip: false,
    index_mcp: false, index_pip: false, index_dip: false, index_tip: false,
    middle_mcp: false, middle_pip: false, middle_dip: false, middle_tip: false,
    ring_mcp: false, ring_pip: false, ring_dip: false, ring_tip: false,
    pinky_mcp: false, pinky_pip: false, pinky_dip: false, pinky_tip: false,
  }
}

const InspectorPanel = ({
  jointRotations,
  cameraJointRotations,
  selectedJoint,
  onSelectedJointChange,
  onJointRotationChange,
  selectedHand,
  onSelectedHandChange,
  selectedLeftModel,
  selectedRightModel,
  onLeftModelChange,
  onRightModelChange,
  models,
  controlMode,
  onControlModeChange,
  onCalibrate,
  calibrationStatus,
  showGimbals,
  onShowGimbalsChange,
  showJointGimbals,
  onShowJointGimbalsChange,
  enableCameraPosition,
  onEnableCameraPositionChange,
  showAxes,
  onShowAxesChange,
  leftHandZRotation,
  rightHandZRotation,
  onLeftHandRotateZ,
  onRightHandRotateZ,
  showDebugLabels,
  onShowDebugLabelsChange,
  disableWristRotation,
  onDisableWristRotationChange,
  onApplyMetalMaterial,
  useMultiDoF,
  onUseMultiDoFChange,
  leftHandJointConfig,
  rightHandJointConfig,
  onMultiDoFChange,
  useQuaternionTracking,
  onUseQuaternionTrackingChange,
  useThumb3DoF,
  onUseThumb3DoFChange,
  showIKVisualization,
  onShowIKVisualizationChange,
  show3DCursor,
  onShow3DCursorChange,
  isTrackingLocked,
  onTrackingLockChange,
  onResetHandPose,
  sceneGraph,
  selectedObject,
  onSelectObject
}) => {
  // Collapsible section states (all open by default)
  const [controlsOpen, setControlsOpen] = useState(true)
  const [jointsOpen, setJointsOpen] = useState(true)
  const [displayOpen, setDisplayOpen] = useState(true)
  const [hierarchyOpen, setHierarchyOpen] = useState(false)

  // State for modal visibility
  const [isLeftModalOpen, setIsLeftModalOpen] = useState(false)
  const [isRightModalOpen, setIsRightModalOpen] = useState(false)

  // Get model path for the currently selected hand to determine joint availability
  const currentModelId = selectedHand === 'left' ? selectedLeftModel : selectedRightModel
  const currentModelData = models.find(m => m.id === currentModelId)
  const modelPath = currentModelData?.path || 'default'
  const jointAvailability = MODEL_JOINT_AVAILABILITY[modelPath] || MODEL_JOINT_AVAILABILITY.default

  // Get current rotation for the selected hand and joint
  const currentHandRotations = jointRotations[selectedHand] || {}
  const joints = currentHandRotations.joints || currentHandRotations
  const currentRotation = joints[selectedJoint] || 0
  const isManualMode = controlMode === 'manual'
  const isCameraMode = controlMode === 'camera'
  const isIKMode = controlMode === 'ik'

  const fingers = [
    { name: 'thumb', label: 'Thumb' },
    { name: 'index', label: 'Index' },
    { name: 'middle', label: 'Middle' },
    { name: 'ring', label: 'Ring' },
    { name: 'pinky', label: 'Pinky' }
  ]
  const segments = ['tip', 'dip', 'pip', 'mcp']

  return (
    <div className="fixed right-0 bottom-0 top-0 w-80 bg-panel border-l border-panel-border flex flex-col z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border shrink-0">
        <h2 className="text-base font-semibold text-panel-foreground">Hand Controls</h2>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 pb-32">
        <div className="p-2 space-y-2">
          {/* Controls Section */}
          <Collapsible open={controlsOpen} onOpenChange={setControlsOpen}>
            <Card className="bg-panel-muted/50 border-panel-border hover:border-panel-border/60 transition-colors">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-2 cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <Move className="w-4 h-4 text-panel-muted-foreground" />
                    <span className="text-sm font-medium text-panel-foreground">Controls</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-panel-muted-foreground transition-transform",
                      controlsOpen && "transform rotate-180"
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2 pb-2 space-y-2">
                  {/* Control Mode Toggle */}
                  <div>
                    <label className="text-xs font-medium text-panel-foreground block mb-1">
                      Control Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        variant={isManualMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => onControlModeChange('manual')}
                        className="text-xs uppercase"
                      >
                        Manual
                      </Button>
                      <Button
                        variant={isCameraMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => onControlModeChange('camera')}
                        className="text-xs uppercase"
                      >
                        Camera
                      </Button>
                      <Button
                        variant={isIKMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => onControlModeChange('ik')}
                        className="text-xs uppercase"
                      >
                        IK
                      </Button>
                    </div>
                  </div>

                  {/* Calibration - Camera mode only */}
                  {isCameraMode && (
                    <div className="p-2 bg-primary/10 border border-primary/30 rounded">
                      <div className="text-[11px] font-medium text-panel-foreground mb-1.5">
                        Calibration
                      </div>
                      <div className="text-[10px] text-panel-muted-foreground mb-1 leading-tight">
                        Hold hand relaxed, open position and click calibrate.
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button
                          onClick={onCalibrate}
                          size="sm"
                          className="flex-1 text-[11px] h-7"
                        >
                          Calibrate
                        </Button>
                        <div className="text-[10px] font-medium">
                          {calibrationStatus?.isCalibrated ? '✓' : '⚠'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IK Controls - IK mode only */}
                  {isIKMode && (
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      <div className="text-[11px] font-medium text-panel-foreground mb-1.5">
                        IK Testing
                      </div>
                      <div className="text-[10px] text-panel-muted-foreground mb-2 leading-tight">
                        Drag fingertips in 3D to test IK solver. Lock tracking to prevent camera updates.
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant={isTrackingLocked ? "default" : "outline"}
                          size="sm"
                          onClick={() => onTrackingLockChange(!isTrackingLocked)}
                          className="flex-1 text-[11px] h-7"
                        >
                          {isTrackingLocked ? '🔒 Locked' : '🔓 Unlocked'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onResetHandPose}
                          className="flex-1 text-[11px] h-7"
                        >
                          Reset Pose
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Model Selector */}
                  <div>
                    <label className="text-xs font-medium text-panel-foreground block mb-1">
                      Hand Models
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-panel-muted-foreground block mb-1">
                          Left
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsLeftModalOpen(true)}
                          className="w-full justify-between text-xs h-8"
                        >
                          <span className="truncate">
                            {models.find(m => m.id === selectedLeftModel)?.name || 'Select'}
                          </span>
                          <span>▼</span>
                        </Button>
                      </div>
                      <div>
                        <label className="text-[10px] text-panel-muted-foreground block mb-1">
                          Right
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRightModalOpen(true)}
                          className="w-full justify-between text-xs h-8"
                        >
                          <span className="truncate">
                            {models.find(m => m.id === selectedRightModel)?.name || 'Select'}
                          </span>
                          <span>▼</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Apply Metal Material */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onApplyMetalMaterial}
                    className="w-full text-xs gap-1.5"
                  >
                    <span>🔩</span>
                    Apply Metal Material
                  </Button>

                  {/* Z-Axis Rotation */}
                  <div>
                    <label className="text-xs font-medium text-panel-foreground block mb-1">
                      Z-Axis Rotation
                    </label>
                    <div className="space-y-2">
                      <div>
                        <div className="text-[10px] text-panel-muted-foreground mb-1">
                          Left: 90°
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLeftHandRotateZ(-1)}
                            className="text-[10px] h-7"
                          >
                            ← -90°
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLeftHandRotateZ(1)}
                            className="text-[10px] h-7"
                          >
                            +90° →
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-panel-muted-foreground mb-1">
                          Right: {(rightHandZRotation * 180 / Math.PI).toFixed(0)}°
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRightHandRotateZ(-1)}
                            className="text-[10px] h-7"
                          >
                            ← -90°
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRightHandRotateZ(1)}
                            className="text-[10px] h-7"
                          >
                            +90° →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Joints Section - Manual mode only */}
          {isManualMode && (
            <Collapsible open={jointsOpen} onOpenChange={setJointsOpen}>
              <Card className="bg-panel-muted/50 border-panel-border hover:border-panel-border/60 transition-colors">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-2 cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <RotateCw className="w-4 h-4 text-panel-muted-foreground" />
                      <span className="text-sm font-medium text-panel-foreground">Joints</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-panel-muted-foreground transition-transform",
                        jointsOpen && "transform rotate-180"
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-2 pb-2 space-y-2">
                    {/* Hand Selector */}
                    <div>
                      <label className="text-xs font-medium text-panel-foreground block mb-1">
                        Control Hand
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          variant={selectedHand === 'left' ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSelectedHandChange('left')}
                          className="text-xs uppercase"
                        >
                          Left
                        </Button>
                        <Button
                          variant={selectedHand === 'right' ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSelectedHandChange('right')}
                          className="text-xs uppercase"
                        >
                          Right
                        </Button>
                      </div>
                    </div>

                    {/* Joint Selector Grid */}
                    <div>
                      <label className="text-xs font-medium text-panel-foreground block mb-1">
                        Select Joint
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {fingers.map(finger => (
                          <div key={finger.name} className="flex flex-col gap-1">
                            <div className="text-[8px] text-center text-panel-muted-foreground mb-0.5">
                              {finger.label}
                            </div>
                            {segments.map(segment => {
                              const jointName = `${finger.name}_${segment}`
                              return (
                                <JointButton
                                  key={jointName}
                                  jointName={jointName}
                                  label={segment}
                                  isAvailable={jointAvailability[jointName]}
                                  selectedJoint={selectedJoint}
                                  onSelectedJointChange={onSelectedJointChange}
                                />
                              )
                            })}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant={selectedJoint === 'wrist' ? "default" : "outline"}
                        size="sm"
                        disabled={!jointAvailability.wrist}
                        onClick={() => {
                          if (jointAvailability.wrist) {
                            onSelectedJointChange('wrist')
                          }
                        }}
                        className="w-full mt-2 text-xs uppercase"
                      >
                        Wrist
                      </Button>
                    </div>

                    {/* Rotation Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-panel-foreground">
                          {selectedJoint.replace('_', ' ').toUpperCase()}
                        </label>
                        <span className="text-xs text-panel-muted-foreground">
                          {currentRotation.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[currentRotation]}
                        onValueChange={(values) => onJointRotationChange(values[0])}
                        min={-1.5}
                        max={1.5}
                        step={0.01}
                        disabled={!jointAvailability[selectedJoint]}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[9px] text-panel-muted-foreground mt-1">
                        <span>-1.5</span>
                        <span>0</span>
                        <span>1.5</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Multi-DoF Joint Controls - Show when Multi-DoF is ON and in Manual mode */}
          {isManualMode && useMultiDoF && (selectedHand === 'left' ? leftHandJointConfig : rightHandJointConfig) && (
            <Collapsible open={true}>
              <Card className="bg-panel-muted/50 border-panel-border hover:border-panel-border/60 transition-colors">
                <div className="p-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Focus className="w-4 h-4 text-panel-muted-foreground" />
                    <span className="text-sm font-medium text-panel-foreground">Multi-DoF Controls</span>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const config = selectedHand === 'left' ? leftHandJointConfig : rightHandJointConfig
                      if (!config || !config.semanticMapping) return null

                      return Object.entries(config.semanticMapping).map(([jointName, mapping]) => {
                        // Only show multi-axis joints (more than one axis)
                        if (mapping.axes.length <= 1) return null

                        return (
                          <div key={jointName} className="p-2 bg-panel/50 rounded border border-panel-border/30">
                            <div className="text-xs font-semibold text-panel-foreground mb-2">
                              {jointName.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            {mapping.axes.map(axis => {
                              const urdfJoint = mapping.urdfJoints[axis]
                              const [lower, upper] = mapping.limits[axis] || [-1.5, 1.5]
                              const currentValue = currentHandRotations[jointName]?.[axis] || 0

                              // Get camera angle for comparison
                              // Note: Camera data is swapped in App.js for back view, so we need to access the opposite hand
                              const cameraHand = selectedHand === 'left' ? 'right' : 'left'
                              const cameraData = cameraJointRotations?.[cameraHand]
                              let cameraAngle = null

                              // Camera data comes as flat URDF joint names (e.g., "thumb_cmc_roll")
                              // We need to construct the full URDF joint name from semantic key + axis
                              const urdfJointName = `${jointName}_${axis}`

                              // Also check for typo version "thunb" instead of "thumb" (L6 URDF has this typo)
                              const urdfJointNameTypo = urdfJointName.replace('thumb', 'thunb')

                              // Only look up camera angles when not in manual mode (optimization)
                              if (!isManualMode && cameraData) {
                                if (cameraData[urdfJointName] !== undefined) {
                                  cameraAngle = cameraData[urdfJointName]
                                } else if (cameraData[urdfJointNameTypo] !== undefined) {
                                  cameraAngle = cameraData[urdfJointNameTypo]
                                }
                              }

                              return (
                                <div key={axis} className="mb-2 last:mb-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-medium text-panel-muted-foreground">
                                      {axis.toUpperCase()}
                                    </label>
                                    <span className="text-[10px] text-panel-muted-foreground">
                                      {(currentValue * 180 / Math.PI).toFixed(0)}°
                                    </span>
                                  </div>
                                  {/* Camera angle display */}
                                  {cameraAngle !== null && cameraAngle !== undefined ? (
                                    <div className="text-[9px] text-primary/70 mb-0.5 font-medium">
                                      Camera: {(cameraAngle * 180 / Math.PI).toFixed(1)}°
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-panel-muted-foreground/40 mb-0.5">
                                      Camera: ---
                                    </div>
                                  )}
                                  <Slider
                                    value={[currentValue]}
                                    onValueChange={(values) => {
                                      onMultiDoFChange(selectedHand, jointName, axis, values[0])
                                    }}
                                    min={lower}
                                    max={upper}
                                    step={0.01}
                                    className="w-full"
                                  />
                                  <div className="flex justify-between text-[8px] text-panel-muted-foreground/60 mt-0.5">
                                    <span>{(lower * 180 / Math.PI).toFixed(0)}°</span>
                                    <span>{(upper * 180 / Math.PI).toFixed(0)}°</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </Card>
            </Collapsible>
          )}

          {/* Hierarchy Section */}
          <Collapsible open={hierarchyOpen} onOpenChange={setHierarchyOpen}>
            <Card className="bg-panel-muted/50 border-panel-border hover:border-panel-border/60 transition-colors">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-2 cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <List className="w-4 h-4 text-panel-muted-foreground" />
                    <span className="text-sm font-medium text-panel-foreground">Hierarchy</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-panel-muted-foreground transition-transform",
                      hierarchyOpen && "transform rotate-180"
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="h-64">
                  <HierarchyPanel
                    sceneGraph={sceneGraph}
                    selectedObject={selectedObject}
                    onSelectObject={onSelectObject}
                  />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Info */}
          {isCameraMode && (
            <div className="p-2 bg-primary/10 border border-primary/30 rounded">
              <p className="text-[10px] text-panel-muted-foreground leading-relaxed">
                Camera tracking active
              </p>
            </div>
          )}

          <div className="text-[9px] text-panel-muted-foreground italic pt-2 border-t border-panel-border">
            Mouse: rotate/zoom 3D view
          </div>
        </div>
      </ScrollArea>

      {/* Floating Display Settings - Always Visible at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-panel/95 backdrop-blur-sm border-t border-panel-border shadow-lg">
        <div className="p-2">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Eye className="w-3.5 h-3.5 text-panel-muted-foreground" />
            <span className="text-xs font-medium text-panel-foreground">Display</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {/* Gimbals - HIDDEN FOR DEMO */}
            {/* <button
              onClick={() => onShowGimbalsChange(!showGimbals)}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                showGimbals
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              Gimbals
            </button> */}

            {/* Axes */}
            <button
              onClick={() => onShowAxesChange(!showAxes)}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                showAxes
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              Axes
            </button>

            {/* Joint Gimbals */}
            <button
              onClick={() => onShowJointGimbalsChange(!showJointGimbals)}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                showJointGimbals
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              Joints
            </button>

            {/* Labels */}
            <button
              onClick={() => onShowDebugLabelsChange(!showDebugLabels)}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                showDebugLabels
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              Labels
            </button>

            {/* 3D Cursor */}
            <button
              onClick={() => onShow3DCursorChange(!show3DCursor)}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                show3DCursor
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              3D Cursor
            </button>

            {/* Multi-DoF - HIDDEN FOR DEMO */}
            {/* <button
              onClick={() => {
                const newValue = !useMultiDoF
                onUseMultiDoFChange(newValue)
                console.log('🎛️ [InspectorPanel] Multi-DoF toggled:', newValue)
              }}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                useMultiDoF
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              Multi-DoF
            </button> */}

            {/* Quaternion Tracking - HIDDEN FOR DEMO */}
            {/* {isCameraMode && (
              <button
                onClick={() => {
                  const newValue = !useQuaternionTracking
                  onUseQuaternionTrackingChange(newValue)
                  console.log('🔄 [InspectorPanel] Quaternion tracking toggled:', newValue)
                }}
                className={cn(
                  "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                  useQuaternionTracking
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                )}
              >
                Quaternion
              </button>
            )} */}

            {/* Thumb 3DOF Addon (only when quaternion tracking is enabled) */}
            {isCameraMode && useQuaternionTracking && (
              <button
                onClick={() => {
                  const newValue = !useThumb3DoF
                  onUseThumb3DoFChange(newValue)
                  console.log('🔧 [InspectorPanel] Thumb 3DOF addon toggled:', newValue)
                }}
                className={cn(
                  "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                  useThumb3DoF
                    ? "bg-green-600 text-white"
                    : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                )}
                title="Enable full 3-axis thumb rotation (accounts for non-orthogonal URDF axes)"
              >
                3DOF Thumb
              </button>
            )}

            {/* IK Debug Visualization (only in IK mode) */}
            {isIKMode && (
              <button
                onClick={() => {
                  const newValue = !showIKVisualization
                  onShowIKVisualizationChange(newValue)
                  console.log('🎯 [InspectorPanel] IK visualization toggled:', newValue)
                }}
                className={cn(
                  "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                  showIKVisualization
                    ? "bg-cyan-600 text-white"
                    : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                )}
                title="Show IK solver debug visualization (spheres and lines)"
              >
                IK Debug
              </button>
            )}

            {/* Position (camera mode only) - HIDDEN FOR DEMO */}
            {/* {isCameraMode ? (
              <button
                onClick={() => onEnableCameraPositionChange(!enableCameraPosition)}
                className={cn(
                  "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                  enableCameraPosition
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                )}
              >
                Position
              </button>
            ) : (
              <div className="px-2 py-1.5 rounded bg-muted/10 text-[10px] text-muted-foreground/50 text-center">
                Position
              </div>
            )} */}

            {/* Wrist (camera mode only) */}
            {isCameraMode ? (
              <button
                onClick={() => onDisableWristRotationChange(!disableWristRotation)}
                className={cn(
                  "px-2 py-1.5 rounded text-[10px] font-medium transition-all",
                  !disableWristRotation
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                )}
              >
                Wrist
              </button>
            ) : (
              <div className="px-2 py-1.5 rounded bg-muted/10 text-[10px] text-muted-foreground/50 text-center">
                Wrist
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Selector Modals */}
      <ModelSelectorModal
        isOpen={isLeftModalOpen}
        onClose={() => setIsLeftModalOpen(false)}
        onSelectModel={onLeftModelChange}
        models={models.filter(m => m.side === 'left' || m.side === null)}
        currentModel={selectedLeftModel}
        title="Select Left Hand Model"
      />
      <ModelSelectorModal
        isOpen={isRightModalOpen}
        onClose={() => setIsRightModalOpen(false)}
        onSelectModel={onRightModelChange}
        models={models.filter(m => m.side === 'right' || m.side === null)}
        currentModel={selectedRightModel}
        title="Select Right Hand Model"
      />
    </div>
  )
}

export default InspectorPanel
