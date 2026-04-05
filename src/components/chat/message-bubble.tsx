'use client';

import { Message, REACTION_EMOJIS } from '@/store/chat-store';
import { EXTENDED_REACTION_EMOJIS } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Copy,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  User,
  Loader2,
  RefreshCw,
  Download,
  Pencil,
  X,
  Star,
  SmilePlus,
  Plus,
  Languages,
  ChevronDown,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import ImageLightbox from './image-lightbox';
import { AVATAR_OPTIONS, TRANSLATION_LANGUAGES } from '@/lib/avatars';

interface MessageBubbleProps {
  message: Message;
  isGenerating?: boolean;
  index?: number;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  /** Search highlight text */
  searchHighlight?: string | null;
  /** Whether this message is the current search match */
  isCurrentSearchMatch?: boolean;
  /** Whether this message contains a search match */
  isSearchMatch?: boolean;
  /** Whether this message is favorited */
  isFavorited?: boolean;
  /** Toggle favorite callback */
  onToggleFavorite?: (messageId: string) => void;
  /** Whether to show response time */
  showResponseTime?: boolean;
  /** Whether to show timestamp text */
  showTimestamp?: boolean;
  /** Toggle reaction callback */
  onToggleReaction?: (messageId: string, emoji: string) => void;
  /** Quick reply suggestions for this message */
  suggestions?: string[];
  /** Callback when a suggestion is clicked */
  onSuggestionClick?: (text: string) => void;
  /** Dismiss suggestions callback */
  onDismissSuggestions?: (messageId: string) => void;
}

