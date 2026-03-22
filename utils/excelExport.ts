import * as XLSX from 'xlsx';
import { InferenceRecord, InferenceCell } from '@/contexts/InferenceHistoryContext';

// Convert image URL to a clickable link format for Excel
function formatCellValue(cell: InferenceCell | undefined): string {
  if (!cell) return '';
  
  if (cell.type === 'text') {
    return typeof cell.value === 'string' ? cell.value : cell.value.join('\n');
  }
  
  if (cell.type === 'image') {
    return typeof cell.value === 'string' ? cell.value : cell.value[0] || '';
  }
  
  if (cell.type === 'images') {
    return Array.isArray(cell.value) ? cell.value.join('\n') : cell.value;
  }
  
  return '';
}

// Get all unique model IDs from records
function getAllModelIds(records: InferenceRecord[]): string[] {
  const modelIds = new Set<string>();
  records.forEach(record => {
    record.outputs.forEach(output => {
      modelIds.add(output.modelId);
    });
  });
  return Array.from(modelIds);
}

// Get model name by ID from records
function getModelName(records: InferenceRecord[], modelId: string): string {
  for (const record of records) {
    const output = record.outputs.find(o => o.modelId === modelId);
    if (output) return output.modelName;
  }
  return modelId;
}

export function exportToExcel(records: InferenceRecord[], filename?: string) {
  if (records.length === 0) {
    alert('没有推理记录可导出');
    return;
  }

  // Separate records by tool type
  const reviewRecords = records.filter(r => r.toolType === 'review');
  const imagegenRecords = records.filter(r => r.toolType === 'imagegen');
  const asrRecords = records.filter(r => r.toolType === 'asr');

  const workbook = XLSX.utils.book_new();

  // Create Review sheet if there are review records
  if (reviewRecords.length > 0) {
    const reviewSheet = createReviewSheet(reviewRecords);
    XLSX.utils.book_append_sheet(workbook, reviewSheet, '内容审核记录');
  }

  // Create ImageGen sheet if there are imagegen records
  if (imagegenRecords.length > 0) {
    const imagegenSheet = createImageGenSheet(imagegenRecords);
    XLSX.utils.book_append_sheet(workbook, imagegenSheet, '图片生成记录');
  }

  // Create ASR sheet if there are asr records
  if (asrRecords.length > 0) {
    const asrSheet = createASRSheet(asrRecords);
    XLSX.utils.book_append_sheet(workbook, asrSheet, 'ASR语音识别记录');
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const finalFilename = filename || `推理记录_${timestamp}.xlsx`;

  // Download the file
  XLSX.writeFile(workbook, finalFilename);
}

function createReviewSheet(records: InferenceRecord[]): XLSX.WorkSheet {
  const modelIds = getAllModelIds(records);
  
  // Build header row
  const headers = [
    '序号',
    '时间',
    '送审文字',
    '送审文件',
    ...modelIds.map(id => `${getModelName(records, id)} (结果)`),
    ...modelIds.map(id => `${getModelName(records, id)} (耗时)`),
  ];

  // Build data rows
  const data = records.map((record, index) => {
    const row: (string | number)[] = [
      index + 1,
      new Date(record.timestamp).toLocaleString('zh-CN'),
      formatCellValue(record.inputs.text),
      formatCellValue(record.inputs.files),
    ];

    // Add model results
    modelIds.forEach(modelId => {
      const output = record.outputs.find(o => o.modelId === modelId);
      if (output) {
        row.push(output.status === 'error' ? `错误: ${output.error}` : formatCellValue(output.content));
      } else {
        row.push('');
      }
    });

    // Add response times
    modelIds.forEach(modelId => {
      const output = record.outputs.find(o => o.modelId === modelId);
      if (output) {
        row.push(`${(output.responseTime / 1000).toFixed(2)}s`);
      } else {
        row.push('');
      }
    });

    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  const colWidths = [
    { wch: 6 },   // 序号
    { wch: 20 },  // 时间
    { wch: 40 },  // 送审文字
    { wch: 50 },  // 送审文件
    ...modelIds.map(() => ({ wch: 60 })),  // Results
    ...modelIds.map(() => ({ wch: 10 })),  // Response times
  ];
  worksheet['!cols'] = colWidths;

  // Enable text wrap for all cells
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { alignment: { wrapText: true, vertical: 'top' } };
      }
    }
  }

  return worksheet;
}

