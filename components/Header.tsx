import { useApp } from '@/contexts/AppContext';
import { useInferenceHistory } from '@/contexts/InferenceHistoryContext';
import { AI_MODELS, TOOL_REGISTRY } from '@/types/models';
import { exportToExcel, getRecordsSummary } from '@/utils/excelExport';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

const Header = ({ onToggleMobileMenu }: HeaderProps) => {
  const { selectedModels, activeTool, setActiveTool } = useApp();
  const { records, hasRecords, clearRecords } = useInferenceHistory();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    exportToExcel(records);
    setMenuOpen(false);
  };

  const handleClearRecords = () => {
    if (confirm('确定要清空所有推理记录吗？此操作不可撤销。')) {
      clearRecords();
      setMenuOpen(false);
    }
  };

  return (
    <header className="glass-card p-4 flex justify-between items-center border-b border-tech-green relative z-[100]">
      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          className="md:hidden p-2 rounded-lg hover:bg-dark-secondary transition-colors"
          onClick={onToggleMobileMenu}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg md:text-2xl font-bold text-tech-green">Multimodal AI Platform</h1>
        
        {/* Tool Selector */}
        <div className="hidden md:flex items-center space-x-2 ml-4 border-l border-tech-green/30 pl-4">
          {TOOL_REGISTRY.map((tool) => (
            <button
              key={tool.id}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-2 ${
                activeTool === tool.id
                  ? 'bg-tech-green text-dark-bg'
                  : 'bg-dark-secondary text-text-primary hover:bg-dark-secondary/80'
              }`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.description}
            >
              <span>{tool.icon}</span>
              <span className="text-sm">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="hidden md:flex items-center space-x-4">
        {activeTool === 'review' && (
          <>
            <div className="flex items-center space-x-2">
              {selectedModels.map((model) => (
                <span
                  key={model.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    model.provider === 'volcano' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {model.name}
                </span>
              ))}
            </div>
            <span className="text-text-tertiary text-sm">
              {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
      
      <div className="md:hidden text-xs text-text-tertiary">
        {activeTool === 'review' ? (
          <>{selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}</>
        ) : (
          <>Image Gen</>
        )}
      </div>

      {/* Three-dot menu */}
      <div className="relative z-[9999]" ref={menuRef}>
        <button
          className="p-2 rounded-lg hover:bg-dark-secondary transition-colors flex items-center gap-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          {hasRecords && (
            <span className="text-xs text-tech-green bg-tech-green/20 px-2 py-0.5 rounded-full">
              {records.length}
            </span>
          )}
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="fixed right-4 top-16 w-64 bg-dark-secondary border border-tech-green/30 rounded-lg shadow-lg z-[9999]">
            <div className="p-2">
              {/* Records summary */}
              <div className="px-3 py-2 text-xs text-text-tertiary border-b border-dark-bg/50 mb-2">
                本次会话记录: {getRecordsSummary(records)}
              </div>

              {/* Export option */}
              <button
                className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center gap-3 ${
                  hasRecords 
                    ? 'hover:bg-tech-green/20 text-text-primary' 
                    : 'text-text-tertiary cursor-not-allowed'
                }`}
                onClick={handleExport}
                disabled={!hasRecords}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="text-sm">导出推理记录</div>
                  <div className="text-xs text-text-tertiary">保存为Excel文档</div>
                </div>
              </button>

              {/* Clear records option */}
              <button
                className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center gap-3 ${
                  hasRecords 
                    ? 'hover:bg-red-500/20 text-text-primary' 
                    : 'text-text-tertiary cursor-not-allowed'
                }`}
                onClick={handleClearRecords}
                disabled={!hasRecords}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div>
                  <div className="text-sm">清空记录</div>
                  <div className="text-xs text-text-tertiary">删除本次会话所有记录</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;