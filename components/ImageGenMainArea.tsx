import { useState, useRef, ChangeEvent } from 'react';
import { useImageGenTool } from '@/contexts/ImageGenToolContext';
import { useInferenceHistory } from '@/contexts/InferenceHistoryContext';
import { UploadedFile, ImageGenProgress } from '@/types/models';

const ImageGenMainArea = () => {
  const {
    referenceImage,
    setReferenceImage,
    generationPrompt,
    setGenerationPrompt,
    outputSize,
    imagesPerModel,
    selectedGenModels,
    setGenerationResults,
    isGenerating,
    setIsGenerating,
    getSelectedModelObjects,
  } = useImageGenTool();
  
  const { addRecord } = useInferenceHistory();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<ImageGenProgress[]>([]);

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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const uploadedFile: UploadedFile = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: 'image',
      preview: URL.createObjectURL(file),
      status: 'ready',
    };

    setReferenceImage(uploadedFile);
  };

  const removeReferenceImage = () => {
    if (referenceImage && referenceImage.preview) {
      URL.revokeObjectURL(referenceImage.preview);
    }
    setReferenceImage(null);
  };

  const handleGenerate = async () => {
    if (!generationPrompt.trim()) {
      alert('Please enter a generation prompt');
      return;
    }

    if (selectedGenModels.length === 0) {
      alert('Please select at least one model');
      return;
    }

    setIsGenerating(true);
    
    // Initialize progress for each selected model
    const selectedModels = getSelectedModelObjects();
    const initialProgress = selectedModels.map(model => ({
      modelId: model.id,
      progress: 0,
      status: 'pending' as const,
    }));
    setProgress(initialProgress);

    try {
      // Upload reference image if provided
      let imageUrl: string | undefined;
      if (referenceImage) {
        const formData = new FormData();
        formData.append('file', referenceImage.file);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const uploadResult = await uploadResponse.json();
        
        if (uploadResult.success) {
          imageUrl = uploadResult.url;
        } else {
          throw new Error('Failed to upload reference image');
        }
      }

      // Update progress to processing
      setProgress(prev => prev.map(p => ({
        ...p,
        status: 'processing',
        progress: 10
      })));

      // Call generate API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models: selectedGenModels,
          prompt: generationPrompt,
          imageUrl,
          size: outputSize,
          n: imagesPerModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.success) {
        // Update progress and results
        data.results.forEach((result: any, index: number) => {
          setProgress(prev => prev.map(p => 
            p.modelId === result.modelId 
              ? { 
                  ...p, 
                  status: result.status === 'success' ? 'completed' : 'error', 
                  progress: 100, 
                  responseTime: result.responseTime,
                  error: result.error 
                } 
              : p
          ));
        });
        
        setGenerationResults(data.results);
        
        // Record to inference history
        addRecord({
          toolType: 'imagegen',
          inputs: {
            prompt: { type: 'text', value: generationPrompt },
            image: imageUrl ? { type: 'image', value: imageUrl } : undefined,
          },
          outputs: data.results.map((r: any) => {
            const modelObj = selectedModels.find(m => m.id === r.modelId);
            return {
              modelId: r.modelId,
              modelName: modelObj?.name || r.modelId,
              content: { 
                type: r.imageUrls && r.imageUrls.length > 1 ? 'images' : 'image', 
                value: r.imageUrls && r.imageUrls.length > 0 
                  ? (r.imageUrls.length > 1 ? r.imageUrls : r.imageUrls[0]) 
                  : '' 
              },
              responseTime: r.responseTime || 0,
              status: r.status === 'success' ? 'success' as const : 'error' as const,
              error: r.error,
            };
          }),
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Mark all as error
      setProgress(prev => prev.map(p => ({
        ...p,
        status: 'error',
        progress: 100,
        error: error instanceof Error ? error.message : 'Unknown error',
      })));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card p-4 flex flex-col">
      <h2 className="text-lg font-semibold text-tech-green mb-4">Image Generation</h2>
      
      {/* Reference Image Upload */}
      <div className="mb-4">
        <h3 className="font-medium text-text-secondary mb-2">Reference Image (Optional)</h3>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept="image/*"
        />
        
        {!referenceImage ? (
          <div 
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors h-32 ${
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
              <div className="text-tech-green text-2xl">🖼️</div>
              <div className="text-left">
                <p className="text-text-secondary text-sm">Drop image here or click to browse</p>
                <p className="text-text-tertiary text-xs">Optional base image for generation</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative glass-card p-2 rounded-lg inline-block">
            <img 
              src={referenceImage.preview} 
              alt="Reference" 
              className="h-32 object-contain rounded"
            />
            <button
              className="absolute top-1 right-1 bg-dark-bg/80 text-tech-green rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-500/80 hover:text-white transition-colors"
              onClick={removeReferenceImage}
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}
      </div>
      
      {/* Prompt Input */}
      <div className="mb-4 flex-1">
        <h3 className="font-medium text-text-secondary mb-2">Generation Prompt</h3>
        <textarea
          value={generationPrompt}
          onChange={(e) => setGenerationPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="resize-none text-sm min-h-[120px] w-full"
          disabled={isGenerating}
        />
      </div>
      
      {/* Progress Display */}
      {progress.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-text-secondary mb-2 text-sm">Generation Progress</h3>
          <div className="space-y-2">
            {progress.map((p) => (
              <div key={p.modelId} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-tertiary">{p.modelId}</span>
                    <span className="text-tech-green">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        p.status === 'error' ? 'bg-red-500' : 'bg-tech-green'
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
                {p.status === 'completed' && p.responseTime && (
                  <span className="text-xs text-text-tertiary">{(p.responseTime / 1000).toFixed(1)}s</span>
                )}
                {p.status === 'error' && (
                  <span className="text-xs text-red-400">Failed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          className={`btn-primary flex items-center ${
            isGenerating ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleGenerate}
          disabled={isGenerating || !generationPrompt.trim()}
        >
          {isGenerating ? (
            <>
              <span className="mr-2">Generating</span>
              <div className="spinner w-4 h-4 border-2" />
            </>
          ) : (
            <>
              <span>🎨</span>
              <span className="ml-2">Generate Images</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageGenMainArea;
