'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
  title?: string;
}

const ImageViewer = ({ imageUrl, onClose, title }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;
  const SCALE_STEP = 0.25;

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + SCALE_STEP, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - SCALE_STEP, MIN_SCALE));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale(prev => Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE));
  }, []);

  // Handle drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle click on backdrop to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-black/90 flex flex-col"
      ref={containerRef}
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-bg/80 backdrop-blur-sm border-b border-tech-green/30">
        <div className="flex items-center gap-4">
          <h3 className="text-tech-green font-medium">
            {title || '图片预览'}
          </h3>
          <span className="text-text-tertiary text-sm">
            缩放: {Math.round(scale * 100)}%
          </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Out */}
          <button
            className="p-2 rounded-lg bg-dark-secondary hover:bg-dark-secondary/80 text-text-primary transition-colors"
            onClick={handleZoomOut}
            title="缩小 (-)"
            disabled={scale <= MIN_SCALE}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          
          {/* Zoom In */}
          <button
            className="p-2 rounded-lg bg-dark-secondary hover:bg-dark-secondary/80 text-text-primary transition-colors"
            onClick={handleZoomIn}
            title="放大 (+)"
            disabled={scale >= MAX_SCALE}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          
          {/* Reset */}
          <button
            className="p-2 rounded-lg bg-dark-secondary hover:bg-dark-secondary/80 text-text-primary transition-colors"
            onClick={handleReset}
            title="重置 (0)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Separator */}
          <div className="w-px h-6 bg-dark-secondary mx-2" />
          
          {/* Download */}
          <a
            href={imageUrl}
            download
            className="p-2 rounded-lg bg-dark-secondary hover:bg-dark-secondary/80 text-text-primary transition-colors"
            title="下载图片"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
          
          {/* Close */}
          <button
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors ml-2"
            onClick={onClose}
            title="关闭 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Image Container */}
      <div 
        className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-none select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          draggable={false}
        />
      </div>
      
      {/* Footer hint */}
      <div className="p-2 text-center text-xs text-text-tertiary bg-dark-bg/80 border-t border-tech-green/30">
        滚轮缩放 • 拖拽移动 • ESC关闭 • 点击空白处关闭
      </div>
    </div>
  );
};

export default ImageViewer;
