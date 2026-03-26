import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

// Model API configuration
const MODEL_CONFIGS: Record<string, {
  apiType: 'openai-compat' | 'dashscope-sync' | 'dashscope-async' | 'tingwu-async';
  endpoint?: string;
}> = {
  'qwen3-asr-flash': { apiType: 'openai-compat' },
  'qwen3-asr-flash-filetrans': { apiType: 'dashscope-async' },
  'tingwu-meeting': { apiType: 'tingwu-async' },
  'paraformer-v2': { apiType: 'dashscope-async' },
  'paraformer-8k-v2': { apiType: 'dashscope-async' },
  'fun-asr': { apiType: 'dashscope-async' },
  'fun-asr-mtl': { apiType: 'dashscope-async' },
};

// Call OpenAI compatible API (qwen3-asr-flash)
async function callOpenAICompatible(audioUrl: string, modelId: string, language?: string, enableITN?: boolean) {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: audioUrl
              }
            }
          ]
        }
      ],
      stream: false,
      asr_options: {
        language: language || undefined,
        enable_itn: enableITN !== false,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return {
      text: data.choices[0].message.content || '',
      language: language,
    };
  }
  
  throw new Error('Unexpected response format from OpenAI compatible API');
}

// Call DashScope sync API (qwen-audio-asr)
async function callDashScopeSync(audioUrl: string, modelId: string, language?: string) {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { audio: audioUrl },
              { text: '请将这段音频转换为文字。' }
            ]
          }
        ]
      },
      parameters: {}
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope sync API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (data.output && data.output.choices && data.output.choices[0]) {
    const message = data.output.choices[0].message;
    return {
      text: message?.content?.[0]?.text || message?.content || '',
      language: language,
    };
  }
  
  if (data.code) {
    throw new Error(`${data.code}: ${data.message}`);
  }
  
  throw new Error('Unexpected response format from DashScope sync API');
}

// Call DashScope async API (paraformer, fun-asr, qwen3-asr-flash-filetrans)
async function callDashScopeAsync(audioUrl: string, modelId: string, language?: string, enableITN?: boolean) {
  // qwen3-asr-flash-filetrans: file_url (singular), no ITN, no language_hints
  const isFiletrans = modelId === 'qwen3-asr-flash-filetrans';
  const input = isFiletrans
    ? { file_url: audioUrl }
    : { file_urls: [audioUrl] };
  const parameters = isFiletrans
    ? {
        channel_id: [0],
        enable_itn: false,
        enable_words: true,
      }
    : {
        language_hints: language ? [language] : undefined,
      };

  const requestBody = { model: modelId, input, parameters };
  console.log(`[ASR] Submitting ${modelId} task, body:`, JSON.stringify(requestBody));

  // Submit transcription task
  const submitResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`DashScope async submit error (${submitResponse.status}): ${errorText}`);
  }

  const submitData = await submitResponse.json();
  
  if (submitData.code) {
    throw new Error(`${submitData.code}: ${submitData.message}`);
  }

  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error('No task_id in response');
  }

  // Poll for result
  // filetrans supports up to 12h audio, allow longer polling
  const maxAttempts = isFiletrans ? 600 : 60;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const statusResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-Async': 'enable',
        'Content-Type': 'application/json',
      },
    });

    if (!statusResponse.ok) {
      continue; // Retry on error
    }

    const statusData = await statusResponse.json();
    const taskStatus = statusData.output?.task_status;

    if (taskStatus === 'SUCCEEDED') {
      const outputJson = JSON.stringify(statusData.output);
      console.log(`[ASR] Task ${taskId} SUCCEEDED, output (${outputJson.length} chars):`, outputJson.substring(0, 2000));

      // Helper: extract text from transcripts array
      const extractFromTranscripts = (transcripts: any[]): string => {
        let text = '';
        for (const transcript of transcripts) {
          if (transcript.sentences) {
            for (const sentence of transcript.sentences) {
              text += sentence.text || '';
            }
          } else if (transcript.text) {
            text += transcript.text;
          }
        }
        return text;
      };

      // Path 1: transcripts directly in results[0] or result (filetrans pattern)
      const resultItem = statusData.output?.results?.[0] || statusData.output?.result;
      if (resultItem?.transcripts) {
        const text = extractFromTranscripts(resultItem.transcripts);
        if (text) return { text, language };
      }

      // Path 2: transcription_url -> fetch JSON
      const transcriptionUrl =
        resultItem?.transcription_url ||
        statusData.output?.transcription_url;

      if (transcriptionUrl) {
        console.log(`[ASR] Fetching transcription_url:`, transcriptionUrl);
        const transcriptionResponse = await fetch(transcriptionUrl);
        if (transcriptionResponse.ok) {
          const transcriptionData = await transcriptionResponse.json();
          console.log(`[ASR] Transcription data keys:`, Object.keys(transcriptionData));
          let fullText = '';
          if (transcriptionData.transcripts) {
            fullText = extractFromTranscripts(transcriptionData.transcripts);
          }
          if (!fullText && transcriptionData.text) {
            fullText = transcriptionData.text;
          }
          if (fullText) return { text: fullText, language };
        }
      }

      // Path 3: direct text in results or output
      const directText = resultItem?.text || statusData.output?.text;
      if (directText) {
        return { text: directText, language };
      }

      // Last resort: dump raw output for debugging
      console.error(`[ASR] Cannot extract text from task ${taskId}, full output:`, outputJson);
      return { text: '(无法获取识别结果)', language };
    } else if (taskStatus === 'FAILED') {
      throw new Error(statusData.output?.message || 'Transcription task failed');
    }
    // Continue polling if PENDING or RUNNING
  }

  throw new Error('Transcription task timeout');
}

