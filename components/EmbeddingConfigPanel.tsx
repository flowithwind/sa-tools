'use client';

import React from 'react';
import { useEmbeddingTool } from '@/contexts/EmbeddingToolContext';
import { EMBEDDING_DIMENSIONS, EMBEDDING_REPEAT_OPTIONS } from '@/types/models';

export default function EmbeddingConfigPanel() {
  const {
    dimension,
    setDimension,
    repeatCount,
    setRepeatCount,
    files,
    clearFiles,
    clearResults,
    isProcessing,
  } = useEmbeddingTool();

  const handleClearAll = () => {
    clearFiles();
    clearResults();
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-tech-green mb-1">Vector Embedding</h2>
        <p className="text-xs text-text-muted">
          qwen3-vl-embedding
        </p>
      </div>

      {/* Dimension Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Vector Dimension
        </label>
        <div className="space-y-1.5">
          {EMBEDDING_DIMENSIONS.map((dim) => (
            <button
              key={dim.value}
              onClick={() => setDimension(dim.value)}
              disabled={isProcessing}
              className={`w-full px-3 py-1.5 rounded-lg text-left text-sm transition-all ${
                dimension === dim.value
                  ? 'bg-tech-green text-dark-bg font-medium'
                  : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
              } disabled:opacity-50`}
            >
              {dim.label}
            </button>
          ))}
        </div>
      </div>

      {/* Repeat Count Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Repeat Count
        </label>
        <div className="space-y-1.5">
          {EMBEDDING_REPEAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRepeatCount(opt.value)}
              disabled={isProcessing}
              className={`w-full px-3 py-1.5 rounded-lg text-left text-sm transition-all ${
                repeatCount === opt.value
                  ? 'bg-tech-green text-dark-bg font-medium'
                  : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          Multiple runs measure vector stability
        </p>
      </div>

      {/* Files Summary */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Files ({files.length}/4)
        </label>
        <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
          {files.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-2">No files added</p>
          ) : (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div key={file.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full ${
                      file.status === 'ready' ? 'bg-tech-green' :
                      file.status === 'uploading' ? 'bg-yellow-500 animate-pulse' :
                      file.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-text-muted truncate">
                      {file.type === 'text' ? 'Text' : file.file.name}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    file.type === 'text' ? 'bg-blue-900/50 text-blue-400' :
                    file.type === 'image' ? 'bg-green-900/50 text-green-400' :
                    'bg-purple-900/50 text-purple-400'
                  }`}>
                    {file.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear Button */}
      {files.length > 0 && (
        <button
          onClick={handleClearAll}
          disabled={isProcessing}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors disabled:opacity-50"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
