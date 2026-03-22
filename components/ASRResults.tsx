'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useASRTool } from '@/contexts/ASRToolContext';
import { useInferenceHistory } from '@/contexts/InferenceHistoryContext';

export default function ASRResults() {
  const {
    asrResults,
    judgeResult,
    setJudgeResult,
    audioFile,
    remark,
    isProcessing,
    isJudging,
    setIsJudging,
    setError,
  } = useASRTool();

  const { addRecord } = useInferenceHistory();
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  const successResults = asrResults.filter(r => r.status === 'success');
  const hasResults = asrResults.length > 0;
  const canJudge = successResults.length >= 2 && audioFile?.url;

  // Save record when ASR results complete or judge completes
  useEffect(() => {
    // Only save if we have successful results and audio URL
    if (successResults.length === 0 || !audioFile?.url) return;
    
    // Create a unique key for this set of results
    const resultsKey = `${audioFile.url}-${successResults.map(r => r.modelId).join(',')}-${judgeResult?.status || 'no-judge'}-${remark || ''}`;
    
    // Don't save if we already saved this exact state
    if (lastSavedRef.current === resultsKey) return;
    
    // Only save when:
    // 1. All ASR processing is done (no pending/processing)
    // 2. Either no judging happening, or judge is complete/error
    const allAsrDone = asrResults.every(r => r.status === 'success' || r.status === 'error');
    const judgeComplete = !judgeResult || judgeResult.status === 'success' || judgeResult.status === 'error';
    
    if (allAsrDone && judgeComplete && !isProcessing && !isJudging) {
      // Save the record
      addRecord({
        toolType: 'asr',
        inputs: {
          files: {
            type: 'text',
            value: audioFile.url,
          },
          remark: remark ? {
            type: 'text',
            value: remark,
          } : undefined,
        },
        outputs: successResults.map(r => ({
          modelId: r.modelId,
          modelName: r.modelName,
          content: {
            type: 'text',
            value: r.text,
          },
          responseTime: r.responseTime,
          status: r.status === 'success' ? 'success' : 'error',
          error: r.error,
        })),
        asrJudge: judgeResult?.status === 'success' ? {
          rankings: judgeResult.rankings,
          reasoning: judgeResult.reasoning,
        } : undefined,
      });
      
      lastSavedRef.current = resultsKey;
    }
  }, [asrResults, judgeResult, audioFile, remark, isProcessing, isJudging, successResults, addRecord]);

  // Call Judge API
  const handleJudge = async () => {
    if (!canJudge) return;

    setIsJudging(true);
    setJudgeResult({
      rankings: [],
      reasoning: '',
      timestamp: Date.now(),
      status: 'processing',
    });

    try {
      const response = await fetch('/api/asr-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioFile!.url,
          results: successResults.map(r => ({
            modelId: r.modelId,
            modelName: r.modelName,
            text: r.text,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJudgeResult({
          rankings: data.rankings,
          reasoning: data.reasoning,
          timestamp: Date.now(),
          status: 'success',
        });
      } else {
        throw new Error(data.error || 'Judge failed');
      }
    } catch (err) {
      setJudgeResult({
        rankings: [],
        reasoning: '',
        timestamp: Date.now(),
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err instanceof Error ? err.message : 'Judge failed');
    } finally {
      setIsJudging(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-400';
      case 'processing': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500 text-black';
      case 2: return 'bg-gray-400 text-black';
      case 3: return 'bg-amber-700 text-white';
      default: return 'bg-dark-bg text-white';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (!hasResults) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-8">
        <div className="text-center">
          <span className="text-4xl mb-3 block">🎧</span>
          <p className="text-text-muted text-sm">识别结果将在这里显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Grid */}
      <div className="bg-dark-card rounded-xl border border-dark-border">
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">识别结果</h3>
              <p className="text-sm text-text-muted mt-1">
                {successResults.length}/{asrResults.length} 个模型完成
              </p>
            </div>
            {successResults.length > 0 && (
              <div className="text-right">
                <span className="text-sm text-text-muted">平均耗时</span>
                <span className="text-lg font-bold text-tech-green ml-2">
                  {Math.round(successResults.reduce((sum, r) => sum + r.responseTime, 0) / successResults.length)}
                </span>
                <span className="text-sm text-text-muted ml-1">ms</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {asrResults.map((result) => {
            const isExpanded = expandedResult === result.modelId;
            
            return (
              <div
                key={result.modelId}
                className={`bg-dark-bg rounded-lg border transition-all ${
                  result.status === 'success' ? 'border-dark-border' :
                  result.status === 'error' ? 'border-red-900/50' :
                  result.status === 'processing' ? 'border-yellow-900/50' : 'border-dark-border'
                }`}
              >
                {/* Header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${result.status === 'processing' ? 'animate-spin' : ''}`}>
                      {getStatusIcon(result.status)}
                    </span>
                    <div>
                      <span className="text-white font-medium">{result.modelName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${getStatusColor(result.status)}`}>
                          {result.status === 'pending' ? '等待中' :
                           result.status === 'processing' ? '识别中...' :
                           result.status === 'success' ? '完成' : '失败'}
                        </span>
                        {result.responseTime > 0 && (
                          <span className="text-xs text-text-muted">
                            {result.responseTime}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {result.status === 'success' && (
                    <button
                      onClick={() => setExpandedResult(isExpanded ? null : result.modelId)}
                      className="text-xs text-tech-green hover:underline"
                    >
                      {isExpanded ? '收起' : '展开'}
                    </button>
                  )}
                </div>

                {/* Text Content */}
                {result.status === 'success' && (
                  <div className={`px-3 pb-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {result.text || '(空)'}
                    </p>
                  </div>
                )}

                {/* Error Content */}
                {result.status === 'error' && (
                  <div className="px-3 pb-3">
                    <p className="text-sm text-red-400">
                      {result.error || 'Unknown error'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Judge Section */}
      <div className="bg-dark-card rounded-xl border border-dark-border">
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🧑‍⚖️</span> AI 裁判
              </h3>
              <p className="text-xs text-text-muted mt-1">
                使用 Qwen-Omni 根据原始音频评估各模型识别结果
              </p>
            </div>
            <button
              onClick={handleJudge}
              disabled={!canJudge || isJudging || isProcessing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !canJudge || isJudging || isProcessing
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isJudging ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  评估中...
                </span>
              ) : (
                '开始评估'
              )}
            </button>
          </div>
        </div>

        <div className="p-4">
          {!judgeResult ? (
            <div className="text-center py-6">
              <span className="text-3xl block mb-2">⚖️</span>
              <p className="text-sm text-text-muted">
                {!canJudge 
                  ? '需要至少2个模型成功识别后才能评估' 
                  : '点击"开始评估"让 AI 评判识别质量'}
              </p>
            </div>
          ) : judgeResult.status === 'processing' ? (
            <div className="text-center py-6">
              <span className="text-3xl block mb-2 animate-bounce">🤔</span>
              <p className="text-sm text-text-muted">正在分析音频和识别结果...</p>
            </div>
          ) : judgeResult.status === 'error' ? (
            <div className="text-center py-6">
              <span className="text-3xl block mb-2">😔</span>
              <p className="text-sm text-red-400">{judgeResult.error || '评估失败'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Rankings */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-secondary mb-3">排名结果</h4>
                {judgeResult.rankings.map((item) => (
                  <div
                    key={item.modelId}
                    className={`p-3 rounded-lg border ${
                      item.rank === 1 ? 'border-yellow-500/50 bg-yellow-900/10' :
                      item.rank === 2 ? 'border-gray-400/50 bg-gray-700/10' :
                      item.rank === 3 ? 'border-amber-700/50 bg-amber-900/10' :
                      'border-dark-border bg-dark-bg'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(item.rank)}`}>
                          {item.rank <= 3 ? getRankEmoji(item.rank) : item.rank}
                        </span>
                        <div>
                          <span className="text-white font-medium">{item.modelName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-tech-green font-medium">
                              得分: {item.score}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {item.comment && (
                      <p className="mt-2 text-xs text-text-muted pl-11">
                        {item.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Reasoning */}
              {judgeResult.reasoning && (
                <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
                  <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                    <span>💭</span> 评估理由
                  </h4>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {judgeResult.reasoning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
