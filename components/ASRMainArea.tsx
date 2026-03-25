'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useASRTool } from '@/contexts/ASRToolContext';
import { ASRResult, AudioFile } from '@/types/models';

export default function ASRMainArea() {
  const {
    audioFile,
    setAudioFile,
    updateAudioUrl,
    updateAudioStatus,
    clearAudio,
    selectedModels,
    language,
    enableITN,
    remark,
    setRemark,
    setASRResults,
    updateASRResult,
    setJudgeResult,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    isRecording,
    setIsRecording,
    recordingTime,
    setRecordingTime,
  } = useASRTool();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Upload file to OSS
  const uploadFile = async (file: File): Promise<string> => {
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      setError('不支持的音频格式，请上传 MP3, WAV, M4A 或 OGG 格式');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小超过 10MB 限制');
      return;
    }

    const newFile: AudioFile = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      url: '',
      preview: URL.createObjectURL(file),
      status: 'pending',
      source: 'upload',
    };

    setAudioFile(newFile);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('webm') ? 'webm' : 'm4a';
        const file = new File([audioBlob], `recording-${Date.now()}.${extension}`, { type: mimeType });

        const newFile: AudioFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          url: '',
          preview: URL.createObjectURL(audioBlob),
          duration: recordingTime,
          status: 'pending',
          source: 'record',
        };

        setAudioFile(newFile);
        setRecordingTime(0);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start recording timer
      let time = 0;
      recordingIntervalRef.current = setInterval(() => {
        time += 0.1;
        if (time >= 300) {
          stopRecording();
          return;
        }
        setRecordingTime(time);
      }, 100);

    } catch (err) {
      setError('无法访问麦克风，请检查浏览器权限设置');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Toggle audio playback
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Process ASR with all selected models
  const handleProcess = async () => {
    if (!audioFile || selectedModels.length === 0) {
      setError('请添加音频文件并选择至少一个模型');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setJudgeResult(null);

    try {
      // Upload file first if not ready
      let audioUrl = audioFile.url;
      if (!audioUrl) {
        updateAudioStatus('uploading');
        audioUrl = await uploadFile(audioFile.file);
        updateAudioUrl(audioUrl);
      }

      // Initialize results for all models
      const initialResults: ASRResult[] = selectedModels.map(model => ({
        modelId: model.id,
        modelName: model.name,
        text: '',
        timestamp: Date.now(),
        responseTime: 0,
        status: 'pending',
      }));
      setASRResults(initialResults);

      // Call ASR API for all models in parallel
      const promises = selectedModels.map(async (model) => {
        const startTime = Date.now();
        updateASRResult(model.id, { status: 'processing' });

        try {
          const response = await fetch('/api/asr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioUrl,
              modelId: model.id,
              language: language === 'auto' ? undefined : language,
              enableITN,
            }),
          });

          const data = await response.json();
          const responseTime = Date.now() - startTime;

          if (data.success) {
            updateASRResult(model.id, {
              text: data.text,
              responseTime,
              status: 'success',
              language: data.language,
            });
          } else {
            throw new Error(data.error || 'ASR failed');
          }
        } catch (err) {
          updateASRResult(model.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
            responseTime: Date.now() - startTime,
          });
        }
      });

      await Promise.all(promises);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Hidden audio element */}
      {audioFile?.preview && (
        <audio
          ref={audioRef}
          src={audioFile.preview}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-1">ASR 语音识别对比</h1>
        <p className="text-text-muted text-sm">上传或录制音频，对比阿里云各ASR模型识别效果</p>
      </div>

      {/* Input Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Section */}
        <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
          <h3 className="text-sm font-medium text-tech-green mb-4 flex items-center gap-2">
            <span className="text-lg">📤</span> 上传音频
          </h3>
          <div 
            onClick={() => !isProcessing && !isRecording && fileInputRef.current?.click()}
            className={`w-full h-32 bg-dark-bg rounded-lg border-2 border-dashed border-dark-border hover:border-tech-green transition-colors flex flex-col items-center justify-center cursor-pointer ${
              (isProcessing || isRecording) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="text-4xl mb-2">🎵</span>
            <span className="text-sm text-text-muted">点击上传音频文件</span>
            <span className="text-xs text-text-muted mt-1">MP3, WAV, M4A, OGG (最大 10MB)</span>
          </div>
        </div>

        {/* Recording Section */}
        <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
          <h3 className="text-sm font-medium text-tech-green mb-4 flex items-center gap-2">
            <span className="text-lg">🎙️</span> 录制音频
          </h3>
          <div className="w-full h-32 bg-dark-bg rounded-lg border border-dark-border flex flex-col items-center justify-center">
            {isRecording ? (
              <>
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                </div>
                <span className="text-lg font-mono text-red-400 mb-2">{formatTime(recordingTime)}</span>
                <button
                  onClick={stopRecording}
                  className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  停止录音
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startRecording}
                  disabled={isProcessing || !!audioFile}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isProcessing || audioFile
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-red-500/20 border-2 border-red-500 hover:bg-red-500/30'
                  }`}
                >
                  <span className="text-2xl">🎤</span>
                </button>
                <span className="text-sm text-text-muted mt-3">
                  {audioFile ? '请先清除现有音频' : '点击开始录音（最长 5分钟）'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audio Preview */}
      {audioFile && (
        <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayback}
                disabled={isProcessing}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isProcessing ? 'bg-gray-700 cursor-not-allowed' : 'bg-tech-green/20 border border-tech-green hover:bg-tech-green/30'
                }`}
              >
                <span className="text-lg">{isPlaying ? '⏸️' : '▶️'}</span>
              </button>
              <div>
                <p className="text-sm text-white font-medium truncate max-w-xs">
                  {audioFile.file.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded ${
                    audioFile.source === 'record' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'
                  }`}>
                    {audioFile.source === 'record' ? '录音' : '上传'}
                  </span>
                  <span>{(audioFile.file.size / 1024).toFixed(1)} KB</span>
                  {audioFile.duration && <span>{formatTime(audioFile.duration)}</span>}
                  <span className={`w-2 h-2 rounded-full ${
                    audioFile.status === 'ready' ? 'bg-tech-green' :
                    audioFile.status === 'uploading' ? 'bg-yellow-500 animate-pulse' :
                    audioFile.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                </div>
              </div>
            </div>
            <button
              onClick={clearAudio}
              disabled={isProcessing}
              className="p-2 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Remark Input */}
      {audioFile && (
        <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
          <label className="block text-sm font-medium text-tech-green mb-2">
            📝 音频备注
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="简要描述音频特点，如：普通话男声、带背景噪音、方言等..."
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-dark-bg rounded-lg border border-dark-border text-white placeholder-text-muted text-sm focus:border-tech-green focus:outline-none disabled:opacity-50"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Process Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleProcess}
          disabled={!audioFile || selectedModels.length === 0 || isProcessing || isRecording}
          className={`px-8 py-3 rounded-xl text-lg font-semibold transition-all ${
            !audioFile || selectedModels.length === 0 || isProcessing || isRecording
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-tech-green text-dark-bg hover:bg-tech-green/90 shadow-lg shadow-tech-green/20'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
              识别中...
            </span>
          ) : (
            `开始识别 (${selectedModels.length} 个模型)`
          )}
        </button>
        
        <p className="text-xs text-text-muted">
          {selectedModels.length === 0 ? '请先选择模型' : `并行调用 ${selectedModels.length} 个 ASR 模型`}
        </p>
      </div>
    </div>
  );
}
