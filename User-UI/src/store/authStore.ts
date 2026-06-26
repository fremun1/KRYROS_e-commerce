import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '@/lib/api';
import { initFirebase, requestNotificationPermission } from '@/lib/firebase';

let messagingInstance: ReturnType<typeof initFirebase>['messaging'] | null = null;

async function registerFcmToken(authToken: string | null, fcmToken: string | null) {
  if (!fcmToken || !authToken) return;
  try {
    await fetch(`${API_BASE}/api/notifications/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: fcmToken, platform: 'web' }),
    });
  } catch {
    // silent
  }
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified?: boolean;
  isActive?: boolean;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string, captchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }, captchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getMe: () => Promise<void>;
  clearError: () => void;
}

export function isAuthenticated(state: Pick<AuthState, 'token' | 'user'>): boolean {
  return !!(state.token && state.user);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (identifier, password, captchaToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password, ...(captchaToken ? { captchaToken } : {}) }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg =
              Array.isArray(data.message)
                ? data.message.join(', ')
                : data.message || 'Invalid credentials. Please try again.';
            set({ isLoading: false, error: msg });
            return { success: false, error: msg };
          }
          set({
            token: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
            isLoading: false,
            error: null,
          });
          const { messaging } = initFirebase();
          messagingInstance = messaging;
          const fcmToken = await requestNotificationPermission(messagingInstance);
          registerFcmToken(data.accessToken, fcmToken);
          return { success: true };
        } catch {
          const msg = 'Network error. Please check your connection.';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      register: async (data, captchaToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              firstName: data.firstName,
              lastName: data.lastName,
              ...(data.phone ? { phone: data.phone } : {}),
              ...(captchaToken ? { captchaToken } : {}),
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg =
              Array.isArray(json.message)
                ? json.message.join(', ')
                : json.message || 'Registration failed. Please try again.';
            set({ isLoading: false, error: msg });
            return { success: false, error: msg };
          }
          if (json.accessToken && json.user) {
            set({
              token: json.accessToken,
              refreshToken: json.refreshToken ?? null,
              user: json.user,
              isLoading: false,
              error: null,
            });
            const { messaging } = initFirebase();
            messagingInstance = messaging;
            const fcmToken = await requestNotificationPermission(messagingInstance);
            registerFcmToken(json.accessToken, fcmToken);
            return { success: true };
          }
          set({ isLoading: false, error: null });
          return get().login(data.email, data.password, captchaToken);
        } catch {
          const msg = 'Network error. Please check your connection.';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      logout: async () => {
        const { token, refreshToken } = get();
        if (token) {
          try {
            await fetch(`${API_BASE}/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ refreshToken }),
            });
          } catch {
            /* ignore logout errors */
          }
        }
        set({ token: null, refreshToken: null, user: null, error: null });
      },

      getMe: async () => {
        const { token, refreshToken } = get();
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 401 && refreshToken) {
            try {
              const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (refreshRes.ok) {
                const { accessToken: newAccess, refreshToken: newRefresh } = await refreshRes.json();
                set({ token: newAccess, refreshToken: newRefresh });
                const retryRes = await fetch(`${API_BASE}/api/auth/me`, {
                  headers: { Authorization: `Bearer ${newAccess}` },
                });
                if (retryRes.ok) {
                  const user = await retryRes.json();
                  set({ user });
                  const { messaging } = initFirebase();
                  messagingInstance = messaging;
                  const fcmToken = await requestNotificationPermission(messagingInstance);
                  registerFcmToken(newAccess, fcmToken);
                  return;
                }
              }
            } catch {
              /* silent */
            }
            set({ token: null, refreshToken: null, user: null });
            return;
          }
          if (!res.ok) {
            set({ token: null, refreshToken: null, user: null });
            return;
          }
          const user = await res.json();
          set({ user });
          const { messaging } = initFirebase();
          messagingInstance = messaging;
          const fcmToken = await requestNotificationPermission(messagingInstance);
          registerFcmToken(token, fcmToken);
        } catch {
          /* silent */
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'kryros-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
