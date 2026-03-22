'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ImageGenModel, IMAGE_GEN_MODELS, ImageGenResult, UploadedFile } from '@/types/models';

type ImageGenToolContextType = {
  // Model Selection
  selectedGenModels: string[];
  setSelectedGenModels: (models: string[]) => void;
  
  // Reference Image
  referenceImage: UploadedFile | null;
  setReferenceImage: (file: UploadedFile | null) => void;
  
  // Prompt
  generationPrompt: string;
  setGenerationPrompt: (prompt: string) => void;
  
  // Output Settings
  outputSize: string;
  setOutputSize: (size: string) => void;
  
  imagesPerModel: number;
  setImagesPerModel: (count: number) => void;
  
  // Results
  generationResults: ImageGenResult[];
  setGenerationResults: (results: ImageGenResult[]) => void;
  
  // Loading state
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;
  
  // Helper functions
  getSelectedModelObjects: () => ImageGenModel[];
};

const ImageGenToolContext = createContext<ImageGenToolContextType | undefined>(undefined);

export function ImageGenToolProvider({ children }: { children: ReactNode }) {
  // Initialize with all 4 models selected
  const [selectedGenModels, setSelectedGenModels] = useState<string[]>(
    IMAGE_GEN_MODELS.map(m => m.id)
  );
  const [referenceImage, setReferenceImage] = useState<UploadedFile | null>(null);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [outputSize, setOutputSize] = useState('1024x1024');
  const [imagesPerModel, setImagesPerModel] = useState(2);
  const [generationResults, setGenerationResults] = useState<ImageGenResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const getSelectedModelObjects = (): ImageGenModel[] => {
    return IMAGE_GEN_MODELS.filter(model => selectedGenModels.includes(model.id));
  };

  return (
    <ImageGenToolContext.Provider
      value={{
        selectedGenModels,
        setSelectedGenModels,
        referenceImage,
        setReferenceImage,
        generationPrompt,
        setGenerationPrompt,
        outputSize,
        setOutputSize,
        imagesPerModel,
        setImagesPerModel,
        generationResults,
        setGenerationResults,
        isGenerating,
        setIsGenerating,
        getSelectedModelObjects,
      }}
    >
      {children}
    </ImageGenToolContext.Provider>
  );
}

export function useImageGenTool() {
  const context = useContext(ImageGenToolContext);
  if (context === undefined) {
    throw new Error('useImageGenTool must be used within an ImageGenToolProvider');
  }
  return context;
}
