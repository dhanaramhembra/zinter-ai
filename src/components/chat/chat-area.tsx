'use client';

import { useChatStore, Message } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import MessageBubble from './message-bubble';
import ChatInput from './chat-input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus, Sparkles, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

interface ChatAreaProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function ChatArea({ onToggleSidebar, sidebarOpen }: ChatAreaProps) {
  const {
    activeConversationId,
    conversations,
    addConversation,
    addMessage,
    updateMessage,
    setGenerating,
    isGenerating,
  } = useChatStore();
  const { user } = useAuthStore();
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const createNewChat = async () => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      const data = await res.json();

      if (data.conversation) {
        addConversation({
          ...data.conversation,
          messages: [],
        });
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!activeConversationId) {
      // Auto-create conversation
      await createNewChat();
      // Wait for state update then send
      setTimeout(() => sendMessage(content), 500);
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    addMessage(activeConversationId, userMessage);
    setGenerating(true);

    // Save user message to database
    try {
      await fetch(`/api/chat/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, role: 'user' }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: activeConversationId,
        }),
      });

      const data = await res.json();

      if (data.message) {
        const assistantMessage: Message = {
          id: data.message.id,
          content: data.message.content,
          role: 'assistant',
          createdAt: data.message.createdAt || new Date().toISOString(),
        };

        addMessage(activeConversationId, assistantMessage);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      addMessage(activeConversationId, {
        id: uuidv4(),
        content: 'Sorry, something went wrong. Please try again.',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async (prompt: string) => {
    if (!activeConversationId) {
      await createNewChat();
      setTimeout(() => generateImage(prompt), 500);
      return;
    }

    // Add user message with prompt
    const userMessage: Message = {
      id: uuidv4(),
      content: `Generate image: ${prompt}`,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    addMessage(activeConversationId, userMessage);
    setGenerating(true);

    // Save user message to database
    try {
      await fetch(`/api/chat/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage.content, role: 'user' }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }

    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: uuidv4(),
          content: `Here's the image I generated based on your description:`,
          role: 'assistant',
          imageUrl: data.imageUrl,
          imagePrompt: data.prompt,
          createdAt: new Date().toISOString(),
        };

        addMessage(activeConversationId, assistantMessage);

        // Save assistant message to database
        await fetch(`/api/chat/${activeConversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: assistantMessage.content,
            role: 'assistant',
            imageUrl: data.imageUrl,
            imagePrompt: data.prompt,
          }),
        });
      } else {
        throw new Error(data.error || 'Image generation failed');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      addMessage(activeConversationId, {
        id: uuidv4(),
        content: 'Sorry, I could not generate the image. Please try again.',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setGenerating(false);
    }
  };

  // Empty state
  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center gap-3 p-4 border-b border-border lg:hidden">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">NexusAI</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-lg">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-6 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-10 h-10" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold mb-2"
            >
              Welcome to NexusAI
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mb-8"
            >
              Your AI-powered assistant for chatting, generating images, and more. Start a conversation to get started.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button onClick={createNewChat} size="lg" className="gap-2 rounded-xl px-8">
                <MessageSquarePlus className="w-5 h-5" />
                Start New Chat
              </Button>
            </motion.div>

            {/* Feature cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10"
            >
              {[
                { icon: '💬', title: 'AI Chat', desc: 'Intelligent conversation' },
                { icon: '🎨', title: 'Image Gen', desc: 'Create images from text' },
                { icon: '🎤', title: 'Voice', desc: 'Speak or listen' },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors cursor-default"
                >
                  <span className="text-2xl mb-2 block">{feature.icon}</span>
                  <h3 className="text-sm font-medium">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <ChatInput
          onSend={sendMessage}
          onImageGenerate={generateImage}
          disabled={!activeConversation}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-sm truncate">{activeConversation.title}</h2>
          <p className="text-xs text-muted-foreground">
            {messages.length} messages
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={createNewChat}
          className="gap-2 rounded-lg shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="max-w-4xl mx-auto py-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                Start a conversation by typing a message below
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isGenerating && (
                <MessageBubble
                  message={{
                    id: 'generating',
                    content: '',
                    role: 'assistant',
                    createdAt: new Date().toISOString(),
                  }}
                  isGenerating={true}
                />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onImageGenerate={generateImage}
      />
    </div>
  );
}
