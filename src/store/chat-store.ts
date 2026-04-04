import { create } from 'zustand';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  imageUrl?: string | null;
  imagePrompt?: string | null;
  audioUrl?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  setGenerating: (generating: boolean) => void;
  getActiveConversation: () => Conversation | null;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isGenerating: false,

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

  setGenerating: (generating) => set({ isGenerating: generating }),

  getActiveConversation: () => {
    const state = get();
    return (
      state.conversations.find((c) => c.id === state.activeConversationId) || null
    );
  },

  clearAll: () =>
    set({ conversations: [], activeConversationId: null, isGenerating: false }),
}));