// Call Tingwu async API using official SDK via child process
async function callTingwuAsync(audioUrl: string, speakerCount?: number, language?: string) {
  const TINGWU_APP_KEY = process.env.TINGWU_APP_KEY;
  const ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID;
  const ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET;
  
  if (!TINGWU_APP_KEY) {
    throw new Error('TINGWU_APP_KEY not configured. Please get AppKey from https://tingwu.console.aliyun.com/');
  }
  
  if (!ALIYUN_ACCESS_KEY_ID || !ALIYUN_ACCESS_KEY_SECRET) {
    throw new Error('ALIYUN_ACCESS_KEY_ID and ALIYUN_ACCESS_KEY_SECRET are required for Tingwu API');
  }

  const { spawn } = require('child_process');
  const path = require('path');
  
  const scriptPath = path.join(process.cwd(), 'scripts', 'tingwu-task.js');
  const args = JSON.stringify({
    accessKeyId: ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: ALIYUN_ACCESS_KEY_SECRET,
    appKey: TINGWU_APP_KEY,
    audioUrl,
    speakerCount: 3,
    language: language === 'en' ? 'en' : 'cn',
  });

  console.log('[ASR] Calling Tingwu via script...');
  
  return new Promise<{ text: string; language?: string; speakers?: string[] }>((resolve, reject) => {
    const child = spawn('node', [scriptPath, args], {
      timeout: 300000, // 5 minutes timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      console.log('[ASR] Tingwu script stderr:', data.toString());
    });

    child.on('close', (code: number) => {
      console.log('[ASR] Tingwu script stdout:', stdout);
      if (code !== 0) {
        console.error('[ASR] Tingwu script error:', stderr);
        try {
          const parsed = JSON.parse(stdout);
          reject(new Error(parsed.error || `Script exited with code ${code}`));
        } catch {
          reject(new Error(`Tingwu script error: ${stderr || stdout || `exit code ${code}`}`));
        }
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          reject(new Error(parsed.error));
        } else {
          resolve(parsed);
        }
      } catch {
        reject(new Error(`Failed to parse Tingwu result: ${stdout}`));
      }
    });

    child.on('error', (err: Error) => {
      reject(new Error(`Tingwu script spawn error: ${err.message}`));
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl, modelId, language, enableITN } = body;

    // Validate inputs
    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Audio URL is required' },
        { status: 400 }
      );
    }

    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'Model ID is required' },
        { status: 400 }
      );
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'DASHSCOPE_API_KEY not configured' },
        { status: 500 }
      );
    }

    const modelConfig = MODEL_CONFIGS[modelId];
    if (!modelConfig) {
      return NextResponse.json(
        { success: false, error: `Unknown model: ${modelId}` },
        { status: 400 }
      );
    }

    console.log(`[ASR] Starting recognition with model ${modelId}, apiType: ${modelConfig.apiType}`);
    const startTime = Date.now();

    let result;
    switch (modelConfig.apiType) {
      case 'openai-compat':
        result = await callOpenAICompatible(audioUrl, modelId, language, enableITN);
        break;
      case 'dashscope-sync':
        result = await callDashScopeSync(audioUrl, modelId, language);
        break;
      case 'dashscope-async':
        result = await callDashScopeAsync(audioUrl, modelId, language, enableITN);
        break;
      case 'tingwu-async':
        result = await callTingwuAsync(audioUrl, undefined, language);
        break;
      default:
        throw new Error(`Unknown API type: ${modelConfig.apiType}`);
    }

    const responseTime = Date.now() - startTime;
    console.log(`[ASR] Model ${modelId} completed in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      text: result.text,
      language: result.language,
      modelId,
      responseTime,
    });

  } catch (error) {
    console.error('[ASR] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
