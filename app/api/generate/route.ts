import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const VOLCANO_ENGINE_API_KEY = process.env.VOLCANO_ENGINE_API_KEY;

// Valid sizes for each model
const VALID_SIZES: Record<string, string[]> = {
  'wanx-v1': ['1024*1024', '720*1280', '768*1152', '1280*720'],
  // wan2.6-t2i: total pixels in [1280*1280, 1440*1440]
  'wan2.6-t2i': ['1280*1280', '1104*1472', '1472*1104', '960*1696', '1696*960'],
  // wan2.6-image: total pixels in [768*768, 1280*1280]
  'wan2.6-image': ['1280*1280', '1024*1024', '800*1200', '1200*800', '960*1280', '1280*960', '720*1280', '1280*720'],
};

// Normalize size format (convert 1024x1024 to 1024*1024)
function normalizeSize(size: string): string {
  return size.replace(/x/gi, '*');
}

// Get valid size for model, fallback to default if invalid
function getValidSize(modelId: string, requestedSize: string, hasImage: boolean): string {
  const normalizedSize = normalizeSize(requestedSize);
  
  // Determine which size list to use
  let validSizes: string[];
  if (modelId === 'wan2.6-image') {
    validSizes = hasImage ? VALID_SIZES['wan2.6-image'] : VALID_SIZES['wan2.6-t2i'];
  } else {
    validSizes = VALID_SIZES['wanx-v1'];
  }
  
  if (validSizes.includes(normalizedSize)) {
    return normalizedSize;
  }
  // Return default size for the model
  return validSizes[0];
}

// Retry with exponential backoff for rate limiting
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited (429), wait and retry
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt); // Exponential backoff
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

