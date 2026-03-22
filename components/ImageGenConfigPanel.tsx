import { useImageGenTool } from '@/contexts/ImageGenToolContext';
import { IMAGE_GEN_MODELS } from '@/types/models';

const SIZE_PRESETS = [
  { label: '512×512', value: '512*512' },
  { label: '768×768', value: '768*768' },
  { label: '1024×1024', value: '1024*1024' },
  { label: '1024×1536', value: '1024*1536' },
  { label: '1536×1024', value: '1536*1024' },
  { label: '1080×1920', value: '1080*1920' },
];

const ImageGenConfigPanel = () => {
  const {
    selectedGenModels,
    setSelectedGenModels,
    outputSize,
    setOutputSize,
    imagesPerModel,
    setImagesPerModel,
  } = useImageGenTool();

  const handleModelToggle = (modelId: string) => {
    if (selectedGenModels.includes(modelId)) {
      // Remove model if already selected (but keep at least one)
      if (selectedGenModels.length > 1) {
        setSelectedGenModels(selectedGenModels.filter(id => id !== modelId));
      }
    } else {
      // Add model
      setSelectedGenModels([...selectedGenModels, modelId]);
    }
  };

  return (
    <div className="glass-card w-80 p-4 flex flex-col h-full max-h-full">
      <h2 className="text-lg font-semibold text-tech-green mb-4">Configuration</h2>
      
      <div className="mb-6">
        <h3 className="font-medium text-text-secondary mb-2">Model Selection</h3>
        <p className="text-xs text-text-tertiary mb-3">
          Selected: {selectedGenModels.length}/{IMAGE_GEN_MODELS.length}
        </p>
        
        <div className="space-y-2">
          {IMAGE_GEN_MODELS.map((model) => {
            const isSelected = selectedGenModels.includes(model.id);
            
            return (
              <div
                key={model.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-tech-green bg-dark-secondary/30' 
                    : 'border-dark-secondary hover:border-tech-green/50'
                }`}
                onClick={() => handleModelToggle(model.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleModelToggle(model.id)}
                        className="accent-tech-green"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="font-medium">{model.name}</div>
                    </div>
                    <div className="text-xs text-text-tertiary mt-1 ml-6">{model.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium text-text-secondary mb-2">Output Size</h3>
        <select
          value={outputSize}
          onChange={(e) => setOutputSize(e.target.value)}
          className="w-full p-2 rounded-lg bg-dark-secondary border border-dark-secondary hover:border-tech-green/50 focus:border-tech-green outline-none text-sm"
        >
          {SIZE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-tertiary mt-1">
          Image dimensions for generation
        </p>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium text-text-secondary mb-2">Images Per Model</h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="6"
            value={imagesPerModel}
            onChange={(e) => setImagesPerModel(parseInt(e.target.value))}
            className="flex-1 accent-tech-green"
          />
          <span className="text-tech-green font-semibold text-lg w-8 text-center">
            {imagesPerModel}
          </span>
        </div>
        <p className="text-xs text-text-tertiary mt-1">
          Number of variations to generate per model
        </p>
      </div>
      
      <div className="flex-1 p-3 bg-dark-secondary/50 rounded-lg">
        <h3 className="font-medium text-text-secondary mb-2 text-sm">Comparison Info</h3>
        <div className="text-xs text-text-tertiary space-y-1">
          <p>• {selectedGenModels.length} models selected</p>
          <p>• {imagesPerModel} images per model</p>
          <p>• Total: {selectedGenModels.length * imagesPerModel} images</p>
          <p>• Output: {outputSize}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageGenConfigPanel;
