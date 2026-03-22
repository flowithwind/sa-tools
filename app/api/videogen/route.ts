import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

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
      
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
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

// Upload video from URL to OSS and return the OSS URL
async function uploadVideoToOSS(videoUrl: string): Promise<string> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error(`Failed to fetch video from ${videoUrl}: ${response.status}`);
      return videoUrl;
    }
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const extMap: Record<string, string> = {
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/mpeg': '.mpeg',
    };
    const ext = extMap[contentType] || '.mp4';
    
    const fileName = `pic/generated/wan2.6-r2v/${randomUUID()}${ext}`;
    
    const OSS: any = (await import('ali-oss')).default;
    
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const bucket = process.env.ALIYUN_OSS_BUCKET_NAME;
    const region = process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing';
    
    if (!accessKeyId || !accessKeySecret || !bucket) {
      console.error('Missing OSS configuration, returning original URL');
      return videoUrl;
    }
    
    const client = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure: true,
    });
    
    const result: any = await client.put(fileName, Buffer.from(bytes));
    console.log(`[OSS] Uploaded video to: ${result.url}`);
    
    return result.url;
  } catch (error) {
    console.error(`Failed to upload video to OSS:`, error);
    return videoUrl;
  }
}

// Create video generation task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      mode, // 'r2v' or 'i2v'
      model, // Specific model ID (e.g., 'wan2.6-i2v-flash')
      prompt, 
      // R2V specific
      referenceVideoUrls, 
      size, 
      // I2V specific
      imageUrl,
      audioUrl,
      resolution,
      // Shared
      duration, 
      shotType,
      negativePrompt,
      watermark,
      seed 
    } = body;

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

    const startTime = Date.now();
    let requestBody: any;
    let logPrefix: string;

    if (mode === 'i2v') {
      // Image-to-Video mode (wan2.6-i2v or wan2.6-i2v-flash)
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, error: 'Image URL is required for I2V mode' },
          { status: 400 }
        );
      }

      const modelId = model || 'wan2.6-i2v-flash';
      logPrefix = `[${modelId}]`;
      
      requestBody = {
        model: modelId,
        input: {
          prompt: prompt.trim(),
          img_url: imageUrl,
        },
        parameters: {
          resolution: resolution || '1080P',
          duration: duration || 5,
          watermark: watermark ?? false,
        },
      };

      // Add optional audio URL for audio-driven video generation
      if (audioUrl) {
        requestBody.input.audio_url = audioUrl;
      }

      // Add optional parameters
      if (negativePrompt && negativePrompt.trim()) {
        requestBody.input.negative_prompt = negativePrompt.trim();
      }

      if (seed !== undefined && seed !== null) {
        requestBody.parameters.seed = seed;
      }

      console.log(`${logPrefix} Creating video generation task with:`, {
        prompt: prompt.substring(0, 50) + '...',
        hasAudio: !!audioUrl,
        resolution,
        duration,
      });
    } else {
      // Reference-to-Video mode (wan2.6-r2v) - default
      if (!referenceVideoUrls || !Array.isArray(referenceVideoUrls) || referenceVideoUrls.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one reference video is required' },
          { status: 400 }
        );
      }

      if (referenceVideoUrls.length > 3) {
        return NextResponse.json(
          { success: false, error: 'Maximum 3 reference videos allowed' },
          { status: 400 }
        );
      }

      const modelId = model || 'wan2.6-r2v';
      logPrefix = `[${modelId}]`;
      
      requestBody = {
        model: modelId,
        input: {
          prompt: prompt.trim(),
          reference_video_urls: referenceVideoUrls,
        },
        parameters: {
          size: size || '1920*1080',
          duration: duration || 5,
          shot_type: shotType || 'single',
          watermark: watermark ?? false,
        },
      };

      // Add optional parameters
      if (negativePrompt && negativePrompt.trim()) {
        requestBody.input.negative_prompt = negativePrompt.trim();
      }

      if (seed !== undefined && seed !== null) {
        requestBody.parameters.seed = seed;
      }

      console.log(`${logPrefix} Creating video generation task with:`, {
        prompt: prompt.substring(0, 50) + '...',
        referenceVideoCount: referenceVideoUrls.length,
        size,
        duration,
        shotType,
      });
    }

    // Create async task
    const response = await fetchWithRetry(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} API error:`, errorText);
      throw new Error(`DashScope API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data.output && data.output.task_id) {
      const responseTime = Date.now() - startTime;
      console.log(`${logPrefix} Task created: ${data.output.task_id} in ${responseTime}ms`);

      return NextResponse.json({
        success: true,
        taskId: data.output.task_id,
        status: data.output.task_status || 'PENDING',
        responseTime,
        mode: mode || 'r2v',
        model: requestBody.model,
      });
    } else if (data.code) {
      throw new Error(`${data.code}: ${data.message}`);
    } else {
      throw new Error('Unexpected response format from API');
    }
  } catch (error) {
    console.error('VideoGen API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Poll task status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 }
      );
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'DASHSCOPE_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Task status check failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data.output) {
      const taskStatus = data.output.task_status;
      let videoUrl: string | undefined;

      // If task succeeded, get the video URL and upload to OSS
      if (taskStatus === 'SUCCEEDED' && data.output.video_url) {
        console.log('[videogen] Task succeeded, uploading to OSS...');
        videoUrl = await uploadVideoToOSS(data.output.video_url);
      }

      return NextResponse.json({
        success: true,
        taskId,
        status: taskStatus,
        videoUrl,
        message: data.output.message,
      });
    } else if (data.code) {
      throw new Error(`${data.code}: ${data.message}`);
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    console.error('VideoGen status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Status check failed' 
      },
      { status: 500 }
    );
  }
}
