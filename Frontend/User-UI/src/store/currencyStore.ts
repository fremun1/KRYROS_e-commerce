import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '@/lib/api';

export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  symbolPosition: 'BEFORE' | 'AFTER';
  exchangeRate: number;
  flag: string;
}

const FLAG_MAP: Record<string, string> = {
  USD: '🇺🇸', ZMW: '🇿🇲', GHS: '🇬🇭', NGN: '🇳🇬',
  KES: '🇰🇪', GBP: '🇬🇧', EUR: '🇪🇺', ZAR: '🇿🇦',
  UGX: '🇺🇬', TZS: '🇹🇿', RWF: '🇷🇼', BWP: '🇧🇼',
  MWK: '🇲🇼', ZWL: '🇿🇼', AOA: '🇦🇴', MZN: '🇲🇿',
};

const DEFAULT: Currency = {
  id: 'usd',
  name: 'US Dollar',
  code: 'USD',
  symbol: '$',
  symbolPosition: 'BEFORE',
  exchangeRate: 1,
  flag: '🇺🇸',
};

interface CurrencyState {
  currencies: Currency[];
  selected: Currency;
  isLoading: boolean;
  fetchCurrencies: () => Promise<void>;
  setCurrency: (code: string) => void;
  convert: (amountUsd: number) => number;
  format: (amountUsd: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currencies: [DEFAULT],
      selected: DEFAULT,
      isLoading: false,

      fetchCurrencies: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_BASE}/api/countries`);
          if (!res.ok) throw new Error('fetch failed');
          const raw = await res.json();
          const list: any[] = Array.isArray(raw) ? raw : (raw.data ?? []);

          const currencies: Currency[] = list
            .filter((c) => c.currencyCode && Number(c.exchangeRate) > 0)
            .map((c) => ({
              id: String(c.id ?? c.currencyCode),
              name: c.currencyName || c.name || c.currencyCode,
              code: c.currencyCode,
              symbol: c.currencySymbol ?? c.currencyCode,
              symbolPosition: (c.symbolPosition as 'BEFORE' | 'AFTER') ?? 'BEFORE',
              exchangeRate: Number(c.exchangeRate),
              flag: FLAG_MAP[c.currencyCode] ?? '',
            }));

          if (currencies.length > 0) {
            const currentCode = get().selected.code;
            const newSelected =
              currencies.find((c) => c.code === currentCode) ?? currencies[0];
            set({ currencies, selected: newSelected, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      setCurrency: (code) => {
        const found = get().currencies.find((c) => c.code === code);
        if (found) set({ selected: found });
      },

      convert: (amountUsd) => amountUsd * get().selected.exchangeRate,

      format: (amountUsd) => {
        const { selected } = get();
        const converted = amountUsd * selected.exchangeRate;
        const formatted = converted.toLocaleString('en', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return selected.symbolPosition === 'AFTER'
          ? `${formatted} ${selected.symbol}`
          : `${selected.symbol}${formatted}`;
      },
    }),
    {
      name: 'kryros-currency',
      partialize: (state) => ({ selected: state.selected }),
    }
  )
);
