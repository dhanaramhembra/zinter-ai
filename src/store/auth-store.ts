import { create } from 'zustand';

interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthState['user']) => void;
  updateUser: (updates: Partial<AuthState['user']>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
