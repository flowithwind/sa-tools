'use client';

import { useVideoGenTool } from '@/contexts/VideoGenToolContext';
import { VIDEO_RESOLUTIONS_R2V, VIDEO_RESOLUTIONS_I2V, VIDEO_DURATIONS, VIDEO_SHOT_TYPES, VIDEO_GEN_MODELS } from '@/types/models';

export default function VideoGenConfigPanel() {
  const {
    currentMode,
    selectedModel,
    setSelectedModel,
    outputSize,
    setOutputSize,
    resolution,
    setResolution,
    duration,
    setDuration,
    shotType,
    setShotType,
    watermark,
    setWatermark,
    negativePrompt,
    setNegativePrompt,
    isGenerating,
  } = useVideoGenTool();

  const isR2V = currentMode === 'r2v';
  const isI2V = currentMode === 'i2v';
  const i2vModels = VIDEO_GEN_MODELS.filter(m => m.id.includes('i2v'));

  return (
    <div className="w-64 bg-dark-secondary rounded-xl p-4 h-fit sticky top-4">
      <h2 className="text-lg font-semibold text-tech-green mb-4 flex items-center gap-2">
        <span>🎬</span>
        Video Settings
      </h2>

      {/* Mode Info */}
      {currentMode && (
        <div className={`mb-4 p-3 rounded-lg border ${isR2V ? 'bg-blue-500/10 border-blue-500/30' : 'bg-purple-500/10 border-purple-500/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span>{isR2V ? '📹' : '🖼️'}</span>
            <span className={`text-sm font-medium ${isR2V ? 'text-blue-400' : 'text-purple-400'}`}>
              {isR2V ? 'R2V Mode' : 'I2V Mode'}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {isR2V ? 'Reference-to-video with character consistency' : 'Image-to-video with optional audio'}
          </p>
        </div>
      )}

      {/* Model Selection (I2V mode only) */}
      {isI2V && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Model
          </label>
          <div className="space-y-2">
            {i2vModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                disabled={isGenerating}
                className={`w-full px-3 py-3 rounded-lg text-left transition-all ${
                  selectedModel.id === model.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-purple-400'
                } disabled:opacity-50`}
              >
                <div className="font-medium text-sm">{model.name}</div>
                <div className={`text-xs mt-0.5 font-mono ${
                  selectedModel.id === model.id ? 'text-white/60' : 'text-text-muted/70'
                }`}>
                  {model.id}
                </div>
                <div className={`text-xs mt-1 ${
                  selectedModel.id === model.id ? 'text-white/80' : 'text-text-muted'
                }`}>
                  {model.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resolution (R2V mode - uses size) */}
      {isR2V && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Resolution (Size)
          </label>
          <select
            value={outputSize}
            onChange={(e) => setOutputSize(e.target.value)}
            disabled={isGenerating}
            className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-tech-green disabled:opacity-50"
          >
            {VIDEO_RESOLUTIONS_R2V.map((res) => (
              <option key={res.value} value={res.value}>
                {res.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            1080P costs more than 720P
          </p>
        </div>
      )}

      {/* Resolution (I2V mode - uses resolution) */}
      {isI2V && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Resolution
          </label>
          <div className="flex gap-2">
            {VIDEO_RESOLUTIONS_I2V.map((res) => (
              <button
                key={res.value}
                onClick={() => setResolution(res.value)}
                disabled={isGenerating}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  resolution === res.value
                    ? 'bg-purple-500 text-white font-medium'
                    : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-purple-400'
                } disabled:opacity-50`}
              >
                {res.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1">
            1080P costs more than 720P
          </p>
        </div>
      )}

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Duration
        </label>
        <div className="flex gap-1.5">
          {VIDEO_DURATIONS.map((dur) => (
            <button
              key={dur.value}
              onClick={() => setDuration(dur.value)}
              disabled={isGenerating}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                duration === dur.value
                  ? 'bg-tech-green text-dark-bg font-medium'
                  : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
              } disabled:opacity-50`}
            >
              {dur.value}s
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-1">
          Longer duration costs more
        </p>
      </div>

      {/* Shot Type (R2V only) */}
      {isR2V && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Shot Type
          </label>
          <div className="space-y-2">
            {VIDEO_SHOT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setShotType(type.value as 'single' | 'multi')}
                disabled={isGenerating}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  shotType === type.value
                    ? 'bg-tech-green text-dark-bg font-medium'
                    : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
                } disabled:opacity-50`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Multi-shot enables auto scene transitions
          </p>
        </div>
      )}

      {/* Negative Prompt */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Negative Prompt (Optional)
        </label>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          disabled={isGenerating}
          placeholder="Elements to avoid..."
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-tech-green disabled:opacity-50 resize-none text-sm"
        />
        <p className="text-xs text-text-muted mt-1">
          {negativePrompt.length}/500 characters
        </p>
      </div>

      {/* Watermark */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={watermark}
            onChange={(e) => setWatermark(e.target.checked)}
            disabled={isGenerating}
            className="w-4 h-4 rounded border-dark-border bg-dark-bg text-tech-green focus:ring-tech-green focus:ring-offset-0"
          />
          <span className="text-sm text-text-secondary">Add AI watermark</span>
        </label>
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-dark-bg rounded-lg border border-dark-border">
        <h3 className="text-sm font-medium text-tech-green mb-2">💡 Tips</h3>
        <ul className="text-xs text-text-muted space-y-1">
          {isR2V ? (
            <>
              <li>• Use character1, character2, etc. in prompts to reference videos</li>
              <li>• Each video should contain one character</li>
              <li>• Video generation takes 1-5 minutes</li>
              <li>• Reference videos: 2-30 seconds, max 100MB</li>
            </>
          ) : isI2V ? (
            <>
              <li>• Image will be the first frame of the video</li>
              <li>• Upload audio for lip-sync and motion control</li>
              <li>• No audio = auto-generated background music</li>
              <li>• Flash model: faster, optimized for speed</li>
              <li>• Video generation takes 1-5 minutes</li>
            </>
          ) : (
            <>
              <li>• Upload videos for R2V (character-consistent)</li>
              <li>• Upload image + audio for I2V (audio-driven)</li>
              <li>• Cannot mix videos with image/audio</li>
              <li>• Video generation takes 1-5 minutes</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
