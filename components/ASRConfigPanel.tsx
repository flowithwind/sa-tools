'use client';

import React from 'react';
import { useASRTool } from '@/contexts/ASRToolContext';
import { ASR_MODELS, ASR_LANGUAGES } from '@/types/models';

export default function ASRConfigPanel() {
  const {
    selectedModels,
    toggleModel,
    selectAllModels,
    clearModels,
    language,
    setLanguage,
    enableITN,
    setEnableITN,
    audioFile,
    clearAll,
    isProcessing,
    isJudging,
  } = useASRTool();

  const isDisabled = isProcessing || isJudging;

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto w-72">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-tech-green mb-1">ASR 对比测试</h2>
        <p className="text-xs text-text-muted">
          阿里云语音识别模型
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-secondary">
            选择模型 ({selectedModels.length}/{ASR_MODELS.length})
          </label>
          <div className="flex gap-1">
            <button
              onClick={selectAllModels}
              disabled={isDisabled}
              className="text-[10px] text-tech-green hover:underline disabled:opacity-50"
            >
              全选
            </button>
            <span className="text-text-muted text-[10px]">|</span>
            <button
              onClick={clearModels}
              disabled={isDisabled}
              className="text-[10px] text-red-400 hover:underline disabled:opacity-50"
            >
              清空
            </button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {ASR_MODELS.map((model) => {
            const isSelected = selectedModels.some(m => m.id === model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model)}
                disabled={isDisabled}
                className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-all ${
                  isSelected
                    ? 'bg-tech-green text-dark-bg font-medium'
                    : 'bg-dark-bg border border-dark-border text-text-secondary hover:border-tech-green'
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{model.name}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                  {model.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          识别语言
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isDisabled}
          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-sm focus:border-tech-green focus:outline-none disabled:opacity-50"
        >
          {ASR_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* ITN Toggle */}
      <div>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-medium text-text-secondary">数字规范化 (ITN)</span>
            <p className="text-[10px] text-text-muted mt-0.5">
              将数字和日期转为标准格式
            </p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={enableITN}
              onChange={(e) => setEnableITN(e.target.checked)}
              disabled={isDisabled}
              className="sr-only"
            />
            <div
              className={`w-10 h-5 rounded-full transition-colors ${
                enableITN ? 'bg-tech-green' : 'bg-dark-border'
              } ${isDisabled ? 'opacity-50' : ''}`}
              onClick={() => !isDisabled && setEnableITN(!enableITN)}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform mt-0.5 ${
                  enableITN ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </div>
        </label>
      </div>

      {/* Audio Info */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          音频文件
        </label>
        <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
          {audioFile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  audioFile.status === 'ready' ? 'bg-tech-green' :
                  audioFile.status === 'uploading' ? 'bg-yellow-500 animate-pulse' :
                  audioFile.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="text-xs text-text-muted truncate">
                  {audioFile.file.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <span className={`px-1.5 py-0.5 rounded ${
                  audioFile.source === 'record' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'
                }`}>
                  {audioFile.source === 'record' ? '录音' : '上传'}
                </span>
                <span>{(audioFile.file.size / 1024).toFixed(1)} KB</span>
                {audioFile.duration && (
                  <span>{audioFile.duration.toFixed(1)}s</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-2">未添加音频</p>
          )}
        </div>
      </div>

      {/* Clear Button */}
      {(audioFile || selectedModels.length > 0) && (
        <button
          onClick={clearAll}
          disabled={isDisabled}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors disabled:opacity-50"
        >
          清空全部
        </button>
      )}

      {/* Info */}
      <div className="text-[10px] text-text-muted border-t border-dark-border pt-4">
        <p className="mb-1">支持格式：MP3, WAV, M4A, OGG</p>
        <p className="mb-1">文件限制：最大 10MB</p>
        <p>录音时长：最长 5 分钟</p>
      </div>
    </div>
  );
}