/** Highlight matching text in a string with <mark> tags */
function highlightText(text: string, query: string, isCurrentMatch: boolean): React.ReactNode[] {
  if (!query.trim()) return [text];

  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery, lastIndex);

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    // Add highlighted match
    parts.push(
      <mark
        key={index}
        className={cn(
          'rounded px-0.5',
          isCurrentMatch
            ? 'bg-yellow-300 dark:bg-yellow-400/40 text-inherit'
            : 'bg-emerald-200/70 dark:bg-emerald-400/30 text-inherit'
        )}
      >
        {text.slice(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Format response time */
function formatResponseTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 1) return '<1s';
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const isInline = !match && !className;

  if (isInline) {
    return (
      <code className="bg-background/20 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
        {children}
      </code>
    );
  }

  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 group/code">
      {match && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] rounded-t-lg border-b border-gray-700">
          <span className="text-xs text-gray-400">{match[1]}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 opacity-0 group-hover/code:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy code'}
          </Button>
        </div>
      )}
      {!match && (
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs bg-[#282c34]/80 text-gray-400 hover:text-white hover:bg-gray-700/80 opacity-0 group-hover/code:opacity-100 transition-opacity rounded"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy code'}
          </Button>
        </div>
      )}
      <ReactSyntaxHighlighter
        style={oneDark}
        language={match?.[1] || 'text'}
        PreTag="div"
        className={cn(
          '!rounded-lg !text-xs !p-4',
          match && '!rounded-t-none'
        )}
        {...props}
      >
        {codeText}
      </ReactSyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({
  message,
  isGenerating,
  index = 0,
  isFirstInGroup = true,
  isLastInGroup = true,
  onRegenerate,
  onEditMessage,
  searchHighlight,
  isCurrentSearchMatch = false,
  isSearchMatch = false,
  isFavorited = false,
  onToggleFavorite,
  showResponseTime = false,
  showTimestamp = true,
  suggestions,
  onSuggestionClick,
  onDismissSuggestions,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [reactionAnimation, setReactionAnimation] = useState<{ emoji: string; x: number; y: number } | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationLang, setTranslationLang] = useState('zh');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationDropdownOpen, setTranslationDropdownOpen] = useState(false);
  const translationDropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const handleCopy = useCallback(async (e?: React.MouseEvent) => {
    const isShiftClick = e?.shiftKey;

    if (isShiftClick && !isUser) {
      // Copy as formatted markdown for assistant messages
      const markdownContent = message.content;
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      toast.success('Copied as Markdown');
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Default: copy raw text
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content, isUser]);

  const handleSpeak = useCallback(async () => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      };

      audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to generate speech');
      setIsSpeaking(false);
    }
  }, [isSpeaking, message.content]);

  // Fixed audio cleanup using ref
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
        audioRef.current = null;
      }
    };
  }, []);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      setEditContent(message.content);
      requestAnimationFrame(() => {
        editTextareaRef.current?.focus();
        editTextareaRef.current?.setSelectionRange(
          editTextareaRef.current.value.length,
          editTextareaRef.current.value.length
        );
      });
    }
  }, [isEditing, message.content]);

  // Auto-resize edit textarea
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height =
        Math.min(editTextareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [isEditing, editContent]);

  // Scroll into view when this is the current search match
  useEffect(() => {
    if (isCurrentSearchMatch && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentSearchMatch]);

  // Close reaction picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setReactionPickerOpen(false);
      }
      if (translationDropdownRef.current && !translationDropdownRef.current.contains(e.target as Node)) {
        setTranslationDropdownOpen(false);
      }
    };
    if (reactionPickerOpen || translationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [reactionPickerOpen, translationDropdownOpen]);

  const handleReactionClick = useCallback(
    (emoji: string, e?: React.MouseEvent) => {
      // Check if this is adding to an existing reaction (increment)
      const existing = reactions.find((r) => r.emoji === emoji);
      const isIncrement = existing && !existing.reactedByUser;

      onToggleReaction?.(message.id, emoji);
      setReactionPickerOpen(false);
      setShowCustomEmoji(false);

      // Show +1 animation when adding to an existing reaction
      if (isIncrement && e) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setReactionAnimation({
          emoji,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        setTimeout(() => setReactionAnimation(null), 800);
      }
    },
    [message.id, onToggleReaction, reactions]
  );

  const reactions = message.reactions || [];

  const handleSaveEdit = useCallback(() => {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    onEditMessage?.(message.id, editContent.trim());
    setIsEditing(false);
    toast.success('Message updated');
  }, [editContent, message.id, message.content, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  // Highlighted user message content for search
  const highlightedUserContent = useMemo(() => {
    if (isUser && searchHighlight && searchHighlight.trim()) {
      return highlightText(message.content, searchHighlight, isCurrentSearchMatch);
    }
    return null;
  }, [isUser, message.content, searchHighlight, isCurrentSearchMatch]);

  const staggerDelay = Math.min(index * 0.05, 0.5);

  // Handle translation
  const handleTranslate = useCallback(async (lang: string) => {
    if (!message.content.trim()) return;
    setIsTranslating(true);
    setTranslationLang(lang);
    setShowTranslation(true);
    setTranslationDropdownOpen(false);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content, targetLanguage: lang }),
      });
      const data = await res.json();
      if (data.translation) {
        setTranslatedText(data.translation);
      } else {
        setTranslatedText('Translation failed.');
      }
    } catch {
      setTranslatedText('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  }, [message.content]);

  // Get user avatar class
  const userAvatarGradient = useMemo(() => {
    if (!user?.avatar) return 'bg-primary text-primary-foreground';
    const option = AVATAR_OPTIONS.find(a => a.id === user.avatar);
    return option ? `${option.gradient} text-white` : 'bg-primary text-primary-foreground';
  }, [user?.avatar]);

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: staggerDelay }}
      className={cn(
        'flex gap-3 group px-4',
        isFirstInGroup ? 'pt-4' : 'pt-1',
        isLastInGroup ? 'pb-4' : 'pb-1',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isCurrentSearchMatch && 'ring-1 ring-emerald-500/40 rounded-xl -mx-2 px-6'
      )}
    >
      {/* Avatar - only show on last message in group */}
      {isLastInGroup ? (
        <div className="relative shrink-0 self-end">
          {isGenerating && (
            <div className="absolute -inset-1 rounded-full animate-spin" style={{
              background: 'conic-gradient(from 0deg, #10b981, #14b8a6, #10b981)',
              animationDuration: '3s',
              WebkitMask: 'radial-gradient(transparent 60%, black 62%)',
              mask: 'radial-gradient(transparent 60%, black 62%)',
            }} />
          )}
          <Avatar className="w-8 h-8 relative z-10">
            <AvatarFallback
              className={cn(
                'text-xs font-medium',
                isUser
                  ? userAvatarGradient
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
              )}
            >
              {isUser ? (
                user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Content */}
      <div className={cn('flex-1 max-w-[80%] space-y-1', isUser && 'flex flex-col items-end')}>
        {/* Name - only show on first message in group */}
        {isFirstInGroup && (
          <div className={cn('flex items-center gap-2', isUser && 'flex-row-reverse')}>
            <span className="text-xs font-medium text-muted-foreground">
              {isUser ? user?.name || 'You' : 'NexusAI'}
            </span>
            <span
              className={cn(
                'text-xs text-muted-foreground/60',
                !showTimestamp && 'sr-only'
              )}
              title={new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            >
              {showTimestamp
                ? new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>
        )}

        {/* Response time indicator - only for most recent assistant message */}
        {!isUser && showResponseTime && message.responseTime != null && !isGenerating && (
          <div className={cn('text-[10px] text-muted-foreground/50', isUser ? 'text-right' : '')}>
            Responded in {formatResponseTime(message.responseTime)}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 leading-relaxed',
            isUser
              ? 'bg-gradient-to-br from-emerald-500/90 to-teal-500/85 text-white rounded-tr-md shadow-md shadow-emerald-500/20 dark:from-emerald-600/90 dark:to-teal-600/85 dark:shadow-emerald-500/15'
              : 'bg-card/60 backdrop-blur-sm border border-border/30 rounded-tl-md shadow-sm relative',
            isGenerating && 'animate-pulse',
            !isUser && isFavorited && 'ring-1 ring-amber-400/50 shadow-amber-400/20'
          )}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking<span className="animate-cursor-blink">|</span></span>
            </div>
          ) : isUser && isEditing ? (
            /* Editing mode for user messages */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-[200px]"
            >
              <Textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className={cn(
                  'resize-none min-h-[60px] max-h-[200px] text-sm',
                  'bg-background/20 border-border/40 text-foreground',
                  'placeholder:text-muted-foreground/60'
                )}
                rows={2}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-7 px-3 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent.trim() === message.content}
                  className="h-7 px-3 text-xs gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              {message.imageUrl && (
                <div
                  className="mb-3 relative group/image inline-block"
                  onMouseEnter={() => setImageHovered(true)}
                  onMouseLeave={() => setImageHovered(false)}
                >
                  <img
                    src={message.imageUrl}
                    alt={message.imagePrompt || 'Generated image'}
                    className="rounded-lg max-w-full max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity duration-200"
                    loading="lazy"
                    onClick={() => setLightboxOpen(true)}
 />
                  {/* Hover overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: imageHovered ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-end p-4"
                  >
                    {message.imagePrompt && (
                      <p className="text-xs text-white/90 text-center mb-3 line-clamp-2 italic">
                        &quot;{message.imagePrompt}&quot;
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}

              {isUser ? (
                <>
                  {message.attachedImage && (
                    <div className="mb-2">
                      <img
                        src={message.attachedImage}
                        alt="Attached image"
                        className="max-w-[240px] max-h-[180px] object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">
                    {highlightedUserContent || message.content}
                  </p>
                </>
              ) : (
                <div className="relative pl-3">{""}
                  <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-emerald-500/60 via-teal-500/40 to-emerald-500/20 dark:from-emerald-400/50 dark:via-teal-400/30 dark:to-emerald-400/10" />
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-pre:shadow-none chat-scroll">
                  <ReactMarkdown
                    components={{
                      code: CodeBlock as any,
                      table({ children }) {
                        return (
                          <div className="my-3 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      thead({ children }) {
                        return (
                          <thead className="bg-muted/50 border-b border-border">
                            {children}
                          </thead>
                        );
                      },
                      th({ children }) {
                        return (
                          <th className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">
                            {children}
                          </th>
                        );
                      },
                      td({ children }) {
                        return (
                          <td className="px-3 py-2 border-b border-border last:border-b-0">
                            {children}
                          </td>
                        );
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="my-3 pl-4 border-l-3 border-emerald-500 bg-emerald-500/5 py-2 pr-3 rounded-r-lg italic text-muted-foreground">
                            {children}
                          </blockquote>
                        );
                      },
                      ul({ children }) {
                        return (
                          <ul className="my-2 space-y-1 list-disc list-outside ml-4 marker:text-emerald-500">
                            {children}
                          </ul>
                        );
                      },
                      ol({ children }) {
                        return (
                          <ol className="my-2 space-y-1 list-decimal list-outside ml-4 marker:text-emerald-500">
                            {children}
                          </ol>
                        );
                      },
                      li({ children }) {
                        return (
                          <li className="pl-1 text-foreground/90">
                            {children}
                          </li>
                        );
                      },
                      a({ href, children }) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-500 hover:text-emerald-400 hover:underline underline-offset-2 transition-colors"
                          >
                            {children}
                          </a>
                        );
                      },
                      hr() {
                        return <hr className="my-4 border-border" />;
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Translation display */}
        {!isUser && showTranslation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 max-w-[80%]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-px flex-1 bg-border/50" />
              <div className="flex items-center gap-1.5">
                <Languages className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {TRANSLATION_LANGUAGES.find(l => l.code === translationLang)?.flag}{' '}
                  {TRANSLATION_LANGUAGES.find(l => l.code === translationLang)?.label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-muted/80"
                  onClick={() => { setShowTranslation(false); setTranslatedText(null); }}
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </div>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="rounded-xl px-4 py-2.5 bg-muted/40 border border-border/30 text-sm text-foreground/80 leading-relaxed">
              {isTranslating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">Translating...</span>
                </div>
              ) : translatedText ? (
                <p className="whitespace-pre-wrap">{translatedText}</p>
              ) : null}
            </div>
          </motion.div>
        )}

        {/* Quick reply suggestions */}
        {!isUser && !isGenerating && suggestions && suggestions.length > 0 && isLastInGroup && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center gap-2 mt-1 flex-wrap"
          >
            {suggestions.map((suggestion, idx) => (
              <motion.button
                key={`${message.id}-${idx}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 + idx * 0.08 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-3 py-1.5 rounded-full border border-border/50 bg-card/80 text-xs text-muted-foreground hover:text-foreground hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 cursor-pointer max-w-[200px] truncate shadow-sm"
              >
                {suggestion}
              </motion.button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 shrink-0"
              onClick={() => onDismissSuggestions?.(message.id)}
              title="Dismiss suggestions"
            >
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        )}

        {/* Reactions - show below message bubble */}
        {!isGenerating && reactions.length > 0 && (
          <div className={cn('flex items-center gap-1 mt-1 flex-wrap', isUser && 'justify-end')}>
            {reactions.map((reaction) => (
              <motion.button
                key={reaction.emoji}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleReactionClick(reaction.emoji, e)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-150',
                  'hover:scale-105 active:scale-95 cursor-pointer',
                  reaction.reactedByUser
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-foreground'
                    : 'bg-muted/50 border-border/40 text-muted-foreground hover:border-border/60'
                )}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 && (
                  <span className={cn(
                    'text-[10px] font-medium',
                    reaction.reactedByUser ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                  )}>
                    {reaction.count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        )}

        {/* +1 reaction animation */}
        {reactionAnimation && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -40, scale: 1.2 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="fixed z-[999] pointer-events-none text-sm font-bold text-emerald-500"
            style={{ left: reactionAnimation.x - 8, top: reactionAnimation.y }}
          >
            +1
          </motion.div>
        )}

        {/* Actions + Reaction picker - only show on last message in group */}
        {!isGenerating && isLastInGroup && (
          <AnimatePresence mode="wait">
            {!isEditing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                  isUser && 'flex-row-reverse'
                )}
              >
                {isUser ? (
                  /* User message actions: Copy + Edit + Reaction */
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                      onClick={(e) => handleCopy(e)}
                      title="Copy message (Shift+Click for Markdown)"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    {onEditMessage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                        onClick={() => setIsEditing(true)}
                        title="Edit message"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onToggleReaction && (
                      <div className="relative" ref={reactionPickerRef}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                          onClick={() => setReactionPickerOpen(!reactionPickerOpen)}
                          title="Add reaction"
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </Button>
                        <AnimatePresence>
                          {reactionPickerOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.9 }}
                              transition={{ duration: 0.15 }}
                              className={cn(
                                'absolute z-50 bottom-full mb-1.5 rounded-xl border border-border/60 bg-popover p-1.5 shadow-lg shadow-emerald-500/5',
                              )}
                            >
                              <div className="flex items-center gap-0.5">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <motion.button
                                    key={emoji}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.85 }}
                                    onClick={(e) => handleReactionClick(emoji, e)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-base"
                                  >
                                    {emoji}
                                  </motion.button>
                                ))}
                              </div>
                              {/* Custom emoji grid toggle */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCustomEmoji(!showCustomEmoji);
                                }}
                                className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-xs text-muted-foreground border-t border-border/40 pt-1.5"
                              >
                                <Plus className="w-3 h-3" />
                                Add custom
                              </button>
                              <AnimatePresence>
                                {showCustomEmoji && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="grid grid-cols-5 gap-0.5 pt-1.5 border-t border-border/40">
                                      {EXTENDED_REACTION_EMOJIS.map((emoji) => (
                                        <motion.button
                                          key={emoji}
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.85 }}
                                          onClick={(e) => handleReactionClick(emoji, e)}
                                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-base"
                                        >
                                          {emoji}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                ) : (
                  /* Assistant message actions: Copy + TTS + Favorite + Regenerate + Translate */
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                      onClick={(e) => handleCopy(e)}
                      title="Copy message (Shift+Click for Markdown)"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                      onClick={handleSpeak}
                      title={isSpeaking ? 'Stop speaking' : 'Listen'}
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </Button>
                    {onToggleFavorite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 hover:scale-110 active:scale-95 transition-all duration-150',
                          isFavorited
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                            : 'hover:bg-accent'
                        )}
                        onClick={() => onToggleFavorite(message.id)}
                        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star
                          className={cn(
                            'w-3.5 h-3.5',
                            isFavorited && 'fill-current'
                          )}
                        />
                      </Button>
                    )}
                    {/* Translate button */}
                    <div className="relative" ref={translationDropdownRef}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 hover:scale-110 active:scale-95 transition-all duration-150',
                          showTranslation ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10' : 'hover:bg-accent'
                        )}
                        onClick={() => setTranslationDropdownOpen(!translationDropdownOpen)}
                        title="Translate"
                      >
                        <Languages className="w-3.5 h-3.5" />
                      </Button>
                      <AnimatePresence>
                        {translationDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 bottom-full mb-1.5 w-48 rounded-xl border border-border/60 bg-popover p-1.5 shadow-lg shadow-emerald-500/5"
                          >
                            <p className="text-[10px] font-semibold text-muted-foreground px-2 pb-1.5 pt-0.5 uppercase tracking-wider">Translate to</p>
                            <div className="max-h-64 overflow-y-auto space-y-0.5">
                              {TRANSLATION_LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => handleTranslate(lang.code)}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer',
                                    'hover:bg-muted/80',
                                    translationLang === lang.code && showTranslation && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  )}
                                >
                                  <span className="text-base shrink-0">{lang.flag}</span>
                                  <span className="flex-1">{lang.label}</span>
                                  {translationLang === lang.code && showTranslation && (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {onRegenerate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                        onClick={() => onRegenerate(message.id)}
                        title="Regenerate response"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onToggleReaction && (
                      <div className="relative" ref={reactionPickerRef}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-150"
                          onClick={() => setReactionPickerOpen(!reactionPickerOpen)}
                          title="Add reaction"
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </Button>
                        <AnimatePresence>
                          {reactionPickerOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.9 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-50 bottom-full mb-1.5 rounded-xl border border-border/60 bg-popover p-1.5 shadow-lg shadow-emerald-500/5"
                            >
                              <div className="flex items-center gap-0.5">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <motion.button
                                    key={emoji}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.85 }}
                                    onClick={(e) => handleReactionClick(emoji, e)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-base"
                                  >
                                    {emoji}
                                  </motion.button>
                                ))}
                              </div>
                              {/* Custom emoji grid toggle */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCustomEmoji(!showCustomEmoji);
                                }}
                                className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-xs text-muted-foreground border-t border-border/40 pt-1.5"
                              >
                                <Plus className="w-3 h-3" />
                                Add custom
                              </button>
                              <AnimatePresence>
                                {showCustomEmoji && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="grid grid-cols-5 gap-0.5 pt-1.5 border-t border-border/40">
                                      {EXTENDED_REACTION_EMOJIS.map((emoji) => (
                                        <motion.button
                                          key={emoji}
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.85 }}
                                          onClick={(e) => handleReactionClick(emoji, e)}
                                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-base"
                                        >
                                          {emoji}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Image lightbox */}
      {message.imageUrl && (
        <ImageLightbox
          imageUrl={message.imageUrl}
          imagePrompt={message.imagePrompt}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </motion.div>
  );
}
