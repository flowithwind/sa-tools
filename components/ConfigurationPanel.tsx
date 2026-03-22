import { useState } from 'react';
import { useReviewTool } from '@/contexts/ReviewToolContext';
import { AI_MODELS } from '@/types/models';

const ConfigurationPanel = () => {
  const {
    selectedModels,
    setSelectedModels,
    personaPrompt,
    setPersonaPrompt,
    getSupportedModalities,
  } = useReviewTool();
  
  const [showPresets, setShowPresets] = useState(false);

  const handleModelSelection = (modelId: string) => {
    const model = AI_MODELS.find(m => m.id === modelId);
    if (!model) return;

    // Multi-select mode: allow selecting up to 10 models
    const isSelected = selectedModels.some(m => m.id === modelId);
    if (isSelected) {
      // Remove the model if already selected (but keep at least 1)
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(m => m.id !== modelId));
      }
    } else if (selectedModels.length < 10) {
      // Add the model if not already selected and we haven't reached the limit
      setSelectedModels([...selectedModels, model]);
    }
  };

  const handleSelectAll = () => {
    if (selectedModels.length === AI_MODELS.length) {
      // Deselect all - keep at least 1 model
      if (AI_MODELS.length > 0) {
        setSelectedModels([AI_MODELS[0]]);
      }
    } else {
      // Select all models (up to 10)
      setSelectedModels(AI_MODELS.slice(0, 10));
    }
  };

  const isAllSelected = selectedModels.length === AI_MODELS.length && AI_MODELS.length <= 10;

  const supportedModalities = getSupportedModalities();
  const supportedModalitiesText = supportedModalities.join(', ');

  return (
    <div className="glass-card w-80 p-4 flex flex-col h-full max-h-full">
      <h2 className="text-lg font-semibold text-tech-green mb-4">配置</h2>
      
      <div className="mb-6">
        <h3 className="font-medium text-text-secondary mb-2">模型选择</h3>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-tertiary">
            已选择：{selectedModels.length}/10
          </span>
          <div className="flex gap-2">
            <button 
              className="text-sm text-tech-green hover:text-tech-green/80"
              onClick={handleSelectAll}
              title={isAllSelected ? '取消全选' : '全选所有模型'}
            >
              {isAllSelected ? '取消全选' : '全选'}
            </button>
            <button 
              className="text-sm text-tech-green hover:text-tech-green/80"
              onClick={() => setShowPresets(!showPresets)}
            >
              {showPresets ? '隐藏预设' : '显示预设'}
            </button>
          </div>
        </div>
        
        {showPresets && (
          <div className="mb-4 p-3 bg-dark-secondary/50 rounded-lg">
            <h4 className="text-sm font-medium text-text-secondary mb-2">快速预设</h4>
            <div className="space-y-2">
              <button
                className="block w-full text-left text-sm p-2 rounded hover:bg-dark-secondary/50"
                onClick={() => setSelectedModels([AI_MODELS[0], AI_MODELS[1]])}
              >
                Qwen-VL-Max + Qwen3-VL-Plus
              </button>
              <button
                className="block w-full text-left text-sm p-2 rounded hover:bg-dark-secondary/50"
                onClick={() => setSelectedModels([AI_MODELS[1], AI_MODELS[3]])}
              >
                Qwen3-VL-Plus + Qwen3-Omni-Flash
              </button>
              <button
                className="block w-full text-left text-sm p-2 rounded hover:bg-dark-secondary/50"
                onClick={() => setSelectedModels([AI_MODELS[0], AI_MODELS[4]])}
              >
                Qwen-VL-Max + Doubao
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {AI_MODELS.map((model) => {
            const isSelected = selectedModels.some(m => m.id === model.id);
            const canSelect = isSelected || selectedModels.length < 10;
            
            return (
              <div
                key={model.id}
                className={`p-3 rounded-lg border ${
                  isSelected 
                    ? 'border-tech-green bg-dark-secondary/30' 
                    : 'border-dark-secondary hover:border-tech-green/50'
                } ${!canSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => canSelect && handleModelSelection(model.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-text-tertiary mt-1">{model.description}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    model.provider === 'volcano' 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {model.provider}
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-tertiary">
                  支持模态: {model.supportedModalities.join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium text-text-secondary mb-2">支持的模态</h3>
        <div className="text-sm p-3 bg-dark-secondary/50 rounded-lg">
          {supportedModalitiesText || '未选择模型'}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium text-text-secondary mb-2">Review Expert Role</h3>
        <textarea
          value={personaPrompt}
          onChange={(e) => setPersonaPrompt(e.target.value)}
          placeholder="Define your review expert role..."
          className="flex-1 resize-none text-sm min-h-[100px]"
        />
      </div>
    </div>
  );
};

export default ConfigurationPanel;