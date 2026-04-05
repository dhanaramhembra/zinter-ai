'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import AuthPage from '@/components/auth/auth-page';
import ConversationSidebar from '@/components/chat/conversation-sidebar';
import ChatArea from '@/components/chat/chat-area';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

// Deterministic seeded random — avoids hydration mismatch from Math.random()
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function LoadingScreen() {
  // Generate particle positions deterministically
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${seededRandom(i * 7 + 1) * 100}%`,
    top: `${30 + seededRandom(i * 7 + 2) * 60}%`,
    size: 2 + seededRandom(i * 7 + 3) * 3,
    delay: seededRandom(i * 7 + 4) * 5,
    duration: 4 + seededRandom(i * 7 + 5) * 6,
    opacity: 0.15 + seededRandom(i * 7 + 6) * 0.3,
  }));

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20" />

      {/* Vignette effect */}
      <div className="vignette absolute inset-0 pointer-events-none" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-emerald-400/5 blur-2xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Floating particles / sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-emerald-400 dark:bg-emerald-500"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
            }}
            animate={{
              y: [-20, -80, -20],
              x: [-5, 10, -5],
              opacity: [0, p.opacity, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo with dynamic entrance (scale + rotate) */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.1 }}
          className="relative"
        >
          {/* Rotating gradient ring */}
          <motion.div
            className="absolute -inset-3 rounded-3xl opacity-60"
            style={{
              background: 'conic-gradient(from 0deg, #10b981, #14b8a6, #10b981)',
              WebkitMask: 'radial-gradient(transparent 62%, black 64%)',
              mask: 'radial-gradient(transparent 62%, black 64%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {/* Pulsing glow */}
          <motion.div
            className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 blur-xl"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Logo icon */}
          <motion.div
            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <Sparkles className="w-10 h-10" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Welcome text with staggered delays */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
          className="text-center"
        >
          <motion.h2
            className="text-2xl font-bold mb-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Welcome to NexusAI
          </motion.h2>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            Loading your experience...
          </motion.p>
        </motion.div>

        {/* Emerald gradient progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="w-48 h-1 rounded-full bg-muted/60 overflow-hidden"
        >
          <motion.div
            className="w-1/3 h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Animated loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-1.5"
        >
          {[0, 150, 300].map((delay) => (
            <motion.span
              key={delay}
              className="w-2 h-2 rounded-full bg-emerald-500"
              animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: delay / 1000,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();
  const { setConversations } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [setUser, setLoading]);

  // Load conversations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      async function loadConversations() {
        try {
          const res = await fetch('/api/chat/conversations');
          const data = await res.json();

          if (data.conversations) {
            setConversations(
              data.conversations.map((conv: any) => ({
                ...conv,
                messages: (conv.messages || []).map((msg: any) => ({
                  ...msg,
                  createdAt: msg.createdAt || new Date().toISOString(),
                })),
              }))
            );
          }
        } catch (error) {
          console.error('Failed to load conversations:', error);
        }
      }

      loadConversations();
    }
  }, [isAuthenticated, setConversations]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <ConversationSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatArea
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
}
