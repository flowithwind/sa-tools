'use client';

import React, { useState, useMemo } from 'react';
import { useEmbeddingTool } from '@/contexts/EmbeddingToolContext';

export default function EmbeddingResults() {
  const {
    embeddingResults,
    similarities,
    stabilityStats,
    responseTime,
    dimension,
    repeatCount,
    files,
  } = useEmbeddingTool();

  const [expandedVector, setExpandedVector] = useState<number | null>(null);

  // Build similarity matrix for N*N display
  const similarityMatrix = useMemo(() => {
    if (!embeddingResults || embeddingResults.length === 0 || !similarities) {
      return null;
    }

    const n = embeddingResults.length;
    const matrix: { cosine: number; euclidean: number }[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = { cosine: 1.0, euclidean: 0.0 };
        } else {
          matrix[i][j] = { cosine: 0, euclidean: 0 };
        }
      }
    }

    similarities.forEach(sim => {
      matrix[sim.item1Index][sim.item2Index] = {
        cosine: sim.cosineSimilarity,
        euclidean: sim.euclideanDistance,
      };
      matrix[sim.item2Index][sim.item1Index] = {
        cosine: sim.cosineSimilarity,
        euclidean: sim.euclideanDistance,
      };
    });

    return matrix;
  }, [embeddingResults, similarities]);

  if (!embeddingResults || embeddingResults.length === 0) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-8">
        <div className="text-center">
          <span className="text-4xl mb-3 block">📊</span>
          <p className="text-text-muted text-sm">Results will appear here after generation</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number, decimals: number = 4) => num.toFixed(decimals);

  const getSimilarityBgColor = (cosine: number) => {
    if (cosine >= 0.9) return 'bg-green-900/60';
    if (cosine >= 0.7) return 'bg-green-900/30';
    if (cosine >= 0.5) return 'bg-yellow-900/30';
    if (cosine >= 0.3) return 'bg-orange-900/30';
    return 'bg-red-900/20';
  };

  const getItemInfo = (idx: number) => {
    const result = embeddingResults[idx];
    const icon = result.type === 'text' ? '📝' : result.type === 'image' ? '🖼️' : '🎬';
    const name = result.fileName || `Item ${idx + 1}`;
    const shortName = name.length > 12 ? name.substring(0, 10) + '...' : name;
    return { icon, name, shortName, type: result.type };
  };

  // Get stability color based on cosine variance (higher = more stable)
  const getStabilityColor = (cosineAvg: number) => {
    if (cosineAvg >= 0.9999) return 'text-green-400';
    if (cosineAvg >= 0.999) return 'text-yellow-400';
    if (cosineAvg >= 0.99) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStabilityLabel = (cosineAvg: number) => {
    if (cosineAvg >= 0.9999) return 'Excellent';
    if (cosineAvg >= 0.999) return 'Good';
    if (cosineAvg >= 0.99) return 'Moderate';
    return 'Unstable';
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border">
      {/* Header */}
      <div className="p-4 border-b border-dark-border flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Embedding Results</h3>
          <p className="text-sm text-text-muted mt-1">
            {embeddingResults.length} vectors ({dimension}D) | {repeatCount > 1 ? `${repeatCount}x runs` : 'Single run'}
          </p>
        </div>
        {responseTime && (
          <div className="text-right">
            <span className="text-2xl font-bold text-tech-green">{responseTime}</span>
            <span className="text-sm text-text-muted ml-1">ms total</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Stability Statistics (only for multiple runs) */}
        {stabilityStats && stabilityStats.length > 0 && (
          <div className="mb-4 bg-dark-bg rounded-lg p-4 border border-dark-border">
            <h4 className="text-sm font-medium text-tech-green mb-3 flex items-center gap-2">
              <span>📊</span> Vector Stability Analysis ({repeatCount}x runs)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs">
                    <th className="text-left pb-2 pr-4">Item</th>
                    <th className="text-center pb-2 px-2" colSpan={4}>Cosine Similarity (internal)</th>
                    <th className="text-center pb-2 px-2" colSpan={4}>Euclidean Distance (internal)</th>
                    <th className="text-center pb-2 pl-2">Stability</th>
                  </tr>
                  <tr className="text-text-muted text-[10px] border-b border-dark-border">
                    <th className="text-left pb-2 pr-4"></th>
                    <th className="text-center pb-2 px-1">Avg</th>
                    <th className="text-center pb-2 px-1">Min</th>
                    <th className="text-center pb-2 px-1">Max</th>
                    <th className="text-center pb-2 px-1">StdDev</th>
                    <th className="text-center pb-2 px-1">Avg</th>
                    <th className="text-center pb-2 px-1">Min</th>
                    <th className="text-center pb-2 px-1">Max</th>
                    <th className="text-center pb-2 px-1">StdDev</th>
                    <th className="text-center pb-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {stabilityStats.map((stat, idx) => (
                    <tr key={idx} className="border-b border-dark-border/50 last:border-0">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span>{stat.itemType === 'text' ? '📝' : stat.itemType === 'image' ? '🖼️' : '🎬'}</span>
                          <span className="text-white text-xs truncate max-w-[100px]" title={stat.itemName}>
                            {stat.itemName}
                          </span>
                        </div>
                      </td>
                      {/* Cosine */}
                      <td className={`text-center py-2 px-1 font-mono text-xs ${getStabilityColor(stat.cosine.avg)}`}>
                        {formatNumber(stat.cosine.avg, 6)}
                      </td>
                      <td className="text-center py-2 px-1 font-mono text-xs text-text-muted">
                        {formatNumber(stat.cosine.min, 6)}
                      </td>
                      <td className="text-center py-2 px-1 font-mono text-xs text-text-muted">
                        {formatNumber(stat.cosine.max, 6)}
                      </td>
                      <td className="text-center py-2 px-1 font-mono text-xs text-yellow-400">
                        {formatNumber(stat.cosine.stdDev, 6)}
                      </td>
                      {/* Euclidean */}
                      <td className="text-center py-2 px-1 font-mono text-xs text-blue-400">
                        {formatNumber(stat.euclidean.avg, 4)}
                      </td>
                      <td className="text-center py-2 px-1 font-mono text-xs text-text-muted">
                        {formatNumber(stat.euclidean.min, 4)}
                      </td>
                      <td className="text-center py-2 px-1 font-mono text-xs text-text-muted">
                        {formatNumber(stat.euclidean.max, 4)}
                      </td>
                      <td className="text-center py-2 px-1 font-mono text-xs text-yellow-400">
                        {formatNumber(stat.euclidean.stdDev, 4)}
                      </td>
                      {/* Stability Badge */}
                      <td className="text-center py-2 pl-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          stat.cosine.avg >= 0.9999 ? 'bg-green-900/50 text-green-400' :
                          stat.cosine.avg >= 0.999 ? 'bg-yellow-900/50 text-yellow-400' :
                          stat.cosine.avg >= 0.99 ? 'bg-orange-900/50 text-orange-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          {getStabilityLabel(stat.cosine.avg)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 pt-3 border-t border-dark-border text-[10px] text-text-muted">
              <p><strong>Interpretation:</strong> Internal similarity measures how consistent vectors are across {repeatCount} runs for the same input.</p>
              <p className="mt-1">Cosine ~1.0 and Euclidean ~0.0 indicate highly stable embeddings.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Vector Results - Compact */}
          <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
            <h4 className="text-sm font-medium text-text-secondary mb-3">Generated Vectors</h4>
            <div className="space-y-2">
              {embeddingResults.map((result, idx) => {
                const isExpanded = expandedVector === idx;
                const info = getItemInfo(idx);
                
                return (
                  <div
                    key={idx}
                    className="bg-dark-card rounded-lg p-3 border border-dark-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <span className="text-white text-sm font-medium truncate max-w-[150px]">
                          {info.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          result.type === 'text' ? 'bg-blue-900/50 text-blue-400' :
                          result.type === 'image' ? 'bg-green-900/50 text-green-400' :
                          'bg-purple-900/50 text-purple-400'
                        }`}>
                          {result.type.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedVector(isExpanded ? null : idx)}
                        className="text-[10px] text-tech-green hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    <div className="text-[10px] text-text-muted font-mono mt-1.5 truncate">
                      [{result.embedding.slice(0, 4).map(v => formatNumber(v, 3)).join(', ')}...]
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-2 p-2 bg-dark-bg rounded border border-dark-border max-h-24 overflow-auto">
                        <div className="text-[10px] text-text-muted font-mono break-all">
                          [{result.embedding.map(v => formatNumber(v, 6)).join(', ')}]
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Similarity Matrix - N*N Table */}
          {similarityMatrix && embeddingResults.length > 1 && (
            <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Cross-Item Similarity ({embeddingResults.length}×{embeddingResults.length})
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1"></th>
                      {embeddingResults.map((_, idx) => {
                        const info = getItemInfo(idx);
                        return (
                          <th key={idx} className="p-2 text-center min-w-[90px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-lg">{info.icon}</span>
                              <span className="text-[10px] text-text-muted truncate max-w-[80px]" title={info.name}>
                                {info.shortName}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {embeddingResults.map((_, rowIdx) => {
                      const rowInfo = getItemInfo(rowIdx);
                      return (
                        <tr key={rowIdx}>
                          <td className="p-2 text-center min-w-[90px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-lg">{rowInfo.icon}</span>
                              <span className="text-[10px] text-text-muted truncate max-w-[80px]" title={rowInfo.name}>
                                {rowInfo.shortName}
                              </span>
                            </div>
                          </td>
                          {embeddingResults.map((_, colIdx) => {
                            const cell = similarityMatrix[rowIdx][colIdx];
                            const isDiagonal = rowIdx === colIdx;
                            
                            return (
                              <td
                                key={colIdx}
                                className={`p-1 border border-dark-border ${
                                  isDiagonal ? 'bg-dark-card' : getSimilarityBgColor(cell.cosine)
                                }`}
                              >
                                <div className="min-w-[80px] rounded overflow-hidden">
                                  <div className={`px-2 py-1.5 text-center ${isDiagonal ? 'bg-tech-green/10' : 'bg-black/20'}`}>
                                    <div className="text-[9px] text-text-muted mb-0.5">Cosine</div>
                                    <div className={`text-sm font-bold ${
                                      isDiagonal ? 'text-tech-green' :
                                      cell.cosine >= 0.7 ? 'text-green-400' :
                                      cell.cosine >= 0.5 ? 'text-yellow-400' :
                                      cell.cosine >= 0.3 ? 'text-orange-400' : 'text-red-400'
                                    }`}>
                                      {formatNumber(cell.cosine, 3)}
                                    </div>
                                  </div>
                                  <div className="h-px bg-dark-border"></div>
                                  <div className={`px-2 py-1.5 text-center ${isDiagonal ? 'bg-tech-green/5' : 'bg-black/10'}`}>
                                    <div className="text-[9px] text-text-muted mb-0.5">Euclid</div>
                                    <div className={`text-sm font-bold ${
                                      isDiagonal ? 'text-tech-green' : 'text-blue-400'
                                    }`}>
                                      {formatNumber(cell.euclidean, 3)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-dark-border">
                <div className="flex flex-wrap gap-4 text-[10px] text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">Cosine:</span>
                    <span className="text-green-400">≥0.7 High</span>
                    <span className="text-yellow-400">≥0.5 Med</span>
                    <span className="text-orange-400">≥0.3 Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">Euclidean:</span>
                    <span>Lower = More Similar</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
