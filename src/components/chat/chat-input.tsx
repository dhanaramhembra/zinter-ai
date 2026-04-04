'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Upload,
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AttachedImage {
  base64: string;
  preview: string;
}

interface ChatInputProps {
  onSend: (message: string, image?: string) => void;
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
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastAppliedInitialRef = useRef<string | null>(null);
  const dragCounterRef = useRef(0);
  const { isGenerating } = useChatStore();

  // Feature 3: Word count and character count
  const wordCount = useMemo(() => {
    if (!input.trim()) return 0;
    return input.trim().split(/\s+/).length;
  }, [input]);

  const charCount = useMemo(() => {
    return input.length;
  }, [input]);

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

  // --- Drag & Drop handlers ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      return; // Only accept image files
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachedImage({
        base64: result,
        preview: result,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setAttachedImage(null);
  }, []);

  const handleSend = () => {
    if ((!input.trim() && !attachedImage) || disabled || isGenerating) return;

    if (imageMode) {
      onImageGenerate(input.trim());
    } else {
      onSend(input.trim(), attachedImage?.base64);
    }
    setInput('');
    setImageMode(false);
    setAttachedImage(null);

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

  const canSend = (input.trim() || !!attachedImage) && !disabled && !isGenerating && !isRecording && !isTranscribing;

  return (
    <div
      className="border-t border-border/60 bg-card/80 backdrop-blur-xl p-4 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />

      {/* Drag & Drop overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-none"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-3 p-8 border-2 border-dashed border-emerald-500 rounded-2xl bg-emerald-500/5 max-w-xs mx-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Upload className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Drop image here</p>
                <p className="text-xs text-muted-foreground mt-1">Image will be attached to your message</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached image preview */}
      <AnimatePresence>
        {attachedImage && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-2 overflow-hidden"
          >
            <div className="relative inline-block group">
              <img
                src={attachedImage.preview}
                alt="Attached image"
                className="h-20 w-20 object-cover rounded-xl border border-border/60 shadow-sm"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110"
                onClick={handleRemoveImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="ml-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground align-middle">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image attached</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image mode indicator with enhanced gradient and animation */}
      <AnimatePresence>
        {imageMode && !attachedImage && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-2"
          >
            <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/8 to-primary/5 text-emerald-700 dark:text-emerald-300 text-sm border border-emerald-500/20 overflow-hidden shadow-sm">
              <div className="absolute inset-0 animate-progress-sweep bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent" style={{ width: '50%' }} />
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

      {/* Recording indicator with pulsing red ring */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/15 shadow-sm">
              <div className="relative flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse animate-pulse-red-ring" />
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse [animation-delay:0.2s]" />
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse [animation-delay:0.4s]" />
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

      {/* Input area with glow effect wrapper */}
      <div className="relative flex items-end gap-2">
        <div className="flex-1 relative">
          {/* Glow effect behind input on focus */}
          <div className={cn(
            'absolute -inset-0.5 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none',
            'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 blur-sm',
          )} style={{ opacity: (input || true) ? undefined : 0 }} />
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
              'resize-none min-h-[44px] max-h-[200px] pr-12 rounded-xl shadow-sm input-glow relative',
              'transition-all duration-300',
              imageMode && 'border-emerald-500/40 focus-visible:ring-emerald-500/20'
            )}
            disabled={disabled || isGenerating}
            rows={1}
          />
        </div>

        {/* Action buttons with connected styling */}
        <div className="flex items-center gap-0.5 pb-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={imageMode ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'rounded-xl h-11 w-11 shrink-0 transition-all duration-200',
                    'hover:scale-105 active:scale-95 hover:shadow-sm',
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
                  className="rounded-xl h-11 w-11 shrink-0 hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-sm"
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
                    'rounded-xl h-11 w-11 shrink-0 transition-all duration-300',
                    'hover:scale-105 active:scale-95',
                    canSend
                      ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110'
                      : ''
                  )}
                  onClick={handleSend}
                  disabled={!canSend}
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

      {/* Feature 3: Word/char count */}
      <AnimatePresence>
        {(input.trim().length > 0 || attachedImage) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-end mt-1.5 px-1"
          >
            <p className="text-[10px] text-muted-foreground/50">
              {wordCount} word{wordCount !== 1 ? 's' : ''} · {charCount} char{charCount !== 1 ? 's' : ''}{attachedImage ? ' · 1 image' : ''}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom hint */}
      <div className="flex items-center justify-center mt-2 relative z-10">
        <p className="text-xs text-muted-foreground/50">
          NexusAI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
