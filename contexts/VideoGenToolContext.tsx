'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { 
  VideoGenModel, 
  VIDEO_GEN_MODELS, 
  VideoGenResult, 
  MediaFile,
  VideoGenMode
} from '@/types/models';

type VideoGenToolContextType = {
  // Media Files (videos for r2v, image+audio for i2v)
  mediaFiles: MediaFile[];
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  updateMediaFile: (id: string, updates: Partial<MediaFile>) => void;
  clearMediaFiles: () => void;
  
  // Model selection
  selectedModel: VideoGenModel;
  setSelectedModel: (model: VideoGenModel) => void;
  
  // Current mode (determined by uploaded files)
  currentMode: VideoGenMode | null;
  
  // Prompt
  generationPrompt: string;
  setGenerationPrompt: (prompt: string) => void;
  
  // Negative Prompt
  negativePrompt: string;
  setNegativePrompt: (prompt: string) => void;
  
  // Output Settings (size for r2v, resolution for i2v)
  outputSize: string;
  setOutputSize: (size: string) => void;
  
  // Resolution for i2v mode
  resolution: string;
  setResolution: (resolution: string) => void;
  
  duration: number;
  setDuration: (duration: number) => void;
  
  shotType: 'single' | 'multi';
  setShotType: (type: 'single' | 'multi') => void;
  
  watermark: boolean;
  setWatermark: (enabled: boolean) => void;
  
  // Results
  generationResult: VideoGenResult | null;
  setGenerationResult: (result: VideoGenResult | null) => void;
  
  // Loading state
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;
  
  // Polling
  pollTaskStatus: (taskId: string) => void;
  stopPolling: () => void;
  
  // Generate video
  generateVideo: () => Promise<void>;
  
  // Helper getters
  getVideoFiles: () => MediaFile[];
  getImageFile: () => MediaFile | undefined;
  getAudioFile: () => MediaFile | undefined;
};

const VideoGenToolContext = createContext<VideoGenToolContextType | undefined>(undefined);

