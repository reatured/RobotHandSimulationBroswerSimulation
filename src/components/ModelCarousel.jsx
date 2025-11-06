import React from 'react';

const ModelCarousel = ({ models, selectedModel, onModelChange, isMobile }) => {
  // Filter to only show L6, L10, L20 models (base models without side)
  const displayModels = models
    .filter(model => ['linker_l6', 'linker_l10', 'linker_l20'].includes(model.path))
    .filter(model => !model.side) // Get the base model entries
    .sort((a, b) => {
      // Sort by L6, L10, L20 order
      const order = ['linker_l6', 'linker_l10', 'linker_l20'];
      return order.indexOf(a.path) - order.indexOf(b.path);
    });

  // If we don't have base models, create them from left-hand models
  const finalModels = displayModels.length > 0 ? displayModels :
    models
      .filter(model => ['linker_l6_left', 'linker_l10_left', 'linker_l20_left'].includes(model.id))
      .map(model => ({
        id: model.path,
        name: model.shortName,
        shortName: model.shortName,
        path: model.path,
      }))
      .sort((a, b) => {
        const order = ['linker_l6', 'linker_l10', 'linker_l20'];
        return order.indexOf(a.path) - order.indexOf(b.path);
      });

  // Image mapping for preview thumbnails
  const modelImages = {
    'linker_l6': './assets/doc/gallery/linker_l6_rt.png',
    'linker_l10': './assets/doc/gallery/linker_l10_rt.png',
    'linker_l20': './assets/doc/gallery/linker_l20_rt.png',
  };

  // Determine if a model is currently selected (check if path matches)
  const isSelected = (modelPath) => {
    return selectedModel && selectedModel.includes(modelPath);
  };

  return (
    <div className={`model-carousel-container ${isMobile ? 'relative' : 'fixed bottom-0 left-0 right-0'} z-30`}>
      <div className="carousel-wrapper  py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="carousel-scroll flex gap-4 md:gap-6 overflow-x-auto overflow-y-visible snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent py-6 px-4">
              {finalModels.map((model) => (
                <button
                  key={model.path || model.id}
                  onClick={() => onModelChange(model.path || model.id)}
                  className={`carousel-card flex-shrink-0 snap-center group cursor-pointer transition-all duration-300 ${
                    isSelected(model.path || model.id)
                      ? 'scale-105'
                      : 'hover:scale-105'
                  }`}
                >
                  <div className={`relative w-28 md:w-44 lg:w-52 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                    isSelected(model.path || model.id)
                      ? 'ring-4 ring-blue-500 shadow-2xl shadow-blue-500/50'
                      : 'ring-1 ring-gray-500 hover:ring-2 hover:ring-gray-400 hover:shadow-2xl'
                  }`}>
                    {/* Selected Badge */}
                    {isSelected(model.path || model.id) && (
                      <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        Active
                      </div>
                    )}

                    {/* Image Container */}
                    <div className="aspect-square bg-gradient-to-br from-gray-500 to-gray-600 p-4 md:p-6 flex items-center justify-center">
                      <img
                        src={modelImages[model.path] || modelImages[model.id]}
                        alt={model.name || model.shortName}
                        className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden flex-col items-center justify-center text-gray-300 text-sm">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {model.shortName || model.name}
                      </div>
                    </div>

                    {/* Info Footer */}
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 p-3 md:p-4 border-t border-gray-600">
                      <h3 className={`text-center text-sm md:text-base font-semibold tracking-wide transition-colors ${
                        isSelected(model.path || model.id)
                          ? 'text-blue-400'
                          : 'text-gray-100 group-hover:text-white'
                      }`}>
                        {model.shortName || model.name}
                      </h3>
                      <p className="text-center text-xs text-gray-400 mt-1 hidden md:block">
                        RealHand Model
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .carousel-scroll {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default ModelCarousel;
