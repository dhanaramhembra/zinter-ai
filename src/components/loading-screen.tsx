'use client';

import { useState, useEffect } from 'react';
import { ZinterLogoAnimated } from '@/components/zinter-logo';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    // Start fade out after 1.5s
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
        >
          {/* Vignette overlay */}
          <div className="absolute inset-0 vignette pointer-events-none" />

          {/* Animated mesh gradient background */}
          <div className="mesh-gradient" />
          <div className="noise-texture absolute inset-0 pointer-events-none" />

          {/* Floating decorative dots */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-purple-500"
                style={{
                  width: `${Math.random() * 4 + 2}px`,
                  height: `${Math.random() * 4 + 2}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.15 + 0.05,
                  animation: `float ${Math.random() * 4 + 3}s ${Math.random() * 2}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-6">
            {/* Logo with rotating gradient ring */}
            <ZinterLogoAnimated size="lg" />

            {/* App name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                Zinter AI
              </h1>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Your intelligent AI companion
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 160 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="h-1 rounded-full bg-muted/50 overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-purple-500 to-purple-500"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
