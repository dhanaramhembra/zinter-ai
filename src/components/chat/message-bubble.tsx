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
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuthStore } from '@/store/auth-store';

interface MessageBubbleProps {
  message: Message;
  isGenerating?: boolean;
}

export default function MessageBubble({ message, isGenerating }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const { user } = useAuthStore();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (isSpeaking && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
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
      setCurrentAudio(audio);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        if (currentAudio.src) {
          URL.revokeObjectURL(currentAudio.src);
        }
      }
    };
  }, [currentAudio]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 px-4 py-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
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

      {/* Content */}
      <div className={cn('flex-1 max-w-[80%] space-y-2', isUser && 'flex flex-col items-end')}>
        {/* Name */}
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
                <div className="mb-3">
                  <img
                    src={message.imageUrl}
                    alt={message.imagePrompt || 'Generated image'}
                    className="rounded-lg max-w-full max-h-80 object-cover"
                    loading="lazy"
                  />
                  {message.imagePrompt && (
                    <p className="text-xs opacity-70 mt-1 italic">
                      Prompt: &quot;{message.imagePrompt}&quot;
                    </p>
                  )}
                </div>
              )}

              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !className;
                        if (isInline) {
                          return (
                            <code className="bg-background/20 px-1.5 py-0.5 rounded text-xs" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <div className="relative my-3">
                            {match && (
                              <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] rounded-t-lg border-b border-gray-700">
                                <span className="text-xs text-gray-400">{match[1]}</span>
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
                              {String(children).replace(/\n$/, '')}
                            </ReactSyntaxHighlighter>
                          </div>
                        );
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

        {/* Actions */}
        {!isUser && !isGenerating && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSpeak}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
