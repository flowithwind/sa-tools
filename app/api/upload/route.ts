import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  let file: File | null = null;
  let bytes: Uint8Array | null = null;
  
  try {
    const formData = await req.formData();
    file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
      'video/mp4', 'video/mpeg', 'video/quicktime', 
      'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'
    ];
    // Also check for webm with codecs (e.g., audio/webm;codecs=opus)
    const isAllowedType = allowedTypes.includes(file.type) || 
                          file.type.startsWith('audio/webm') || 
                          file.type.startsWith('audio/ogg');
    if (!isAllowedType) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Read the file content early (before OSS operations that might fail)
    const buffer = await file.arrayBuffer();
    bytes = new Uint8Array(buffer);
    
    // Get the file extension and create a unique filename
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const fileName = `pic/huisen-anti/${randomUUID()}${fileExtension}`;
    
    // Import and use ali-oss to upload to the specified bucket
    const OSS: any = (await import('ali-oss')).default;
    
    // Check if all required environment variables are set
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const bucket = process.env.ALIYUN_OSS_BUCKET_NAME;
    const region = process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing';
    
    console.log('Environment variables check:', {
      accessKeyId: accessKeyId ? '***PROVIDED***' : 'MISSING',
      accessKeySecret: accessKeySecret ? '***PROVIDED***' : 'MISSING',
      bucket,
      region,
    });
    
    if (!accessKeyId || !accessKeySecret || !bucket) {
      throw new Error('Missing required OSS configuration environment variables');
    }
    
    const client = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure: true, // Use HTTPS
    });
    
    console.log('Attempting to upload file:', fileName);
    
    // Upload the file to OSS
    const result: any = await client.put(fileName, Buffer.from(bytes));
    
    console.log('Upload successful, result:', result);
    
    // Return the public URL of the uploaded file
    return NextResponse.json({
      success: true,
      url: result.url,
      originalName: file.name,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // If OSS upload fails and we have the file data, fallback to data URL
    if (file && bytes) {
      try {
        const base64 = Buffer.from(bytes).toString('base64');
        const mimeType = file.type;
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        return NextResponse.json({
          success: true,
          url: dataUrl,
          originalName: file.name,
          type: file.type,
          warning: 'OSS upload failed, using data URL as fallback',
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}