import { create } from 'zustand';

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
  getActiveConversation: () => Conversation | null;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isGenerating: false,
  selectedPersona: 'pro' as PersonaId,

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

  getActiveConversation: () => {
    const state = get();
    return (
      state.conversations.find((c) => c.id === state.activeConversationId) || null
    );
  },

  clearAll: () =>
    set({ conversations: [], activeConversationId: null, isGenerating: false, selectedPersona: 'pro' as PersonaId }),
}));
