import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EFFECTIVE_API_BASE } from '@/lib/api';
import { initFirebase, requestNotificationPermission } from '@/lib/firebase';
import { getNativeFcmToken } from '@/lib/notificationTokens';

let messagingInstance: Awaited<ReturnType<typeof initFirebase>>['messaging'] | null = null;

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('@')) return trimmed.toLowerCase();

  const normalizedPhone = trimmed.replace(/[^\d+]/g, '');
  if (normalizedPhone.startsWith('+')) {
    return `+${normalizedPhone.slice(1).replace(/\D/g, '')}`;
  }

  return normalizedPhone.replace(/\D/g, '');
}

function formatPhoneNumberWithCountryCode(phone: string, countryCode: string): string {
  const cleanedPhone = phone.replace(/\D/g, ""); // Remove all non-digits
  const cleanedCountryCode = countryCode.replace(/\D/g, ""); // Remove all non-digits from country code
  
  // If phone already starts with country code (with or without +), return as is
  if (cleanedPhone.startsWith(cleanedCountryCode)) {
    return "+" + cleanedPhone;
  }
  
  // Otherwise, prepend country code
  return "+" + cleanedCountryCode + cleanedPhone;
}

async function registerFcmToken(authToken: string | null, fcmToken: string | null) {
  if (!fcmToken) return;
  try {
    const endpoint = authToken ? `${EFFECTIVE_API_BASE}/api/notifications/token` : `${EFFECTIVE_API_BASE}/api/notifications/token/public`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: fcmToken, platform: 'web' }),
    });
  } catch {
    // silent
  }
}

export async function hydrateNotifications(authToken: string | null) {
  // Do not prompt unauthenticated visitors on application start. Guest checkout
  // requests a token only when the shopper places an order.
  if (!authToken) return;

  try {
    const nativeToken = getNativeFcmToken();
    if (nativeToken) {
      await registerFcmToken(authToken, nativeToken);
      return;
    }

    const { messaging } = await initFirebase();
    messagingInstance = messaging;
    const fcmToken = await requestNotificationPermission(messagingInstance);
    if (fcmToken) {
      await registerFcmToken(authToken, fcmToken);
    }
  } catch {
    // Notification setup must never block auth flows
  }
}

export async function registerNativeTokenWithSession(fcmToken: string) {
  const authToken = useAuthStore.getState().token;
  if (!authToken || !fcmToken?.trim()) return;

  await registerFcmToken(authToken, fcmToken.trim());
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
  notifications: any[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  login: (identifier: string, password: string, captchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    identifier: string; // email or phone
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    countryCode?: string;
  }, captchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getMe: () => Promise<void>;
  clearError: () => void;
  setSession: (user: any, accessToken: string, refreshToken: string) => void;
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
      notifications: [],
      unreadCount: 0,

      fetchNotifications: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/notifications?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.data ?? [];
            set({ notifications: list });
            
            const countRes = await fetch(`${EFFECTIVE_API_BASE}/api/notifications/unread-count`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (countRes.ok) {
              const countData = await countRes.json();
              set({ unreadCount: countData.count });
            }
          }
        } catch {}
      },

      markAsRead: async (id) => {
        const { token, notifications, unreadCount } = get();
        if (!token) return;
        try {
          await fetch(`${EFFECTIVE_API_BASE}/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          set({
            notifications: notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
            unreadCount: Math.max(0, unreadCount - 1)
          });
        } catch {}
      },

      markAllAsRead: async () => {
        const { token, notifications } = get();
        if (!token) return;
        try {
          await fetch(`${EFFECTIVE_API_BASE}/api/notifications/read-all`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          set({
            notifications: notifications.map(n => ({ ...n, isRead: true })),
            unreadCount: 0
          });
        } catch {}
      },

      login: async (identifier, password, captchaToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          const normalizedIdentifier = normalizeIdentifier(identifier);
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: normalizedIdentifier, password, ...(captchaToken ? { captchaToken } : {}) }),
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
          void hydrateNotifications(data.accessToken);
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
          const identifier = normalizeIdentifier(data.identifier || "");
          const isEmail = identifier.includes("@");
          
          // Format phone number with country code if provided separately
          const formattedPhone = data.phone ? formatPhoneNumberWithCountryCode(data.phone, data.countryCode || '+260') : null;
          
          // Build request body
          const requestBody: any = {
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            ...(captchaToken ? { captchaToken } : {}),
          };
          
          if (isEmail) {
            requestBody.email = identifier;
            if (formattedPhone) {
              requestBody.phone = formattedPhone;
            }
          } else {
            // Identifier is a phone number - format it with country code
            requestBody.phone = formatPhoneNumberWithCountryCode(identifier, data.countryCode || '+260');
          }
          
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
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
          
          // Always save session when tokens are returned (registration returns tokens)
          if (json.accessToken) {
            set({
              token: json.accessToken,
              refreshToken: json.refreshToken ?? null,
              user: json.user ?? null,
              isLoading: false,
              error: null,
            });
            void hydrateNotifications(json.accessToken);
          } else {
            set({ isLoading: false, error: null });
          }
          
          return { success: true };
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
            await fetch(`${EFFECTIVE_API_BASE}/api/auth/logout`, {
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
        // Force redirect to login page to prevent blank screen
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage?.clear?.();
          } catch { /* ignore */ }
          window.location.href = '/login';
        }
      },

      getMe: async () => {
        const { token, refreshToken } = get();
        if (!token) return;
        try {
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 401 && refreshToken) {
            try {
              const refreshRes = await fetch(`${EFFECTIVE_API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (refreshRes.ok) {
                const { accessToken: newAccess, refreshToken: newRefresh } = await refreshRes.json();
                set({ token: newAccess, refreshToken: newRefresh });
                const retryRes = await fetch(`${EFFECTIVE_API_BASE}/api/auth/me`, {
                  headers: { Authorization: `Bearer ${newAccess}` },
                });
                if (retryRes.ok) {
                  const user = await retryRes.json();
                  set({ user });
                  void hydrateNotifications(newAccess);
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
          void hydrateNotifications(token);
        } catch {
          /* silent */
        }
      },

      clearError: () => set({ error: null }),

      setSession: (user, accessToken, refreshToken) => {
        set({ user, token: accessToken, refreshToken, error: null, isLoading: false });
        void hydrateNotifications(accessToken);
      },
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
