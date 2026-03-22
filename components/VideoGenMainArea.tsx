'use client';

import { useCallback, useRef, useState } from 'react';
import { useVideoGenTool } from '@/contexts/VideoGenToolContext';
import { MediaFile } from '@/types/models';

export default function VideoGenMainArea() {
  const {
    mediaFiles,
    addMediaFile,
    removeMediaFile,
    updateMediaFile,
    currentMode,
    getVideoFiles,
    getImageFile,
    getAudioFile,
    generationPrompt,
    setGenerationPrompt,
    isGenerating,
    generateVideo,
  } = useVideoGenTool();
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const videoFiles = getVideoFiles();
  const imageFile = getImageFile();
  const audioFile = getAudioFile();

  const uploadFile = async (file: File, type: 'video' | 'image' | 'audio') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preview = type !== 'audio' ? URL.createObjectURL(file) : undefined;
    
    const newFile: MediaFile = {
      id,
      file,
      url: '',
      preview,
      type,
      status: 'uploading',
    };
    addMediaFile(newFile);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        updateMediaFile(id, {
          url: data.url,
          status: 'ready',
        });
      } else {
        updateMediaFile(id, { status: 'error' });
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      updateMediaFile(id, { status: 'error' });
      setError('Upload failed');
    }
  };

  const handleVideoSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (videoFiles.length >= 3) {
        setError('Maximum 3 reference videos allowed');
        break;
      }
      
      if (!file.type.startsWith('video/')) {
        setError(`Invalid file type: ${file.name}`);
        continue;
      }
      
      if (file.size > 100 * 1024 * 1024) {
        setError(`File too large: ${file.name} (max 100MB)`);
        continue;
      }
      
      await uploadFile(file, 'video');
    }
  }, [videoFiles.length]);

  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      setError(`Invalid image file: ${file.name}`);
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      setError(`Image too large: ${file.name} (max 20MB)`);
      return;
    }
    
    await uploadFile(file, 'image');
  }, []);

  const handleAudioSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    
    const file = files[0];
    
    if (!file.type.startsWith('audio/')) {
      setError(`Invalid audio file: ${file.name}`);
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError(`Audio too large: ${file.name} (max 50MB)`);
      return;
    }
    
    await uploadFile(file, 'audio');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'video' | 'image' | 'audio') => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (type === 'video') handleVideoSelect(files);
    else if (type === 'image') handleImageSelect(files);
    else handleAudioSelect(files);
  }, [handleVideoSelect, handleImageSelect, handleAudioSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGenerate = async () => {
    setError(null);
    try {
      await generateVideo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
  };

  const readyVideosCount = videoFiles.filter(v => v.status === 'ready').length;
  const hasReadyImage = imageFile?.status === 'ready';
  const canGenerate = (currentMode === 'r2v' ? readyVideosCount > 0 : hasReadyImage) && generationPrompt.trim() && !isGenerating;

  // Mode badge
  const ModeBadge = () => {
    if (!currentMode) return null;
    const config = currentMode === 'r2v' 
      ? { label: 'R2V Mode', icon: '📹', color: 'bg-blue-500' }
      : { label: 'I2V Mode', icon: '🖼️', color: 'bg-purple-500' };
    return (
      <div className={`${config.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Mode Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">Media Upload</h2>
          <ModeBadge />
        </div>
        <p className="text-xs text-text-muted">
          {currentMode === 'r2v' ? 'Upload videos for character-consistent generation' : 
           currentMode === 'i2v' ? 'Upload image + optional audio for I2V generation' :
           'Upload videos (R2V) or image+audio (I2V)'}
        </p>
      </div>

      {/* Reference Videos Upload (R2V) */}
      <div className="bg-dark-secondary rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-tech-green flex items-center gap-2">
            <span>📹</span>
            Reference Videos ({videoFiles.length}/3)
            {currentMode === 'r2v' && <span className="text-xs bg-tech-green/20 px-2 py-0.5 rounded">Active</span>}
          </h3>
          {videoFiles.length < 3 && !imageFile && (
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-tech-green text-dark-bg rounded-lg text-sm font-medium hover:bg-tech-green-dark transition-colors disabled:opacity-50"
            >
              + Add Video
            </button>
          )}
        </div>
        
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/mov"
          multiple
          className="hidden"
          onChange={(e) => handleVideoSelect(e.target.files)}
          disabled={isGenerating}
        />
        
        {videoFiles.length === 0 ? (
          <div
            onDrop={(e) => handleDrop(e, 'video')}
            onDragOver={handleDragOver}
            onClick={() => !isGenerating && !imageFile && videoInputRef.current?.click()}
            className={`
              border-2 border-dashed border-dark-border rounded-xl p-6 text-center
              ${!imageFile ? 'cursor-pointer hover:border-tech-green' : 'opacity-50 cursor-not-allowed'}
              transition-colors
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="text-3xl mb-2">🎥</div>
            <p className="text-text-secondary text-sm mb-1">
              {imageFile ? 'Cannot mix videos with image' : 'Drag & drop videos or click to browse'}
            </p>
            <p className="text-xs text-text-muted">
              MP4, MOV • 2-30 seconds • Max 100MB each • Up to 3 videos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videoFiles.map((video, index) => (
              <div key={video.id} className="relative bg-dark-bg rounded-xl overflow-hidden border border-dark-border">
                {video.preview && (
                  <video
                    src={video.preview}
                    className="w-full h-28 object-cover"
                    muted
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-tech-green text-dark-bg text-xs font-bold rounded">
                  character{index + 1}
                </div>
                <div className="absolute top-2 right-2">
                  {video.status === 'uploading' && <div className="w-4 h-4 border-2 border-tech-green border-t-transparent rounded-full animate-spin" />}
                  {video.status === 'ready' && <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                  {video.status === 'error' && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">!</span></div>}
                </div>
                {!isGenerating && (
                  <button onClick={() => removeMediaFile(video.id)} className="absolute bottom-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <div className="p-2 text-xs text-text-muted truncate">{video.file.name}</div>
              </div>
            ))}
            {videoFiles.length < 3 && !isGenerating && (
              <div onClick={() => videoInputRef.current?.click()} className="h-28 border-2 border-dashed border-dark-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-tech-green transition-colors">
                <span className="text-xl mb-1">+</span>
                <span className="text-xs text-text-muted">Add video</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image + Audio Upload (I2V) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image Upload */}
        <div className="bg-dark-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-purple-400 flex items-center gap-2">
              <span>🖼️</span>
              Image
              {currentMode === 'i2v' && <span className="text-xs bg-purple-400/20 px-2 py-0.5 rounded">Active</span>}
            </h3>
            {!imageFile && !videoFiles.length && (
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                + Add Image
              </button>
            )}
          </div>
          
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files)} disabled={isGenerating} />
          
          {!imageFile ? (
            <div
              onDrop={(e) => handleDrop(e, 'image')}
              onDragOver={handleDragOver}
              onClick={() => !isGenerating && !videoFiles.length && imageInputRef.current?.click()}
              className={`
                border-2 border-dashed border-dark-border rounded-xl p-6 text-center
                ${!videoFiles.length ? 'cursor-pointer hover:border-purple-400' : 'opacity-50 cursor-not-allowed'}
                transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="text-3xl mb-2">🖼️</div>
              <p className="text-text-secondary text-sm mb-1">
                {videoFiles.length ? 'Cannot mix image with videos' : 'Drop image or click to browse'}
              </p>
              <p className="text-xs text-text-muted">JPG, PNG, WebP • Max 20MB</p>
            </div>
          ) : (
            <div className="relative bg-dark-bg rounded-xl overflow-hidden border border-dark-border">
              {imageFile.preview && <img src={imageFile.preview} className="w-full h-32 object-cover" alt="Preview" />}
              <div className="absolute top-2 right-2">
                {imageFile.status === 'uploading' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                {imageFile.status === 'ready' && <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                {imageFile.status === 'error' && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">!</span></div>}
              </div>
              {!isGenerating && (
                <button onClick={() => removeMediaFile(imageFile.id)} className="absolute bottom-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              <div className="p-2 text-xs text-text-muted truncate">{imageFile.file.name}</div>
            </div>
          )}
        </div>

        {/* Audio Upload (optional for I2V) */}
        <div className="bg-dark-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-orange-400 flex items-center gap-2">
              <span>🎵</span>
              Audio (Optional)
            </h3>
            {!audioFile && imageFile && (
              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                + Add Audio
              </button>
            )}
          </div>
          
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioSelect(e.target.files)} disabled={isGenerating} />
          
          {!audioFile ? (
            <div
              onDrop={(e) => handleDrop(e, 'audio')}
              onDragOver={handleDragOver}
              onClick={() => !isGenerating && imageFile && audioInputRef.current?.click()}
              className={`
                border-2 border-dashed border-dark-border rounded-xl p-6 text-center
                ${imageFile ? 'cursor-pointer hover:border-orange-400' : 'opacity-50 cursor-not-allowed'}
                transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="text-3xl mb-2">🎵</div>
              <p className="text-text-secondary text-sm mb-1">
                {!imageFile ? 'Add image first to enable audio' : 'Drop audio or click to browse'}
              </p>
              <p className="text-xs text-text-muted">MP3, WAV, M4A • Max 50MB</p>
            </div>
          ) : (
            <div className="relative bg-dark-bg rounded-xl overflow-hidden border border-dark-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{audioFile.file.name}</p>
                  <p className="text-xs text-text-muted">{(audioFile.file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <div>
                  {audioFile.status === 'uploading' && <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />}
                  {audioFile.status === 'ready' && <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                  {audioFile.status === 'error' && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">!</span></div>}
                </div>
              </div>
              {!isGenerating && (
                <button onClick={() => removeMediaFile(audioFile.id)} className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="bg-dark-secondary rounded-xl p-4">
        <h3 className="text-base font-semibold text-tech-green mb-3 flex items-center gap-2">
          <span>✍️</span>
          Prompt
        </h3>
        
        <textarea
          value={generationPrompt}
          onChange={(e) => setGenerationPrompt(e.target.value)}
          disabled={isGenerating}
          placeholder={currentMode === 'r2v' 
            ? `Describe the video scene...

Example: character1一边喝奶茶，一边随着音乐即兴跳舞。

Tips: Use character1, character2, etc. to reference the uploaded videos.`
            : `Describe the video scene...

Example: A person talking and gesturing naturally.

Tips: Audio will drive lip-sync and motion if provided.`
          }
          rows={4}
          maxLength={1500}
          className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-tech-green disabled:opacity-50 resize-none"
        />
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-text-muted">{generationPrompt.length}/1500 characters</span>
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
            ? currentMode === 'r2v' ? 'bg-tech-green text-dark-bg hover:bg-tech-green-dark' : 'bg-purple-500 text-white hover:bg-purple-600'
            : 'bg-dark-border text-text-muted cursor-not-allowed'
          }
        `}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Generating Video...
          </span>
        ) : currentMode === 'r2v' ? (
          `Generate R2V Video (${readyVideosCount} reference${readyVideosCount !== 1 ? 's' : ''})`
        ) : currentMode === 'i2v' ? (
          `Generate I2V Video${audioFile?.status === 'ready' ? ' with Audio' : ''}`
        ) : (
          'Upload media to start'
        )}
      </button>
    </div>
  );
}
