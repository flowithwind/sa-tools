'use client';

import Header from '@/components/Header';
import ConfigurationPanel from '@/components/ConfigurationPanel';
import MainContentArea from '@/components/MainContentArea';
import ResultsDisplay from '@/components/ResultsDisplay';
import ImageGenConfigPanel from '@/components/ImageGenConfigPanel';
import ImageGenMainArea from '@/components/ImageGenMainArea';
import ImageGenResults from '@/components/ImageGenResults';
import VideoGenConfigPanel from '@/components/VideoGenConfigPanel';
import VideoGenMainArea from '@/components/VideoGenMainArea';
import VideoGenResults from '@/components/VideoGenResults';
import AnimateConfigPanel from '@/components/AnimateConfigPanel';
import AnimateMainArea from '@/components/AnimateMainArea';
import AnimateResults from '@/components/AnimateResults';
import EmbeddingConfigPanel from '@/components/EmbeddingConfigPanel';
import EmbeddingMainArea from '@/components/EmbeddingMainArea';
import EmbeddingResults from '@/components/EmbeddingResults';
import ASRConfigPanel from '@/components/ASRConfigPanel';
import ASRMainArea from '@/components/ASRMainArea';
import ASRResults from '@/components/ASRResults';
import { useApp } from '@/contexts/AppContext';
import { ReviewToolProvider } from '@/contexts/ReviewToolContext';
import { ImageGenToolProvider } from '@/contexts/ImageGenToolContext';
import { VideoGenToolProvider } from '@/contexts/VideoGenToolContext';
import { AnimateToolProvider } from '@/contexts/AnimateToolContext';
import { EmbeddingToolProvider } from '@/contexts/EmbeddingToolContext';
import { ASRToolProvider } from '@/contexts/ASRToolContext';
import { useState, useEffect } from 'react';

