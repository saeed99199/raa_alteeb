import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  permissions: string[];
  branch_id: number | null;
  branch_name: string | null;
  locale: string;
  avatar: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (user) => set((state) => ({ ...state, user })),
      logout: () => set({ token: null, user: null }),
      hasPermission: (perm) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'super_admin' || user.role === 'admin') return true;
        return user.permissions.includes(perm);
      },
      isSuperAdmin: () => get().user?.role === 'super_admin',
    }),
    {
      name: 'raa-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
