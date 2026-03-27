export type AIModel = {
  id: string;
  name: string;
  provider: 'volcano' | 'alibaba';
  supportedModalities: ('image' | 'video' | 'audio' | 'text')[];
  description: string;
  cost: string;
};

export const AI_MODELS: AIModel[] = [
  {
    id: 'qwen3-vl-plus',
    name: 'Qwen3-VL-Plus',
    provider: 'alibaba',
    supportedModalities: ['image', 'video', 'text'],
    description: 'Balanced performance, cost-effective',
    cost: 'Medium',
  },
  {
    id: 'qwen3-vl-flash',
    name: 'Qwen3-VL-Flash',
    provider: 'alibaba',
    supportedModalities: ['image', 'video', 'text'],
    description: 'Fast multimodal understanding, efficient processing',
    cost: 'Low',
  },
  {
    id: 'qwen3-vl-235b-a22b-thinking',
    name: 'Qwen3-VL-235B-A22B Thinking',
    provider: 'alibaba',
    supportedModalities: ['image', 'video', 'text'],
    description: 'Ultra-large scale thinking model, deep reasoning',
    cost: 'Very High',
  },
  {
    id: 'qwen3-vl-8b-thinking',
    name: 'Qwen3-VL-8B Thinking',
    provider: 'alibaba',
    supportedModalities: ['image', 'video', 'text'],
    description: 'Lightweight thinking model, focused reasoning',
    cost: 'Medium',
  },
  {
    id: 'qwen3.5-plus',
    name: 'Qwen3.5-Plus',
    provider: 'alibaba',
    supportedModalities: ['text'],
    description: 'Hybrid thinking model, balanced performance and speed',
    cost: 'Medium',
  },
  {
    id: 'qwen3.5-flash',
    name: 'Qwen3.5-Flash',
    provider: 'alibaba',
    supportedModalities: ['text'],
    description: 'Fast hybrid thinking model, optimized for speed',
    cost: 'Low',
  },
  {
    id: 'qwen3.5-35b-a3b',
    name: 'Qwen3.5-35B-A3B',
    provider: 'alibaba',
    supportedModalities: ['text'],
    description: 'Advanced hybrid thinking model, 35B parameters',
    cost: 'High',
  },
  {
    id: 'qwen3-omni-flash',
    name: 'Qwen3-Omni-Flash',
    provider: 'alibaba',
    supportedModalities: ['image', 'video', 'audio', 'text'],
    description: 'Real-time multimodal with audio support',
    cost: 'Medium',
  },
  {
    id: 'doubao-1.6-vision-pro',
    name: 'Doubao 1.6-vision-pro',
    provider: 'volcano',
    supportedModalities: ['image', 'video', 'text'],
    description: 'Volcano Engine multimodal model',
    cost: 'Medium',
  },
];

export type ComparisonMode = 'single' | 'comparison';

export type ReviewResult = {
  modelId: string;
  modelName: string;
  content: string;
  timestamp: number;
  responseTime: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'success' | 'error' | 'loading';
  error?: string;
};

export type UploadedFile = {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio';
  preview?: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
};

export type ModelProgress = {
  modelId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  responseTime?: number;
  error?: string;
};

// Tool Types
export type ToolType = 'review' | 'imagegen' | 'videogen' | 'animate' | 'embedding' | 'asr';

export type ToolDefinition = {
  id: ToolType;
  name: string;
  description: string;
  icon: string;
};

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'review',
    name: 'AI Content Review',
    description: 'Multimodal content moderation',
    icon: '🔍',
  },
  {
    id: 'imagegen',
    name: 'Image Generation',
    description: 'Compare image generation models',
    icon: '🎨',
  },
  {
    id: 'videogen',
    name: 'Video Generation',
    description: 'Character-consistent video from reference',
    icon: '🎬',
  },
  {
    id: 'animate',
    name: 'Video Animate',
    description: 'Motion transfer and face swap',
    icon: '🎭',
  },
  {
    id: 'embedding',
    name: 'Vector Embedding',
    description: 'Multimodal vectorization & similarity',
    icon: '🔢',
  },
  {
    id: 'asr',
    name: 'ASR Compare',
    description: 'Speech recognition model comparison',
    icon: '🎙️',
  },
];

// Embedding Tool Types
export const EMBEDDING_DIMENSIONS = [
  { label: '2560 (Max)', value: 2560 },
  { label: '2048', value: 2048 },
  { label: '1536', value: 1536 },
  { label: '1024 (Default)', value: 1024 },
  { label: '768', value: 768 },
  { label: '512', value: 512 },
  { label: '256 (Min)', value: 256 },
];

export const EMBEDDING_REPEAT_OPTIONS = [
  { label: '1x (Single)', value: 1 },
  { label: '10x (Stability Test)', value: 10 },
  { label: '100x (Full Test)', value: 100 },
];

export type EmbeddingFile = {
  id: string;
  file: File;
  url: string;
  preview?: string;
  type: 'text' | 'image' | 'video';
  textContent?: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
};

