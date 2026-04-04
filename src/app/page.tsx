'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import AuthPage from '@/components/auth/auth-page';
import ConversationSidebar from '@/components/chat/conversation-sidebar';
import ChatArea from '@/components/chat/chat-area';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();
  const { setConversations, clearAll } = useChatStore();
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
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
