'use client';

import { useAnimateTool } from '@/contexts/AnimateToolContext';

export default function AnimateResults() {
  const { generationResult, selectedModel, resetAll, isGenerating } = useAnimateTool();

  if (!generationResult) {
    return (
      <div className="bg-dark-secondary rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🎭</div>
        <h3 className="text-lg font-medium text-text-secondary mb-2">
          Animation Result
        </h3>
        <p className="text-sm text-text-muted">
          Upload image and video, then generate to see result
        </p>
      </div>
    );
  }

  const { status, videoUrl, error, responseTime, videoDuration } = generationResult;

  const isMotionTransfer = selectedModel.id === 'wan2.2-animate-move';

  return (
    <div className="bg-dark-secondary rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-tech-green flex items-center gap-2">
          <span>🎭</span>
          {isMotionTransfer ? 'Motion Transfer Result' : 'Face Swap Result'}
        </h3>
        {status === 'success' && (
          <button
            onClick={resetAll}
            className="px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-text-secondary hover:border-tech-green transition-colors"
          >
            New Generation
          </button>
        )}
      </div>

      {/* Processing State */}
      {(status === 'pending' || status === 'running') && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 border-4 border-tech-green/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-tech-green border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">{isMotionTransfer ? '🕺' : '🎭'}</span>
            </div>
          </div>
          <p className="text-lg font-medium text-text-primary mb-1">
            {status === 'pending' ? 'Queued for processing...' : 'Generating animation...'}
          </p>
          <p className="text-sm text-text-muted">
            This may take 2-5 minutes
          </p>
          {responseTime && (
            <p className="text-xs text-text-muted mt-2">
              Elapsed: {Math.round(responseTime / 1000)}s
            </p>
          )}
        </div>
      )}

      {/* Success State */}
      {status === 'success' && videoUrl && (
        <div className="space-y-4">
          <div className="relative bg-dark-bg rounded-xl overflow-hidden">
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full max-h-[500px] object-contain"
            />
            {videoDuration && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                {videoDuration.toFixed(1)}s
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-text-muted">
              <span className="flex items-center gap-1">
                ✓ Generated in {Math.round((responseTime || 0) / 1000)}s
              </span>
              {videoDuration && (
                <span className="flex items-center gap-1">
                  🎬 {videoDuration.toFixed(1)}s video
                </span>
              )}
            </div>
            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-tech-green text-dark-bg rounded-lg font-medium hover:bg-tech-green-dark transition-colors"
            >
              Download Video
            </a>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <p className="text-lg font-medium text-red-400 mb-1">
            Generation Failed
          </p>
          <p className="text-sm text-text-muted text-center max-w-md">
            {error || 'An error occurred during generation'}
          </p>
          <button
            onClick={resetAll}
            disabled={isGenerating}
            className="mt-4 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-text-secondary hover:border-tech-green transition-colors disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
