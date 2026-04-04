'use client';

import { useChatStore, Message } from '@/store/chat-store';
import MessageBubble from './message-bubble';
import ChatInput from './chat-input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquarePlus,
  Sparkles,
  Menu,
  Lightbulb,
  Code,
  Mail,
  ImageIcon,
  Keyboard,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  {
    id: 'quantum',
    text: 'Explain quantum computing in simple terms',
    title: 'Explain quantum computing',
    description: 'Break down complex topics into easy-to-understand language',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'python',
    text: 'Write a Python function to sort a list',
    title: 'Write Python code',
    description: 'Get help with coding tasks and debugging',
    icon: Code,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'email',
    text: 'Help me write a professional email',
    title: 'Draft a professional email',
    description: 'Craft polished, well-structured business emails',
    icon: Mail,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'image',
    text: 'Generate a sunset landscape image',
    title: 'Generate an image',
    description: 'Create stunning visuals from text descriptions',
    icon: ImageIcon,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    enableImageMode: true,
  },
];

interface ChatAreaProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function ChatArea({ onToggleSidebar, sidebarOpen }: ChatAreaProps) {
  const {
    activeConversationId,
    conversations,
    addConversation,
    setActiveConversationId,
    addMessage,
    setGenerating,
    isGenerating,
  } = useChatStore();
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [pendingImageMode, setPendingImageMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  const createNewChat = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      const data = await res.json();

      if (data.conversation) {
        const conversation = {
          ...data.conversation,
          messages: [],
        };
        addConversation(conversation);
        setActiveConversationId(conversation.id);
        return conversation.id;
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    return null;
  }, [addConversation, setActiveConversationId]);

  // Smooth scroll to bottom whenever messages change or generating state changes
  useEffect(() => {
    // Use a small timeout to ensure DOM has updated after render
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isGenerating]);

  // Keyboard shortcut: Ctrl+N / Cmd+N to create new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewChat]);

  const handleSuggestionClick = useCallback(
    async (text: string, enableImageMode = false) => {
      let convId = activeConversationId;
      if (!convId) {
        convId = await createNewChat();
        if (!convId) return;
      }
      setPendingSuggestion(text);
      setPendingImageMode(enableImageMode);
    },
    [activeConversationId, createNewChat]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      // Clear any pending suggestion state
      setPendingSuggestion(null);
      setPendingImageMode(false);

      let convId = activeConversationId;
      if (!convId) {
        convId = await createNewChat();
        if (!convId) return;
      }

      const userMessage: Message = {
        id: uuidv4(),
        content,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      addMessage(convId, userMessage);
      setGenerating(true);

      // Save user message to database
      try {
        await fetch(`/api/chat/${convId}/messages`, {
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
            conversationId: convId,
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

          addMessage(convId, assistantMessage);
        }
      } catch (error) {
        console.error('AI chat error:', error);
        addMessage(convId, {
          id: uuidv4(),
          content: 'Sorry, something went wrong. Please try again.',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        });
      } finally {
        setGenerating(false);
      }
    },
    [activeConversationId, createNewChat, addMessage, setGenerating]
  );

  const generateImage = useCallback(
    async (prompt: string) => {
      // Clear any pending suggestion state
      setPendingSuggestion(null);
      setPendingImageMode(false);

      let convId = activeConversationId;
      if (!convId) {
        convId = await createNewChat();
        if (!convId) return;
      }

      // Add user message with prompt
      const userMessage: Message = {
        id: uuidv4(),
        content: `Generate image: ${prompt}`,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      addMessage(convId, userMessage);
      setGenerating(true);

      // Save user message to database
      try {
        await fetch(`/api/chat/${convId}/messages`, {
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
            content: "Here's the image I generated based on your description:",
            role: 'assistant',
            imageUrl: data.imageUrl,
            imagePrompt: data.prompt,
            createdAt: new Date().toISOString(),
          };

          addMessage(convId, assistantMessage);

          // Save assistant message to database
          await fetch(`/api/chat/${convId}/messages`, {
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
        addMessage(convId, {
          id: uuidv4(),
          content: 'Sorry, I could not generate the image. Please try again.',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        });
      } finally {
        setGenerating(false);
      }
    },
    [activeConversationId, createNewChat, addMessage, setGenerating]
  );

  // Typing indicator component
  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 px-4 py-2"
    >
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Sparkles className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground py-2">
        <span>NexusAI is typing</span>
        <span className="inline-flex gap-0.5 ml-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </span>
      </div>
    </motion.div>
  );

  // Suggestion card component
  const SuggestionCard = ({
    suggestion,
    index,
    onClick,
  }: {
    suggestion: (typeof SUGGESTIONS)[number];
    index: number;
    onClick: () => void;
  }) => {
    const IconComp = suggestion.icon;
    return (
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
        onClick={onClick}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/50',
          'hover:bg-card hover:border-border hover:shadow-sm',
          'transition-all duration-200 text-left group cursor-pointer',
          'active:scale-[0.98]'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors',
            suggestion.bgColor,
            'group-hover:scale-110'
          )}
        >
          <IconComp className={cn('w-4.5 h-4.5', suggestion.color)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{suggestion.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {suggestion.description}
          </p>
        </div>
      </motion.button>
    );
  };

  // Empty state when no conversation is selected
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

        <ScrollArea className="flex-1">
          <div className="flex items-center justify-center p-8 min-h-full">
            <div className="text-center max-w-2xl w-full py-8">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-6 shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-10 h-10" />
              </motion.div>

              {/* Welcome text */}
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
                transition={{ delay: 0.25 }}
                className="text-muted-foreground mb-8 max-w-md mx-auto"
              >
                Your AI-powered assistant for chatting, generating images, and more.
                Try one of these suggestions to get started.
              </motion.p>

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    index={index}
                    onClick={() =>
                      handleSuggestionClick(
                        suggestion.text,
                        suggestion.enableImageMode
                      )
                    }
                  />
                ))}
              </div>

              {/* Keyboard shortcut hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">N</kbd> to start a new chat
                </span>
              </motion.div>
            </div>
          </div>
        </ScrollArea>

        <ChatInput
          onSend={sendMessage}
          onImageGenerate={generateImage}
          disabled={!activeConversation}
          initialMessage={pendingSuggestion}
          initialImageMode={pendingImageMode}
        />
      </div>
    );
  }

  // Conversation view
  const hasMessages = messages.length > 0;

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
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => createNewChat()}
          className="gap-2 rounded-lg shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1">
        {!hasMessages ? (
          /* Empty conversation state - centered suggestion area */
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center max-w-2xl w-full py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 mb-4">
                  <Sparkles className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">How can I help you today?</h3>
                <p className="text-sm text-muted-foreground">
                  Ask anything or try one of these suggestions
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    index={index}
                    onClick={() =>
                      handleSuggestionClick(
                        suggestion.text,
                        suggestion.enableImageMode
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages list */
          <div className="max-w-4xl mx-auto py-4">
            <div className="space-y-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            {/* Typing indicator - shown below the last message */}
            <AnimatePresence>
              {isGenerating && <TypingIndicator />}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Chat input */}
      <ChatInput
        onSend={sendMessage}
        onImageGenerate={generateImage}
        initialMessage={pendingSuggestion}
        initialImageMode={pendingImageMode}
      />
    </div>
  );
}
