import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

type ASRResultInput = {
  modelId: string;
  modelName: string;
  text: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl, results } = body as { audioUrl: string; results: ASRResultInput[] };

    // Validate inputs
    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Audio URL is required' },
        { status: 400 }
      );
    }

    if (!results || results.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 ASR results are required for comparison' },
        { status: 400 }
      );
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'DASHSCOPE_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('[ASR-Judge] Starting evaluation with', results.length, 'results');
    const startTime = Date.now();

    // Build the prompt for Qwen-Omni
    const resultsText = results.map((r, idx) => 
      `【模型${idx + 1}】${r.modelName}\n识别结果：${r.text || '(空)'}`
    ).join('\n\n');

    const judgePrompt = `你是一位专业的语音识别评估专家。请仔细听这段音频，然后评估以下各个ASR模型的识别结果质量。

${resultsText}

请根据以下标准评估每个模型的识别质量：
1. 准确性：识别结果与原始音频内容的匹配程度
2. 完整性：是否遗漏了重要内容
3. 流畅性：识别结果是否通顺自然
4. 标点符号：标点使用是否合理

请以JSON格式输出评估结果（只输出合法的JSON，不要用markdown格式）：
{
  "rankings": [
    {
      "rank": 1,
      "modelId": "模型ID",
      "modelName": "模型名称",
      "score": 85,
      "comment": "简短评价"
    }
  ],
  "reasoning": "整体评估理由，说明为什么这样排名"
}

注意：
1. rank从1开始，1为最佳
2. score范围0-100
3. 必须为每个模型给出排名
4. reasoning要具体说明各模型的优缺点`;

    // Call Qwen-Omni model
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5-omni-7b',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { audio: audioUrl },
                { text: judgePrompt }
              ]
            }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ASR-Judge] API error:', errorText);
      throw new Error(`Qwen-Omni API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('[ASR-Judge] API response received');

    // Extract the response content
    let responseContent = '';
    if (data.output?.choices?.[0]?.message?.content) {
      const content = data.output.choices[0].message.content;
      if (Array.isArray(content)) {
        responseContent = content.find((c: any) => c.text)?.text || '';
      } else {
        responseContent = content;
      }
    } else if (data.code) {
      throw new Error(`${data.code}: ${data.message}`);
    }

    if (!responseContent) {
      throw new Error('Empty response from Qwen-Omni');
    }

    // Parse the JSON response
    let judgeResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        judgeResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[ASR-Judge] JSON parse error:', parseError);
      console.error('[ASR-Judge] Raw response:', responseContent);
      
      // Fallback: create a simple ranking based on text length
      judgeResult = {
        rankings: results.map((r, idx) => ({
          rank: idx + 1,
          modelId: r.modelId,
          modelName: r.modelName,
          score: 70 - idx * 5,
          comment: '无法解析AI评估结果'
        })),
        reasoning: `AI评估结果解析失败，原始响应：${responseContent.substring(0, 200)}...`
      };
    }

    // Validate and normalize the result
    const normalizedRankings = results.map((r) => {
      const found = judgeResult.rankings?.find(
        (rank: any) => rank.modelId === r.modelId || rank.modelName === r.modelName
      );
      return {
        rank: found?.rank || 999,
        modelId: r.modelId,
        modelName: r.modelName,
        score: found?.score || 0,
        comment: found?.comment || ''
      };
    }).sort((a, b) => a.rank - b.rank);

    // Re-assign ranks to ensure sequential
    normalizedRankings.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    const responseTime = Date.now() - startTime;
    console.log('[ASR-Judge] Evaluation completed in', responseTime, 'ms');

    return NextResponse.json({
      success: true,
      rankings: normalizedRankings,
      reasoning: judgeResult.reasoning || '',
      responseTime,
    });

  } catch (error) {
    console.error('[ASR-Judge] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
