'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Send,
  Mic,
  MicOff,
  ImageIcon,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageGenerate: (prompt: string) => void;
  disabled?: boolean;
  /** Text to pre-fill the input (e.g. from a suggestion card click) */
  initialMessage?: string | null;
  /** Whether to enable image mode when initialMessage is set */
  initialImageMode?: boolean;
}

export default function ChatInput({
  onSend,
  onImageGenerate,
  disabled,
  initialMessage,
  initialImageMode,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastAppliedInitialRef = useRef<string | null>(null);
  const { isGenerating } = useChatStore();

  // Handle initial message from suggestion click
  useEffect(() => {
    if (initialMessage && initialMessage !== lastAppliedInitialRef.current) {
      setInput(initialMessage);
      lastAppliedInitialRef.current = initialMessage;
      if (initialImageMode) {
        setImageMode(true);
      }
      // Focus the textarea after a tick to ensure DOM is ready
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
    // Reset ref when initialMessage is cleared
    if (!initialMessage) {
      lastAppliedInitialRef.current = null;
    }
  }, [initialMessage, initialImageMode]);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled || isGenerating) return;

    if (imageMode) {
      onImageGenerate(input.trim());
    } else {
      onSend(input.trim());
    }
    setInput('');
    setImageMode(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch('/api/ai/asr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.transcription) {
        setInput((prev) => (prev ? prev + ' ' + data.transcription : data.transcription));
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-xl p-4">
      {/* Image mode indicator with gradient background */}
      <AnimatePresence>
        {imageMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-sm border border-primary/20">
              <ImageIcon className="w-4 h-4" />
              <span className="font-medium">Image Generation Mode</span>
              <span className="text-xs opacity-70">
                Describe the image you want to create
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6"
                onClick={() => setImageMode(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse [animation-delay:0.4s]" />
              </div>
              <span className="font-medium">Recording...</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 text-xs"
                onClick={toggleRecording}
              >
                Stop
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating
                ? 'AI is thinking...'
                : imageMode
                  ? 'Describe the image you want to generate...'
                  : 'Type a message... (Shift+Enter for new line)'
            }
            className={cn(
              'resize-none min-h-[44px] max-h-[200px] pr-12 rounded-xl shadow-sm',
              'focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/40',
              'focus-visible:shadow-[0_0_0_3px_oklch(0.55_0.18_163/8%)]',
              imageMode && 'border-primary/50 focus-visible:ring-primary/30'
            )}
            disabled={disabled || isGenerating}
            rows={1}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pb-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={imageMode ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'rounded-xl h-11 w-11 shrink-0 transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    imageMode && 'bg-primary text-primary-foreground shadow-md shadow-emerald-500/20'
                  )}
                  onClick={() => setImageMode(!imageMode)}
                  disabled={disabled || isGenerating}
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {imageMode ? 'Text Mode' : 'Image Generation'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? 'destructive' : 'ghost'}
                  size="icon"
                  className="rounded-xl h-11 w-11 shrink-0 hover:scale-105 active:scale-95 transition-all duration-200"
                  onClick={toggleRecording}
                  disabled={disabled || isTranscribing || isGenerating}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRecording ? 'Stop Recording' : 'Voice Input'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    'rounded-xl h-11 w-11 shrink-0 transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    input.trim() && !disabled && !isGenerating && !isRecording && !isTranscribing
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25'
                      : ''
                  )}
                  onClick={handleSend}
                  disabled={
                    !input.trim() || disabled || isGenerating || isRecording || isTranscribing
                  }
                >
                  {imageMode ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {imageMode ? 'Generate Image' : 'Send Message'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="flex items-center justify-center mt-2">
        <p className="text-xs text-muted-foreground/60">
          NexusAI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
