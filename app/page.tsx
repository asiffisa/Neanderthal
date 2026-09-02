'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  Send,
  Zap,
  Layers,
  HelpCircle,
  Shuffle,
  Key,
  Check,
  X,
  ExternalLink,
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

export default function PlaygroundPage() {
  // Preset & Input state
  const [selectedPreset, setSelectedPreset] = useState<PresetQuestion>(PRESETS[0]);
  const [customInput, setCustomInput] = useState('');

  // Gemini API Key & Model state
  const [apiKey, setApiKey] = useState<string>('');
  const [keyDraft, setKeyDraft] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [isLiveGenerating, setIsLiveGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Streaming state
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState<number>(30); // ms per chunk
  const [streamIndex, setStreamIndex] = useState(0);

  // Inspector & UI settings
  const [activeTab, setActiveTab] = useState<'design' | 'media'>('design');
  const [capsuleSettings, setCapsuleSettings] = useState<CapsuleSettings>(DEFAULT_CAPSULE_SETTINGS);
  const [inspectMedia, setInspectMedia] = useState<ResolvedMedia | null>(null);

  const fullTextToStream = selectedPreset.response;
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load API key & model choice from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('neanderthal_gemini_key') || '';
      const savedModel = localStorage.getItem('neanderthal_gemini_model') || 'gemini-3.8-flash';
      setApiKey(savedKey);
      setKeyDraft(savedKey);
      setSelectedModel(savedModel);
    }
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
    setStreamIndex(0);
    setIsStreaming(true);

    let currentIndex = 0;
    const stepSize = 4; // chunk size for realistic LLM token burst

    streamTimerRef.current = setInterval(() => {
      currentIndex += stepSize;
      if (currentIndex >= fullContent.length) {
        setStreamedText(fullContent);
        setStreamIndex(fullContent.length);
        stopStreaming();
      } else {
        setStreamedText(fullContent.slice(0, currentIndex));
        setStreamIndex(currentIndex);
      }
    }, streamSpeed);
  };

  const handleInstantReveal = () => {
    stopStreaming();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (fullTextToStream) {
      setStreamedText(fullTextToStream);
      setStreamIndex(fullTextToStream.length);
    }
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
        body: JSON.stringify({ prompt: promptText, apiKey, model: selectedModel }),
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
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamedText(accumulated);
        setStreamIndex(accumulated.length);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Clean cancellation when switching prompts
      }
      const msg = err instanceof Error ? err.message : 'Streaming error occurred';
      console.error('[Gemini Stream Error]:', msg);
      setApiError(msg);
    } finally {
      setIsLiveGenerating(false);
      setIsStreaming(false);
    }
  };

  // Shuffle button handler: picks a random nature/science preset
  const handleShuffle = () => {
    const available = PRESETS.filter((p) => p.id !== selectedPreset.id);
    const random = available[Math.floor(Math.random() * available.length)] || PRESETS[0];
    setSelectedPreset(random);

    if (apiKey.trim()) {
      streamFromGemini(random.prompt, random.title, random.category, random.icon);
    } else {
      startStreaming(random.response);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const queryText = customInput.trim();
    setCustomInput('');

    if (apiKey.trim()) {
      streamFromGemini(queryText, 'Live Exploration', 'Nature & Science', '🔬');
    } else {
      const newCustomPreset: PresetQuestion = {
        id: 'custom-' + Date.now(),
        title: queryText.slice(0, 20) + (queryText.length > 20 ? '...' : ''),
        category: 'User Prompt',
        icon: '🔬',
        prompt: queryText,
        response: queryText.includes('![media:')
          ? queryText
          : `In the scientific study of **${queryText}** ![media:${queryText}], researchers analyze its biochemical, physical, and ecological significance in the natural world.`,
      };
      setSelectedPreset(newCustomPreset);
    }
  };

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();
    setApiKey(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('neanderthal_gemini_key', trimmed);
    }
    setShowKeyModal(false);
    setApiError(null);
  };

  const handleClearKey = () => {
    setApiKey('');
    setKeyDraft('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('neanderthal_gemini_key');
    }
    setShowKeyModal(false);
    setApiError(null);
  };

  // Compute AST tokens for live inspector
  const activeTokens: MarkdownToken[] = tokenizeStreamingMarkdown(streamedText, isStreaming);
  const mediaTokens = activeTokens.filter((t) => t.type === 'media');

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#e5e7eb] flex flex-col justify-center items-center p-3 sm:p-4 md:p-6 selection:bg-amber-500/20 selection:text-amber-300">
      <div className="w-full max-w-[900px] flex flex-col gap-3">
        {/* Preset & Control Action Bar */}
        <section className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Shuffle Action Button */}
            <button
              type="button"
              onClick={handleShuffle}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:text-amber-300 hover:border-amber-400/40 hover:bg-white/10 active:scale-95 transition-all shrink-0"
              title="Shuffle to random Nature & Science prompt"
            >
              <Shuffle className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 group-hover:rotate-180 transition-all duration-300" />
              <span>Shuffle</span>
            </button>

            <span className="text-zinc-600 mx-0.5">|</span>

            {/* Presets List */}
            {PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset);
                    if (apiKey.trim()) {
                      streamFromGemini(preset.prompt, preset.title, preset.category, preset.icon);
                    } else {
                      startStreaming(preset.response);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.title}</span>
                </button>
              );
            })}
          </div>

          {/* Gemini API Key Button */}
          <div className="shrink-0 pl-2">
            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                apiKey
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
              title={apiKey ? 'Gemini API Key Connected' : 'Add Gemini API Key for live unscripted answers'}
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">
                {apiKey ? getModelShortLabel(selectedModel) : 'Add Key'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  apiKey ? 'bg-emerald-400' : 'bg-zinc-500'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Two-Column Layout: Left (Chat) + Right (Control Property) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3.5 items-start w-full">
          {/* Left Column: Chat & Live Streaming */}
          <main className="flex flex-col gap-3 min-w-0">

          {/* Chat Stream Card */}
          <div className="rounded-2xl bg-[#111317] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Question Bar */}
            <div className="px-4 py-3 border-b border-white/10 bg-[#14161b] flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-lg mt-0.5">{selectedPreset.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold tracking-wider">
                      {selectedPreset.category}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[11px] text-zinc-400">Prompt</span>
                  </div>
                  <p className="text-sm font-semibold text-white tracking-tight mt-0.5 truncate">
                    {selectedPreset.prompt}
                  </p>
                </div>
              </div>

              {/* Streaming Playback Controls */}
              <div className="flex items-center gap-1 shrink-0 bg-black/40 p-1 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (apiKey.trim()) {
                      streamFromGemini(
                        selectedPreset.prompt,
                        selectedPreset.title,
                        selectedPreset.category,
                        selectedPreset.icon
                      );
                    } else if (selectedPreset.response) {
                      startStreaming(selectedPreset.response);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Replay Stream"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleInstantReveal}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono hover:bg-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Instant reveal"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  Instant
                </button>
              </div>
            </div>

            {/* Stream View Area */}
            <div className="p-4 md:p-5 overflow-y-auto min-h-[360px] max-h-[460px] text-[13.5px] leading-relaxed">
              {apiError && (
                <div className="p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3 text-xs text-red-300">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-semibold block">Gemini API Error</span>
                      <span className="text-[11px] text-red-300/90 break-words">{apiError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(true)}
                    className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-medium shrink-0 transition-colors"
                  >
                    Fix Key
                  </button>
                </div>
              )}

              {isLiveGenerating && !streamedText && (
                <div className="flex items-center gap-2.5 text-xs text-zinc-400 py-8 justify-center animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>
                    {getModelFullLabel(selectedModel)} is
                    generating insights with visual capsules...
                  </span>
                </div>
              )}

              <StreamingMarkdownView
                content={streamedText}
                isStreaming={isStreaming}
                settings={capsuleSettings}
                onInspect={(m) => setInspectMedia(m)}
              />
            </div>

            {/* Stream Status Bar */}
            <div className="px-4 py-2 bg-[#0e1014] border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isStreaming ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  {isStreaming ? 'Streaming...' : 'Complete'}
                </span>
                <span className="text-zinc-600">|</span>
                <span className="font-mono text-[10px] text-amber-400">
                  {mediaTokens.length} visual{mediaTokens.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Speed dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Speed:</span>
                <select
                  value={streamSpeed}
                  onChange={(e) => setStreamSpeed(Number(e.target.value))}
                  className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 focus:outline-none"
                >
                  <option value={60}>0.5x</option>
                  <option value={30}>1x</option>
                  <option value={15}>2x</option>
                  <option value={5}>Turbo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Prompt Input */}
          <form onSubmit={handleCustomSubmit} className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask or test tokens: 'Tell me about Saturn ![media:Saturn]'"
                className="w-full bg-[#111317] border border-white/10 focus:border-amber-400/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50 shadow-md pr-10 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors"
                title="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 pl-1">
              Tip: Include <code className="text-amber-400/90 font-mono">![media:query]</code> anywhere to resolve inline media.
            </p>
          </form>
        </main>

        {/* Right Column: Control Property Sidebar */}
        <aside className="w-full md:w-[280px] shrink-0 flex flex-col gap-3">
          <div className="rounded-2xl bg-[#111317] border border-white/10 shadow-xl overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex items-center border-b border-white/10 bg-[#14161b]">
              <button
                type="button"
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-2.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
                  activeTab === 'design'
                    ? 'border-amber-400 text-amber-300 bg-white/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                Craft
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-2.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
                  activeTab === 'media'
                    ? 'border-amber-400 text-amber-300 bg-white/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                Media ({mediaTokens.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto max-h-[calc(100vh-220px)] space-y-5 text-xs">
              {/* Tab 1: Design Controls */}
              {activeTab === 'design' && (
                <div className="space-y-4">
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
                  ].map((ctrl) => (
                    <div key={ctrl.key}>
                      <div className="flex justify-between mb-1.5">
                        <span className="font-medium text-zinc-300">{ctrl.label}</span>
                        <span className="font-mono text-amber-400">{ctrl.value}{ctrl.unit}</span>
                      </div>
                      <input
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        value={ctrl.value}
                        onChange={(e) =>
                          setCapsuleSettings({ ...capsuleSettings, [ctrl.key]: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      {ctrl.hint && <span className="text-[11px] text-zinc-500">{ctrl.hint}</span>}
                    </div>
                  ))}

                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-medium text-zinc-300">Hover Popover Card</span>
                      <input
                        type="checkbox"
                        checked={capsuleSettings.showHoverCard}
                        onChange={(e) =>
                          setCapsuleSettings({
                            ...capsuleSettings,
                            showHoverCard: e.target.checked,
                          })
                        }
                        className="rounded accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-medium text-zinc-300">Hover Spring Zoom</span>
                      <input
                        type="checkbox"
                        checked={capsuleSettings.hoverScale}
                        onChange={(e) =>
                          setCapsuleSettings({
                            ...capsuleSettings,
                            hoverScale: e.target.checked,
                          })
                        }
                        className="rounded accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCapsuleSettings(DEFAULT_CAPSULE_SETTINGS)}
                      className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-colors border border-white/10 text-xs"
                    >
                      Reset to Craft Defaults
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Media Pool */}
              {activeTab === 'media' && (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-[11px]">
                    All media entities recognized in current streaming response:
                  </p>
                  <div className="space-y-2">
                    {mediaTokens.map((token, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setInspectMedia({
                            query: token.query,
                            title: token.query,
                            status: 'loaded',
                          })
                        }
                        className="p-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-amber-400/40 cursor-pointer flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-white truncate max-w-[180px]">
                            {token.query}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
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

      {/* Gemini API Key Configuration Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[#14161b] border border-white/15 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Google Gemini API Key</h3>
                    <p className="text-[11px] text-zinc-400">Enables unscripted streaming for any science prompt</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-300 font-medium block">
                  Paste your Gemini API Key
                </label>
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 font-mono transition-all"
                />
                <p className="text-[11px] text-zinc-500">
                  Your key is saved locally in your browser&apos;s localStorage and sent securely to your local dev server.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium block">
                  Gemini Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setSelectedModel(newModel);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('neanderthal_gemini_model', newModel);
                    }
                  }}
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all cursor-pointer"
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Latest Flagship)</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
                <p className="text-[11px] text-zinc-500">
                  Defaults to Gemini 3.8 Flash with automatic fallback cascade.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10 text-xs">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors text-[11px]"
                >
                  Get a free key from Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-2">
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors shadow-sm"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Inspection Modal */}
      <MediaLightbox media={inspectMedia} onClose={() => setInspectMedia(null)} />
    </div>
  );
}
