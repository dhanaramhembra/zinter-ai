'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
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
                className="absolute rounded-full bg-emerald-500"
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
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.1 }}
              className="relative"
            >
              {/* Spinning gradient ring */}
              <motion.div
                className="absolute -inset-2 rounded-2xl opacity-50"
                style={{
                  background: 'conic-gradient(from 0deg, #10b981, #14b8a6, #10b981)',
                  WebkitMask: 'radial-gradient(transparent 58%, black 60%)',
                  mask: 'radial-gradient(transparent 58%, black 60%)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />

              {/* Inner glow ring */}
              <motion.div
                className="absolute -inset-1 rounded-2xl"
                style={{
                  background: 'conic-gradient(from 180deg, #10b981, #14b8a6, #10b981)',
                  WebkitMask: 'radial-gradient(transparent 62%, black 64%)',
                  mask: 'radial-gradient(transparent 62%, black 64%)',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />

              {/* Logo box */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-8 h-8" />
              </div>
            </motion.div>

            {/* App name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                NexusAI
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
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"
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
