'use client';

import { useChatStore, Message, PERSONAS, BACKGROUND_THEMES, ChatBackground } from '@/store/chat-store';
import MessageBubble from './message-bubble';
import ChatInput from './chat-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquarePlus,
  Sparkles,
  Menu,
  Lightbulb,
  Code,
  Mail,
  ImageIcon,
  Keyboard,
  StopCircle,
  Download,
  ChevronDown,
  Search,
  X,
  ChevronUp,
  Heart,
  Share2,
  Pin,
  PinOff,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_CLASS: Record<FontSize, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

function getStoredFontSize(): FontSize {
  if (typeof window === 'undefined') return 'medium';
  try {
    const stored = localStorage.getItem('nexusai-font-size') as FontSize | null;
    if (stored && ['small', 'medium', 'large'].includes(stored)) return stored;
  } catch {
    // ignore
  }
  return 'medium';
}

function getStoredBackground(): ChatBackground {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = localStorage.getItem('nexusai-chat-background') as ChatBackground | null;
    if (stored && BACKGROUND_THEMES.some((t) => t.id === stored)) return stored;
  } catch {
    // ignore
  }
  return 'default';
}

function getStoredShowTimestamps(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem('nexusai-show-timestamps');
    if (stored !== null) return stored === 'true';
  } catch {
    // ignore
  }
  return true;
}

function getStoredFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('nexusai-favorites');
    if (stored) return JSON.parse(stored) as string[];
  } catch {
    // ignore
  }
  return [];
}

function saveFavorites(favorites: string[]) {
  try {
    localStorage.setItem('nexusai-favorites', JSON.stringify(favorites));
  } catch {
    // ignore
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    const val = num / 1000;
    return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
  }
  return num.toString();
}

const SUGGESTIONS = [
  {
    id: 'quantum',
    text: 'Explain quantum computing in simple terms',
    title: 'Explain quantum computing',
    description: 'Break down complex topics into easy-to-understand language',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'python',
    text: 'Write a Python function to sort a list',
    title: 'Write Python code',
    description: 'Get help with coding tasks and debugging',
    icon: Code,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'email',
    text: 'Help me write a professional email',
    title: 'Draft a professional email',
    description: 'Craft polished, well-structured business emails',
    icon: Mail,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'image',
    text: 'Generate a sunset landscape image',
    title: 'Generate an image',
    description: 'Create stunning visuals from text descriptions',
    icon: ImageIcon,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    enableImageMode: true,
  },
];

function SuggestionCard({
  suggestion,
  index,
  onClick,
}: {
  suggestion: (typeof SUGGESTIONS)[number];
  index: number;
  onClick: () => void;
}) {
  const IconComp = suggestion.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/50',
        'hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5',
        'transition-all duration-200 text-left group cursor-pointer hover-glow-emerald',
        'active:scale-[0.98]'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-all duration-200',
          suggestion.bgColor,
          'group-hover:scale-110 group-hover:shadow-sm',
          'relative overflow-hidden shimmer-overlay'
        )}
      >
        <IconComp className={cn('w-4.5 h-4.5 relative z-10', suggestion.color)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{suggestion.title}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
          {suggestion.description}
        </p>
      </div>
    </motion.button>
  );
}

interface ChatAreaProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function ChatArea({ onToggleSidebar, sidebarOpen }: ChatAreaProps) {
  const {
    activeConversationId,
    conversations,
    addConversation,
    setActiveConversationId,
    addMessage,
    removeMessage,
    updateMessage,
    setGenerating,
    isGenerating,
    selectedPersona,
    setSelectedPersona,
    selectedBackground,
    setSelectedBackground,
    showTimestamps,
    setShowTimestamps,
    isUserTyping,
    setUserTyping,
    toggleReaction,
    useCustomSystemPrompt,
    customSystemPrompt,
  } = useChatStore();
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [pendingImageMode, setPendingImageMode] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const personaDropdownRef = useRef<HTMLDivElement>(null);

  // Feature 1: Message search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Feature 2: Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Pinned messages state
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [pinnedSectionOpen, setPinnedSectionOpen] = useState(true);

  // AI Quick Reply Suggestions state
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, string[]>>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState<string | null>(null);

  // Typing status for header indicator
  const [typingStatus, setTypingStatus] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  // Track time of first chunk for streaming response time
  const firstChunkTimeRef = useRef<number | null>(null);



  // Feature 4: Response time tracking
  const requestStartTimeRef = useRef<number | null>(null);

  // Scroll-to-bottom button state
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [messagesBelowViewport, setMessagesBelowViewport] = useState(0);
  const scrollAreaContainerRef = useRef<HTMLDivElement>(null);
  const [scrollContainerReady, setScrollContainerReady] = useState(false);

  // Ref callback to ensure scroll listener attaches after DOM is ready
  const scrollAreaRefCallback = useCallback((node: HTMLDivElement | null) => {
    scrollAreaContainerRef.current = node;
    setScrollContainerReady(!!node);
  }, []);

  // Pinned messages localStorage helpers
  function getStoredPinned(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('nexusai-pinned');
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch { /* ignore */ }
    return new Set();
  }

  function savePinned(pinned: Set<string>) {
    try {
      localStorage.setItem('nexusai-pinned', JSON.stringify([...pinned]));
    } catch { /* ignore */ }
  }

  // Load preferences from localStorage
  useEffect(() => {
    setFontSize(getStoredFontSize());
    setFavorites(getStoredFavorites());
    setSelectedBackground(getStoredBackground());
    setShowTimestamps(getStoredShowTimestamps());
    setPinnedMessages(getStoredPinned());
  }, [setSelectedBackground, setShowTimestamps]);