function createImageGenSheet(records: InferenceRecord[]): XLSX.WorkSheet {
  const modelIds = getAllModelIds(records);
  
  // Build header row
  const headers = [
    '序号',
    '时间',
    '生成提示词',
    '参考图片',
    ...modelIds.map(id => `${getModelName(records, id)} (生成图片)`),
    ...modelIds.map(id => `${getModelName(records, id)} (耗时)`),
  ];

  // Build data rows
  const data = records.map((record, index) => {
    const row: (string | number)[] = [
      index + 1,
      new Date(record.timestamp).toLocaleString('zh-CN'),
      formatCellValue(record.inputs.prompt),
      formatCellValue(record.inputs.image),
    ];

    // Add model results (image URLs)
    modelIds.forEach(modelId => {
      const output = record.outputs.find(o => o.modelId === modelId);
      if (output) {
        row.push(output.status === 'error' ? `错误: ${output.error}` : formatCellValue(output.content));
      } else {
        row.push('');
      }
    });

    // Add response times
    modelIds.forEach(modelId => {
      const output = record.outputs.find(o => o.modelId === modelId);
      if (output) {
        row.push(`${(output.responseTime / 1000).toFixed(2)}s`);
      } else {
        row.push('');
      }
    });

    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  const colWidths = [
    { wch: 6 },   // 序号
    { wch: 20 },  // 时间
    { wch: 40 },  // 生成提示词
    { wch: 50 },  // 参考图片
    ...modelIds.map(() => ({ wch: 60 })),  // Results
    ...modelIds.map(() => ({ wch: 10 })),  // Response times
  ];
  worksheet['!cols'] = colWidths;

  return worksheet;
}

function createASRSheet(records: InferenceRecord[]): XLSX.WorkSheet {
  const modelIds = getAllModelIds(records);
  
  // Build header row
  const headers = [
    '序号',
    '时间',
    '音频备注',
    '音频文件URL',
    ...modelIds.map(id => `${getModelName(records, id)} (识别结果)`),
    ...modelIds.map(id => `${getModelName(records, id)} (耗时)`),
    ...modelIds.map(id => `${getModelName(records, id)} (排名)`),
    ...modelIds.map(id => `${getModelName(records, id)} (得分)`),
    ...modelIds.map(id => `${getModelName(records, id)} (评价)`),
    'AI评估理由',
  ];

  // Build data rows
  const data = records.map((record, index) => {
    const row: (string | number)[] = [
      index + 1,
      new Date(record.timestamp).toLocaleString('zh-CN'),
      formatCellValue(record.inputs.remark),
      formatCellValue(record.inputs.files),
    ];

    // Add model recognition results
    modelIds.forEach(modelId => {
      const output = record.outputs.find(o => o.modelId === modelId);
      if (output) {
        row.push(output.status === 'error' ? `错误: ${output.error}` : formatCellValue(output.content));
      } else {
        row.push('');
      }
    });

    // Add response times
    modelIds.forEach(modelId => {
      const output = record.outputs.find(o => o.modelId === modelId);
      if (output) {
        row.push(`${(output.responseTime / 1000).toFixed(2)}s`);
      } else {
        row.push('');
      }
    });

    // Add judge rankings
    modelIds.forEach(modelId => {
      const ranking = record.asrJudge?.rankings.find(r => r.modelId === modelId);
      row.push(ranking ? `第${ranking.rank}名` : '-');
    });

    // Add judge scores
    modelIds.forEach(modelId => {
      const ranking = record.asrJudge?.rankings.find(r => r.modelId === modelId);
      row.push(ranking ? ranking.score : '-');
    });

    // Add judge comments
    modelIds.forEach(modelId => {
      const ranking = record.asrJudge?.rankings.find(r => r.modelId === modelId);
      row.push(ranking?.comment || '-');
    });

    // Add overall reasoning
    row.push(record.asrJudge?.reasoning || '-');

    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  const colWidths = [
    { wch: 6 },   // 序号
    { wch: 20 },  // 时间
    { wch: 30 },  // 音频备注
    { wch: 60 },  // 音频URL
    ...modelIds.map(() => ({ wch: 50 })),  // Recognition results
    ...modelIds.map(() => ({ wch: 10 })),  // Response times
    ...modelIds.map(() => ({ wch: 8 })),   // Rankings
    ...modelIds.map(() => ({ wch: 8 })),   // Scores
    ...modelIds.map(() => ({ wch: 30 })),  // Comments
    { wch: 80 },  // Overall reasoning
  ];
  worksheet['!cols'] = colWidths;

  // Enable text wrap for all cells
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { alignment: { wrapText: true, vertical: 'top' } };
      }
    }
  }

  return worksheet;
}

// Export a summary of records count
export function getRecordsSummary(records: InferenceRecord[]): string {
  const reviewCount = records.filter(r => r.toolType === 'review').length;
  const imagegenCount = records.filter(r => r.toolType === 'imagegen').length;
  const asrCount = records.filter(r => r.toolType === 'asr').length;
  
  const parts = [];
  if (reviewCount > 0) parts.push(`${reviewCount}条审核记录`);
  if (imagegenCount > 0) parts.push(`${imagegenCount}条生成记录`);
  if (asrCount > 0) parts.push(`${asrCount}条ASR记录`);
  
  return parts.length > 0 ? parts.join('，') : '暂无记录';
}
