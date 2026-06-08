import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  redirectError: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setRedirectError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  redirectError: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setRedirectError: (error) => set({ redirectError: error }),
}));
