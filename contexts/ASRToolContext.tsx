'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ASRModel, ASR_MODELS, ASRResult, ASRJudgeResult, AudioFile } from '@/types/models';

interface ASRToolContextType {
  // Audio file
  audioFile: AudioFile | null;
  setAudioFile: (file: AudioFile | null) => void;
  updateAudioUrl: (url: string) => void;
  updateAudioStatus: (status: AudioFile['status']) => void;
  clearAudio: () => void;
  
  // Selected models
  selectedModels: ASRModel[];
  toggleModel: (model: ASRModel) => void;
  selectAllModels: () => void;
  clearModels: () => void;
  
  // Configuration
  language: string;
  setLanguage: (lang: string) => void;
  enableITN: boolean;
  setEnableITN: (enable: boolean) => void;
  remark: string;
  setRemark: (remark: string) => void;
  
  // Results
  asrResults: ASRResult[];
  setASRResults: (results: ASRResult[]) => void;
  updateASRResult: (modelId: string, result: Partial<ASRResult>) => void;
  
  // Judge results
  judgeResult: ASRJudgeResult | null;
  setJudgeResult: (result: ASRJudgeResult | null) => void;
  
  // Processing state
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  isJudging: boolean;
  setIsJudging: (value: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Recording state
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  recordingTime: number;
  setRecordingTime: (time: number) => void;
  
  // Clear all
  clearAll: () => void;
}

const ASRToolContext = createContext<ASRToolContextType | undefined>(undefined);

export function ASRToolProvider({ children }: { children: React.ReactNode }) {
  const [audioFile, setAudioFileState] = useState<AudioFile | null>(null);
  const [selectedModels, setSelectedModels] = useState<ASRModel[]>(ASR_MODELS.slice(0, 3)); // Default select first 3
  const [language, setLanguage] = useState('auto');
  const [enableITN, setEnableITN] = useState(true);
  const [remark, setRemark] = useState('');
  const [asrResults, setASRResultsState] = useState<ASRResult[]>([]);
  const [judgeResult, setJudgeResultState] = useState<ASRJudgeResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const setAudioFile = useCallback((file: AudioFile | null) => {
    if (audioFile?.preview) {
      URL.revokeObjectURL(audioFile.preview);
    }
    setAudioFileState(file);
    setError(null);
  }, [audioFile]);

  const updateAudioUrl = useCallback((url: string) => {
    setAudioFileState(prev => prev ? { ...prev, url, status: 'ready' } : null);
  }, []);

  const updateAudioStatus = useCallback((status: AudioFile['status']) => {
    setAudioFileState(prev => prev ? { ...prev, status } : null);
  }, []);

  const clearAudio = useCallback(() => {
    if (audioFile?.preview) {
      URL.revokeObjectURL(audioFile.preview);
    }
    setAudioFileState(null);
  }, [audioFile]);

  const toggleModel = useCallback((model: ASRModel) => {
    setSelectedModels(prev => {
      const exists = prev.find(m => m.id === model.id);
      if (exists) {
        return prev.filter(m => m.id !== model.id);
      } else {
        return [...prev, model];
      }
    });
  }, []);

  const selectAllModels = useCallback(() => {
    setSelectedModels(ASR_MODELS);
  }, []);

  const clearModels = useCallback(() => {
    setSelectedModels([]);
  }, []);

  const setASRResults = useCallback((results: ASRResult[]) => {
    setASRResultsState(results);
  }, []);

  const updateASRResult = useCallback((modelId: string, result: Partial<ASRResult>) => {
    setASRResultsState(prev => prev.map(r => 
      r.modelId === modelId ? { ...r, ...result } : r
    ));
  }, []);

  const setJudgeResult = useCallback((result: ASRJudgeResult | null) => {
    setJudgeResultState(result);
  }, []);

  const clearAll = useCallback(() => {
    clearAudio();
    setASRResultsState([]);
    setJudgeResultState(null);
    setError(null);
    setRecordingTime(0);
    setRemark('');
  }, [clearAudio]);

  return (
    <ASRToolContext.Provider
      value={{
        audioFile,
        setAudioFile,
        updateAudioUrl,
        updateAudioStatus,
        clearAudio,
        selectedModels,
        toggleModel,
        selectAllModels,
        clearModels,
        language,
        setLanguage,
        enableITN,
        setEnableITN,
        remark,
        setRemark,
        asrResults,
        setASRResults,
        updateASRResult,
        judgeResult,
        setJudgeResult,
        isProcessing,
        setIsProcessing,
        isJudging,
        setIsJudging,
        error,
        setError,
        isRecording,
        setIsRecording,
        recordingTime,
        setRecordingTime,
        clearAll,
      }}
    >
      {children}
    </ASRToolContext.Provider>
  );
}

export function useASRTool() {
  const context = useContext(ASRToolContext);
  if (context === undefined) {
    throw new Error('useASRTool must be used within an ASRToolProvider');
  }
  return context;
}
