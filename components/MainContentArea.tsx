import { useState, useRef, ChangeEvent } from 'react';
import { useReviewTool } from '@/contexts/ReviewToolContext';
import { useInferenceHistory } from '@/contexts/InferenceHistoryContext';
import { UploadedFile, ReviewResult, ModelProgress } from '@/types/models';
import ProgressDisplay from './ProgressDisplay';

// Utility function to convert blob to data URL
const convertBlobToFileReader = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  });
};

const MainContentArea = () => {
  const {
    uploadedFiles,
    setUploadedFiles,
    canUploadFile,
    isLoading,
    setIsLoading,
    selectedModels,
    personaPrompt,
    setResults,
    getSupportedModalities,
    results, // Add results to check if we should collapse
  } = useReviewTool();
  
  const { addRecord } = useInferenceHistory();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // State for tracking progress of each model
  const [progress, setProgress] = useState<ModelProgress[]>([]);
  
  // State for hover expansion when collapsed
  const [isHovered, setIsHovered] = useState(false);
  
  // State for text input focus
  const [isFocused, setIsFocused] = useState(false);
  
  // State for review text content
  const [reviewText, setReviewText] = useState('');
  
  // Determine if the area should be collapsed (has results and not loading and not focused)
  const shouldCollapse = results.length > 0 && !isLoading && !isHovered && !isFocused;

  const handleFiles = (files: FileList) => {
    if (isLoading) return;
    
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.type.split('/')[0];
      
      // Determine if this file type is supported
      let supportedType: 'image' | 'video' | 'audio' | null = null;
      if (fileType === 'image' && canUploadFile('image')) {
        supportedType = 'image';
      } else if (fileType === 'video' && canUploadFile('video')) {
        supportedType = 'video';
      } else if (fileType === 'audio' && canUploadFile('audio')) {
        supportedType = 'audio';
      }
      
      if (supportedType) {
        // Create a preview URL for images and videos
        let preview: string | undefined;
        if (supportedType === 'image' || supportedType === 'video') {
          preview = URL.createObjectURL(file);
        }
        
        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          type: supportedType,
          preview,
          status: 'ready',
        });
      }
    }
    
    if (newFiles.length > 0) {
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    const fileToRemove = uploadedFiles.find(f => f.id === id);
    if (fileToRemove && fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview); // Clean up object URL
    }
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0 && !reviewText.trim()) {
      alert('请上传文件或输入送审文字');
      return;
    }
    
    if (selectedModels.length === 0) {
      alert('请先选择至少一个模型再提交');
      return;
    }
    
    if (!personaPrompt || personaPrompt.trim() === '') {
      alert('请在配置面板中设置角色提示词');
      return;
    }
    
    // Initialize progress tracking for each model
    if (selectedModels && selectedModels.length > 0) {
      const initialProgress = selectedModels.map(model => ({
        modelId: model.id,
        progress: 0,
        status: 'pending' as const,
      }));
      setProgress(initialProgress);
    } else {
      setProgress([]);
    }
    setIsLoading(true);
    
    try {
      // Upload all files to OSS and get public URLs
      const fileContents = await Promise.all(uploadedFiles.map(async (file) => {
        // Upload all file types (image, video, audio) to OSS to avoid data URL size limits
        try {
          const formData = new FormData();
          formData.append('file', file.file);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success) {
            // Use the uploaded file URL
            return {
              type: 'image_url' as const,
              image_url: { url: uploadResult.url }
            };
          } else {
            console.error(`Failed to upload ${file.type} file:`, uploadResult.error);
            // If upload fails and it's an image, try data URL as fallback (may fail for large images)
            if (file.type === 'image') {
              try {
                const dataUrl = await convertBlobToFileReader(file.preview || URL.createObjectURL(file.file));
                return {
                  type: 'image_url' as const,
                  image_url: { url: dataUrl }
                };
              } catch {
                console.warn(`Skipping ${file.type} file after upload failed: ${file.file.name}`);
                return null;
              }
            }
            return null;
          }
        } catch (error) {
          console.error(`Error uploading ${file.type} file:`, error);
          // If upload fails and it's an image, try data URL as fallback
          if (file.type === 'image') {
            try {
              const dataUrl = await convertBlobToFileReader(file.preview || URL.createObjectURL(file.file));
              return {
                type: 'image_url' as const,
                image_url: { url: dataUrl }
              };
            } catch {
              console.warn(`Skipping ${file.type} file after all attempts: ${file.file.name}`);
              return null;
            }
          }
          console.warn(`Skipping ${file.type} file after upload error: ${file.file.name}`);
          return null;
        }
      }));
      
      const validContents = fileContents.filter(content => content !== null);
      
      // Prepare the request body
      // Build content array: text first (if provided), then files
      const allContents: Array<{type: 'text', text: string} | {type: 'image_url', image_url: {url: string}}> = [];
      
      // Add review text as first content item if provided
      if (reviewText.trim()) {
        allContents.push({ type: 'text' as const, text: reviewText.trim() });
      }
      
      // Add file contents
      allContents.push(...validContents as any);
      
      // Only error if no content at all (no text and no files)
      if (allContents.length === 0) {
        console.error('No valid content to submit');
        setIsLoading(false);
        return;
      }
      
      const requestBody = {
        personaPrompt,
        content: allContents,
      };
      
      // Update progress for all models to processing
      if (selectedModels && selectedModels.length > 0) {
        setProgress(prev => prev.map(p => ({
          ...p,
          status: 'processing',
          progress: 10
        })));
      }
      
      // Call the PUT endpoint for all models
      const response = await fetch('/api/review', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestBody,
          models: selectedModels && selectedModels.length > 0 ? selectedModels.map(model => model.id) : [],
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update results with the comparison data
        const comparisonResults = data.results.map((result: any, index: number) => {
          // Update progress for this specific model
          if (selectedModels && index < selectedModels.length) {
            setProgress(prev => prev.map(p => 
              p.modelId === (result.modelId || selectedModels[index]?.id) 
                ? { ...p, status: 'completed', progress: 100, responseTime: result.responseTime || 0 } 
                : p
            ));
          }
          
          return {
            modelId: result.modelId || (selectedModels && index < selectedModels.length ? selectedModels[index]?.id : 'unknown'),
            modelName: result.modelName || (selectedModels && index < selectedModels.length ? selectedModels[index]?.name : 'Unknown Model'),
            content: result.content || result.error,
            timestamp: Date.now(),
            responseTime: result.responseTime || 0,
            tokenUsage: result.tokenUsage,
            status: result.success ? 'success' : 'error',
            error: result.error,
          };
        });
        
        setResults(comparisonResults);
        
        // Record to inference history
        const fileUrls = validContents.map((c: any) => c?.image_url?.url).filter(Boolean);
        addRecord({
          toolType: 'review',
          inputs: {
            text: reviewText.trim() ? { type: 'text', value: reviewText.trim() } : undefined,
            files: fileUrls.length > 0 ? { type: 'images', value: fileUrls } : undefined,
          },
          outputs: comparisonResults.map((r: ReviewResult) => ({
            modelId: r.modelId,
            modelName: r.modelName,
            content: { type: 'text', value: r.content },
            responseTime: r.responseTime,
            status: r.status === 'loading' ? 'error' : r.status,
            error: r.error,
          })),
        });
      } else {
        // Mark all models as error
        if (selectedModels && selectedModels.length > 0) {
          setProgress(prev => prev.map(p => ({
            ...p,
            status: 'error',
            progress: 100,
            error: data.error || '请求失败',
          })));
        } else {
          setProgress([]);
        }
        
        throw new Error(data.error || 'Request failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Show user-friendly error notification
      alert(`错误: ${errorMessage}`);
      
      // Set error results for all selected models
      if (selectedModels && selectedModels.length > 0) {
        const errorResults = selectedModels.map(model => ({
          modelId: model.id,
          modelName: model.name,
          content: '',
          timestamp: Date.now(),
          responseTime: 0,
          status: 'error' as const,
          error: error instanceof Error ? error.message : '未知错误',
        }));
        setResults(errorResults);
      } else {
        // If no selected models, create a generic error result
        const errorResult: ReviewResult = {
          modelId: 'unknown',
          modelName: 'Unknown Model',
          content: '',
          timestamp: Date.now(),
          responseTime: 0,
          status: 'error' as const,
          error: error instanceof Error ? error.message : '未知错误',
        };
        setResults([errorResult]);
      }
      
      // Mark all models as error
      if (selectedModels && selectedModels.length > 0) {
        setProgress(prev => prev.map(p => ({
          ...p,
          status: 'error',
          progress: 100,
          error: error instanceof Error ? error.message : '未知错误',
        })));
      } else {
        // If no selected models, reset progress
        setProgress([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`glass-card p-4 flex flex-col transition-all duration-300 ease-in-out ${
        shouldCollapse ? 'h-14 overflow-hidden' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden file input - always rendered so it's always available */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileInput}
        className="hidden"
        accept="image/*,video/*,audio/*"
      />
      
      {/* Collapsed header bar */}
      {shouldCollapse ? (
        <div className="flex items-center justify-between h-full cursor-pointer">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-tech-green">内容提交</h2>
            <span className="text-text-tertiary text-sm">
              ({uploadedFiles.length > 0 ? `${uploadedFiles.length} 个文件` : ''}
              {uploadedFiles.length > 0 && reviewText.trim() ? ' + ' : ''}
              {reviewText.trim() ? '文字内容' : ''}
              {!uploadedFiles.length && !reviewText.trim() ? '无内容' : ''})
            </span>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary text-sm">
            <span>鼠标悬停展开</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      ) : (
        /* Expanded content */
        <>
          <h2 className="text-lg font-semibold text-tech-green mb-4">内容提交</h2>
          
          <div 
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors h-24 ${
              dragActive 
                ? 'border-tech-green bg-dark-secondary/30' 
                : 'border-dark-secondary hover:border-tech-green/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center justify-center h-full gap-4">
              <div className="text-tech-green text-2xl">📁</div>
              <div className="text-left">
                <p className="text-text-secondary text-sm">拖拽文件到这里或点击浏览</p>
                <p className="text-text-tertiary text-xs">支持: 图片, 视频, 音频</p>
              </div>
            </div>
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="mt-4 flex-1 min-h-0 overflow-hidden">
              <h3 className="font-medium text-text-secondary mb-2">已上传文件 ({uploadedFiles.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto h-full max-h-[280px] pb-2">
                {uploadedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="relative glass-card p-2 rounded-lg flex flex-col items-center group"
                  >
                    {file.type === 'image' && file.preview ? (
                      <div className="w-full aspect-square relative overflow-hidden rounded">
                        <img 
                          src={file.preview} 
                          alt={file.file.name} 
                          className="w-full h-full object-contain bg-dark-secondary/50 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.preview, '_blank');
                          }}
                          title="点击查看原图"
                        />
                      </div>
                    ) : file.type === 'video' && file.preview ? (
                      <div className="w-full aspect-square relative overflow-hidden rounded bg-dark-secondary/50">
                        <video 
                          src={file.preview} 
                          className="w-full h-full object-contain"
                          controls
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-dark-secondary/50 rounded">
                        <div className="text-tech-green text-3xl">🎵</div>
                      </div>
                    )}
                    <div className="text-xs mt-2 truncate w-full text-center text-text-tertiary" title={file.file.name}>
                      {file.file.name}
                    </div>
                    <button
                      className="absolute top-1 right-1 bg-dark-bg/80 text-tech-green rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-500/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      title="删除文件"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-3">
            <h3 className="font-medium text-text-secondary mb-2">送审文字</h3>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="输入需要审核的文字内容..."
              className="resize-none text-sm h-20"
              disabled={isLoading}
            />
          </div>
          
          <ProgressDisplay progresses={progress} isLoading={isLoading} />
          
          <div className="mt-4 flex justify-end">
            <button
              className={`btn-primary flex items-center ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={handleSubmit}
              disabled={isLoading || (uploadedFiles.length === 0 && !reviewText.trim())}
            >
              {isLoading ? (
                <>
                  <span className="mr-2">处理中</span>
                  <div className="spinner w-4 h-4 border-2" />
                </>
              ) : (
                '提交审核'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MainContentArea;