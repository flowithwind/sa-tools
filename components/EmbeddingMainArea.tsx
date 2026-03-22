'use client';

import React, { useState, useRef } from 'react';
import { useEmbeddingTool } from '@/contexts/EmbeddingToolContext';
import { StabilityStats } from '@/types/models';

// Helper functions for similarity calculations
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function calculateStdDev(values: number[], avg: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

export default function EmbeddingMainArea() {
  const {
    files,
    addFile,
    removeFile,
    updateFileUrl,
    updateFileStatus,
    dimension,
    repeatCount,
    setResults,
    setStabilityStats,
    clearResults,
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    error,
    setError,
    setResponseTime,
  } = useEmbeddingTool();

  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addingType, setAddingType] = useState<'text' | 'image' | 'video' | null>(null);

  // Upload file to OSS
  const uploadFile = async (file: File, fileId: string): Promise<string> => {
    updateFileStatus(fileId, 'uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];
    const fileType = addingType || (file.type.startsWith('image/') ? 'image' : 'video');
    
    addFile(file, fileType as 'image' | 'video');
    
    // Reset
    setAddingType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle text submission
  const handleAddText = () => {
    if (!textInput.trim()) return;
    
    const dummyFile = new File([textInput], 'text-input.txt', { type: 'text/plain' });
    addFile(dummyFile, 'text', textInput.trim());
    setTextInput('');
  };

  // Trigger file picker
  const triggerFilePicker = (type: 'image' | 'video') => {
    setAddingType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' 
        ? 'image/jpeg,image/png,image/webp,image/bmp'
        : 'video/mp4,video/avi,video/mov';
      fileInputRef.current.click();
    }
  };

  // Process all files and generate embeddings
  const handleGenerate = async () => {
    if (files.length === 0) {
      setError('Please add at least one file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    clearResults();

    try {
      // Upload files that need URLs first
      const contents = await Promise.all(
        files.map(async (file) => {
          if (file.type === 'text') {
            return {
              type: 'text',
              content: file.textContent,
              fileName: 'Text Input',
            };
          } else {
            let url = file.url;
            if (!url) {
              url = await uploadFile(file.file, file.id);
              updateFileUrl(file.id, url);
            }
            return {
              type: file.type,
              url,
              fileName: file.file.name,
            };
          }
        })
      );

      const startTime = Date.now();
      
      // Collect all embeddings from multiple runs
      const allRunEmbeddings: number[][][] = []; // [runIndex][itemIndex][embeddingValues]
      
      for (let run = 0; run < repeatCount; run++) {
        setProgress({ current: run + 1, total: repeatCount });
        
        const response = await fetch('/api/embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, dimension }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Embedding generation failed');
        }

        // Store embeddings from this run
        const runEmbeddings = data.embeddings.map((emb: any) => emb.embedding);
        allRunEmbeddings.push(runEmbeddings);

        // For single run, set results immediately
        if (repeatCount === 1) {
          setResults(data.embeddings, data.similarities);
        }
      }

      const totalTime = Date.now() - startTime;
      setResponseTime(totalTime);

      // Calculate stability statistics for multiple runs
      if (repeatCount > 1) {
        const stabilityStats: StabilityStats[] = [];
        
        for (let itemIdx = 0; itemIdx < files.length; itemIdx++) {
          const itemEmbeddings = allRunEmbeddings.map(run => run[itemIdx]);
          
          // Calculate pairwise similarities within this item's embeddings
          const cosineValues: number[] = [];
          const euclideanValues: number[] = [];
          
          for (let i = 0; i < itemEmbeddings.length; i++) {
            for (let j = i + 1; j < itemEmbeddings.length; j++) {
              cosineValues.push(cosineSimilarity(itemEmbeddings[i], itemEmbeddings[j]));
              euclideanValues.push(euclideanDistance(itemEmbeddings[i], itemEmbeddings[j]));
            }
          }
          
          const cosineAvg = cosineValues.reduce((a, b) => a + b, 0) / cosineValues.length;
          const euclideanAvg = euclideanValues.reduce((a, b) => a + b, 0) / euclideanValues.length;
          
          stabilityStats.push({
            itemIndex: itemIdx,
            itemName: contents[itemIdx].fileName || `Item ${itemIdx + 1}`,
            itemType: contents[itemIdx].type,
            repeatCount,
            cosine: {
              avg: cosineAvg,
              min: Math.min(...cosineValues),
              max: Math.max(...cosineValues),
              stdDev: calculateStdDev(cosineValues, cosineAvg),
            },
            euclidean: {
              avg: euclideanAvg,
              min: Math.min(...euclideanValues),
              max: Math.max(...euclideanValues),
              stdDev: calculateStdDev(euclideanValues, euclideanAvg),
            },
            allEmbeddings: itemEmbeddings,
          });
        }
        
        setStabilityStats(stabilityStats);
        
        // Use last run's results for the similarity matrix
        const lastResponse = await fetch('/api/embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, dimension }),
        });
        const lastData = await lastResponse.json();
        if (lastData.success) {
          setResults(lastData.embeddings, lastData.similarities);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-1">Multimodal Vector Embedding</h1>
        <p className="text-text-muted text-sm">Add text, images, or videos to generate vectors and compare similarities</p>
      </div>

      {/* Input Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Text Input */}
        <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
          <h3 className="text-sm font-medium text-tech-green mb-3 flex items-center gap-2">
            <span className="text-lg">📝</span> Text
          </h3>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text to vectorize..."
            disabled={isProcessing || files.length >= 4}
            className="w-full h-20 bg-dark-bg rounded-lg p-3 text-sm text-white placeholder-text-muted border border-dark-border focus:border-tech-green focus:outline-none resize-none disabled:opacity-50"
          />
          <button
            onClick={handleAddText}
            disabled={!textInput.trim() || isProcessing || files.length >= 4}
            className="mt-2 w-full py-2 rounded-lg text-sm font-medium bg-blue-900/30 text-blue-400 border border-blue-900/50 hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Text
          </button>
        </div>

        {/* Image Input */}
        <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
          <h3 className="text-sm font-medium text-tech-green mb-3 flex items-center gap-2">
            <span className="text-lg">🖼️</span> Image
          </h3>
          <div 
            onClick={() => !isProcessing && files.length < 4 && triggerFilePicker('image')}
            className={`w-full h-20 bg-dark-bg rounded-lg border-2 border-dashed border-dark-border hover:border-tech-green transition-colors flex flex-col items-center justify-center cursor-pointer ${
              (isProcessing || files.length >= 4) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="text-2xl mb-1">📤</span>
            <span className="text-xs text-text-muted">Click to upload image</span>
          </div>
        </div>

        {/* Video Input */}
        <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
          <h3 className="text-sm font-medium text-tech-green mb-3 flex items-center gap-2">
            <span className="text-lg">🎬</span> Video
          </h3>
          <div 
            onClick={() => !isProcessing && files.length < 4 && triggerFilePicker('video')}
            className={`w-full h-20 bg-dark-bg rounded-lg border-2 border-dashed border-dark-border hover:border-tech-green transition-colors flex flex-col items-center justify-center cursor-pointer ${
              (isProcessing || files.length >= 4) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="text-2xl mb-1">📤</span>
            <span className="text-xs text-text-muted">Click to upload video</span>
          </div>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-secondary">
              Added Items ({files.length}/4)
            </h3>
            <span className="text-xs text-text-muted">
              {repeatCount}x runs = {repeatCount * files.length} API calls
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map((file, idx) => (
              <div
                key={file.id}
                className="relative bg-dark-bg rounded-lg p-2 border border-dark-border group"
              >
                {/* Preview */}
                <div className="aspect-square rounded-lg bg-dark-card overflow-hidden mb-2 flex items-center justify-center">
                  {file.type === 'text' ? (
                    <div className="p-2 text-[10px] text-text-muted line-clamp-4 overflow-hidden">
                      {file.textContent}
                    </div>
                  ) : file.type === 'image' && file.preview ? (
                    <img src={file.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🎬</span>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    file.type === 'text' ? 'bg-blue-900/50 text-blue-400' :
                    file.type === 'image' ? 'bg-green-900/50 text-green-400' :
                    'bg-purple-900/50 text-purple-400'
                  }`}>
                    {file.type.toUpperCase()}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    file.status === 'ready' ? 'bg-tech-green' :
                    file.status === 'uploading' ? 'bg-yellow-500 animate-pulse' :
                    file.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                </div>
                
                {/* Remove button */}
                <button
                  onClick={() => removeFile(file.id)}
                  disabled={isProcessing}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={files.length === 0 || isProcessing}
          className={`px-8 py-3 rounded-xl text-lg font-semibold transition-all ${
            files.length === 0 || isProcessing
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-tech-green text-dark-bg hover:bg-tech-green/90 shadow-lg shadow-tech-green/20'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
              {progress ? `Run ${progress.current}/${progress.total}` : 'Processing...'}
            </span>
          ) : (
            `Generate ${repeatCount > 1 ? `(${repeatCount}x)` : 'Embeddings'}`
          )}
        </button>
        
        {/* Progress bar for multiple runs */}
        {isProcessing && progress && repeatCount > 1 && (
          <div className="w-64 h-2 bg-dark-bg rounded-full overflow-hidden">
            <div 
              className="h-full bg-tech-green transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}
        
        <p className="text-xs text-text-muted">
          {dimension}D vectors | {repeatCount > 1 ? `${repeatCount}x stability test` : 'Single run'}
        </p>
      </div>
    </div>
  );
}
