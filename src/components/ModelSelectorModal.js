import { memo } from 'react'

// Map model paths to their preview images
const getModelImage = (modelPath) => {
  const imageMap = {
    'ability_hand': './assets/doc/gallery/ability_rt.webp',
    'shadow_hand': './assets/doc/gallery/shadow_rt.webp',
    'allegro_hand': './assets/doc/gallery/allegro_rt.webp',
    'inspire_hand': './assets/doc/gallery/inspire_rt.webp',
    'leap_hand': './assets/doc/gallery/leap_rt.webp',
    'schunk_hand': './assets/doc/gallery/svh_rt.webp',
    'barrett_hand': './assets/doc/gallery/bhand_rt.webp',
    'dclaw_gripper': './assets/doc/gallery/dclaw_rt.webp',
    'panda_gripper': './assets/doc/gallery/panda_rt.webp',
    'linker_l6': './assets/doc/gallery/linker_l6_rt.png',
    'linker_l10': './assets/doc/gallery/linker_l10_rt.png',
    'linker_l20': './assets/doc/gallery/linker_l20_rt.png',
    'linker_l20pro': './assets/doc/gallery/linker_l20pro_rt.png',
    'linker_l21': null, // No preview image available
    'linker_l25': null, // No preview image available
    'linker_l30': './assets/doc/gallery/linker_l30_rt.png',
    'linker_o6': './assets/doc/gallery/linker_o6_rt.png',
    'linker_o7': './assets/doc/gallery/linker_o7_rt.png'
  }
  return imageMap[modelPath] || null
}

const ModelSelectorModal = memo(({
  isOpen,
  onClose,
  onSelectModel,
  models,
  currentModel,
  title
}) => {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleModelSelect = (modelId) => {
    onSelectModel(modelId)
    onClose()
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(20, 20, 30, 0.95)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '85vh',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            margin: 0
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
              lineHeight: '1',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'white'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
            }}
          >
            ×
          </button>
        </div>

        {/* Model Grid */}
        <div style={{
          maxHeight: 'calc(85vh - 100px)',
          overflowY: 'auto',
          paddingRight: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px'
        }}>
          {models.map((model) => {
            const isSelected = model.id === currentModel
            const imagePath = getModelImage(model.path)
            return (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                style={{
                  padding: '12px',
                  backgroundColor: isSelected
                    ? 'rgba(100, 150, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected
                    ? '2px solid rgba(100, 150, 255, 1)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch'
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(100, 200, 255, 1)',
                    color: 'rgba(20, 20, 30, 1)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    zIndex: 1,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}>
                    ✓
                  </div>
                )}

                {/* Preview Image */}
                <div style={{
                  width: '100%',
                  paddingTop: '100%',
                  position: 'relative',
                  marginBottom: '12px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}>
                  {imagePath ? (
                    <img
                      src={imagePath}
                      alt={model.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const placeholder = e.currentTarget.nextSibling
                        if (placeholder) {
                          placeholder.style.display = 'flex'
                        }
                      }}
                    />
                  ) : null}
                  {/* Placeholder for models without images */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: imagePath ? 'none' : 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    color: 'rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{
                      fontSize: '32px',
                      marginBottom: '8px'
                    }}>
                      🤖
                    </div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      No Preview
                    </div>
                  </div>
                </div>

                {/* Model Info */}
                <div style={{
                  textAlign: 'center'
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    {model.name}
                  </div>
                  {model.path && (
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '10px',
                      fontFamily: 'monospace'
                    }}>
                      {model.path}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

ModelSelectorModal.displayName = 'ModelSelectorModal'

export default ModelSelectorModal
