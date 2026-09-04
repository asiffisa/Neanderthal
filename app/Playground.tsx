'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sliders,
  Image as ImageIcon,
  ChevronRight,
  Send,
  Shuffle,
  AlertCircle,
} from 'lucide-react';
import { PRESETS, PresetQuestion } from '../src/lib/presets';
import {
  CapsuleSettings,
  DEFAULT_CAPSULE_SETTINGS,
  MarkdownToken,
  ResolvedMedia,
} from '../src/core/types';
import { tokenizeStreamingMarkdown } from '../src/core/tokenizer';
import { createNeanderthalMediaMarkdown } from '../src/core/media-markdown';
import { resolveMedia } from '../src/lib/wikimedia';
import { StreamingMarkdownView } from '../src/components/StreamingMarkdownView';
import { MediaLightbox } from '../src/components/MediaLightbox';

function getModelShortLabel(id: string): string {
  if (id === 'gemini-3.8-flash') return 'Gemini 3.8';
  if (id === 'gemini-3.6-flash') return 'Gemini 3.6';
  if (id === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Lite';
  if (id === 'gemini-2.5-flash') return 'Gemini 2.5';
  if (id === 'gemini-1.5-flash') return 'Gemini 1.5';
  return 'Gemini';
}

function getModelFullLabel(id: string): string {
  if (id === 'gemini-3.8-flash') return 'Gemini 3.8 Flash';
  if (id === 'gemini-3.6-flash') return 'Gemini 3.6 Flash';
  if (id === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Flash Lite';
  if (id === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
  if (id === 'gemini-1.5-flash') return 'Gemini 1.5 Flash';
  return 'Gemini Flash';
}

const STREAM_SPEED_MS = 14;

interface PlaygroundProps {
  hasInitialServerKey?: boolean;
}

export default function Playground({ hasInitialServerKey = false }: PlaygroundProps) {
  // Preset & Input state
  const [selectedPreset, setSelectedPreset] = useState<PresetQuestion>(PRESETS[0]);
  const [customInput, setCustomInput] = useState('');

  // Gemini AI Server Key & Model state
  const [hasServerKey, setHasServerKey] = useState<boolean>(hasInitialServerKey);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash-lite');
  const isKeyActive = Boolean(hasServerKey);
  const [isLiveGenerating, setIsLiveGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [recentTitles, setRecentTitles] = useState<string[]>([]);

  // Streaming state
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Inspector & UI settings
  const [activeTab, setActiveTab] = useState<'design' | 'media'>('design');
  const [capsuleSettings, setCapsuleSettings] = useState<CapsuleSettings>(() => ({
    ...DEFAULT_CAPSULE_SETTINGS,
  }));
  const [inspectMedia, setInspectMedia] = useState<ResolvedMedia | null>(null);

  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamContainerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize server key availability and active model dynamically
  useEffect(() => {
    fetch('/api/key-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.hasServerKey === 'boolean') {
          setHasServerKey(data.hasServerKey);
        }
        if (data && typeof data.model === 'string' && data.model) {
          setSelectedModel(data.model);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-start initial preset stream on mount only
  useEffect(() => {
    startStreaming(PRESETS[0].response);
    return () => {
      stopStreaming();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopStreaming = () => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsStreaming(false);
  };

  const startStreaming = (fullContent: string) => {
    stopStreaming();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStreamedText('');
    setIsStreaming(true);
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = 0;
    }

    let currentIndex = 0;
    const stepSize = 8; // chunk size for realistic, rapid LLM token burst

    streamTimerRef.current = setInterval(() => {
      currentIndex += stepSize;
      if (currentIndex >= fullContent.length) {
        setStreamedText(fullContent);
        stopStreaming();
      } else {
        setStreamedText(fullContent.slice(0, currentIndex));
      }
    }, STREAM_SPEED_MS);
  };

  // Live streaming directly from Google Gemini API
  const streamFromGemini = async (
    promptText: string,
    title = 'Science Query',
    category?: string,
    icon = '🔬'
  ) => {
    stopStreaming();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLiveGenerating(true);
    setIsStreaming(true);
    setStreamedText('');
    setApiError(null);
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = 0;
    }

    const modelLabel = getModelShortLabel(selectedModel);

    setSelectedPreset({
      id: 'live-' + Date.now(),
      title,
      category: category || modelLabel,
      icon,
      prompt: promptText,
      response: '',
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: selectedModel,
          visualsPerParagraph: Math.min(4, Math.max(1, capsuleSettings.visualsPerParagraph ?? 4)),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Request failed with status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream returned by server');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || abortControllerRef.current !== controller) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        if (abortControllerRef.current === controller) {
          setStreamedText(accumulated);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Clean cancellation when switching prompts
      }
      const msg = err instanceof Error ? err.message : 'Streaming error occurred';
      console.error('[Gemini Stream Error]:', msg);
      if (abortControllerRef.current === controller) {
        // Graceful fallback: If this topic has a curated scripted response, recover smoothly!
        const matchingPreset = PRESETS.find(
          (p) =>
            p.title.toLowerCase() === title.toLowerCase() ||
            p.prompt.toLowerCase() === promptText.toLowerCase()
        );
        if (matchingPreset && matchingPreset.response) {
          console.warn('[Gemini Stream]: Recovered smoothly using pre-scripted response for:', title);
          setSelectedPreset(matchingPreset);
          startStreaming(matchingPreset.response);
          setApiError(null);
          return;
        }
        setApiError(msg);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLiveGenerating(false);
        setIsStreaming(false);
      }
    }
  };

  // Shuffle button handler: queries Gemini LLM to invent an unpredictable, non-repeating scientific mystery
  const handleShuffle = async () => {
    if (isShuffling || isStreaming || isLiveGenerating) return;
    setIsShuffling(true);

    try {
      const res = await fetch('/api/random-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          excludeTitles: recentTitles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const { title, category, icon, prompt } = data;

        // Remember recent titles to prevent repetitive loops
        setRecentTitles((prev) => [...prev.slice(-15), title]);

        const newQuestion: PresetQuestion = {
          id: 'shuffle-' + Date.now(),
          title,
          category,
          icon,
          prompt,
          response: '',
        };
        setSelectedPreset(newQuestion);

        if (isKeyActive) {
          // Stream an answer with a small number of high-value visual capsules
          await streamFromGemini(prompt, title, category, icon);
        } else {
          // If offline / no key, find if there is a matching preset or inform user
          const matchingPreset = PRESETS.find((p) => p.title.toLowerCase() === title.toLowerCase());
          if (matchingPreset) {
            startStreaming(matchingPreset.response);
          } else {
            const fallbackAnswer = `Explore the fascinating science of **${title}** ${createNeanderthalMediaMarkdown(title)}. Discover unscripted scientific research with focused visual media capsules.`;
            startStreaming(fallbackAnswer);
          }
        }
      }
    } catch (err) {
      console.error('[Shuffle Error]:', err);
      // Fallback to non-repeating preset from local bank
      const available = PRESETS.filter((p) => p.id !== selectedPreset.id);
      const random = available[Math.floor(Math.random() * available.length)] || PRESETS[0];
      setSelectedPreset(random);
      if (isKeyActive) {
        streamFromGemini(random.prompt, random.title, random.category, random.icon);
      } else {
        startStreaming(random.response);
      }
    } finally {
      setIsShuffling(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const queryText = customInput.trim();
    setCustomInput('');

    if (isKeyActive) {
      streamFromGemini(queryText, 'Live Exploration', 'Nature & Science', '🔬');
    } else {
      const newCustomPreset: PresetQuestion = {
        id: 'custom-' + Date.now(),
        title: queryText.slice(0, 20) + (queryText.length > 20 ? '...' : ''),
        category: 'User Prompt',
        icon: '🔬',
        prompt: queryText,
        response: queryText.includes('![media:') || queryText.includes('(neanderthal:')
          ? queryText
          : `In the scientific study of **${queryText}** ${createNeanderthalMediaMarkdown(queryText)}, researchers analyze its biochemical, physical, and ecological significance in the natural world.`,
      };
      setSelectedPreset(newCustomPreset);
      startStreaming(newCustomPreset.response);
    }
  };


  // Memoize tokens to prevent redundant regex parsing on unrelated state changes
  const activeTokens: MarkdownToken[] = useMemo(() => {
    return tokenizeStreamingMarkdown(streamedText, isStreaming);
  }, [streamedText, isStreaming]);

  const mediaTokens = useMemo(() => {
    return activeTokens.filter((t) => t.type === 'media');
  }, [activeTokens]);

  const activeEntityContext = useMemo(() => {
    // Only pass context if it is a concise entity name (<= 3 words, no question marks, not a full sentence)
    const candidate = (selectedPreset.title || selectedPreset.prompt || '').trim();
    if (!candidate || candidate.includes('?') || candidate.split(/\s+/).length > 3) {
      return '';
    }
    return candidate;
  }, [selectedPreset.title, selectedPreset.prompt]);

  const handleSidebarMediaClick = async (
    query: string,
    fallbackUrl?: string,
    vendorPreference?: 'wikipedia' | 'duckduckgo' | 'auto'
  ) => {
    setInspectMedia({ query, title: query, status: 'loading' });
    const resolved = await resolveMedia(
      query,
      fallbackUrl,
      vendorPreference,
      undefined,
      0,
      activeEntityContext
    );
    setInspectMedia(resolved);
  };

  const handleCloseLightbox = useCallback(() => {
    setInspectMedia(null);
  }, []);

  const isBusy = isShuffling || isStreaming || isLiveGenerating;

  return (
    <div className="w-full min-w-0 text-[#fafafa] selection:bg-white/20 selection:text-white">
      <div className="w-full max-w-[800px] flex flex-col gap-4">
        {/* Preset & Control Action Bar */}
        <section className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            {/* Presets List */}
            {PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedPreset(preset);
                    if (isKeyActive) {
                      streamFromGemini(preset.prompt, preset.title, preset.category, preset.icon);
                    } else {
                      startStreaming(preset.response);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border active:scale-[0.96] ${
                    isSelected
                      ? 'bg-white/20 text-white border-white/30 shadow-sm font-semibold'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.title}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Two-Column Layout: Left (Chat) + Right (Control Property) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_290px] gap-4 items-stretch w-full">
          {/* Left Column: Chat & Live Streaming */}
          <div className="flex flex-col gap-3.5 min-w-0">

          {/* Chat Stream Card */}
          <div className="rounded-2xl bg-[#101114] border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
            {/* Question Bar */}
            <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#14151a] flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0">{selectedPreset.icon}</span>
                <p className="text-[13.5px] font-medium text-zinc-100 tracking-tight truncate min-w-0">
                  {selectedPreset.prompt}
                </p>
              </div>

              {/* Shuffle Action Button */}
              <button
                type="button"
                onClick={handleShuffle}
                disabled={isBusy}
                className={`group relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 shadow-sm ${
                  isBusy
                    ? 'border-white/20 text-zinc-400 cursor-not-allowed animate-shimmer'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.96]'
                }`}
                title={isBusy ? 'Generating response...' : 'Shuffle to random AI-generated Nature & Science prompt'}
              >
                <Shuffle
                  className={`w-3.5 h-3.5 transition-all duration-300 ${
                    isBusy ? 'text-zinc-400' : 'text-zinc-400 group-hover:text-white group-hover:rotate-180'
                  }`}
                />
                <span>{isShuffling ? 'Inventing...' : isStreaming ? 'Streaming...' : 'Shuffle'}</span>
              </button>
            </div>

            {/* Stream View Area */}
            <div
              ref={streamContainerRef}
              className="p-6 sm:p-7 md:p-8 overflow-y-auto h-[480px] sm:h-[520px] text-[15px] leading-[1.8]"
            >
              {apiError && (
                <div className="p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3 text-xs text-red-300">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-semibold block">Gemini API Error</span>
                      <span className="text-[11px] text-red-300/90 break-words">{apiError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApiError(null)}
                    className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-medium shrink-0 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {isLiveGenerating && !streamedText && (
                <div className="flex items-center text-xs text-zinc-400 py-12 justify-center animate-pulse">
                  <span>
                    {getModelFullLabel(selectedModel)} is
                    generating insights with visual capsules...
                  </span>
                </div>
              )}

              <StreamingMarkdownView
                key={selectedPreset.id}
                content={streamedText}
                context={activeEntityContext}
                isStreaming={isStreaming}
                settings={capsuleSettings}
                onInspect={setInspectMedia}
              />
            </div>
          </div>

          {/* Custom Prompt Input */}
          <form onSubmit={handleCustomSubmit} className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask anything about science, nature, cosmos..."
                className="w-full bg-[#101114] border border-white/[0.08] focus:border-white/25 focus:ring-1 focus:ring-white/20 rounded-xl pl-4 pr-12 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none shadow-md transition-all"
              />
              {Boolean(customInput.trim()) && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold transition-all shadow-sm active:scale-[0.96] flex items-center justify-center"
                  title="Send query"
                >
                  <Send className="w-3.5 h-3.5 text-black -translate-x-[1px]" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Control Property Sidebar */}
        <aside className="w-full md:w-[290px] shrink-0 flex flex-col md:h-[580px] min-h-0">
          <div className="rounded-2xl bg-[#101114] border border-white/[0.08] shadow-xl overflow-hidden flex flex-col h-full min-h-0">
            {/* Tabs */}
            <div className="flex items-center border-b border-white/[0.08] bg-[#14151a] h-11 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('design')}
                className={`flex-1 h-full px-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 active:scale-[0.98] ${
                  activeTab === 'design'
                    ? 'border-white text-white bg-white/[0.03]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Craft
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`flex-1 h-full px-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 active:scale-[0.98] ${
                  activeTab === 'media'
                    ? 'border-white text-white bg-white/[0.03]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Media ({mediaTokens.length})
              </button>
            </div>

            {/* Tab Contents: Fixed height matching left column with internal scroll */}
            <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-6 text-xs">
              {/* Tab 1: Design Controls */}
              {activeTab === 'design' && (
                <div className="space-y-5">
                  {[
                    {
                      label: 'Capsule Height',
                      key: 'height',
                      value: capsuleSettings.height,
                      min: 20,
                      max: 36,
                      unit: 'px',
                      hint: 'Matches typography cap-height to avoid line jumping.',
                    },
                    {
                      label: 'Border Radius',
                      key: 'borderRadius',
                      value: capsuleSettings.borderRadius,
                      min: 4,
                      max: 18,
                      unit: 'px',
                    },
                    {
                      label: 'Asset Gap',
                      key: 'gap',
                      value: capsuleSettings.gap,
                      min: 2,
                      max: 14,
                      unit: 'px',
                    },
                    {
                      label: 'Vertical Offset',
                      key: 'verticalOffset',
                      value: capsuleSettings.verticalOffset,
                      min: -6,
                      max: 4,
                      unit: 'px',
                      hint: 'Nudges capsule optically onto the text baseline.',
                    },
                    {
                      label: 'Visuals per Paragraph',
                      key: 'visualsPerParagraph',
                      value: Math.min(4, Math.max(1, capsuleSettings.visualsPerParagraph ?? 4)),
                      min: 1,
                      max: 4,
                      unit: ' / ¶',
                      hint: 'Target visual capsule density for each paragraph.',
                    },
                  ].map((ctrl) => {
                    const val = ctrl.value ?? ctrl.min ?? 0;
                    const percent = Math.min(100, Math.max(0, ((val - ctrl.min) / (ctrl.max - ctrl.min)) * 100));
                    return (
                      <div key={ctrl.key}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-zinc-300">{ctrl.label}</span>
                          <span className="font-mono text-xs text-white font-semibold">{val}{ctrl.unit}</span>
                        </div>
                        <div className="relative flex items-center py-1">
                          <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            value={val}
                            style={{
                              background: `linear-gradient(to right, #f4f4f5 0%, #f4f4f5 ${percent}%, rgba(255, 255, 255, 0.12) ${percent}%, rgba(255, 255, 255, 0.12) 100%)`,
                            }}
                            onChange={(e) =>
                              setCapsuleSettings((prev) => ({
                                ...prev,
                                [ctrl.key]:
                                  ctrl.key === 'visualsPerParagraph'
                                    ? Math.min(4, Math.max(1, Number(e.target.value)))
                                    : Number(e.target.value),
                              }))
                            }
                            className="monochrome-slider w-full cursor-pointer"
                          />
                        </div>
                        {ctrl.hint && <span className="text-[11px] text-zinc-500 mt-1.5 block leading-normal">{ctrl.hint}</span>}
                      </div>
                    );
                  })}

                  <div className="pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCapsuleSettings({ ...DEFAULT_CAPSULE_SETTINGS })}
                      className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium transition-all border border-white/[0.08] text-xs active:scale-[0.96]"
                    >
                      Reset to Craft Defaults
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Media Pool */}
              {activeTab === 'media' && (
                <div className="space-y-3.5">
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    All media entities recognized in current streaming response:
                  </p>
                  <div className="space-y-2">
                    {mediaTokens.map((token, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          handleSidebarMediaClick(
                            token.query,
                            token.fallbackUrl,
                            token.vendorPreference
                          )
                        }
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer flex items-center justify-between transition-all group active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-white/10 text-zinc-200 flex items-center justify-center text-[10px] font-mono font-semibold">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-zinc-200 group-hover:text-white truncate max-w-[145px]">
                            {token.query}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-zinc-400 font-medium">
                            {token.vendorPreference === 'duckduckgo' ? 'DDG' : 'Wiki'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
      </div>


      {/* Lightbox Inspection Modal */}
      <MediaLightbox media={inspectMedia} onClose={handleCloseLightbox} />
    </div>
  );
}
