'use client';

import { useVideoGenTool } from '@/contexts/VideoGenToolContext';
import { useEffect, useState } from 'react';

export default function VideoGenResults() {
  const {
    generationResult,
    setGenerationResult,
    isGenerating,
    stopPolling,
  } = useVideoGenTool();
  
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time while generating
  useEffect(() => {
    if (!isGenerating || !generationResult) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - generationResult.timestamp) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isGenerating, generationResult]);

  // Reset elapsed time when generation starts
  useEffect(() => {
    if (isGenerating) {
      setElapsedTime(0);
    }
  }, [isGenerating]);

  const handleClear = () => {
    stopPolling();
    setGenerationResult(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!generationResult) {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: '⏳',
      text: 'Queued',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    running: {
      icon: '🔄',
      text: 'Generating',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    success: {
      icon: '✅',
      text: 'Complete',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    error: {
      icon: '❌',
      text: 'Failed',
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
    },
  };

  const status = statusConfig[generationResult.status];

  return (
    <div className="bg-dark-secondary rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-tech-green flex items-center gap-2">
          <span>🎬</span>
          Generated Video
        </h3>
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span className={`px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.color}`}>
            {status.icon} {status.text}
          </span>
          
          {/* Clear button */}
          {!isGenerating && (
            <button
              onClick={handleClear}
              className="p-2 text-text-muted hover:text-text-primary transition-colors"
              title="Clear result"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress indicator for pending/running */}
      {(generationResult.status === 'pending' || generationResult.status === 'running') && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              {generationResult.status === 'pending' ? 'Waiting in queue...' : 'Generating video...'}
            </span>
            <span className="text-sm text-text-muted">
              {formatTime(elapsedTime)} elapsed
            </span>
          </div>
          
          <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                generationResult.status === 'running' 
                  ? 'bg-gradient-to-r from-tech-green to-blue-500 animate-pulse'
                  : 'bg-yellow-500'
              }`}
              style={{ 
                width: generationResult.status === 'running' ? '60%' : '10%'
              }}
            />
          </div>
          
          <p className="text-xs text-text-muted mt-2">
            Video generation typically takes 1-5 minutes. Please wait...
          </p>
        </div>
      )}

      {/* Video result */}
      {generationResult.status === 'success' && generationResult.videoUrl && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-dark-bg">
            <video
              src={generationResult.videoUrl}
              controls
              className="w-full max-h-[500px] object-contain"
              autoPlay
              loop
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Generated in {(generationResult.responseTime / 1000).toFixed(1)}s
            </div>
            
            <div className="flex gap-2">
              <a
                href={generationResult.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-text-secondary hover:border-tech-green transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open
              </a>
              
              <a
                href={generationResult.videoUrl}
                download
                className="px-4 py-2 bg-tech-green text-dark-bg rounded-lg text-sm font-medium hover:bg-tech-green-dark transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {generationResult.status === 'error' && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400">{generationResult.error || 'Video generation failed'}</p>
          <p className="text-sm text-text-muted mt-2">
            Task ID: {generationResult.taskId}
          </p>
        </div>
      )}

      {/* Task ID info */}
      <div className="mt-4 text-xs text-text-muted">
        Task ID: {generationResult.taskId}
      </div>
    </div>
  );
}
