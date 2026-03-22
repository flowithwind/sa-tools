'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Types for inference records
export type InferenceCellType = 'text' | 'image' | 'images';

export type InferenceCell = {
  type: InferenceCellType;
  value: string | string[]; // text content or image URL(s)
};

export type InferenceInput = {
  prompt?: InferenceCell;
  image?: InferenceCell;
  text?: InferenceCell;
  files?: InferenceCell;
  remark?: InferenceCell;
};

export type ModelOutput = {
  modelId: string;
  modelName: string;
  content: InferenceCell;
  responseTime: number;
  status: 'success' | 'error';
  error?: string;
};

export type InferenceRecord = {
  id: string;
  timestamp: number;
  toolType: 'review' | 'imagegen' | 'asr';
  inputs: InferenceInput;
  outputs: ModelOutput[];
  // ASR specific fields
  asrJudge?: {
    rankings: {
      rank: number;
      modelId: string;
      modelName: string;
      score: number;
      comment: string;
    }[];
    reasoning: string;
  };
};

type InferenceHistoryContextType = {
  records: InferenceRecord[];
  addRecord: (record: Omit<InferenceRecord, 'id' | 'timestamp'>) => void;
  clearRecords: () => void;
  hasRecords: boolean;
};

const InferenceHistoryContext = createContext<InferenceHistoryContextType | undefined>(undefined);

export function InferenceHistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<InferenceRecord[]>([]);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  const hasRecords = records.length > 0;

  // Add a new inference record
  const addRecord = useCallback((record: Omit<InferenceRecord, 'id' | 'timestamp'>) => {
    const newRecord: InferenceRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setRecords(prev => [...prev, newRecord]);
  }, []);

  // Clear all records
  const clearRecords = useCallback(() => {
    setRecords([]);
  }, []);

  // Handle beforeunload event to warn user about unsaved records
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (records.length > 0 && !hasShownWarning) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [records.length, hasShownWarning]);

  return (
    <InferenceHistoryContext.Provider
      value={{
        records,
        addRecord,
        clearRecords,
        hasRecords,
      }}
    >
      {children}
    </InferenceHistoryContext.Provider>
  );
}

export function useInferenceHistory() {
  const context = useContext(InferenceHistoryContext);
  if (context === undefined) {
    throw new Error('useInferenceHistory must be used within an InferenceHistoryProvider');
  }
  return context;
}
