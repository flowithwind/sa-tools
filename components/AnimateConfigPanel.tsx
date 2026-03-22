'use client';

import { useAnimateTool } from '@/contexts/AnimateToolContext';
import { ANIMATE_MODELS, ANIMATE_MODES } from '@/types/models';

export default function AnimateConfigPanel() {
  const {
    selectedModel,
    setSelectedModel,
    mode,
    setMode,
    checkImage,
    setCheckImage,
    isGenerating,
  } = useAnimateTool();

  return (
    <div className="w-64 bg-dark-secondary rounded-xl p-4 h-fit sticky top-4">
      <h2 className="text-lg font-semibold text-tech-green mb-4 flex items-center gap-2">
        <span>🎭</span>
        Animate Settings
      </h2>

      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Model
        </label>
        <div className="space-y-2">
          {ANIMATE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model)}
              disabled={isGenerating}
              className={`w-full px-3 py-3 rounded-lg text-left transition-all ${
                selectedModel.id === model.id
                  ? 'bg-tech-green text-dark-bg'
                  : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
              } disabled:opacity-50`}
            >
              <div className="font-medium text-sm">{model.name}</div>
              <div className={`text-xs mt-0.5 font-mono ${
                selectedModel.id === model.id ? 'text-dark-bg/60' : 'text-text-muted/70'
              }`}>
                {model.id}
              </div>
              <div className={`text-xs mt-1 ${
                selectedModel.id === model.id ? 'text-dark-bg/70' : 'text-text-muted'
              }`}>
                {model.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Quality Mode
        </label>
        <div className="space-y-2">
          {ANIMATE_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value as 'wan-std' | 'wan-pro')}
              disabled={isGenerating}
              className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                mode === m.value
                  ? m.value === 'wan-pro' ? 'bg-purple-500 text-white' : 'bg-tech-green text-dark-bg'
                  : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{m.label}</span>
                {m.value === 'wan-pro' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    mode === m.value ? 'bg-white/20' : 'bg-purple-500/20 text-purple-400'
                  }`}>PRO</span>
                )}
              </div>
              <div className={`text-xs mt-0.5 ${
                mode === m.value ? 'opacity-70' : 'text-text-muted'
              }`}>
                {m.description}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">
          Pro mode has better quality but costs more
        </p>
      </div>

      {/* Check Image Option */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checkImage}
            onChange={(e) => setCheckImage(e.target.checked)}
            disabled={isGenerating}
            className="w-4 h-4 rounded border-dark-border bg-dark-bg text-tech-green focus:ring-tech-green focus:ring-offset-0"
          />
          <span className="text-sm text-text-secondary">Enable image detection</span>
        </label>
        <p className="text-xs text-text-muted mt-1 ml-6">
          Validates face quality before processing
        </p>
      </div>

      {/* Model Info */}
      <div className="mt-6 p-3 bg-dark-bg rounded-lg border border-dark-border">
        <h3 className="text-sm font-medium text-tech-green mb-2">💡 Tips</h3>
        <ul className="text-xs text-text-muted space-y-1">
          {selectedModel.id === 'wan2.2-animate-move' ? (
            <>
              <li>• Image provides character and background</li>
              <li>• Video provides motion and audio</li>
              <li>• Best for: dance replication, motion transfer</li>
              <li>• Single person, facing camera, face visible</li>
            </>
          ) : (
            <>
              <li>• Image provides the new face</li>
              <li>• Video provides scene and motion</li>
              <li>• Best for: face replacement, dubbing</li>
              <li>• Preserves original video lighting and color</li>
            </>
          )}
          <li>• Video: 2-30s, max 200MB</li>
          <li>• Image: max 5MB, clear face</li>
        </ul>
      </div>
    </div>
  );
}
