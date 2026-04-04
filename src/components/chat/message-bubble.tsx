'use client';

import { Message } from '@/store/chat-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuthStore } from '@/store/auth-store';

interface MessageBubbleProps {
  message: Message;
  isGenerating?: boolean;
  index?: number;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onRegenerate?: (messageId: string) => void;
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
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuthStore();

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

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
      setIsSpeaking(false);
    }
  }, [isSpeaking, message.content]);

  // Fixed audio cleanup using ref - no dependency on audio state
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

  const staggerDelay = Math.min(index * 0.05, 0.5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: staggerDelay }}
      className={cn(
        'flex gap-3 group px-4',
        isFirstInGroup ? 'pt-4' : 'pt-0.5',
        isLastInGroup ? 'pb-3' : 'pb-0.5',
        isUser ? 'flex-row-reverse' : 'flex-row'
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
                  ? 'bg-primary text-primary-foreground'
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
            <span className="text-xs text-muted-foreground/60">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted rounded-tl-md',
            isGenerating && 'animate-pulse'
          )}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
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
                    className="rounded-lg max-w-full max-h-80 object-cover"
                    loading="lazy"
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
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-pre:shadow-none">
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
              )}
            </>
          )}
        </div>

        {/* Actions - only show on last message in group */}
        {!isUser && !isGenerating && isLastInGroup && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSpeak}
              title={isSpeaking ? 'Stop speaking' : 'Listen'}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRegenerate(message.id)}
                title="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