export function VideoGenToolProvider({ children }: { children: ReactNode }) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  // Model selection - default to I2V Flash for I2V mode
  const [selectedModel, setSelectedModel] = useState<VideoGenModel>(
    VIDEO_GEN_MODELS.find(m => m.id === 'wan2.6-i2v-flash') || VIDEO_GEN_MODELS[0]
  );
  
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [outputSize, setOutputSize] = useState('1920*1080'); // For r2v
  const [resolution, setResolution] = useState('1080P'); // For i2v
  const [duration, setDuration] = useState(5);
  const [shotType, setShotType] = useState<'single' | 'multi'>('single');
  const [watermark, setWatermark] = useState(false);
  const [generationResult, setGenerationResult] = useState<VideoGenResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Compute current mode based on uploaded files
  const currentMode = useMemo((): VideoGenMode | null => {
    const hasVideo = mediaFiles.some(f => f.type === 'video' && f.status === 'ready');
    const hasImage = mediaFiles.some(f => f.type === 'image' && f.status === 'ready');
    
    if (hasVideo && !hasImage) return 'r2v';
    if (hasImage) return 'i2v';
    return null;
  }, [mediaFiles]);

  // Helper getters
  const getVideoFiles = useCallback(() => {
    return mediaFiles.filter(f => f.type === 'video');
  }, [mediaFiles]);

  const getImageFile = useCallback(() => {
    return mediaFiles.find(f => f.type === 'image');
  }, [mediaFiles]);

  const getAudioFile = useCallback(() => {
    return mediaFiles.find(f => f.type === 'audio');
  }, [mediaFiles]);

  const addMediaFile = useCallback((file: MediaFile) => {
    setMediaFiles(prev => {
      // For videos (r2v mode), limit to 3
      if (file.type === 'video') {
        const videoCount = prev.filter(f => f.type === 'video').length;
        if (videoCount >= 3) {
          console.warn('Maximum 3 reference videos allowed');
          return prev;
        }
      }
      // For image, only allow 1
      if (file.type === 'image') {
        const hasImage = prev.some(f => f.type === 'image');
        if (hasImage) {
          // Replace existing image
          return [...prev.filter(f => f.type !== 'image'), file];
        }
      }
      // For audio, only allow 1
      if (file.type === 'audio') {
        const hasAudio = prev.some(f => f.type === 'audio');
        if (hasAudio) {
          // Replace existing audio
          return [...prev.filter(f => f.type !== 'audio'), file];
        }
      }
      return [...prev, file];
    });
  }, []);

  const removeMediaFile = useCallback((id: string) => {
    setMediaFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateMediaFile = useCallback((id: string, updates: Partial<MediaFile>) => {
    setMediaFiles(prev => 
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  }, []);

  const clearMediaFiles = useCallback(() => {
    setMediaFiles([]);
  }, []);

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
        const response = await fetch(`/api/videogen?taskId=${taskId}`);
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
            });
            setIsGenerating(false);
          } else if (data.status === 'FAILED') {
            stopPolling();
            setGenerationResult({
              taskId,
              timestamp: Date.now(),
              responseTime,
              status: 'error',
              error: data.message || 'Video generation failed',
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

  const generateVideo = useCallback(async () => {
    if (!currentMode) {
      throw new Error('Please upload video files (for R2V) or an image (for I2V)');
    }
    
    if (!generationPrompt.trim()) {
      throw new Error('Prompt is required');
    }
    
    setIsGenerating(true);
    setGenerationResult(null);
    
    try {
      let requestBody: any = {
        prompt: generationPrompt,
        duration,
        shotType,
        negativePrompt: negativePrompt || undefined,
        watermark,
      };
      
      if (currentMode === 'r2v') {
        // Reference-to-video mode
        const readyVideos = mediaFiles.filter(f => f.type === 'video' && f.status === 'ready');
        if (readyVideos.length === 0) {
          throw new Error('At least one uploaded reference video is required');
        }
        requestBody.mode = 'r2v';
        requestBody.model = 'wan2.6-r2v';
        requestBody.referenceVideoUrls = readyVideos.map(v => v.url);
        requestBody.size = outputSize;
      } else {
        // Image-to-video mode
        const imageFile = mediaFiles.find(f => f.type === 'image' && f.status === 'ready');
        if (!imageFile) {
          throw new Error('An uploaded image is required for I2V mode');
        }
        const audioFile = mediaFiles.find(f => f.type === 'audio' && f.status === 'ready');
        
        requestBody.mode = 'i2v';
        requestBody.model = selectedModel.id;
        requestBody.imageUrl = imageFile.url;
        requestBody.audioUrl = audioFile?.url;
        requestBody.resolution = resolution;
      }
      
      const response = await fetch('/api/videogen', {
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
        throw new Error(data.error || 'Failed to create video generation task');
      }
    } catch (error) {
      setIsGenerating(false);
      throw error;
    }
  }, [
    currentMode,
    mediaFiles, 
    generationPrompt, 
    negativePrompt, 
    outputSize,
    resolution,
    duration, 
    shotType, 
    watermark,
    selectedModel,
    pollTaskStatus
  ]);

  return (
    <VideoGenToolContext.Provider
      value={{
        mediaFiles,
        addMediaFile,
        removeMediaFile,
        updateMediaFile,
        clearMediaFiles,
        selectedModel,
        setSelectedModel,
        currentMode,
        generationPrompt,
        setGenerationPrompt,
        negativePrompt,
        setNegativePrompt,
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
        generationResult,
        setGenerationResult,
        isGenerating,
        setIsGenerating,
        pollTaskStatus,
        stopPolling,
        generateVideo,
        getVideoFiles,
        getImageFile,
        getAudioFile,
      }}
    >
      {children}
    </VideoGenToolContext.Provider>
  );
}

export function useVideoGenTool() {
  const context = useContext(VideoGenToolContext);
  if (context === undefined) {
    throw new Error('useVideoGenTool must be used within a VideoGenToolProvider');
  }
  return context;
}
