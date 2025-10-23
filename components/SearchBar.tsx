import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { PaperClipIcon, ArrowUpIcon, BookOpenIcon, StopCircleIcon, SparklesIcon, CheckIcon, Squares2X2Icon, BoltIcon, XIcon } from './icons';
import { ModelType } from '../types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  onAttachmentClick: () => void;
  hasAttachment: boolean;
  initialQuery?: string;
  isDeepResearchMode: boolean;
  onToggleDeepResearch: () => void;
  onStop: () => void;
  activeModel: ModelType;
  onModelChange: (model: ModelType) => void;
  isMistralAvailable: boolean;
  askContext: string | null;
  onClearAskContext: () => void;
}

export const SearchBar = forwardRef<HTMLTextAreaElement, SearchBarProps>(({ 
    onSearch, 
    isLoading, 
    onAttachmentClick, 
    hasAttachment, 
    initialQuery = '',
    isDeepResearchMode,
    onToggleDeepResearch,
    onStop,
    activeModel,
    onModelChange,
    isMistralAvailable,
    askContext,
    onClearAskContext
}, ref) => {
  const [query, setQuery] = useState(initialQuery);
  const { t } = useLocalization();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  useEffect(() => {
    const textarea = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
    if (textarea) {
        textarea.style.height = 'auto'; // Reset height
        const maxHeight = 160; // 10rem
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [query, ref]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isLoading) return;
    if (!query.trim() && !hasAttachment) return;
    onSearch(query.trim());
    setQuery('');
  };

  const canSubmit = !isLoading && (!!query.trim() || (hasAttachment && activeModel !== 'mistral'));

  return (
    <div className="relative w-full">
      {askContext && (
        <div className="p-2 mb-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm animate-pop-in">
            <div className="flex justify-between items-start">
                <div className="flex-grow min-w-0">
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">{t('search.askingAbout')}</span>
                    <p className="mt-1 text-neutral-800 dark:text-neutral-200 line-clamp-2 pr-2">
                        “{askContext}”
                    </p>
                </div>
                <button onClick={onClearAskContext} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600 ml-2 flex-shrink-0">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
      )}
      <div className="relative flex flex-col w-full p-3 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/10 ring-1 ring-neutral-900/10 dark:ring-white/10 focus-within:ring-brand-500 focus-within:ring-2 transition-all">
        <textarea
          ref={ref}
          value={query}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={isDeepResearchMode ? t('search.focusPlaceholder') : t('search.placeholder')}
          disabled={isLoading}
          rows={1}
          className="w-full bg-transparent resize-none focus:outline-none text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 disabled:opacity-50 max-h-40 px-1 pt-1"
        />

        <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 relative" ref={toolsMenuRef}>
                 {isToolsOpen && (
                    <div className="absolute bottom-full left-0 rtl:right-0 rtl:left-auto mb-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 z-10 animate-pop-in p-2 space-y-2">
                        {/* Model Section */}
                        <div className="space-y-1">
                            <label className="px-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('search.model')}</label>
                            <button onClick={() => { onModelChange('gemini'); }} className={`w-full text-left rtl:text-right px-2 py-1.5 text-sm flex items-center justify-between font-medium rounded-md transition-colors ${activeModel === 'gemini' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
                                <span className="flex items-center gap-2"><SparklesIcon className="w-4 h-4" /> Gemini</span> {activeModel === 'gemini' && <CheckIcon className="w-4 h-4 text-brand-500" />}
                            </button>
                            {isMistralAvailable && (
                                <button onClick={() => { onModelChange('mistral'); }} className={`w-full text-left rtl:text-right px-2 py-1.5 text-sm flex items-center justify-between font-medium rounded-md transition-colors ${activeModel === 'mistral' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
                                    <span className="flex items-center gap-2"><BoltIcon className="w-4 h-4" /> Mistral</span> {activeModel === 'mistral' && <CheckIcon className="w-4 h-4 text-brand-500" />}
                                </button>
                            )}
                        </div>
                        
                        <div className="!my-2 h-px bg-neutral-200 dark:bg-neutral-700"></div>

                        <div 
                            onClick={activeModel === 'gemini' ? onToggleDeepResearch : undefined} 
                            className={`flex items-center justify-between p-2 rounded-md transition-colors ${activeModel !== 'gemini' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}
                            title={activeModel !== 'gemini' ? "Focus mode is only available for Gemini" : ""}
                        >
                            <div className="flex items-center gap-2">
                                <BookOpenIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300"/>
                                <div className="text-sm">
                                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{t('search.focus')}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('search.focusDescription')}</p>
                                </div>
                            </div>
                            <button
                                role="switch" aria-checked={isDeepResearchMode} disabled={activeModel !== 'gemini'}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isDeepResearchMode ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDeepResearchMode ? 'translate-x-5' : 'translate-x-0'}`}/>
                            </button>
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    disabled={isLoading}
                    className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/60 transition-colors disabled:opacity-50"
                    aria-label={t('search.tools')}
                    title={t('search.tools')}
                >
                    <Squares2X2Icon className="w-5 h-5"/>
                </button>
                <button
                    type="button"
                    onClick={onAttachmentClick}
                    disabled={isLoading || activeModel === 'mistral'}
                    className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={activeModel === 'mistral' ? t('search.fileAttachNotSupported') : t('search.attachFile')}
                    title={activeModel === 'mistral' ? t('search.fileAttachNotSupported') : t('search.attachFile')}
                >
                    <PaperClipIcon className={`w-5 h-5 transition-colors ${hasAttachment ? 'text-brand-600 dark:text-brand-500' : ''} ${activeModel === 'mistral' ? 'text-neutral-400 dark:text-neutral-600' : ''}`} />
                </button>
            </div>
             <div className="flex-shrink-0">
                {isLoading ? (
                <button
                    type="button"
                    onClick={onStop}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all"
                    aria-label={t('search.stopGeneration')}
                >
                    <StopCircleIcon className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />
                </button>
                ) : (
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${canSubmit ? 'bg-brand-600 hover:bg-brand-500' : 'bg-neutral-200 dark:bg-neutral-700 cursor-not-allowed'}`}
                    aria-label={t('search.sendMessage')}
                >
                    <ArrowUpIcon className={`w-5 h-5 transition-colors ${canSubmit ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'}`} />
                </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
});