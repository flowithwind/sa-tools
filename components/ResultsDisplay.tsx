import { useReviewTool } from '@/contexts/ReviewToolContext';
import { ReviewResult } from '@/types/models';
import { useEffect, useRef } from 'react';

const ResultsDisplay = () => {
  const { results, isLoading } = useReviewTool();
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Synchronize scrolling across comparison columns
  useEffect(() => {
    if (resultRefs.current.length > 1) {
      const handleScroll = (sourceIndex: number) => {
        const sourceElement = resultRefs.current[sourceIndex];
        if (!sourceElement) return;

        const scrollPercentage = sourceElement.scrollTop / (sourceElement.scrollHeight - sourceElement.clientHeight);

        resultRefs.current.forEach((element, index) => {
          if (element && index !== sourceIndex) {
            element.scrollTop = scrollPercentage * (element.scrollHeight - element.clientHeight);
          }
        });
      };

      // Attach scroll listeners to all result containers
      resultRefs.current.forEach((element, index) => {
        if (element) {
          const listener = () => handleScroll(index);
          element.addEventListener('scroll', listener);
          
          // Store the listener function to be able to remove it later
          (element as any)._scrollListener = listener;
        }
      });
      
      // Cleanup function
      return () => {
        resultRefs.current.forEach(element => {
          if (element && (element as any)._scrollListener) {
            element.removeEventListener('scroll', (element as any)._scrollListener);
            delete (element as any)._scrollListener;
          }
        });
      };
    }
  }, [results]);

  if (results.length === 0 && !isLoading) {
    return (
      <div className="glass-card p-4 text-center text-text-tertiary min-h-[200px] flex items-center justify-center">
        <p>Submit content for review to see results</p>
      </div>
    );
  }

  // Display results in columns (supports 1 or more models)
  return (
    <div className="glass-card p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-tech-green">模型对比</h2>
        <div className="text-sm text-text-tertiary">
          {results.length} 个模型完成
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="spinner" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result, index) => (
            <div 
              key={result.modelId || index} 
              className="border border-dark-secondary rounded-lg overflow-hidden flex flex-col"
            >
              <div className="bg-dark-secondary/70 p-3 border-b border-dark-secondary flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{result.modelName}</h3>
                  <span className="text-xs text-text-tertiary">
                    {(result.responseTime / 1000).toFixed(2)}秒
                  </span>
                </div>
              </div>
              <div 
                ref={el => resultRefs.current[index] = el}
                className="bg-dark-secondary/30 p-4"
              >
                {result.status === 'loading' ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="spinner w-6 h-6 border-2" />
                  </div>
                ) : result.status === 'error' ? (
                  <div className="text-red-400 text-center">
                    错误: {result.error}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{result.content}</div>
                )}
              </div>
              {result.tokenUsage && (
                <div className="p-2 bg-dark-secondary/50 text-xs text-text-tertiary border-t border-dark-secondary flex-shrink-0">
                  令牌数: {result.tokenUsage.totalTokens}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comparison metrics footer */}
      {results.length > 0 && !isLoading && (
        <div className="mt-4 pt-4 border-t border-dark-secondary text-xs text-text-tertiary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>总模型数: {results.length}</div>
            <div>最快: {Math.min(...results.map(r => r.responseTime))}ms</div>
            <div>最慢: {Math.max(...results.map(r => r.responseTime))}ms</div>
            <div>平均: {Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)}ms</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;