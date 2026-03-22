'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AIModel, AI_MODELS, ComparisonMode, ReviewResult, UploadedFile, ToolType } from '@/types/models';

type AppContextType = {
  // Active Tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<ToolType>('review'); // Default to review tool
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('comparison');
  const [selectedModels, setSelectedModels] = useState<AIModel[]>([AI_MODELS[1]]); // Default to Qwen3-VL-Plus
  const [personaPrompt, setPersonaPrompt] = useState(`你是一款青少年社交产品的审核员，请按照严格的规则审核提交的文本、图片、视频和音频内容中是否有包含涉政、暴恐、血腥、色情等的内容，尤其是包含引导和暗示的内容。

注意以下类型进行尽可能全的召回：
1. 针对青少年或儿童的性暗示、诱骗。
2. 各种人类能够识别的文字变体，来传递QQ号、微信号、网址等文字
3. 如果给出的内容涵盖多种媒体形式，需要综合多模态信息进行综合判断。
4. 对于SM圈的内容进行识别
5. 女生短裙长度不能短于大腿长度的一半
6. 使用马赛克、贴画、玩偶等进行裸露身体的遮挡，也被认为引发用户联想“看到了”裸露的身体，也认为违规
7. 男生不能露出完整腹肌
8. 音频需要检查是否有娇嗔

如果内容中包含违规信息，则判定为不通过，否则为通过。

返回的信息以json格式输出，并且只输出合法的json字符串（不要用markdown格式）：
{
  "ret": "通过"/"违规",
  "reason": ""/"具体违规类型",
  "detail":"详细的违规原因说明",
}`);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [contextualInstructions, setContextualInstructions] = useState('');
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSupportedModalities = (): ('image' | 'video' | 'audio' | 'text')[] => {
    if (selectedModels.length === 0) return [];
    
    // Return intersection of all selected models' capabilities
    const firstModelModalities = new Set(selectedModels[0].supportedModalities);
    return selectedModels.slice(1).reduce(
      (acc: ('image' | 'video' | 'audio' | 'text')[], model: AIModel) => {
        const modelModalities = new Set(model.supportedModalities);
        return acc.filter((m: 'image' | 'video' | 'audio' | 'text') => modelModalities.has(m));
      },
      Array.from(firstModelModalities)
    );
  };

  const canUploadFile = (fileType: 'image' | 'video' | 'audio') => {
    const supported = getSupportedModalities();
    return supported.includes(fileType);
  };

  return (
    <AppContext.Provider
      value={{
        activeTool,
        setActiveTool,
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
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
