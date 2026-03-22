'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AIModel, AI_MODELS, ComparisonMode, ReviewResult, UploadedFile } from '@/types/models';

type ReviewToolContextType = {
  // Mode
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  
  // Model Selection
  selectedModels: AIModel[];
  setSelectedModels: (models: AIModel[]) => void;
  
  // Persona
  personaPrompt: string;
  setPersonaPrompt: (prompt: string) => void;
  
  // Files
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  
  // Contextual instructions
  contextualInstructions: string;
  setContextualInstructions: (instructions: string) => void;
  
  // Results
  results: ReviewResult[];
  setResults: (results: ReviewResult[]) => void;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Helper functions
  getSupportedModalities: () => ('image' | 'video' | 'audio' | 'text')[];
  canUploadFile: (fileType: 'image' | 'video' | 'audio') => boolean;
};

const ReviewToolContext = createContext<ReviewToolContextType | undefined>(undefined);

export function ReviewToolProvider({ children }: { children: ReactNode }) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('comparison');
  const [selectedModels, setSelectedModels] = useState<AIModel[]>([AI_MODELS[1]]); // Default to Qwen3-VL-Plus
  const [personaPrompt, setPersonaPrompt] = useState(`You are a content moderator for a youth social platform. Review submitted text, images, videos, and audio for violations including politics, terrorism, gore, pornography, especially content with suggestions or implications.

Pay special attention to:
1. Sexual suggestions or predatory behavior toward minors or children.
2. Various text variants (QQ numbers, WeChat IDs, URLs) that humans can recognize.
3. Multi-modal analysis combining different media types.
4. SM/BDSM related content identification.
5. Girls' skirts must not be shorter than half the thigh length.
6. Use of mosaics, stickers, dolls to cover nudity is still suggestive and violates policy.
7. Boys must not show complete abs.
8. Audio must be checked for flirtation/seduction.

If content contains violations, mark as FAIL, otherwise PASS.

Return JSON format only (no markdown):
{
  "ret": "PASS"/"FAIL",
  "reason": ""/"specific violation type",
  "detail":"detailed violation explanation"
}`);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [contextualInstructions, setContextualInstructions] = useState('');
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSupportedModalities = (): ('image' | 'video' | 'audio' | 'text')[] => {
    if (selectedModels.length === 0) return [];
    
    // Return union of all selected models' capabilities for upload purposes
    // This allows uploading files as long as at least one model supports them
    const allModalities = new Set<'image' | 'video' | 'audio' | 'text'>();
    selectedModels.forEach(model => {
      model.supportedModalities.forEach(modality => {
        allModalities.add(modality);
      });
    });
    
    return Array.from(allModalities);
  };

  const canUploadFile = (fileType: 'image' | 'video' | 'audio') => {
    const supported = getSupportedModalities();
    return supported.includes(fileType);
  };

  return (
    <ReviewToolContext.Provider
      value={{
        comparisonMode,
        setComparisonMode,
        selectedModels,
        setSelectedModels,
        personaPrompt,
        setPersonaPrompt,
        uploadedFiles,
        setUploadedFiles,
        contextualInstructions,
        setContextualInstructions,
        results,
        setResults,
        isLoading,
        setIsLoading,
        getSupportedModalities,
        canUploadFile,
      }}
    >
      {children}
    </ReviewToolContext.Provider>
  );
}

export function useReviewTool() {
  const context = useContext(ReviewToolContext);
  if (context === undefined) {
    throw new Error('useReviewTool must be used within a ReviewToolProvider');
  }
  return context;
}
