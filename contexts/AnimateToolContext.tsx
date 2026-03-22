'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { 
  AnimateModel, 
  ANIMATE_MODELS, 
  AnimateResult
} from '@/types/models';

type AnimateFile = {
  id: string;
  file: File;
  url: string;
  preview?: string;
  type: 'image' | 'video';
  status: 'pending' | 'uploading' | 'ready' | 'error';
};

type AnimateToolContextType = {
  // Model selection
  selectedModel: AnimateModel;
  setSelectedModel: (model: AnimateModel) => void;
  
  // Mode (wan-std or wan-pro)
  mode: 'wan-std' | 'wan-pro';
  setMode: (mode: 'wan-std' | 'wan-pro') => void;
  
  // Check image option
  checkImage: boolean;
  setCheckImage: (check: boolean) => void;
  
  // Image file (person)
  imageFile: AnimateFile | null;
  setImageFile: (file: AnimateFile | null) => void;
  
  // Video file (reference motion/video)
  videoFile: AnimateFile | null;
  setVideoFile: (file: AnimateFile | null) => void;
  
  // Results
  generationResult: AnimateResult | null;
  setGenerationResult: (result: AnimateResult | null) => void;
  
  // Loading state
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;
  
  // Polling
  pollTaskStatus: (taskId: string) => void;
  stopPolling: () => void;
  
  // Generate
  generateAnimation: () => Promise<void>;
  
  // Reset
  resetAll: () => void;
};

const AnimateToolContext = createContext<AnimateToolContextType | undefined>(undefined);

export function AnimateToolProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<AnimateModel>(ANIMATE_MODELS[0]);
  const [mode, setMode] = useState<'wan-std' | 'wan-pro'>('wan-std');
  const [checkImage, setCheckImage] = useState(true);
  const [imageFile, setImageFile] = useState<AnimateFile | null>(null);
  const [videoFile, setVideoFile] = useState<AnimateFile | null>(null);
  const [generationResult, setGenerationResult] = useState<AnimateResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollTaskStatus = useCallback((taskId: string) => {
    stopPolling();
    
    const startTime = Date.now();
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/animate?taskId=${taskId}`);
        const data = await response.json();
        
        if (data.success) {
          const responseTime = Date.now() - startTime;
          
          if (data.status === 'SUCCEEDED') {
            stopPolling();
            setGenerationResult({
              taskId,
              videoUrl: data.videoUrl,
              timestamp: Date.now(),
              responseTime,
              status: 'success',
              videoDuration: data.videoDuration,
            });
            setIsGenerating(false);
          } else if (data.status === 'FAILED') {
            stopPolling();
            setGenerationResult({
              taskId,
              timestamp: Date.now(),
              responseTime,
              status: 'error',
              error: data.message || 'Animation generation failed',
            });
            setIsGenerating(false);
          } else {
            // Still processing (PENDING or RUNNING)
            setGenerationResult(prev => ({
              taskId,
              timestamp: prev?.timestamp || Date.now(),
              responseTime,
              status: data.status === 'RUNNING' ? 'running' : 'pending',
            }));
          }
        } else {
          stopPolling();
          setGenerationResult({
            taskId,
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            status: 'error',
            error: data.error || 'Failed to check status',
          });
          setIsGenerating(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    poll();
    pollingRef.current = setInterval(poll, 15000);
  }, [stopPolling]);

  const generateAnimation = useCallback(async () => {
    if (!imageFile || imageFile.status !== 'ready') {
      throw new Error('Please upload a person image');
    }
    
    if (!videoFile || videoFile.status !== 'ready') {
      throw new Error('Please upload a reference video');
    }
    
    setIsGenerating(true);
    setGenerationResult(null);
    
    try {
      const requestBody = {
        model: selectedModel.id,
        imageUrl: imageFile.url,
        videoUrl: videoFile.url,
        mode,
        checkImage,
      };
      
      const response = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (data.success && data.taskId) {
        setGenerationResult({
          taskId: data.taskId,
          timestamp: Date.now(),
          responseTime: data.responseTime || 0,
          status: 'pending',
        });
        
        pollTaskStatus(data.taskId);
      } else {
        throw new Error(data.error || 'Failed to create animation task');
      }
    } catch (error) {
      setIsGenerating(false);
      throw error;
    }
  }, [
    selectedModel,
    imageFile,
    videoFile,
    mode,
    checkImage,
    pollTaskStatus
  ]);

  const resetAll = useCallback(() => {
    stopPolling();
    setImageFile(null);
    setVideoFile(null);
    setGenerationResult(null);
    setIsGenerating(false);
  }, [stopPolling]);

  return (
    <AnimateToolContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        mode,
        setMode,
        checkImage,
        setCheckImage,
        imageFile,
        setImageFile,
        videoFile,
        setVideoFile,
        generationResult,
        setGenerationResult,
        isGenerating,
        setIsGenerating,
        pollTaskStatus,
        stopPolling,
        generateAnimation,
        resetAll,
      }}
    >
      {children}
    </AnimateToolContext.Provider>
  );
}

export function useAnimateTool() {
  const context = useContext(AnimateToolContext);
  if (context === undefined) {
    throw new Error('useAnimateTool must be used within an AnimateToolProvider');
  }
  return context;
}
