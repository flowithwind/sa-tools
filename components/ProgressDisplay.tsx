import { ModelProgress } from '@/types/models';

interface ProgressDisplayProps {
  progresses: ModelProgress[];
  isLoading: boolean;
}

const ProgressDisplay = ({ progresses, isLoading }: ProgressDisplayProps) => {
  if (!isLoading || progresses.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 w-full">
      <h3 className="font-medium text-text-secondary mb-2">处理进度</h3>
      <div className="space-y-3">
        {progresses.map((progress, index) => (
          <div key={progress.modelId} className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-tech-green">
                {progresses.length > 1 ? `模型 ${index + 1}: ` : '当前模型: '}
              </span>
              <span className={`${
                progress.status === 'completed' ? 'text-green-400' : 
                progress.status === 'error' ? 'text-red-400' : 
                'text-yellow-400'
              }`}>
                {progress.status === 'completed' ? '已完成' : 
                 progress.status === 'error' ? '出错' : 
                 progress.status === 'processing' ? '处理中' : '等待中'} 
                {progress.responseTime ? ` (${(progress.responseTime / 1000).toFixed(2)}秒)` : ''}
              </span>
            </div>
            <div className="w-full bg-dark-secondary rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  progress.status === 'error' ? 'bg-red-500' : 
                  progress.status === 'completed' ? 'bg-tech-green' : 
                  'bg-blue-500'
                }`}
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
            {progress.error && (
              <div className="mt-1 text-xs text-red-400">{progress.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressDisplay;