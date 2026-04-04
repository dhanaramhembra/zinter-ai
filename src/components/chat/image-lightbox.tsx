'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  imageUrl: string;
  imagePrompt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, imagePrompt, isOpen, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = imagePrompt ? `${imagePrompt.replace(/[^a-zA-Z0-9]/g, '_')}.png` : 'nexusai-image.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [imageUrl, imagePrompt]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Dark backdrop with blur */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" />

          {/* Content container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 h-9 w-9 rounded-full bg-background/20 backdrop-blur-sm text-white hover:bg-background/30 hover:text-white hover:scale-110 transition-all"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Image */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50">
              <img
                src={imageUrl}
                alt={imagePrompt || 'Generated image'}
                className="max-w-[80vw] max-h-[70vh] object-contain rounded-xl"
              />
              {/* Subtle border glow */}
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 pointer-events-none" />
            </div>

            {/* Image info and actions */}
            <div className="flex items-center gap-3">
              {/* AI badge */}
              <div className="badge-emerald">
                <Sparkles className="w-3 h-3" />
                <span>AI Generated</span>
              </div>

              {/* Prompt text */}
              {imagePrompt && (
                <p className="text-sm text-white/70 italic line-clamp-1 max-w-[300px]">
                  &quot;{imagePrompt}&quot;
                </p>
              )}

              {/* Download button */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