  // Listen for settings changes from settings sheet
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nexusai-font-size') {
        setFontSize(getStoredFontSize());
      }
      if (e.key === 'nexusai-chat-background') {
        setSelectedBackground(getStoredBackground());
      }
      if (e.key === 'nexusai-show-timestamps') {
        setShowTimestamps(getStoredShowTimestamps());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      setFontSize(getStoredFontSize());
      setSelectedBackground(getStoredBackground());
      setShowTimestamps(getStoredShowTimestamps());
    }, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [setSelectedBackground, setShowTimestamps]);

  // Close persona dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaDropdownRef.current && !personaDropdownRef.current.contains(e.target as Node)) {
        setPersonaDropdownOpen(false);
      }
    };
    if (personaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [personaDropdownOpen]);

  // Scroll listener for scroll-to-bottom button
  // Uses scrollContainerReady state to ensure ref is set before attaching
  useEffect(() => {
    const container = scrollAreaContainerRef.current;
    if (!container) return;

    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement | null;
    if (!viewport) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        const distanceFromBottom = viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight);
        const scrolledUp = distanceFromBottom > 200;
        setIsScrolledUp(scrolledUp);

        if (scrolledUp) {
          const messagesContainer = container.querySelector('[data-messages-container]');
          if (messagesContainer) {
            const msgEls = messagesContainer.querySelectorAll('[data-message-idx]');
            const viewportRect = viewport.getBoundingClientRect();
            let count = 0;
            msgEls.forEach((el) => {
              const rect = (el as HTMLElement).getBoundingClientRect();
              if (rect.top >= viewportRect.bottom) {
                count++;
              }
            });
            setMessagesBelowViewport(count);
          }
        } else {
          setMessagesBelowViewport(0);
        }
      });
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollContainerReady]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];
  const currentPersona = PERSONAS.find((p) => p.id === selectedPersona) || PERSONAS[0];

  // Compute effective system prompt (custom overrides persona when enabled)
  const effectiveSystemPrompt = useMemo(() => {
    if (useCustomSystemPrompt && customSystemPrompt.trim()) {
      return customSystemPrompt.trim();
    }
    return currentPersona.systemPrompt;
  }, [useCustomSystemPrompt, customSystemPrompt, currentPersona.systemPrompt]);

  // Feature 1: Compute search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return messages.reduce<number[]>((acc, msg, idx) => {
      if (msg.content.toLowerCase().includes(query)) {
        acc.push(idx);
      }
      return acc;
    }, []);
  }, [searchQuery, messages]);

  // Toggle pin on a message
  const handleTogglePin = useCallback((messageId: string) => {
    setPinnedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
        toast.success('Message unpinned');
      } else {
        next.add(messageId);
        toast.success('Message pinned');
      }
      savePinned(next);
      return next;
    });
  }, []);

  // Get pinned messages for current conversation (up to 3)
  const pinnedMessagesInConv = useMemo(() => {
    return messages.filter((m) => pinnedMessages.has(m.id)).slice(0, 3);
  }, [messages, pinnedMessages]);

  // Feature 2: Toggle favorite
  const handleToggleFavorite = useCallback((messageId: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(messageId);
      const next = isFav
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId];
      saveFavorites(next);
      toast.success(isFav ? 'Removed from favorites' : 'Message saved');
      return next;
    });
  }, []);

  // Feature 1: Open search with Ctrl+F/Cmd+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
      }
      // Escape to close search
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      // Enter to go to next match
      if (e.key === 'Enter' && searchOpen && searchMatches.length > 0) {
        e.preventDefault();
        setCurrentMatchIndex((prev) => {
          if (e.shiftKey) {
            return prev <= 0 ? searchMatches.length - 1 : prev - 1;
          }
          return prev >= searchMatches.length - 1 ? 0 : prev + 1;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, searchMatches.length]);

  // Reset current match index when search query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  // Feature 1: Navigate search matches with up/down
  const handleSearchPrev = useCallback(() => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev <= 0 ? searchMatches.length - 1 : prev - 1));
  }, [searchMatches.length]);

  const handleSearchNext = useCallback(() => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev >= searchMatches.length - 1 ? 0 : prev + 1));
  }, [searchMatches.length]);

  const handleSearchClear = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setCurrentMatchIndex(0);
    searchInputRef.current?.blur();
  }, []);

  const createNewChat = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      const data = await res.json();

      if (data.conversation) {
        const conversation = {
          ...data.conversation,
          messages: [],
        };
        addConversation(conversation);
        setActiveConversationId(conversation.id);
        return conversation.id;
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    return null;
  }, [addConversation, setActiveConversationId]);

  // Smooth scroll to bottom whenever messages change or generating state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isGenerating]);

  // Keyboard shortcut: Ctrl+N / Cmd+N to create new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewChat]);

  const handleSuggestionClick = useCallback(
    async (text: string, enableImageMode = false) => {
      let convId = activeConversationId;
      if (!convId) {
        convId = await createNewChat();
        if (!convId) return;
      }
      setPendingSuggestion(text);
      setPendingImageMode(enableImageMode);
    },
    [activeConversationId, createNewChat]
  );

  // Feature 1: Stop generation handler
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenerating(false);
    setIsStreaming(false);
    toast.success('Generation stopped');
  }, [setGenerating]);

  // Auto-title a conversation using AI based on the first user message
  const generateAutoTitle = useCallback(async (convId: string, firstMessage: string) => {
    try {
      useChatStore.getState().setAutoTitleLoadingId(convId);

      const res = await fetch('/api/ai/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: firstMessage }],
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!data.title || data.title === 'New Chat') return;

      // Update title in the store
      useChatStore.getState().updateConversation(convId, { title: data.title });

      // Update title in the database
      await fetch(`/api/chat/${convId}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title }),
      });

      toast.success('Smart title applied', { description: data.title, duration: 2500 });
    } catch (error) {
      console.error('Auto-title error:', error);
    } finally {
      useChatStore.getState().setAutoTitleLoadingId(null);
    }
  }, []);

  // Helper: consume SSE stream from AI chat and update message in real-time
  const streamAIResponse = useCallback(
    async (
      res: Response,
      convId: string,
      assistantMsgId: string,
      controller: AbortController
    ): Promise<boolean> => {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) return false;

      setIsStreaming(true);
      const reader = res.body?.getReader();
      if (!reader) return false;

      const decoder = new TextDecoder();
      let accumulated = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);

              // Check for stream error
              if (parsed.error) {
                toast.error('AI response error');
                updateMessage(convId, assistantMsgId, {
                  content: 'Sorry, something went wrong. Please try again.',
                });
                return true;
              }

              // Final event with id and createdAt
              if (parsed.done) {
                const responseTime = firstChunkTimeRef.current
                  ? Date.now() - firstChunkTimeRef.current
                  : null;
                updateMessage(convId, assistantMsgId, {
                  id: parsed.id || assistantMsgId,
                  createdAt: parsed.createdAt || new Date().toISOString(),
                  responseTime,
                });
                continue;
              }

              // Content delta
              if (parsed.content) {
                if (!firstChunkTimeRef.current) {
                  firstChunkTimeRef.current = Date.now();
                }
                accumulated += parsed.content;
                updateMessage(convId, assistantMsgId, { content: accumulated });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // User stopped generation - keep partial content
        } else {
          console.error('Stream reading error:', error);
        }
      } finally {
        setIsStreaming(false);
        firstChunkTimeRef.current = null;
      }

      return true;
    },
    [updateMessage]
  );

  // Fetch AI suggestions after AI response (defined early to avoid TDZ with sendMessage)
  const fetchSuggestions = useCallback(async (convId: string, assistantMsgId: string, messagesList: Message[]) => {
    try {
      setSuggestionsLoading(assistantMsgId);
      const lastMessages = messagesList.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: lastMessages }),
      });
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestionsMap((prev) => ({ ...prev, [assistantMsgId]: data.suggestions }));
      }
    } catch {
      // Silently fail - suggestions are optional
    } finally {
      setSuggestionsLoading(null);
    }
  }, []);

  // Dismiss suggestions
  const handleDismissSuggestions = useCallback((messageId: string) => {
    setSuggestionsMap((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, imageBase64?: string) => {
      setPendingSuggestion(null);
      setPendingImageMode(false);

      let convId = activeConversationId;
      if (!convId) {
        convId = await createNewChat();
        if (!convId) return;
      }

      const userMessage: Message = {
        id: uuidv4(),
        content: content || 'Analyze this image',
        role: 'user',
        createdAt: new Date().toISOString(),
        attachedImage: imageBase64 || null,
      };

      addMessage(convId, userMessage);
      setGenerating(true);

      // Feature 4: Record start time
      requestStartTimeRef.current = Date.now();
      firstChunkTimeRef.current = null;

      // Create AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Save user message to database
      try {
        await fetch(`/api/chat/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: userMessage.content, role: 'user' }),
        });
      } catch (error) {
        console.error('Failed to save message:', error);
      }

      // Create empty assistant message for streaming
      const assistantMsgId = uuidv4();
      addMessage(convId, {
        id: assistantMsgId,
        content: '',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      });

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content || 'Analyze this image',
            conversationId: convId,
            systemPrompt: effectiveSystemPrompt,
            imageBase64: imageBase64 || undefined,
          }),
          signal: controller.signal,
        });

        // Try streaming first
        const wasStreamed = await streamAIResponse(res, convId, assistantMsgId, controller);

        if (wasStreamed) {
          // Check if content was actually accumulated (not empty from error)
          const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
          const msg = conv?.messages.find((m) => m.id === assistantMsgId);
          if (!msg?.content) {
            // Stream completed but no content - remove empty message
            removeMessage(convId, assistantMsgId);
          }
          return;
        }

        // Non-streaming fallback
        const data = await res.json();

        // Feature 4: Calculate response time
        const responseTime = requestStartTimeRef.current ? Date.now() - requestStartTimeRef.current : null;

        if (data.message) {
          const assistantMessage: Message = {
            id: data.message.id,
            content: data.message.content,
            role: 'assistant',
            createdAt: data.message.createdAt || new Date().toISOString(),
            responseTime: responseTime,
          };

          // Remove the empty placeholder and add the real message
          removeMessage(convId, assistantMsgId);
          addMessage(convId, assistantMessage);
        } else {
          // No message in response, remove empty placeholder
          removeMessage(convId, assistantMsgId);
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Generation was stopped by user - keep partial streamed content if any
          const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
          const msg = conv?.messages.find((m) => m.id === assistantMsgId);
          if (!msg?.content) {
            removeMessage(convId, assistantMsgId);
          }
        } else {
          console.error('AI chat error:', error);
          toast.error('Failed to get AI response');
          updateMessage(convId, assistantMsgId, {
            content: 'Sorry, something went wrong. Please try again.',
          });
        }
      } finally {
        setGenerating(false);
        abortControllerRef.current = null;
        requestStartTimeRef.current = null;
        firstChunkTimeRef.current = null;

        // Auto-title if the conversation title is still "New Chat"
        const convForTitle = useChatStore.getState().conversations.find((c) => c.id === convId);
        if (convForTitle && convForTitle.title === 'New Chat') {
          generateAutoTitle(convId, content || 'Analyze this image').catch(() => {});
        }

        // Fetch quick reply suggestions for the assistant message
        const finalMsgs = useChatStore.getState().conversations.find((c) => c.id === convId)?.messages || [];
        const lastMsg = finalMsgs[finalMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
          fetchSuggestions(convId, lastMsg.id, finalMsgs);
        }
      }
    },
    [activeConversationId, createNewChat, addMessage, removeMessage, updateMessage, setGenerating, effectiveSystemPrompt, streamAIResponse, generateAutoTitle, fetchSuggestions]
  );

  const generateImage = useCallback(
    async (prompt: string) => {
      setPendingSuggestion(null);
      setPendingImageMode(false);

      let convId = activeConversationId;
      if (!convId) {
        convId = await createNewChat();
        if (!convId) return;
      }

      const userMessage: Message = {
        id: uuidv4(),
        content: `Generate image: ${prompt}`,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      addMessage(convId, userMessage);
      setGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Feature 4: Record start time
      requestStartTimeRef.current = Date.now();

      // Save user message to database
      try {
        await fetch(`/api/chat/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: userMessage.content, role: 'user' }),
        });
      } catch (error) {
        console.error('Failed to save message:', error);
      }

      try {
        const res = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        const data = await res.json();

        // Feature 4: Calculate response time
        const responseTime = requestStartTimeRef.current ? Date.now() - requestStartTimeRef.current : null;

        if (data.success) {
          const assistantMessage: Message = {
            id: uuidv4(),
            content: "Here's the image I generated based on your description:",
            role: 'assistant',
            imageUrl: data.imageUrl,
            imagePrompt: data.prompt,
            createdAt: new Date().toISOString(),
            responseTime: responseTime,
          };

          addMessage(convId, assistantMessage);
          toast.success('Image generated successfully');

          // Save assistant message to database
          await fetch(`/api/chat/${convId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: assistantMessage.content,
              role: 'assistant',
              imageUrl: data.imageUrl,
              imagePrompt: data.prompt,
            }),
          });
        } else {
          throw new Error(data.error || 'Image generation failed');
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Generation was stopped by user
        } else {
          console.error('Image generation error:', error);
          toast.error('Failed to generate image');
          addMessage(convId, {
            id: uuidv4(),
            content: 'Sorry, I could not generate the image. Please try again.',
            role: 'assistant',
            createdAt: new Date().toISOString(),
          });
        }
      } finally {
        setGenerating(false);
        abortControllerRef.current = null;
        requestStartTimeRef.current = null;
      }
    },
    [activeConversationId, createNewChat, addMessage, setGenerating]
  );

  // Regenerate handler
  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (!activeConversationId || isGenerating) return;

      const conv = conversations.find((c) => c.id === activeConversationId);
      if (!conv) return;

      const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      let userContent = '';
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (conv.messages[i].role === 'user') {
          userContent = conv.messages[i].content.replace(/^Generate image: /, '');
          break;
        }
      }

      if (!userContent) return;

      removeMessage(activeConversationId, messageId);

      toast.info('Regenerating response...');
      setGenerating(true);

      // Feature 4: Record start time
      requestStartTimeRef.current = Date.now();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const wasImageMessage = conv.messages[msgIndex]?.imageUrl;

      try {
        if (wasImageMessage) {
          const res = await fetch('/api/ai/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userContent }),
            signal: controller.signal,
          });

          const data = await res.json();

          // Feature 4: Calculate response time
          const responseTime = requestStartTimeRef.current ? Date.now() - requestStartTimeRef.current : null;

          if (data.success) {
            const newMessage: Message = {
              id: uuidv4(),
              content: "Here's the image I generated based on your description:",
              role: 'assistant',
              imageUrl: data.imageUrl,
              imagePrompt: data.prompt,
              createdAt: new Date().toISOString(),
              responseTime: responseTime,
            };
            addMessage(activeConversationId, newMessage);
            toast.success('Image generated successfully');
          } else {
            throw new Error(data.error || 'Image generation failed');
          }
        } else {
          // Create empty assistant message for streaming
          const regenMsgId = uuidv4();
          addMessage(activeConversationId, {
            id: regenMsgId,
            content: '',
            role: 'assistant',
            createdAt: new Date().toISOString(),
          });
          firstChunkTimeRef.current = null;

          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userContent,
              conversationId: activeConversationId,
              systemPrompt: effectiveSystemPrompt,
            }),
            signal: controller.signal,
          });

          // Try streaming first
          const wasStreamed = await streamAIResponse(res, activeConversationId, regenMsgId, controller);

          if (wasStreamed) {
            const convState = useChatStore.getState().conversations.find((c) => c.id === activeConversationId);
            const msgState = convState?.messages.find((m) => m.id === regenMsgId);
            if (!msgState?.content) {
              removeMessage(activeConversationId, regenMsgId);
            }
          } else {
            // Non-streaming fallback
            const data = await res.json();
            const responseTime = requestStartTimeRef.current ? Date.now() - requestStartTimeRef.current : null;

            if (data.message) {
              const newMessage: Message = {
                id: data.message.id || uuidv4(),
                content: data.message.content,
                role: 'assistant',
                createdAt: data.message.createdAt || new Date().toISOString(),
                responseTime: responseTime,
              };
              removeMessage(activeConversationId, regenMsgId);
              addMessage(activeConversationId, newMessage);
            } else {
              removeMessage(activeConversationId, regenMsgId);
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Generation was stopped by user
        } else {
          console.error('Regenerate error:', error);
          toast.error('Failed to get AI response');
          addMessage(activeConversationId, {
            id: uuidv4(),
            content: 'Sorry, something went wrong while regenerating. Please try again.',
            role: 'assistant',
            createdAt: new Date().toISOString(),
          });
        }
      } finally {
        setGenerating(false);
        abortControllerRef.current = null;
        requestStartTimeRef.current = null;
        firstChunkTimeRef.current = null;
      }
    },
    [activeConversationId, conversations, isGenerating, removeMessage, addMessage, setGenerating, effectiveSystemPrompt, streamAIResponse]
  );

  // Feature 2: Edit message handler - update content and regenerate
  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeConversationId) return;

      // Update message in store
      updateMessage(activeConversationId, messageId, { content: newContent });

      // Update message in database
      try {
        await fetch(`/api/chat/${activeConversationId}/messages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, content: newContent }),
        });
      } catch (error) {
        console.error('Failed to update message:', error);
      }

      // Remove all messages after this user message (assistant responses etc.)
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv) {
        const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
        if (msgIndex !== -1) {
          for (let i = conv.messages.length - 1; i > msgIndex; i--) {
            removeMessage(activeConversationId, conv.messages[i].id);
          }
        }
      }

      // Re-send to AI to get a new response
      if (!isGenerating) {
        setGenerating(true);
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Feature 4: Record start time
        requestStartTimeRef.current = Date.now();

        const cleanContent = newContent.replace(/^Generate image: /, '');
        const isImageRequest = newContent.startsWith('Generate image:');

        try {
          if (isImageRequest) {
            const res = await fetch('/api/ai/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: cleanContent }),
              signal: controller.signal,
            });
            const data = await res.json();
            const responseTime = requestStartTimeRef.current ? Date.now() - requestStartTimeRef.current : null;
            if (data.success) {
              const newMsg: Message = {
                id: uuidv4(),
                content: "Here's the image I generated based on your description:",
                role: 'assistant',
                imageUrl: data.imageUrl,
                imagePrompt: data.prompt,
                createdAt: new Date().toISOString(),
                responseTime: responseTime,
              };
              addMessage(activeConversationId, newMsg);
              toast.success('Image generated successfully');
            } else {
              throw new Error(data.error || 'Image generation failed');
            }
          } else {
            // Create empty assistant message for streaming
            const editMsgId = uuidv4();
            addMessage(activeConversationId, {
              id: editMsgId,
              content: '',
              role: 'assistant',
              createdAt: new Date().toISOString(),
            });
            firstChunkTimeRef.current = null;

            const res = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: newContent,
                conversationId: activeConversationId,
                systemPrompt: effectiveSystemPrompt,
              }),
              signal: controller.signal,
            });

            // Try streaming first
            const wasStreamed = await streamAIResponse(res, activeConversationId, editMsgId, controller);

            if (wasStreamed) {
              const convState = useChatStore.getState().conversations.find((c) => c.id === activeConversationId);
              const msgState = convState?.messages.find((m) => m.id === editMsgId);
              if (!msgState?.content) {
                removeMessage(activeConversationId, editMsgId);
              }
            } else {
              // Non-streaming fallback
              const data = await res.json();
              const responseTime = requestStartTimeRef.current ? Date.now() - requestStartTimeRef.current : null;
              if (data.message) {
                const newMsg: Message = {
                  id: data.message.id || uuidv4(),
                  content: data.message.content,
                  role: 'assistant',
                  createdAt: data.message.createdAt || new Date().toISOString(),
                  responseTime: responseTime,
                };
                removeMessage(activeConversationId, editMsgId);
                addMessage(activeConversationId, newMsg);
              } else {
                removeMessage(activeConversationId, editMsgId);
              }
            }
          }
        } catch (error: unknown) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            // Generation was stopped by user
          } else {
            console.error('Edit-regenerate error:', error);
            toast.error('Failed to get AI response');
            addMessage(activeConversationId, {
              id: uuidv4(),
              content: 'Sorry, something went wrong. Please try again.',
              role: 'assistant',
              createdAt: new Date().toISOString(),
            });
          }
        } finally {
          setGenerating(false);
          abortControllerRef.current = null;
          requestStartTimeRef.current = null;
        }
      }
    },
    [activeConversationId, conversations, updateMessage, removeMessage, addMessage, setGenerating, isGenerating, effectiveSystemPrompt, streamAIResponse]
  );

  // Share conversation as formatted text
  const handleShareConversation = useCallback(() => {
    if (!activeConversation || messages.length === 0) {
      toast.error('No messages to share');
      return;
    }

    const date = new Date().toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let text = '🌟 Zinter AI Conversation 🌟\n\n';
    text += `Title: ${activeConversation.title}\n`;
    text += `Date: ${date}\n`;
    text += `Persona: ${currentPersona.name}\n`;
    text += '\n━━━━━━━━━━━━━━━━━━━━━\n\n';

    for (const msg of messages) {
      const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const sender = msg.role === 'user' ? '👤 User' : '🤖 Zinter AI';
      text += `${sender} (${time}):\n`;
      text += `${msg.content}\n\n`;
    }

    text += '━━━━━━━━━━━━━━━━━━━━━\n\n';
    text += 'Generated with Zinter AI';

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Conversation copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, [activeConversation, messages, currentPersona.name]);

  // Feature 3: Export conversation as Markdown
  const handleExportMarkdown = useCallback(() => {
    if (!activeConversation || messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    let markdown = `# ${activeConversation.title}\n\n`;
    markdown += `*Exported from Zinter AI on ${new Date().toLocaleString()}*\n\n---\n\n`;

    for (const msg of messages) {
      const sender = msg.role === 'user' ? '**User**' : '**Zinter AI**';
      const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      markdown += `${sender} (${time})\n\n`;

      if (msg.imageUrl) {
        markdown += `${msg.content}\n\n`;
        markdown += `![${msg.imagePrompt || 'Generated image'}](${msg.imageUrl})\n\n`;
      } else {
        markdown += `${msg.content}\n\n`;
      }

      markdown += '---\n\n';
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Conversation exported as Markdown');
  }, [activeConversation, messages]);

  // Feature 4: Find the most recent assistant message with responseTime
  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].responseTime != null) {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  // Feature 2: Filter messages based on favorites
  const displayMessages = useMemo(() => {
    if (!showFavoritesOnly) return messages;
    return messages.filter((m) => favorites.includes(m.id));
  }, [messages, showFavoritesOnly, favorites]);

  const favoritesInConv = useMemo(() => {
    return messages.filter((m) => favorites.includes(m.id)).length;
  }, [messages, favorites]);

  // Handle typing status change from ChatInput
  const handleTypingStatusChange = useCallback((isTyping: boolean) => {
    setTypingStatus(isTyping);
    setUserTyping(isTyping);
  }, [setUserTyping]);

  // Handle template insertion
  const [templateText, setTemplateText] = useState<string | null>(null);

  const handleInsertTemplate = useCallback((text: string) => {
    setTemplateText(text);
  }, []);

  // Handle reaction toggle
  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!activeConversationId) return;
    toggleReaction(activeConversationId, messageId, emoji);
  }, [activeConversationId, toggleReaction]);

  // Chat statistics
  const chatStats = useMemo(() => {
    if (messages.length === 0) return null;
    const totalWords = messages.reduce((sum, msg) => {
      return sum + msg.content.split(/\s+/).filter(Boolean).length;
    }, 0);
    return { wordCount: totalWords };
  }, [messages]);

  const formattedStats = useMemo(() => {
    if (!chatStats) return '';
    const parts: string[] = [];
    if (typingStatus) {
      parts.push('Typing...');
    } else {
      parts.push(`${messages.length} message${messages.length !== 1 ? 's' : ''}`);
      parts.push(`${formatNumber(chatStats.wordCount)} words`);
    }
    return parts.join(' · ');
  }, [chatStats, messages.length, typingStatus]);

  // Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Typing indicator component - shows "thinking" before stream starts, "responding" while flowing
  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 px-4 py-2"
    >
      <div className="relative shrink-0 mt-0.5">
        {/* Animated ring around avatar during thinking */}
        <motion.div
          className="absolute -inset-1 rounded-full opacity-60"
          style={{
            background: 'conic-gradient(from 0deg, #10b981, #14b8a6, #10b981)',
            WebkitMask: 'radial-gradient(transparent 62%, black 64%)',
            mask: 'radial-gradient(transparent 62%, black 64%)',
          }}
          animate={{ rotate: 360 }}
          transition={isStreaming ? { duration: 2, repeat: Infinity, ease: 'linear' } : { duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        <Avatar className="w-8 h-8 relative z-10">
          <AvatarFallback className={cn(
            'text-xs font-medium bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-all duration-300',
            isStreaming ? 'scale-105 shadow-lg shadow-emerald-500/40' : 'animate-pulse'
          )}>
            <Sparkles className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex items-center gap-2 py-2">
        {/* Animated waveform bars */}
        <div className="flex items-end gap-[3px] h-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className={cn(
                'w-[3px] rounded-full',
                isStreaming
                  ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                  : 'bg-emerald-500'
              )}
              animate={isStreaming
                ? { height: ['8px', '18px', '6px', '14px', '8px'] }
                : { height: ['4px', '14px', '4px'], opacity: [0.4, 1, 0.4] }
              }
              transition={isStreaming
                ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }
                : { duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }
              }
            />
          ))}
        </div>
        <span className={cn(
          'text-sm font-medium',
          isStreaming ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )}>
          {isStreaming ? 'Zinter AI is responding' : 'Zinter AI is thinking'}
          <span className="animate-cursor-blink ml-0.5">|</span>
        </span>
      </div>
    </motion.div>
  );

  // Stop button component with prominent styling
  const StopButton = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="flex justify-center px-4 py-1"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={handleStopGeneration}
        className="gap-2 rounded-full border-destructive/30 bg-card/90 backdrop-blur-sm text-destructive/80 hover:text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:shadow-md hover:shadow-destructive/10 transition-all duration-200 shadow-sm"
      >
        <StopCircle className="w-4 h-4" />
        <span className="text-xs font-semibold">Stop generating</span>
      </Button>
    </motion.div>
  );

  // Empty state when no conversation is selected
  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 p-4 border-b border-border lg:hidden">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Zinter AI</h1>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex items-center justify-center p-8 min-h-full dot-grid">
            <div className="text-center max-w-2xl w-full py-8">
              {/* Logo with dramatic entrance */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.1 }}
                className="relative inline-flex items-center justify-center mb-6"
              >
                <motion.div
                  className="absolute -inset-3 rounded-3xl opacity-40"
                  style={{
                    background: 'conic-gradient(from 0deg, #10b981, #14b8a6, #10b981)',
                    WebkitMask: 'radial-gradient(transparent 62%, black 64%)',
                    mask: 'radial-gradient(transparent 62%, black 64%)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Sparkles className="w-10 h-10" />
                </div>
              </motion.div>

              {/* Welcome text */}
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-2xl font-bold mb-2 gradient-text"
              >
                Welcome to Zinter AI
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-muted-foreground mb-8 max-w-md mx-auto"
              >
                Your AI-powered assistant for chatting, generating images, and more.
                Try one of these suggestions to get started.
              </motion.p>

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    index={index}
                    onClick={() =>
                      handleSuggestionClick(
                        suggestion.text,
                        suggestion.enableImageMode
                      )
                    }
                  />
                ))}
              </div>

              {/* Keyboard shortcut hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">N</kbd> to start a new chat
                </span>
              </motion.div>

              {/* Powered by badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="mt-6"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 text-xs text-muted-foreground/60">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>Powered by Zinter AI</span>
                </div>
              </motion.div>
            </div>
          </div>
        </ScrollArea>

        <ChatInput
          onSend={sendMessage}
          onImageGenerate={generateImage}
          disabled={false}
          initialMessage={pendingSuggestion}
          initialImageMode={pendingImageMode}
          onTypingStatusChange={handleTypingStatusChange}
          onInsertTemplate={handleInsertTemplate}
          conversationId={activeConversationId}
        />
      </div>
    );
  }

  // Conversation view
  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Header with glassmorphism and gradient accent line */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/70 via-teal-400/50 to-transparent" />
        <div className="gradient-border-top chat-header flex items-center gap-2 px-4 py-3 border-b border-border/60">
          <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 hover:scale-110 active:scale-95 transition-transform duration-200"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{activeConversation.title}</h2>
          {hasMessages && formattedStats && (
            <p className={cn(
              'text-[11px] text-muted-foreground flex items-center gap-1.5',
              typingStatus && 'text-emerald-500'
            )}>
              {typingStatus && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              {formattedStats}
            </p>
          )}
        </div>

        {/* Feature 4: Persona badge */}
        <Badge
          variant="secondary"
          className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          {currentPersona.name}
        </Badge>

        {/* Feature 3: Export button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 hover:scale-110 active:scale-95 transition-transform duration-200"
          onClick={handleExportMarkdown}
          title="Export as Markdown"
          disabled={!hasMessages}
        >
          <Download className="w-4 h-4" />
        </Button>

        {/* Share button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 hover:scale-110 active:scale-95 transition-transform duration-200"
          onClick={handleShareConversation}
          title="Share conversation"
          disabled={!hasMessages}
        >
          <Share2 className="w-4 h-4" />
        </Button>

        {/* Feature 2: Favorites filter button */}
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 shrink-0 relative transition-all duration-200',
              showFavoritesOnly && 'text-amber-500 hover:text-amber-600'
            )}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title={showFavoritesOnly ? 'Show all messages' : 'Show favorites only'}
          >
            <Heart className={cn('w-4 h-4', showFavoritesOnly && 'fill-current')} />
            {favoritesInConv > 0 && (
              <span className={cn(
                'absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5',
                showFavoritesOnly
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground'
              )}>
                {favoritesInConv}
              </span>
            )}
          </Button>
        )}

        {/* Feature 1: Search button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0 transition-all duration-200',
            searchOpen && 'text-emerald-500 hover:text-emerald-600'
          )}
          onClick={() => {
            if (searchOpen) {
              handleSearchClear();
            } else {
              setSearchOpen(true);
              requestAnimationFrame(() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
              });
            }
          }}
          title="Search messages (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Feature 4: Persona selector dropdown */}
        <div className="relative" ref={personaDropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 hover:scale-110 active:scale-95 transition-transform duration-200"
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            title="Select persona"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <AnimatePresence>
            {personaDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-emerald-500/30 bg-popover/95 backdrop-blur-sm p-1.5 shadow-lg shadow-emerald-500/10 z-50"
              >
                <p className="text-xs font-medium text-muted-foreground px-2.5 py-1.5">
                  Select AI Persona
                </p>
                {PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => {
                      setSelectedPersona(persona.id);
                      setPersonaDropdownOpen(false);
                      toast.success(`Switched to ${persona.name}`);
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150',
                      'hover:bg-emerald-500/5 hover:translate-x-0.5',
                      selectedPersona === persona.id && 'bg-emerald-500/8'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5',
                        selectedPersona === persona.id
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{persona.name}</p>
                        {selectedPersona === persona.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                        {persona.description}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => createNewChat()}
          className="gap-2 rounded-lg shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
        </div>

        {/* Feature 1: Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in conversation..."
                  className={cn(
                    'h-8 text-sm border-transparent bg-muted/40 focus-visible:bg-background',
                    'focus-visible:border-emerald-500/40',
                    'focus-visible:ring-2 focus-visible:ring-emerald-500/20',
                    'focus-visible:shadow-[0_0_12px_oklch(0.55_0.18_163/15%)]',
                    'transition-all duration-200'
                  )}
                />
                {searchQuery.trim() && searchMatches.length > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap shrink-0 tabular-nums">
                    {currentMatchIndex + 1}/{searchMatches.length} results
                  </span>
                )}
                {searchQuery.trim() && searchMatches.length === 0 && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    No matches
                  </span>
                )}
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6 transition-all duration-150',
                      searchMatches.length > 1
                        ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10'
                        : 'text-muted-foreground'
                    )}
                    onClick={handleSearchPrev}
                    disabled={searchMatches.length <= 1}
                    title="Previous match (Shift+Enter)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6 transition-all duration-150',
                      searchMatches.length > 1
                        ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10'
                        : 'text-muted-foreground'
                    )}
                    onClick={handleSearchNext}
                    disabled={searchMatches.length <= 1}
                    title="Next match (Enter)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleSearchClear}
                    title="Close search (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages area */}
      <div ref={scrollAreaRefCallback} className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        {!hasMessages ? (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center max-w-2xl w-full py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 mb-5 animated-border">
                  <Sparkles className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="relative inline-block">
                  <h3 className="text-lg font-semibold mb-1 relative z-10 gradient-text">
                    How can I help you today?
                  </h3>
                  <div className="absolute inset-0 -z-10 blur-md bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent rounded-lg" />
                </div>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Ask anything or try one of these suggestions
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    index={index}
                    onClick={() =>
                      handleSuggestionClick(
                        suggestion.text,
                        suggestion.enableImageMode
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : showFavoritesOnly && displayMessages.length === 0 ? (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center py-12">
              <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No favorited messages yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Star messages to save them for later
              </p>
            </div>
          </div>
        ) : (
          <div className={cn('max-w-4xl mx-auto py-4 rounded-lg', FONT_SIZE_CLASS[fontSize], BACKGROUND_THEMES.find((t) => t.id === selectedBackground)?.className)} data-messages-container>
            {/* Pinned Messages collapsible section */}
            {pinnedMessagesInConv.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setPinnedSectionOpen(!pinnedSectionOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all duration-200 w-full group cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pinned Messages</span>
                  <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center px-1">
                    {pinnedMessages.size}
                  </span>
                  <div className="flex-1" />
                  <ChevronDown className={cn(
                    'w-3.5 h-3.5 text-amber-500/60 transition-transform duration-200',
                    pinnedSectionOpen && 'rotate-180'
                  )} />
                </button>
                <AnimatePresence>
                  {pinnedSectionOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {pinnedMessagesInConv.map((msg) => (
                          <div
                            key={msg.id}
                            className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border-l-2 border-amber-500/60 cursor-pointer hover:bg-amber-500/10 transition-colors"
                            onClick={() => {
                              const el = document.querySelector(`[data-message-idx]`);
                              // Scroll to the message
                              const msgEl = document.querySelector(`[data-pinned-id="${msg.id}"]`);
                              if (msgEl) {
                                msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                          >
                            <Pin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">{msg.content.slice(0, 120)}{msg.content.length > 120 ? '...' : ''}</p>
                              <p className="text-[10px] text-muted-foreground/50 mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/10"
                              onClick={(e) => { e.stopPropagation(); handleTogglePin(msg.id); }}
                            >
                              <PinOff className="w-3 h-3 text-amber-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="space-y-1 [&_p]:leading-relaxed">
              {displayMessages.map((message, idx) => {
                const actualIndex = messages.indexOf(message);
                const prev = actualIndex > 0 ? messages[actualIndex - 1] : null;
                const next = actualIndex < messages.length - 1 ? messages[actualIndex + 1] : null;
                const isFirstInGroup = !prev || prev.role !== message.role;
                const isLastInGroup = !next || next.role !== message.role;

                // Feature 1: Search match props
                const isSearchMatch = searchQuery.trim() && searchMatches.includes(actualIndex);
                const isCurrentSearchMatch = isSearchMatch && searchMatches[currentMatchIndex] === actualIndex;

                // Feature 4: Show response time for most recent assistant message
                const showResponseTime = message.id === lastAssistantMessageId;

                return (
                  <div key={message.id} data-message-idx={actualIndex} data-pinned-id={message.id}>
                    <MessageBubble
                      message={message}
                      index={idx}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      onRegenerate={message.role === 'assistant' && isLastInGroup ? handleRegenerate : undefined}
                      onEditMessage={
                        message.role === 'user'
                          ? handleEditMessage
                          : undefined
                      }
                      searchHighlight={searchOpen ? searchQuery : null}
                      isSearchMatch={isSearchMatch}
                      isCurrentSearchMatch={isCurrentSearchMatch}
                      isFavorited={favorites.includes(message.id)}
                      onToggleFavorite={message.role === 'assistant' ? handleToggleFavorite : undefined}
                      showResponseTime={showResponseTime}
                      showTimestamp={showTimestamps}
                      onToggleReaction={handleToggleReaction}
                      suggestions={
                        message.role === 'assistant' && isLastInGroup
                          ? suggestionsMap[message.id]
                          : undefined
                      }
                      onSuggestionClick={handleSuggestionClick}
                      onDismissSuggestions={handleDismissSuggestions}
                      isPinned={pinnedMessages.has(message.id)}
                      onTogglePin={message.role === 'assistant' ? handleTogglePin : undefined}
                    />
                  </div>
                );
              })}
            </div>

            {/* Typing indicator + Stop button */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TypingIndicator />
                  <StopButton />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {isScrolledUp && hasMessages && !showFavoritesOnly && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
            className="absolute bottom-4 right-4 z-10"
          >
            <button
              onClick={scrollToBottom}
              className={cn(
                'scroll-to-bottom-btn relative w-12 h-12 sm:w-10 sm:h-10 rounded-full',
                'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
                'shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40',
                'hover:scale-110 active:scale-95',
                'transition-shadow duration-200 cursor-pointer',
                'flex items-center justify-center',
                messagesBelowViewport > 0 && 'animate-pulse-ring'
              )}
              title="Scroll to bottom"
            >
              <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />
              {/* Badge showing count of messages below viewport */}
              {messagesBelowViewport > 0 && (
                <span className={cn(
                  'notification-badge absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px]',
                  'rounded-full bg-gradient-to-r from-emerald-400 to-teal-500',
                  'text-white text-[10px] font-bold',
                  'flex items-center justify-center px-1',
                  'shadow-md shadow-emerald-500/30',
                  'ring-2 ring-background'
                )}>
                  {messagesBelowViewport > 99 ? '99+' : messagesBelowViewport}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Subtle separator between messages and input */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {/* Chat input */}
      <ChatInput
        onSend={sendMessage}
        onImageGenerate={generateImage}
        initialMessage={pendingSuggestion}
        initialImageMode={pendingImageMode}
        onTypingStatusChange={handleTypingStatusChange}
        onInsertTemplate={handleInsertTemplate}
      />
    </div>
  );
}
