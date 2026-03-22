import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Calculate Euclidean distance between two vectors
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contents, dimension } = body;

    // Validate inputs
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one content item is required' },
        { status: 400 }
      );
    }

    if (contents.length > 4) {
      return NextResponse.json(
        { success: false, error: 'Maximum 4 items allowed' },
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
    console.log('[embedding] Starting embedding request with', contents.length, 'items, dimension:', dimension);

    // Build contents array for API
    const apiContents = contents.map((item: any) => {
      if (item.type === 'text') {
        return { text: item.content };
      } else if (item.type === 'image') {
        return { image: item.url };
      } else if (item.type === 'video') {
        return { video: item.url };
      }
      throw new Error(`Unknown content type: ${item.type}`);
    });

    // Build request body
    const requestBody: any = {
      model: 'qwen3-vl-embedding',
      input: {
        contents: apiContents,
      },
      parameters: {
        dimension: dimension || 1024,
        output_type: 'dense',
      },
    };

    console.log('[embedding] Request body:', JSON.stringify(requestBody, null, 2));

    // Call DashScope API
    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[embedding] API error:', errorText);
      throw new Error(`DashScope API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('[embedding] API response received');

    if (data.output && data.output.embeddings) {
      const embeddings = data.output.embeddings;
      const responseTime = Date.now() - startTime;

      // Map embeddings back to original items
      const embeddingResults = embeddings.map((emb: any, idx: number) => ({
        index: emb.index,
        type: contents[emb.index]?.type || emb.type,
        embedding: emb.embedding,
        fileName: contents[emb.index]?.fileName,
      }));

      // Calculate pairwise similarities
      const similarities: any[] = [];
      for (let i = 0; i < embeddingResults.length; i++) {
        for (let j = i + 1; j < embeddingResults.length; j++) {
          const cosine = cosineSimilarity(
            embeddingResults[i].embedding,
            embeddingResults[j].embedding
          );
          const euclidean = euclideanDistance(
            embeddingResults[i].embedding,
            embeddingResults[j].embedding
          );
          
          similarities.push({
            item1Index: i,
            item2Index: j,
            item1Type: embeddingResults[i].type,
            item2Type: embeddingResults[j].type,
            item1Name: embeddingResults[i].fileName || `Item ${i + 1}`,
            item2Name: embeddingResults[j].fileName || `Item ${j + 1}`,
            cosineSimilarity: cosine,
            euclideanDistance: euclidean,
          });
        }
      }

      console.log('[embedding] Completed in', responseTime, 'ms');

      return NextResponse.json({
        success: true,
        embeddings: embeddingResults,
        similarities,
        dimension: dimension || 1024,
        responseTime,
        usage: data.usage,
      });
    } else if (data.code) {
      throw new Error(`${data.code}: ${data.message}`);
    } else {
      throw new Error('Unexpected response format from API');
    }
  } catch (error) {
    console.error('Embedding API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
