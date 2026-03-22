'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { EmbeddingFile, EmbeddingResult, SimilarityResult, StabilityStats } from '@/types/models';

interface EmbeddingToolContextType {
  // Files
  files: EmbeddingFile[];
  addFile: (file: File, type: 'text' | 'image' | 'video', textContent?: string) => void;
  removeFile: (id: string) => void;
  updateFileUrl: (id: string, url: string) => void;
  updateFileStatus: (id: string, status: EmbeddingFile['status']) => void;
  clearFiles: () => void;
  
  // Configuration
  dimension: number;
  setDimension: (dim: number) => void;
  repeatCount: number;
  setRepeatCount: (count: number) => void;
  
  // Results
  embeddingResults: EmbeddingResult[] | null;
  similarities: SimilarityResult[] | null;
  stabilityStats: StabilityStats[] | null;
  setResults: (embeddings: EmbeddingResult[], similarities: SimilarityResult[]) => void;
  setStabilityStats: (stats: StabilityStats[]) => void;
  clearResults: () => void;
  
  // Processing state
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  progress: { current: number; total: number } | null;
  setProgress: (progress: { current: number; total: number } | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  responseTime: number | null;
  setResponseTime: (time: number | null) => void;
}

const EmbeddingToolContext = createContext<EmbeddingToolContextType | undefined>(undefined);

export function EmbeddingToolProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<EmbeddingFile[]>([]);
  const [dimension, setDimension] = useState(1024);
  const [repeatCount, setRepeatCount] = useState(1);
  const [embeddingResults, setEmbeddingResults] = useState<EmbeddingResult[] | null>(null);
  const [similarities, setSimilarities] = useState<SimilarityResult[] | null>(null);
  const [stabilityStats, setStabilityStatsState] = useState<StabilityStats[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const addFile = useCallback((file: File, type: 'text' | 'image' | 'video', textContent?: string) => {
    if (files.length >= 4) {
      setError('Maximum 4 files allowed');
      return;
    }
    
    const newFile: EmbeddingFile = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      url: '',
      type,
      textContent,
      status: type === 'text' ? 'ready' : 'pending',
    };
    
    // Create preview for images
    if (type === 'image') {
      newFile.preview = URL.createObjectURL(file);
    }
    
    setFiles(prev => [...prev, newFile]);
    setError(null);
  }, [files.length]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const updateFileUrl = useCallback((id: string, url: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, url, status: 'ready' as const } : f
    ));
  }, []);

  const updateFileStatus = useCallback((id: string, status: EmbeddingFile['status']) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status } : f
    ));
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setFiles([]);
  }, [files]);

  const setResults = useCallback((embeddings: EmbeddingResult[], sims: SimilarityResult[]) => {
    setEmbeddingResults(embeddings);
    setSimilarities(sims);
  }, []);

  const setStabilityStats = useCallback((stats: StabilityStats[]) => {
    setStabilityStatsState(stats);
  }, []);

  const clearResults = useCallback(() => {
    setEmbeddingResults(null);
    setSimilarities(null);
    setStabilityStatsState(null);
    setResponseTime(null);
    setProgress(null);
    setError(null);
  }, []);

  return (
    <EmbeddingToolContext.Provider
      value={{
        files,
        addFile,
        removeFile,
        updateFileUrl,
        updateFileStatus,
        clearFiles,
        dimension,
        setDimension,
        repeatCount,
        setRepeatCount,
        embeddingResults,
        similarities,
        stabilityStats,
        setResults,
        setStabilityStats,
        clearResults,
        isProcessing,
        setIsProcessing,
        progress,
        setProgress,
        error,
        setError,
        responseTime,
        setResponseTime,
      }}
    >
      {children}
    </EmbeddingToolContext.Provider>
  );
}

export function useEmbeddingTool() {
  const context = useContext(EmbeddingToolContext);
  if (context === undefined) {
    throw new Error('useEmbeddingTool must be used within an EmbeddingToolProvider');
  }
  return context;
}