export type EmbeddingResult = {
  index: number;
  type: 'text' | 'image' | 'video';
  embedding: number[];
  fileName?: string;
};

export type SimilarityResult = {
  item1Index: number;
  item2Index: number;
  item1Type: string;
  item2Type: string;
  item1Name: string;
  item2Name: string;
  cosineSimilarity: number;
  euclideanDistance: number;
};

// Stability statistics for repeated embeddings
export type StabilityStats = {
  itemIndex: number;
  itemName: string;
  itemType: string;
  repeatCount: number;
  cosine: {
    avg: number;
    min: number;
    max: number;
    stdDev: number;
  };
  euclidean: {
    avg: number;
    min: number;
    max: number;
    stdDev: number;
  };
  allEmbeddings: number[][];  // Store all embeddings for reference
};

// Image Generation Models
export type ImageGenModel = {
  id: string;
  name: string;
  description: string;
  provider: 'alibaba' | 'volcano';
};

export const IMAGE_GEN_MODELS: ImageGenModel[] = [
  {
    id: 'qwen-image-edit',
    name: 'Qwen Image Edit',
    description: 'Single-image modification, object addition/removal, style transfer',
    provider: 'alibaba',
  },
  {
    id: 'qwen-image-edit-plus-2025-12-15',
    name: 'Qwen Image Edit Plus 1215',
    description: 'Multi-image fusion, enhanced consistency, ControlNet support',
    provider: 'alibaba',
  },
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    description: 'Lightweight fast text-to-image, supports Chinese/English text rendering',
    provider: 'alibaba',
  },
  {
    id: 'wan2.6-image',
    name: 'Wan 2.6 Image',
    description: 'Mixed text-image output, latest generation model',
    provider: 'alibaba',
  },
  {
    id: 'wan2.5-i2i-preview',
    name: 'Wan 2.5 I2I',
    description: 'General editing with reference image fusion',
    provider: 'alibaba',
  },
  {
    id: 'doubao-seedream-4.0',
    name: 'Doubao Seedream 4.0',
    description: 'ByteDance advanced image generation with reference support',
    provider: 'volcano',
  },
];

// Image Generation Result
export type ImageGenResult = {
  modelId: string;
  modelName: string;
  imageUrls: string[];
  timestamp: number;
  responseTime: number;
  status: 'success' | 'error';
  error?: string;
};

// Image Generation Progress
export type ImageGenProgress = {
  modelId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  responseTime?: number;
  error?: string;
};

// Video Generation Types
export type VideoGenModel = {
  id: 'wan2.6-r2v' | 'wan2.6-i2v' | 'wan2.6-i2v-flash';
  name: string;
  description: string;
  provider: 'alibaba';
};

export const VIDEO_GEN_MODELS: VideoGenModel[] = [
  {
    id: 'wan2.6-r2v',
    name: 'Wan 2.6 R2V',
    description: 'Reference-to-video with character consistency, multi-shot narration, auto dubbing',
    provider: 'alibaba',
  },
  {
    id: 'wan2.6-i2v',
    name: 'Wan 2.6 I2V',
    description: 'Image-to-video with audio support, multi-shot narration',
    provider: 'alibaba',
  },
  {
    id: 'wan2.6-i2v-flash',
    name: 'Wan 2.6 I2V Flash',
    description: 'Faster image-to-video with audio sync, optimized for speed',
    provider: 'alibaba',
  },
];

// Video Generation Mode (determined by input files)
export type VideoGenMode = 'r2v' | 'i2v';

// Video Resolution Options for R2V (uses size parameter)
export const VIDEO_RESOLUTIONS_R2V = [
  { label: '720P 16:9', value: '1280*720' },
  { label: '720P 9:16', value: '720*1280' },
  { label: '720P 1:1', value: '960*960' },
  { label: '720P 4:3', value: '1088*832' },
  { label: '720P 3:4', value: '832*1088' },
  { label: '1080P 16:9', value: '1920*1080' },
  { label: '1080P 9:16', value: '1080*1920' },
  { label: '1080P 1:1', value: '1440*1440' },
  { label: '1080P 4:3', value: '1632*1248' },
  { label: '1080P 3:4', value: '1248*1632' },
];

// Video Resolution Options for I2V (uses resolution parameter)
export const VIDEO_RESOLUTIONS_I2V = [
  { label: '720P', value: '720P' },
  { label: '1080P', value: '1080P' },
];

// Video Duration Options
export const VIDEO_DURATIONS = [
  { label: '5 seconds', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '15 seconds', value: 15 },
];

// Video Shot Type Options
export const VIDEO_SHOT_TYPES = [
  { label: 'Single Shot', value: 'single' },
  { label: 'Multi-Shot (Auto Scene)', value: 'multi' },
];

export type VideoGenResult = {
  taskId: string;
  videoUrl?: string;
  timestamp: number;
  responseTime: number;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
};

// Media file for video generation (video, image, or audio)
export type MediaFile = {
  id: string;
  file: File;
  url: string;
  preview?: string;
  type: 'video' | 'image' | 'audio';
  status: 'pending' | 'uploading' | 'ready' | 'error';
};

