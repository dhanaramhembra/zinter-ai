import { create } from 'zustand';
import {
  FileText,
  Languages,
  GraduationCap,
  Flower2,
  Scale,
  Table,
  type LucideIcon,
} from 'lucide-react';

export interface MessageReaction {
  emoji: string;
  count: number;
  reactedByUser: boolean;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  imageUrl?: string | null;
  imagePrompt?: string | null;
  audioUrl?: string | null;
  createdAt: string;
  responseTime?: number | null;
  /** Base64-encoded image attached by user (for display in user bubble) */
  attachedImage?: string | null;
  /** Emoji reactions on the message (client-side only) */
  reactions?: MessageReaction[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export type PersonaId = 'pro' | 'creative' | 'code' | 'friendly';

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface QuickTemplate {
  id: string;
  text: string;
  label: string;
  icon: LucideIcon;
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'summarize', text: 'Summarize the following text: ', label: 'Summarize text', icon: FileText },
  { id: 'translate', text: 'Translate to English: ', label: 'Translate', icon: Languages },
  { id: 'explain-code', text: 'Explain this code step by step: ', label: 'Explain code', icon: GraduationCap },
  { id: 'haiku', text: 'Write a haiku about ', label: 'Write haiku', icon: Flower2 },
  { id: 'pros-cons', text: 'List the pros and cons of ', label: 'Pros & cons', icon: Scale },
  { id: 'compare', text: 'Create a table comparing ', label: 'Compare', icon: Table },
];

export const REACTION_EMOJIS = ['👍', '❤️', '😮', '🔥', '👎', '💡'];

export type ChatBackground = 'default' | 'dots' | 'gradient' | 'minimal' | 'warm';

export interface BackgroundTheme {
  id: ChatBackground;
  name: string;
  className: string;
  previewClass: string;
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: 'default',
    name: 'Default',
    className: 'dot-grid',
    previewClass: 'bg-background',
  },
  {
    id: 'dots',
    name: 'Dots',
    className: 'bg-dots-pattern',
    previewClass: 'bg-background',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    className: 'bg-chat-gradient',
    previewClass: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    className: 'bg-minimal-chat',
    previewClass: 'bg-background',
  },
  {
    id: 'warm',
    name: 'Warm',
    className: 'bg-warm-chat',
    previewClass: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/15',
  },
];

export const PERSONAS: Persona[] = [
  {
    id: 'pro',
    name: 'NexusAI Pro',
    description: 'Balanced, helpful assistant',
    systemPrompt:
      'You are a helpful, friendly, and knowledgeable AI assistant. You provide clear, accurate, and concise responses. You can help with coding, writing, analysis, creative tasks, and general questions. Use markdown formatting when appropriate for code blocks, lists, and emphasis.',
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    description: 'Expressive, imaginative storyteller',
    systemPrompt:
      'You are a creative, imaginative writer with a passion for storytelling and expressive language. You help users with creative writing, poetry, stories, brainstorming, and any task that benefits from vivid, engaging prose. You use rich metaphors, sensory details, and a warm, enthusiastic tone. You still provide accurate information but wrap it in creative language. Use markdown formatting when appropriate.',
  },
  {
    id: 'code',
    name: 'Code Expert',
    description: 'Focused on programming & debugging',
    systemPrompt:
      'You are an expert software engineer and coding assistant. You specialize in writing clean, efficient, well-documented code. You are proficient in all major programming languages, frameworks, and tools. You provide detailed code explanations, debugging help, architecture advice, and best practices. Always use code blocks with language identifiers. Be concise and technical.',
  },
  {
    id: 'friendly',
    name: 'Friendly Assistant',
    description: 'Casual, warm, and conversational',
    systemPrompt:
      'You are a warm, friendly, and approachable AI assistant. You chat with users in a casual, conversational tone as if talking to a good friend. You use light humor, emojis occasionally, and simple language. You are encouraging, supportive, and make complex topics easy to understand. You avoid overly technical jargon unless the user asks for it.',
  },
];

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  selectedPersona: PersonaId;
  selectedBackground: ChatBackground;
  showTimestamps: boolean;
  isUserTyping: boolean;
  useCustomSystemPrompt: boolean;
  customSystemPrompt: string;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  setGenerating: (generating: boolean) => void;
  setSelectedPersona: (persona: PersonaId) => void;
  setSelectedBackground: (background: ChatBackground) => void;
  setShowTimestamps: (show: boolean) => void;
  setUserTyping: (typing: boolean) => void;
  setUseCustomSystemPrompt: (use: boolean) => void;
  setCustomSystemPrompt: (prompt: string) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  getActiveConversation: () => Conversation | null;
  clearAll: () => void;
}

function getStoredUseCustomPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('nexusai-use-custom-prompt');
    return stored === 'true';
  } catch {
    return false;
  }
}

function getStoredCustomPrompt(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('nexusai-custom-system-prompt') || '';
  } catch {
    return '';
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isGenerating: false,
  selectedPersona: 'pro' as PersonaId,
  selectedBackground: 'default' as ChatBackground,
  showTimestamps: true,
  isUserTyping: false,
  useCustomSystemPrompt: getStoredUseCustomPrompt(),
  customSystemPrompt: getStoredCustomPrompt(),

  setConversations: (conversations) => set({ conversations }),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({ conversations: [conversation, ...state.conversations] })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: new Date().toISOString() }
          : c
      ),
    })),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            }
          : c
      ),
    })),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
          : c
      ),
    })),

  setGenerating: (generating) => set({ isGenerating: generating }),

  setSelectedPersona: (persona) => set({ selectedPersona: persona }),

  setSelectedBackground: (background) => set({ selectedBackground: background }),

  setShowTimestamps: (show) => set({ showTimestamps: show }),

  setUserTyping: (typing) => set({ isUserTyping: typing }),

  setUseCustomSystemPrompt: (use) => {
    set({ useCustomSystemPrompt: use });
    try {
      localStorage.setItem('nexusai-use-custom-prompt', String(use));
    } catch {
      // ignore
    }
  },

  setCustomSystemPrompt: (prompt) => {
    set({ customSystemPrompt: prompt });
    try {
      localStorage.setItem('nexusai-custom-system-prompt', prompt);
    } catch {
      // ignore
    }
  },

  toggleReaction: (conversationId, messageId, emoji) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== messageId) return m;
            const existing = m.reactions || [];
            const idx = existing.findIndex((r) => r.emoji === emoji);
            if (idx !== -1) {
              const reaction = existing[idx];
              if (reaction.reactedByUser) {
                // Remove user's reaction
                if (reaction.count <= 1) {
                  return { ...m, reactions: existing.filter((r) => r.emoji !== emoji) };
                }
                return {
                  ...m,
                  reactions: existing.map((r, i) =>
                    i === idx ? { ...r, count: r.count - 1, reactedByUser: false } : r
                  ),
                };
              } else {
                // Add user's reaction to existing
                return {
                  ...m,
                  reactions: existing.map((r, i) =>
                    i === idx ? { ...r, count: r.count + 1, reactedByUser: true } : r
                  ),
                };
              }
            } else {
              // New reaction
              return {
                ...m,
                reactions: [...existing, { emoji, count: 1, reactedByUser: true }],
              };
            }
          }),
        };
      }),
    })),

  getActiveConversation: () => {
    const state = get();
    return (
      state.conversations.find((c) => c.id === state.activeConversationId) || null
    );
  },

  clearAll: () =>
    set({ conversations: [], activeConversationId: null, isGenerating: false, selectedPersona: 'pro' as PersonaId, selectedBackground: 'default' as ChatBackground, showTimestamps: true, isUserTyping: false, useCustomSystemPrompt: false, customSystemPrompt: '' }),
}));
