import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize clients for both providers
const volcanoClient = new OpenAI({
  apiKey: process.env.VOLCANO_ENGINE_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3', // Volcano Engine ARK API endpoint
});

const dashscopeClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.NEXT_PUBLIC_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface MessageContentText {
  type: 'text';
  text: string;
}

interface MessageContentImageUrl {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

interface ReviewRequest {
  modelId: string;
  personaPrompt: string;
  content: Array<MessageContentText | MessageContentImageUrl>;
}

export async function POST(req: NextRequest) {
  try {
    const { modelId, personaPrompt, content }: ReviewRequest = await req.json();

    // Validation
    if (!modelId || typeof modelId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or missing modelId',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!content || !Array.isArray(content) || content.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content array is required and must not be empty',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate API keys
    if (modelId.startsWith('doubao') && !process.env.VOLCANO_ENGINE_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Volcano Engine API key is not configured',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!modelId.startsWith('doubao') && !process.env.DASHSCOPE_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'DashScope API key is not configured',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine which client to use based on the model
    let client: OpenAI;
    let modelName: string;
    const isDoubaoModel = modelId.startsWith('doubao');

    if (isDoubaoModel) {
      client = volcanoClient;
      // For Volcano Engine ARK API, use the endpoint ID from environment variable
      // The endpoint ID is created in Volcano Engine console (e.g., ep-xxxxxxxxxxxxxxxxx)
      const endpointId = process.env.VOLCANO_ENGINE_ENDPOINT_ID;
      if (!endpointId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Volcano Engine endpoint ID is not configured. Please set VOLCANO_ENGINE_ENDPOINT_ID in .env.local',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      modelName = endpointId;
    } else {
      client = dashscopeClient;
      // Use the model ID as is for Alibaba Cloud models
      modelName = modelId;
    }

    // Prepare the messages for the API call
    // Handle content differently based on model provider
    const processedContent = content.map(item => {
      if (item.type === 'text') {
        return {
          type: 'text' as const,
          text: item.text || ''
        };
      } else {
        // Check if the URL is for a video or audio file
        const url = item.image_url.url;
        const fileExtension = url.split('.').pop()?.toLowerCase();
        
        // Check if it's a video file
        if (['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'].includes(fileExtension || '')) {
          // Both Qwen VL and Doubao Vision use video_url type with fps parameter
          return {
            type: 'video_url' as const,
            video_url: { url },
            fps: 2  // Sample 2 frames per second for efficient processing
          };
        } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fileExtension || '')) {
          // Audio files - only supported by some models
          if (isDoubaoModel) {
            // Doubao doesn't support audio, skip or send as-is
            return {
              type: 'image_url' as const,
              image_url: { url }
            };
          } else {
            // DashScope/Qwen models - use input_audio format
            return {
              type: 'input_audio' as const,
              input_audio: {
                data: url,
                format: fileExtension || 'mp3'
              }
            };
          }
        } else {
          // For image files, use image_url
          return {
            type: 'image_url' as const,
            image_url: item.image_url
          };
        }
      }
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: personaPrompt || 'You are a content review specialist. Analyze the provided content and provide a detailed review with findings.',
      },
      {
        role: 'user',
        content: processedContent as any,
      },
    ];

    // Make the API call with timeout
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await client.chat.completions.create({
        model: modelName,
        messages: messages,
        stream: false,
        temperature: 0.7,
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();

      const result = response.choices[0]?.message?.content || '';

      if (!result) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Model returned empty response',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          modelId,
          content: result,
          responseTime: endTime - startTime,
          tokenUsage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (apiError) {
      clearTimeout(timeoutId);
      
      if ((apiError as any).name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timeout - model took too long to respond',
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;
    
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body';
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific OpenAI API errors
      if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
        errorMessage = 'API authentication failed - please check your API keys';
        statusCode = 401;
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded - please try again later';
        statusCode = 429;
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Request timeout - model took too long to respond';
        statusCode = 504;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handler for comparison mode - multiple models in parallel
export async function PUT(req: NextRequest) {
  try {
    const { models, personaPrompt, content }: { 
      models: string[]; 
      personaPrompt: string; 
      content: Array<MessageContentText | MessageContentImageUrl>; 
    } = await req.json();

    // Validation
    if (!models || !Array.isArray(models) || models.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Models array is required and must not be empty',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (models.length > 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Maximum 10 models allowed for comparison',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!content || !Array.isArray(content) || content.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content array is required and must not be empty',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Run all model requests in parallel
    const results = await Promise.allSettled(
      models.map(async (modelId) => {
        // Create a new request for each model
        const requestBody = {
          modelId,
          personaPrompt,
          content,
        };

        // Make the request to the POST endpoint (self-call)
        const response = await fetch(`${req.nextUrl.origin}/api/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        return result;
      })
    );

    // Process results
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          modelId: models[index],
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        };
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        results: processedResults,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Comparison API Error:', error);
    
    let errorMessage = 'An unexpected error occurred during comparison';
    let statusCode = 500;
    
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body';
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}