export default function Home() {
  const { activeTool } = useApp();
  const [isClient, setIsClient] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="min-h-screen bg-dark-bg flex items-center justify-center">Loading...</div>;
  }
  
  // Render tool-specific layout
  const renderToolContent = () => {
    if (activeTool === 'review') {
      return (
        <ReviewToolProvider>
          <div className="flex flex-1 gap-4 w-full p-4">
            <div className="hidden md:block flex-shrink-0">
              <ConfigurationPanel />
            </div>
              
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <MainContentArea />
              <ResultsDisplay />
            </div>
          </div>
            
          {/* Mobile drawer for review */}
          {showMobileConfig && (
            <div className={`
              fixed top-0 left-0 h-full w-80 bg-dark-bg z-50 transform transition-transform duration-300 md:hidden
              ${
                showMobileConfig ? 'translate-x-0' : '-translate-x-full'
              }
            `}>
              <div className="p-4 flex justify-between items-center border-b border-tech-green">
                <h2 className="text-lg font-semibold text-tech-green">Configuration</h2>
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="p-2 rounded-lg hover:bg-dark-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                <ConfigurationPanel />
              </div>
            </div>
          )}
        </ReviewToolProvider>
      );
    } else if (activeTool === 'imagegen') {
      return (
        <ImageGenToolProvider>
          <div className="flex flex-1 gap-4 w-full p-4">
            <div className="hidden md:block flex-shrink-0">
              <ImageGenConfigPanel />
            </div>
              
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <ImageGenMainArea />
              <ImageGenResults />
            </div>
          </div>
            
          {/* Mobile drawer for imagegen */}
          {showMobileConfig && (
            <div className={`
              fixed top-0 left-0 h-full w-80 bg-dark-bg z-50 transform transition-transform duration-300 md:hidden
              ${
                showMobileConfig ? 'translate-x-0' : '-translate-x-full'
              }
            `}>
              <div className="p-4 flex justify-between items-center border-b border-tech-green">
                <h2 className="text-lg font-semibold text-tech-green">Configuration</h2>
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="p-2 rounded-lg hover:bg-dark-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                <ImageGenConfigPanel />
              </div>
            </div>
          )}
        </ImageGenToolProvider>
      );
    } else if (activeTool === 'videogen') {
      return (
        <VideoGenToolProvider>
          <div className="flex flex-1 gap-4 w-full p-4">
            <div className="hidden md:block flex-shrink-0">
              <VideoGenConfigPanel />
            </div>
              
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <VideoGenMainArea />
              <VideoGenResults />
            </div>
          </div>
            
          {/* Mobile drawer for videogen */}
          {showMobileConfig && (
            <div className={`
              fixed top-0 left-0 h-full w-80 bg-dark-bg z-50 transform transition-transform duration-300 md:hidden
              ${
                showMobileConfig ? 'translate-x-0' : '-translate-x-full'
              }
            `}>
              <div className="p-4 flex justify-between items-center border-b border-tech-green">
                <h2 className="text-lg font-semibold text-tech-green">Configuration</h2>
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="p-2 rounded-lg hover:bg-dark-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                <VideoGenConfigPanel />
              </div>
            </div>
          )}
        </VideoGenToolProvider>
      );
    } else if (activeTool === 'animate') {
      return (
        <AnimateToolProvider>
          <div className="flex flex-1 gap-4 w-full p-4">
            <div className="hidden md:block flex-shrink-0">
              <AnimateConfigPanel />
            </div>
              
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <AnimateMainArea />
              <AnimateResults />
            </div>
          </div>
            
          {/* Mobile drawer for animate */}
          {showMobileConfig && (
            <div className={`
              fixed top-0 left-0 h-full w-80 bg-dark-bg z-50 transform transition-transform duration-300 md:hidden
              ${
                showMobileConfig ? 'translate-x-0' : '-translate-x-full'
              }
            `}>
              <div className="p-4 flex justify-between items-center border-b border-tech-green">
                <h2 className="text-lg font-semibold text-tech-green">Configuration</h2>
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="p-2 rounded-lg hover:bg-dark-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                <AnimateConfigPanel />
              </div>
            </div>
          )}
        </AnimateToolProvider>
      );
    } else if (activeTool === 'embedding') {
      return (
        <EmbeddingToolProvider>
          <div className="flex flex-col flex-1 w-full">
            {/* Top section: Config + Main Area */}
            <div className="flex gap-4 w-full p-4 pb-2">
              <div className="hidden md:block flex-shrink-0">
                <EmbeddingConfigPanel />
              </div>
              <div className="flex-1 min-w-0">
                <EmbeddingMainArea />
              </div>
            </div>
            
            {/* Bottom section: Results (full width) */}
            <div className="w-full px-4 pb-4">
              <EmbeddingResults />
            </div>
          </div>
            
          {/* Mobile drawer for embedding */}
          {showMobileConfig && (
            <div className={`
              fixed top-0 left-0 h-full w-80 bg-dark-bg z-50 transform transition-transform duration-300 md:hidden
              ${
                showMobileConfig ? 'translate-x-0' : '-translate-x-full'
              }
            `}>
              <div className="p-4 flex justify-between items-center border-b border-tech-green">
                <h2 className="text-lg font-semibold text-tech-green">Configuration</h2>
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="p-2 rounded-lg hover:bg-dark-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                <EmbeddingConfigPanel />
              </div>
            </div>
          )}
        </EmbeddingToolProvider>
      );
    } else if (activeTool === 'asr') {
      return (
        <ASRToolProvider>
          <div className="flex flex-col flex-1 w-full">
            {/* Top section: Config + Main Area */}
            <div className="flex gap-4 w-full p-4 pb-2">
              <div className="hidden md:block flex-shrink-0">
                <ASRConfigPanel />
              </div>
              <div className="flex-1 min-w-0">
                <ASRMainArea />
              </div>
            </div>
            
            {/* Bottom section: Results (full width) */}
            <div className="w-full px-4 pb-4">
              <ASRResults />
            </div>
          </div>
            
          {/* Mobile drawer for ASR */}
          {showMobileConfig && (
            <div className={`
              fixed top-0 left-0 h-full w-80 bg-dark-bg z-50 transform transition-transform duration-300 md:hidden
              ${
                showMobileConfig ? 'translate-x-0' : '-translate-x-full'
              }
            `}>
              <div className="p-4 flex justify-between items-center border-b border-tech-green">
                <h2 className="text-lg font-semibold text-tech-green">Configuration</h2>
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="p-2 rounded-lg hover:bg-dark-secondary transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                <ASRConfigPanel />
              </div>
            </div>
          )}
        </ASRToolProvider>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary flex flex-col">
      <Header onToggleMobileMenu={() => setShowMobileConfig(!showMobileConfig)} />
      
      {/* Mobile configuration drawer overlay */}
      {showMobileConfig && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMobileConfig(false)}
        />
      )}
      
      {/* Render tool-specific content */}
      {renderToolContent()}
    </div>
  );
}