// Legacy type for backwards compatibility
export type ReferenceVideo = MediaFile;

// Animate Tool Types
export type AnimateModel = {
  id: 'wan2.2-animate-move' | 'wan2.2-animate-mix';
  name: string;
  description: string;
  provider: 'alibaba';
};

export const ANIMATE_MODELS: AnimateModel[] = [
  {
    id: 'wan2.2-animate-move',
    name: 'Motion Transfer',
    description: 'Transfer video motion/expression to image character, keep character and background from image',
    provider: 'alibaba',
  },
  {
    id: 'wan2.2-animate-mix',
    name: 'Face Swap',
    description: 'Replace video character with image person, preserve video scene and lighting',
    provider: 'alibaba',
  },
];

// Animate Mode Options
export const ANIMATE_MODES = [
  { label: 'Standard', value: 'wan-std', description: 'Faster, cost-effective' },
  { label: 'Professional', value: 'wan-pro', description: 'Higher quality, smoother' },
];

export type AnimateResult = {
  taskId: string;
  videoUrl?: string;
  timestamp: number;
  responseTime: number;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  videoDuration?: number;
};

// ASR Tool Types
export type ASRModel = {
  id: string;
  name: string;
  description: string;
  provider: 'alibaba';
  apiType: 'openai-compat' | 'dashscope-sync' | 'dashscope-async' | 'tingwu-async';
  supportedLanguages: string[];
};

export const ASR_MODELS: ASRModel[] = [
  {
    id: 'qwen3-asr-flash',
    name: 'Qwen3-ASR-Flash',
    description: '千问3-ASR-Flash, 短音频实时识别(≤5min), 中英文',
    provider: 'alibaba',
    apiType: 'openai-compat',
    supportedLanguages: ['zh', 'en'],
  },
  {
    id: 'qwen3-asr-flash-filetrans',
    name: 'Qwen3-ASR-Flash-Filetrans',
    description: '千问3-ASR-Flash长音频版, 异步转写(≤12h), 30+语种, 情感识别',
    provider: 'alibaba',
    apiType: 'dashscope-async',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'de', 'fr', 'ru', 'yue', 'es', 'it', 'pt', 'ar', 'hi', 'id', 'th', 'tr', 'uk', 'vi', 'cs', 'da', 'fi', 'is', 'ms', 'no', 'pl', 'sv', 'fil', 'sichuan', 'minnan', 'wu'],
  },
  {
    id: 'tingwu-meeting',
    name: '听悟ASR',
    description: '通义听悟，支持多说话人分离识别',
    provider: 'alibaba',
    apiType: 'tingwu-async',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'yue'],
  },
  {
    id: 'paraformer-v2',
    name: 'Paraformer-V2',
    description: '端到端语音识别，支持多语种',
    provider: 'alibaba',
    apiType: 'dashscope-async',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'de', 'fr', 'ru'],
  },
  {
    id: 'paraformer-8k-v2',
    name: 'Paraformer-8K-V2',
    description: '8kHz采样率语音识别, 适用于电话/客服录音',
    provider: 'alibaba',
    apiType: 'dashscope-async',
    supportedLanguages: ['zh', 'en'],
  },
  {
    id: 'fun-asr',
    name: 'Fun-ASR',
    description: '支持歌唱识别、多方言、噪声鲁棒',
    provider: 'alibaba',
    apiType: 'dashscope-async',
    supportedLanguages: ['zh', 'yue', 'sichuan', 'en'],
  },
  {
    id: 'fun-asr-mtl',
    name: 'Fun-ASR-MTL',
    description: '多语种国际场景，多语言混合识别',
    provider: 'alibaba',
    apiType: 'dashscope-async',
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'de', 'fr', 'ru', 'es', 'it', 'pt'],
  },
];

export const ASR_LANGUAGES = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'yue', label: '粤语' },
  { value: 'sichuan', label: '四川话' },
  { value: 'minnan', label: '闽南语' },
  { value: 'wu', label: '吴语' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'ru', label: 'Русский' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'th', label: 'ไทย' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'uk', label: 'Українська' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'cs', label: 'Čeština' },
  { value: 'da', label: 'Dansk' },
  { value: 'fi', label: 'Suomi' },
  { value: 'is', label: 'Íslenska' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'no', label: 'Norsk' },
  { value: 'pl', label: 'Polski' },
  { value: 'sv', label: 'Svenska' },
  { value: 'fil', label: 'Filipino' },
];

export type ASRResult = {
  modelId: string;
  modelName: string;
  text: string;
  timestamp: number;
  responseTime: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  language?: string;
  confidence?: number;
};

export type ASRJudgeResult = {
  rankings: {
    rank: number;
    modelId: string;
    modelName: string;
    score: number;
    comment: string;
  }[];
  reasoning: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
};

export type AudioFile = {
  id: string;
  file: File;
  url: string;
  preview?: string;
  duration?: number;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  source: 'upload' | 'record';
};