// Upload image from URL to OSS and return the OSS URL
async function uploadImageToOSS(imageUrl: string, modelId: string): Promise<string> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image from ${imageUrl}: ${response.status}`);
      return imageUrl; // Return original URL if fetch fails
    }
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Determine file extension from content-type or URL
    const contentType = response.headers.get('content-type') || 'image/png';
    const extMap: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const ext = extMap[contentType] || '.png';
    
    // Generate unique filename
    const fileName = `pic/generated/${modelId}/${randomUUID()}${ext}`;
    
    // Import and use ali-oss
    const OSS: any = (await import('ali-oss')).default;
    
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const bucket = process.env.ALIYUN_OSS_BUCKET_NAME;
    const region = process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing';
    
    if (!accessKeyId || !accessKeySecret || !bucket) {
      console.error('Missing OSS configuration, returning original URL');
      return imageUrl;
    }
    
    const client = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure: true,
    });
    
    const result: any = await client.put(fileName, Buffer.from(bytes));
    console.log(`[OSS] Uploaded ${modelId} image to: ${result.url}`);
    
    return result.url;
  } catch (error) {
    console.error(`Failed to upload image to OSS:`, error);
    return imageUrl; // Return original URL on error
  }
}

// Image generation API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { models, prompt, imageUrl, size, n } = body;

    if (!models || !Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No models specified' },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'DASHSCOPE_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Execute all model calls in parallel
    const results = await Promise.all(
      models.map(async (modelId: string) => {
        const startTime = Date.now();
        
        // Log the input for debugging - ensure single image
        console.log(`[${modelId}] Starting generation with:`, {
          prompt: prompt.substring(0, 50) + '...',
          imageUrl: imageUrl ? 'provided (single image)' : 'none',
          size: size || '1024*1024',
          n: n || 1,
        });
        
        try {
          // Get valid size for this model
          const validSize = getValidSize(modelId, size || '1024*1024', !!imageUrl);
          
          // Call DashScope image generation API
          // Pass imageUrl directly - it's a string (immutable) so no risk of mutation
          const response = await callDashScopeImageGen({
            modelId,
            prompt,
            imageUrl,  // Single image URL or undefined
            size: validSize,
            n: n || 1,
            apiKey: DASHSCOPE_API_KEY!,
          });

          const responseTime = Date.now() - startTime;
          console.log(`[${modelId}] Completed in ${responseTime}ms, generated ${response.imageUrls.length} images`);

          // Upload generated images to OSS for permanent storage
          const ossUrls = await Promise.all(
            response.imageUrls.map(url => uploadImageToOSS(url, modelId))
          );
          console.log(`[${modelId}] Uploaded ${ossUrls.length} images to OSS`);

          return {
            modelId,
            modelName: getModelName(modelId),
            imageUrls: ossUrls,
            timestamp: Date.now(),
            responseTime,
            status: 'success',
          };
        } catch (error) {
          const responseTime = Date.now() - startTime;
          console.error(`Error generating images for model ${modelId}:`, error);
          
          return {
            modelId,
            modelName: getModelName(modelId),
            imageUrls: [],
            timestamp: Date.now(),
            responseTime,
            status: 'error',
            error: error instanceof Error ? error.message : 'Generation failed',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Helper function to call DashScope image generation API
async function callDashScopeImageGen({
  modelId,
  prompt,
  imageUrl,
  size,
  n,
  apiKey,
}: {
  modelId: string;
  prompt: string;
  imageUrl?: string;
  size: string;
  n: number;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  // Route to appropriate API based on model
  
  // doubao-seedream-4.0: uses Volcano Engine ARK API
  if (modelId === 'doubao-seedream-4.0') {
    if (!VOLCANO_ENGINE_API_KEY) {
      throw new Error('VOLCANO_ENGINE_API_KEY is not configured');
    }
    return callDoubaoSeedreamAPI({ prompt, imageUrl, size, n, apiKey: VOLCANO_ENGINE_API_KEY });
  }
  
  // wan2.6-image: uses multimodal-generation API
  if (modelId === 'wan2.6-image') {
    if (imageUrl) {
      return callWan26ImageEditAPI({ prompt, imageUrl, size, n, apiKey });
    } else {
      return callWan26T2IAPI({ prompt, size, n, apiKey });
    }
  }
  
  // qwen-image-edit / qwen-image-edit-plus: uses multimodal-generation API with messages format
  if (modelId === 'qwen-image-edit' || modelId === 'qwen-image-edit-plus-2025-12-15') {
    return callQwenImageEditAPI({ modelId, prompt, imageUrl, size, n, apiKey });
  }
  
  // z-image-turbo: lightweight text-to-image model
  if (modelId === 'z-image-turbo') {
    return callZImageTurboAPI({ prompt, size, apiKey });
  }
  
  // wan2.5-i2i-preview: uses image2image/image-synthesis API with prompt + images format
  if (modelId === 'wan2.5-i2i-preview') {
    return callWan25I2IAPI({ prompt, imageUrl, size, n, apiKey });
  }
  
  throw new Error(`Unknown model: ${modelId}`);
}

// Call Doubao Seedream 4.0 API (Volcano Engine)
async function callDoubaoSeedreamAPI({
  prompt,
  imageUrl,
  size,
  n,
  apiKey,
}: {
  prompt: string;
  imageUrl?: string;
  size: string;
  n: number;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  // Map size to Doubao format (supports: 1K, 2K, 4K, or WxH format)
  const sizeMapping: Record<string, string> = {
    '512*512': '1K',
    '768*768': '1K',
    '1024*1024': '2K',
    '1280*1280': '2K',
    '1536*1024': '2K',
    '1024*1536': '2K',
    '2048*2048': '4K',
  };
  const normalizedSize = normalizeSize(size);
  const doubaoSize = sizeMapping[normalizedSize] || '2K';

  // IMPORTANT: Create fresh request body each call, only add ONE image if provided
  const requestBody: any = {
    model: 'doubao-seedream-4-0-250828',
    prompt: prompt,
    response_format: 'url',
    size: doubaoSize,
    stream: false,
    watermark: false,
    sequential_image_generation: 'disabled',
  };

  // Add reference image if provided - ONLY ONE
  if (imageUrl) {
    requestBody.image = imageUrl;
  }
  
  console.log(`[doubao-seedream-4.0] Building request with image: ${imageUrl ? 'yes (1)' : 'no'}`);

  // Doubao generates one image at a time, so we need to make multiple requests
  const imageUrls: string[] = [];
  const requestCount = Math.min(n, 4); // Limit to 4 images

  for (let i = 0; i < requestCount; i++) {
    const response = await fetchWithRetry('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Volcano Engine API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract image URL from response
    if (data.data && data.data.length > 0 && data.data[0].url) {
      imageUrls.push(data.data[0].url);
    } else if (data.error) {
      throw new Error(`${data.error.code}: ${data.error.message}`);
    }
  }

  if (imageUrls.length === 0) {
    throw new Error('No images generated from Doubao Seedream API');
  }

  return { imageUrls };
}

// Call Qwen Image Edit API (qwen-image-edit / qwen-image-edit-plus)
// Uses multimodal-generation endpoint with messages format
async function callQwenImageEditAPI({
  modelId,
  prompt,
  imageUrl,
  size,
  n,
  apiKey,
}: {
  modelId: string;
  prompt: string;
  imageUrl?: string;
  size: string;
  n: number;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  // Build content array: image first (if provided), then text
  // IMPORTANT: Create fresh array each call, only add ONE image if provided
  const content: any[] = [];
  if (imageUrl) {
    content.push({ image: imageUrl });
  }
  content.push({ text: prompt });
  
  // Verify: should have at most 1 image + 1 text
  const imageCount = content.filter(c => c.image).length;
  console.log(`[${modelId}] Building request with ${imageCount} image(s) in content array`);

  const requestBody: any = {
    model: modelId,
    input: {
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    },
    parameters: {
      n: Math.min(n, modelId === 'qwen-image-edit' ? 1 : 6), // qwen-image-edit only supports 1
      negative_prompt: '低质量',
      prompt_extend: true,
      watermark: false,
    },
  };

  // Add size parameter only for qwen-image-edit-plus
  if (modelId === 'qwen-image-edit-plus-2025-12-15') {
    requestBody.parameters.size = size;
  }

  const response = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Handle synchronous response from qwen-image-edit
  if (data.output && data.output.choices) {
    const imageUrls: string[] = [];
    for (const choice of data.output.choices) {
      if (choice.message && choice.message.content) {
        for (const item of choice.message.content) {
          if (item.image) {
            imageUrls.push(item.image);
          }
        }
      }
    }
    return { imageUrls };
  } else if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  } else {
    throw new Error('Unexpected response format from Qwen Image Edit API');
  }
}

// Call Z-Image Turbo API (lightweight text-to-image)
// Uses multimodal-generation endpoint with messages format (sync)
async function callZImageTurboAPI({
  prompt,
  size,
  apiKey,
}: {
  prompt: string;
  size: string;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  console.log(`[z-image-turbo] Building request with prompt: ${prompt.substring(0, 50)}...`);

  const requestBody: any = {
    model: 'z-image-turbo',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { text: prompt },
          ],
        },
      ],
    },
    parameters: {
      prompt_extend: false,
    },
  };

  // Add size parameter if specified and not 'auto'
  if (size && size !== 'auto') {
    requestBody.parameters.size = size;
    console.log(`[z-image-turbo] Adding size parameter: ${size}`);
  }

  const response = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Handle synchronous response
  if (data.output && data.output.choices) {
    const imageUrls: string[] = [];
    for (const choice of data.output.choices) {
      if (choice.message && choice.message.content) {
        for (const item of choice.message.content) {
          if (item.image) {
            imageUrls.push(item.image);
          }
        }
      }
    }
    if (imageUrls.length === 0) {
      throw new Error('No images generated from Z-Image Turbo API');
    }
    console.log(`[z-image-turbo] Generated ${imageUrls.length} image(s)`);
    return { imageUrls };
  } else if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  } else {
    throw new Error('Unexpected response format from Z-Image Turbo API');
  }
}

// Call Wan 2.5 Image-to-Image API
// Uses image2image/image-synthesis endpoint with prompt + images format (async)
async function callWan25I2IAPI({
  prompt,
  imageUrl,
  size,
  n,
  apiKey,
}: {
  prompt: string;
  imageUrl?: string;
  size: string;
  n: number;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  // Build images array - IMPORTANT: only add ONE image if provided
  const images: string[] = [];
  if (imageUrl) {
    images.push(imageUrl);
  }
  
  // Verify: should have at most 1 image
  console.log(`[wan2.5-i2i-preview] Building request with ${images.length} image(s) in images array`);

  const requestBody: any = {
    model: 'wan2.5-i2i-preview',
    input: {
      prompt: prompt,
      images: images,
    },
    parameters: {
      size: size,
      n: Math.min(n, 4), // wan2.5 supports max 4
      prompt_extend: true,
      watermark: false,
    },
  };

  // wan2.5-i2i requires async call
  const response = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Handle async task
  if (data.output && data.output.task_id) {
    const taskId = data.output.task_id;
    const imageUrls = await pollTaskStatus(taskId, apiKey);
    return { imageUrls };
  } else if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  } else {
    throw new Error('Unexpected response format from Wan2.5 I2I API');
  }
}

// Call Wan 2.6 Text-to-Image API (no image input allowed)
async function callWan26T2IAPI({
  prompt,
  size,
  n,
  apiKey,
}: {
  prompt: string;
  size: string;
  n: number;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  const requestBody = {
    model: 'wan2.6-t2i',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { text: prompt },
          ],
        },
      ],
    },
    parameters: {
      size: size,
      n: n,
      prompt_extend: true,
      watermark: false,
    },
  };

  // Wan2.6-t2i supports synchronous call with retry
  const response = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Handle synchronous response from wan2.6
  if (data.output && data.output.choices) {
    const imageUrls: string[] = [];
    for (const choice of data.output.choices) {
      if (choice.message && choice.message.content) {
        for (const item of choice.message.content) {
          if (item.type === 'image' && item.image) {
            imageUrls.push(item.image);
          }
        }
      }
    }
    return { imageUrls };
  } else if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  } else {
    throw new Error('Unexpected response format from Wan2.6 T2I API');
  }
}

// Call Wan 2.6 Image Edit API (requires 1-4 image inputs)
async function callWan26ImageEditAPI({
  prompt,
  imageUrl,
  size,
  n,
  apiKey,
}: {
  prompt: string;
  imageUrl: string;
  size: string;
  n: number;
  apiKey: string;
}): Promise<{ imageUrls: string[] }> {
  // Build content array with text first, then ONLY ONE image
  const content: any[] = [
    { text: prompt },
    { image: imageUrl },
  ];
  
  // Verify: should have exactly 1 image
  const imageCount = content.filter(c => c.image).length;
  console.log(`[wan2.6-image] Building request with ${imageCount} image(s) in content array`);

  const requestBody = {
    model: 'wan2.6-image',
    input: {
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    },
    parameters: {
      size: size,
      n: Math.min(n, 4), // max 4 for image editing
      enable_interleave: false, // image editing mode
      prompt_extend: true,
      watermark: false,
    },
  };

  // Wan2.6-image supports synchronous call with retry
  const response = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Handle synchronous response from wan2.6-image
  if (data.output && data.output.choices) {
    const imageUrls: string[] = [];
    for (const choice of data.output.choices) {
      if (choice.message && choice.message.content) {
        for (const item of choice.message.content) {
          if (item.type === 'image' && item.image) {
            imageUrls.push(item.image);
          }
        }
      }
    }
    return { imageUrls };
  } else if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  } else {
    throw new Error('Unexpected response format from Wan2.6 Image Edit API');
  }
}

// Poll task status for async generation
async function pollTaskStatus(taskId: string, apiKey: string, maxAttempts: number = 60): Promise<string[]> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Task status check failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.output && data.output.task_status === 'SUCCEEDED') {
      if (data.output.results && Array.isArray(data.output.results)) {
        return data.output.results.map((result: any) => result.url);
      } else {
        throw new Error('No results in completed task');
      }
    } else if (data.output && data.output.task_status === 'FAILED') {
      throw new Error(data.output.message || 'Task failed');
    }

    attempts++;
  }

  throw new Error('Task polling timeout');
}

// Get friendly model name
function getModelName(modelId: string): string {
  const names: Record<string, string> = {
    'qwen-image-edit': 'Qwen Image Edit',
    'qwen-image-edit-plus-2025-12-15': 'Qwen Image Edit Plus 1215',
    'z-image-turbo': 'Z-Image Turbo',
    'wan2.6-image': 'Wan 2.6 Image',
    'wan2.5-i2i-preview': 'Wan 2.5 I2I',
  };
  return names[modelId] || modelId;
}
