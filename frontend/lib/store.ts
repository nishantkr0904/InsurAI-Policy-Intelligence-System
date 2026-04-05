import { create } from 'zustand';

/**
 * Global application state using Zustand
 * 
 * Manages:
 * - User authentication state
 * - Active workspace
 * - Onboarding status
 * 
 * Runtime-only in-memory state
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  workspace?: string;
}

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;

  // Workspace
  workspaceId: string | null;

  // Onboarding
  onboardingComplete: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setWorkspace: (workspaceId: string) => void;
  completeOnboarding: (workspaceName: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  workspaceId: null,
  onboardingComplete: false,

  // Actions
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    workspaceId: user?.workspace || null
  }),

  setWorkspace: (workspaceId) => set({ workspaceId }),

  completeOnboarding: (workspaceName) => set((state) => ({
    onboardingComplete: true,
    workspaceId: workspaceName,
    user: state.user ? { ...state.user, workspace: workspaceName } : null
  })),

  logout: () => set({
    user: null,
    isAuthenticated: false,
    workspaceId: null,
    onboardingComplete: false
  })
}));
