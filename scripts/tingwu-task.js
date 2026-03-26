/**
 * Tingwu ASR task script - called as child process from route.ts
 * Usage: node scripts/tingwu-task.js '<json args>'
 * Args: { accessKeyId, accessKeySecret, appKey, audioUrl, speakerCount, language }
 * Output: JSON { text, language, speakers } or { error }
 */

const args = JSON.parse(process.argv[2]);

async function main() {
  const Client = require('@alicloud/tingwu20230930').default;
  const {
    CreateTaskRequest,
    CreateTaskRequestInput,
    CreateTaskRequestParameters,
    CreateTaskRequestParametersTranscription,
    CreateTaskRequestParametersTranscriptionDiarization,
  } = require('@alicloud/tingwu20230930');
  const OpenApi = require('@alicloud/openapi-client');

  // Init client
  const config = new OpenApi.Config({
    accessKeyId: args.accessKeyId,
    accessKeySecret: args.accessKeySecret,
    regionId: 'cn-beijing',
  });
  config.endpoint = 'tingwu.cn-beijing.aliyuncs.com';
  const client = new Client(config);

  // Build create task request
  const input = new CreateTaskRequestInput({
    fileUrl: args.audioUrl,
    sourceLanguage: args.language || 'cn',
  });

  const diarization = new CreateTaskRequestParametersTranscriptionDiarization({
    speakerCount: args.speakerCount || 3,
  });

  const transcription = new CreateTaskRequestParametersTranscription({
    diarizationEnabled: true,
    diarization: diarization,
  });

  const parameters = new CreateTaskRequestParameters({
    transcription: transcription,
  });

  const createRequest = new CreateTaskRequest({
    appKey: args.appKey,
    type: 'offline',
    input: input,
    parameters: parameters,
  });

  console.error('[tingwu] Creating task...');
  const createResponse = await client.createTask(createRequest);

  if (createResponse.body?.code && createResponse.body.code !== '0') {
    throw new Error(`CreateTask failed: ${createResponse.body.message} (code: ${createResponse.body.code})`);
  }

  const taskId = createResponse.body?.data?.taskId;
  if (!taskId) {
    throw new Error('No taskId in createTask response: ' + JSON.stringify(createResponse.body));
  }
  console.error(`[tingwu] Task created: ${taskId}`);

  // Poll for result (max 5 minutes, check every 2s)
  const maxAttempts = 150;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const taskInfo = await client.getTaskInfo(taskId);
    const status = taskInfo.body?.data?.taskStatus;
    console.error(`[tingwu] Poll #${i + 1}: ${status}`);

    if (status === 'COMPLETE' || status === 'COMPLETED') {
      const transcriptionUrl = taskInfo.body?.data?.result?.transcription;
      if (!transcriptionUrl) {
        throw new Error('Task completed but no transcription URL. Result: ' + JSON.stringify(taskInfo.body?.data?.result));
      }

      console.error(`[tingwu] Fetching transcription: ${transcriptionUrl}`);
      const response = await fetch(transcriptionUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch transcription (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      return parseTranscription(data);
    } else if (status === 'FAILED') {
      const errMsg = taskInfo.body?.data?.errorMessage || taskInfo.body?.data?.errorCode || 'unknown error';
      throw new Error(`Tingwu task failed: ${errMsg}`);
    }
    // CREATED / RUNNING -> continue polling
  }

  throw new Error('Tingwu task timeout (5 min)');
}

/**
 * Parse Tingwu transcription JSON into text with speaker labels
 * Handles multiple response formats
 */
function parseTranscription(data) {
  let text = '';
  const speakers = new Set();

  // Format 1: data.Transcription.Paragraphs (common)
  const paragraphs =
    data?.Transcription?.Paragraphs ||
    data?.transcription?.paragraphs ||
    data?.Paragraphs ||
    data?.paragraphs;

  if (paragraphs && Array.isArray(paragraphs)) {
    for (const para of paragraphs) {
      const speakerId = para.SpeakerId || para.speakerId;
      if (speakerId !== undefined && speakerId !== null) {
        speakers.add(`Speaker${speakerId}`);
      }

      // Words can be a string or an array of word objects
      let paraText = '';
      const words = para.Words || para.words;
      if (typeof words === 'string') {
        paraText = words;
      } else if (Array.isArray(words)) {
        paraText = words.map(w => w.Text || w.text || '').join('');
      }

      if (paraText) {
        text += (speakerId !== undefined && speakerId !== null ? `[Speaker${speakerId}] ` : '') + paraText + '\n';
      }
    }
  }

  // Format 2: data.Transcription.Text (fallback)
  if (!text) {
    const directText = data?.Transcription?.Text || data?.transcription?.text || data?.text || data?.Text;
    if (directText) {
      text = directText;
    }
  }

  return {
    text: text.trim() || '(无识别结果)',
    language: args.language,
    speakers: [...speakers],
  };
}

main()
  .then(result => {
    console.log(JSON.stringify(result));
  })
  .catch(error => {
    console.log(JSON.stringify({ error: error.message || String(error) }));
    process.exit(1);
  });
