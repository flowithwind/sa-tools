import { useState } from 'react';
import { useImageGenTool } from '@/contexts/ImageGenToolContext';
import { IMAGE_GEN_MODELS } from '@/types/models';
import ImageViewer from './ImageViewer';

const ImageGenResults = () => {
  const { generationResults, isGenerating } = useImageGenTool();
  const [viewerImage, setViewerImage] = useState<{ url: string; title?: string } | null>(null);

  if (generationResults.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <div className="glass-card p-4 flex flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold text-tech-green mb-4">Comparison Results</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {generationResults.map((result) => {
          const model = IMAGE_GEN_MODELS.find(m => m.id === result.modelId);
          
          return (
            <div key={result.modelId} className="glass-card p-4 rounded-lg">
              {/* Model Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300">
                    {model?.name || result.modelName}
                  </div>
                  {result.status === 'success' && (
                    <span className="text-xs text-tech-green">✓ Success</span>
                  )}
                  {result.status === 'error' && (
                    <span className="text-xs text-red-400">✗ Failed</span>
                  )}
                </div>
                <span className="text-xs text-text-tertiary">
                  {(result.responseTime / 1000).toFixed(1)}s
                </span>
              </div>
              
              {/* Error Display */}
              {result.status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-3">
                  <p className="text-sm text-red-300">
                    {result.error || 'Generation failed'}
                  </p>
                </div>
              )}
              
              {/* Image Grid */}
              {result.status === 'success' && result.imageUrls.length > 0 && (
                <div className={`grid gap-2 ${
                  result.imageUrls.length === 1 
                    ? 'grid-cols-1' 
                    : result.imageUrls.length === 2 
                    ? 'grid-cols-2' 
                    : 'grid-cols-2 sm:grid-cols-3'
                }`}>
                  {result.imageUrls.map((url, index) => (
                    <div 
                      key={index} 
                      className="relative group overflow-hidden rounded-lg bg-dark-secondary/50 aspect-square"
                    >
                      <img 
                        src={url} 
                        alt={`Generated ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button
                          className="p-2 bg-tech-green text-dark-bg rounded-lg hover:bg-tech-green/80 transition-colors"
                          onClick={() => setViewerImage({ 
                            url, 
                            title: `${model?.name || result.modelId} - 图片 #${index + 1}` 
                          })}
                          title="查看原图"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </button>
                        <a
                          href={url}
                          download={`${result.modelId}-${index + 1}.png`}
                          className="p-2 bg-tech-green text-dark-bg rounded-lg hover:bg-tech-green/80 transition-colors"
                          title="下载图片"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                      
                      {/* Image Index Badge */}
                      <div className="absolute top-2 left-2 bg-dark-bg/80 text-tech-green px-2 py-1 rounded text-xs font-medium">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Model Description */}
              {model && (
                <p className="text-xs text-text-tertiary mt-3">
                  {model.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Image Viewer Modal */}
      {viewerImage && (
        <ImageViewer
          imageUrl={viewerImage.url}
          title={viewerImage.title}
          onClose={() => setViewerImage(null)}
        />
      )}
    </div>
  );
};

export default ImageGenResults;
