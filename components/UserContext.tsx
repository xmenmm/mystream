'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api-client';
import { LocaleContext, Locale, isRTL } from '@/lib/i18n';

export type Me = {
  username: string;
  email: string;
  bio?: string;
  avatarColor?: string;
  country?: string;
  hasAvatar: boolean;
  isAdmin: boolean;
  totpEnabled: boolean;
  following?: string[];
  createdAt: string;
  plan?: 'free' | 'premium';
  planLabel?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  locale?: Locale;
};

type Ctx = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const C = createContext<Ctx>({
  me: null, loading: true,
  refresh: async () => {}, logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: Me }>('/api/me');
      setMe(r.user);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    setMe(null);
    window.location.href = '/';
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Pakai locale user kalo dia premium, kalo nggak default 'id'
  const locale: Locale = (me?.isPremium && me?.locale) ? me.locale : 'id';

  // Set <html dir> for RTL support
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <C.Provider value={{ me, loading, refresh, logout }}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </C.Provider>
  );
}

export const useMe = () => useContext(C);
