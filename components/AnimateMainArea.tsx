'use client';

import { useCallback, useRef, useState } from 'react';
import { useAnimateTool } from '@/contexts/AnimateToolContext';

type AnimateFile = {
  id: string;
  file: File;
  url: string;
  preview?: string;
  type: 'image' | 'video';
  status: 'pending' | 'uploading' | 'ready' | 'error';
};

export default function AnimateMainArea() {
  const {
    selectedModel,
    imageFile,
    setImageFile,
    videoFile,
    setVideoFile,
    isGenerating,
    generateAnimation,
  } = useAnimateTool();
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, type: 'image' | 'video') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preview = URL.createObjectURL(file);
    
    const newFile: AnimateFile = {
      id,
      file,
      url: '',
      preview,
      type,
      status: 'uploading',
    };
    
    if (type === 'image') {
      setImageFile(newFile);
    } else {
      setVideoFile(newFile);
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        const updatedFile = { ...newFile, url: data.url, status: 'ready' as const };
        if (type === 'image') {
          setImageFile(updatedFile);
        } else {
          setVideoFile(updatedFile);
        }
      } else {
        const errorFile = { ...newFile, status: 'error' as const };
        if (type === 'image') {
          setImageFile(errorFile);
        } else {
          setVideoFile(errorFile);
        }
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      const errorFile = { ...newFile, status: 'error' as const };
      if (type === 'image') {
        setImageFile(errorFile);
      } else {
        setVideoFile(errorFile);
      }
      setError('Upload failed');
    }
  };

  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      setError(`Invalid image file: ${file.name}`);
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError(`Image too large: ${file.name} (max 5MB)`);
      return;
    }
    
    await uploadFile(file, 'image');
  }, []);

  const handleVideoSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    
    const file = files[0];
    
    if (!file.type.startsWith('video/')) {
      setError(`Invalid video file: ${file.name}`);
      return;
    }
    
    if (file.size > 200 * 1024 * 1024) {
      setError(`Video too large: ${file.name} (max 200MB)`);
      return;
    }
    
    await uploadFile(file, 'video');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (type === 'image') {
      handleImageSelect(files);
    } else {
      handleVideoSelect(files);
    }
  }, [handleImageSelect, handleVideoSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGenerate = async () => {
    setError(null);
    try {
      await generateAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
  };

  const canGenerate = imageFile?.status === 'ready' && videoFile?.status === 'ready' && !isGenerating;

  const isMotionTransfer = selectedModel.id === 'wan2.2-animate-move';

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Model Info Header */}
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
          isMotionTransfer 
            ? 'bg-tech-green/20 text-tech-green border border-tech-green/30' 
            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
        }`}>
          {isMotionTransfer ? '🕺 Motion Transfer' : '🎭 Face Swap'}
        </div>
        <p className="text-sm text-text-muted">
          {isMotionTransfer 
            ? 'Image character + Video motion = Animated character' 
            : 'Image face + Video = Face-swapped video'}
        </p>
      </div>

      {/* Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image Upload */}
        <div className="bg-dark-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-tech-green flex items-center gap-2">
              <span>🖼️</span>
              {isMotionTransfer ? 'Person Image' : 'Face Image'}
            </h3>
            {!imageFile && (
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-tech-green text-dark-bg rounded-lg text-sm font-medium hover:bg-tech-green-dark transition-colors disabled:opacity-50"
              >
                + Add Image
              </button>
            )}
          </div>
          
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files)}
            disabled={isGenerating}
          />
          
          {!imageFile ? (
            <div
              onDrop={(e) => handleDrop(e, 'image')}
              onDragOver={handleDragOver}
              onClick={() => !isGenerating && imageInputRef.current?.click()}
              className={`
                border-2 border-dashed border-dark-border rounded-xl p-8 text-center
                cursor-pointer hover:border-tech-green transition-colors
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="text-4xl mb-3">🧑</div>
              <p className="text-text-secondary text-sm mb-1">
                {isMotionTransfer ? 'Drop person image' : 'Drop face image'}
              </p>
              <p className="text-xs text-text-muted">
                JPG, PNG, WebP • Max 5MB • Single person, clear face
              </p>
            </div>
          ) : (
            <div className="relative bg-dark-bg rounded-xl overflow-hidden border border-dark-border">
              {imageFile.preview && (
                <img
                  src={imageFile.preview}
                  className="w-full h-48 object-cover"
                  alt="Person"
                />
              )}
              <div className="absolute top-2 right-2">
                {imageFile.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-tech-green border-t-transparent rounded-full animate-spin" />
                )}
                {imageFile.status === 'ready' && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {imageFile.status === 'error' && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                )}
              </div>
              {!isGenerating && (
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute bottom-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="p-2 text-xs text-text-muted truncate">
                {imageFile.file.name}
              </div>
            </div>
          )}
          
          <p className="text-xs text-text-muted mt-2">
            {isMotionTransfer 
              ? '↑ Character & background source' 
              : '↑ New face to swap in'}
          </p>
        </div>

        {/* Video Upload */}
        <div className="bg-dark-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-purple-400 flex items-center gap-2">
              <span>🎬</span>
              {isMotionTransfer ? 'Motion Video' : 'Target Video'}
            </h3>
            {!videoFile && (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                + Add Video
              </button>
            )}
          </div>
          
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/avi,video/mov"
            className="hidden"
            onChange={(e) => handleVideoSelect(e.target.files)}
            disabled={isGenerating}
          />
          
          {!videoFile ? (
            <div
              onDrop={(e) => handleDrop(e, 'video')}
              onDragOver={handleDragOver}
              onClick={() => !isGenerating && videoInputRef.current?.click()}
              className={`
                border-2 border-dashed border-dark-border rounded-xl p-8 text-center
                cursor-pointer hover:border-purple-400 transition-colors
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="text-4xl mb-3">🎥</div>
              <p className="text-text-secondary text-sm mb-1">
                {isMotionTransfer ? 'Drop motion reference video' : 'Drop video to face-swap'}
              </p>
              <p className="text-xs text-text-muted">
                MP4, MOV, AVI • 2-30 seconds • Max 200MB
              </p>
            </div>
          ) : (
            <div className="relative bg-dark-bg rounded-xl overflow-hidden border border-dark-border">
              {videoFile.preview && (
                <video
                  src={videoFile.preview}
                  className="w-full h-48 object-cover"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
              )}
              <div className="absolute top-2 right-2">
                {videoFile.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                )}
                {videoFile.status === 'ready' && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {videoFile.status === 'error' && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                )}
              </div>
              {!isGenerating && (
                <button
                  onClick={() => setVideoFile(null)}
                  className="absolute bottom-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="p-2 text-xs text-text-muted truncate">
                {videoFile.file.name}
              </div>
            </div>
          )}
          
          <p className="text-xs text-text-muted mt-2">
            {isMotionTransfer 
              ? '↑ Motion & audio source' 
              : '↑ Scene & motion to keep'}
          </p>
        </div>
      </div>

      {/* Visual Flow Indicator */}
      <div className="bg-dark-secondary/50 rounded-xl p-4 flex items-center justify-center gap-4">
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
            imageFile?.status === 'ready' ? 'bg-tech-green/20' : 'bg-dark-border/50'
          }`}>
            <span className="text-2xl">🧑</span>
          </div>
          <span className="text-xs text-text-muted mt-1">
            {isMotionTransfer ? 'Character' : 'Face'}
          </span>
        </div>
        <span className="text-2xl text-text-muted">+</span>
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
            videoFile?.status === 'ready' ? 'bg-purple-500/20' : 'bg-dark-border/50'
          }`}>
            <span className="text-2xl">🎬</span>
          </div>
          <span className="text-xs text-text-muted mt-1">
            {isMotionTransfer ? 'Motion' : 'Video'}
          </span>
        </div>
        <span className="text-2xl text-text-muted">=</span>
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
            canGenerate ? 'bg-gradient-to-br from-tech-green/20 to-purple-500/20' : 'bg-dark-border/50'
          }`}>
            <span className="text-2xl">✨</span>
          </div>
          <span className="text-xs text-text-muted mt-1">Result</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`
          w-full py-4 rounded-xl text-lg font-semibold transition-all
          ${canGenerate
            ? isMotionTransfer 
              ? 'bg-tech-green text-dark-bg hover:bg-tech-green-dark'
              : 'bg-purple-500 text-white hover:bg-purple-600'
            : 'bg-dark-border text-text-muted cursor-not-allowed'
          }
        `}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Generating Animation...
          </span>
        ) : (
          `Generate ${isMotionTransfer ? 'Motion Transfer' : 'Face Swap'}`
        )}
      </button>
    </div>
  );
}
