/**
 * 音频处理工具 - 将音频转换为 MP3 并压缩到指定大小以下
 */

// 动态导入 lamejs 以避免 SSR 问题
async function getLamejs() {
  const lamejs = await import('lamejs');
  return lamejs;
}

/**
 * 将 AudioBuffer 转换为 MP3 Blob
 * @param audioBuffer - Web Audio API 的 AudioBuffer
 * @param kbps - MP3 比特率，默认 128
 * @returns MP3 Blob
 */
async function audioBufferToMp3(audioBuffer: AudioBuffer, kbps: number = 128): Promise<Blob> {
  const lame = await getLamejs();
  const mp3encoder = new lame.Mp3Encoder(1, audioBuffer.sampleRate, kbps);
  
  // 获取音频数据（单声道）
  const samples = audioBuffer.getChannelData(0);
  
  // 转换为 16 位整数
  const sampleBlockSize = 1152;
  const mp3Data: Int8Array[] = [];
  
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const int16Chunk = new Int16Array(sampleChunk.length);
    
    for (let j = 0; j < sampleChunk.length; j++) {
      // 将 -1.0 ~ 1.0 的浮点数转换为 -32768 ~ 32767 的整数
      const s = Math.max(-1, Math.min(1, sampleChunk[j]));
      int16Chunk[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const mp3buf = mp3encoder.encodeBuffer(int16Chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  // 刷新编码器
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  
  // 合并所有 MP3 数据
  const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buf of mp3Data) {
    result.set(buf, offset);
    offset += buf.length;
  }
  
  return new Blob([result], { type: 'audio/mp3' });
}

/**
 * 解码音频文件为 AudioBuffer
 * @param file - 音频文件
 * @param audioContext - AudioContext 实例
 * @returns AudioBuffer
 */
async function decodeAudioFile(file: File, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * 将音频文件转换为 MP3 格式并压缩到指定大小以下
 * @param file - 原始音频文件
 * @param maxSizeMB - 最大文件大小（MB），默认 10
 * @returns 处理后的 MP3 File 对象
 */
export async function convertToMp3AndCompress(
  file: File, 
  maxSizeMB: number = 10
): Promise<File> {
  // 如果已经是 MP3 且文件大小符合要求，直接返回
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.type === 'audio/mp3' || file.type === 'audio/mpeg') {
    if (file.size <= maxSizeBytes) {
      return file;
    }
  }

  // 创建 AudioContext
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    // 解码音频
    const audioBuffer = await decodeAudioFile(file, audioContext);
    
    // 计算音频时长
    const duration = audioBuffer.duration;
    
    // 估算需要的比特率（kbps）
    // MP3 文件大小 ≈ (比特率(kbps) * 时长(秒)) / 8 / 1024 (MB)
    // 目标比特率 = (目标大小(MB) * 8 * 1024 * 1024) / 时长(秒) / 1000
    const targetBitrate = Math.floor((maxSizeBytes * 8) / duration / 1000);
    
    // 限制比特率范围：64kbps（最低）到 320kbps（最高）
    const kbps = Math.max(64, Math.min(320, targetBitrate));
    
    // 转换为 MP3
    const mp3Blob = await audioBufferToMp3(audioBuffer, kbps);
    
    // 如果转换后仍然超过限制，尝试更低的比特率
    if (mp3Blob.size > maxSizeBytes && kbps > 64) {
      // 递归调用，使用更低的比特率
      const lowerKbps = Math.max(64, Math.floor(kbps * 0.8));
      const recompressedBlob = await audioBufferToMp3(audioBuffer, lowerKbps);
      
      // 创建新的 File 对象
      const fileName = file.name.replace(/\.[^/.]+$/, '') + '.mp3';
      return new File([recompressedBlob], fileName, { type: 'audio/mp3' });
    }
    
    // 创建新的 File 对象
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '.mp3';
    return new File([mp3Blob], fileName, { type: 'audio/mp3' });
    
  } finally {
    // 关闭 AudioContext
    await audioContext.close();
  }
}

/**
 * 获取音频文件的时长
 * @param file - 音频文件
 * @returns 时长（秒）
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('无法读取音频时长'));
    };
    
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * 格式化时长为 mm:ss 格式
 * @param seconds - 秒数
 * @returns 格式化后的字符串
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
