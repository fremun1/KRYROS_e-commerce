import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EFFECTIVE_API_BASE } from '@/lib/api';

export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  symbolPosition: 'BEFORE' | 'AFTER';
  exchangeRate: number;
  flag: string;
  countryCode?: string;
  isDefault?: boolean;
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
  countryCode: 'US',
};

interface CurrencyState {
  currencies: Currency[];
  selected: Currency;
  isLoading: boolean;
  detectedCountryCode?: string;
  fetchCurrencies: () => Promise<void>;
  fetchCurrenciesByLocation: () => Promise<void>;
  setCurrency: (code: string) => void;
  convert: (amountUsd: number) => number;
  format: (amountUsd: number) => string;
}

function buildCurrencies(list: any[]): Currency[] {
  const deduped = new Map<string, Currency>();

  list
    .filter((country) => country.currencyCode && Number(country.exchangeRate) > 0)
    .forEach((country) => {
      const code = String(country.currencyCode).toUpperCase();
      const existing = deduped.get(code);
      const candidate: Currency = {
        id: String(country.id ?? code),
        name: country.currencyName || country.currencyCode,
        code,
        symbol: country.currencySymbol ?? country.currencyCode,
        symbolPosition: (country.symbolPosition as 'BEFORE' | 'AFTER') ?? 'BEFORE',
        exchangeRate: Number(country.exchangeRate),
        flag: country.flag || FLAG_MAP[code] || '',
        countryCode: country.code,
        isDefault: country.isDefault === true,
      };

      if (!existing || candidate.isDefault) {
        deduped.set(code, candidate);
      }
    });

  return Array.from(deduped.values());
}

function pickDefaultCurrency(currencies: Currency[], currentCode?: string): Currency {
  return (
    currencies.find((currency) => currency.code === currentCode) ??
    currencies.find((currency) => currency.isDefault) ??
    currencies[0] ??
    DEFAULT
  );
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currencies: [DEFAULT],
      selected: DEFAULT,
      isLoading: false,
      detectedCountryCode: undefined,

      fetchCurrencies: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${EFFECTIVE_API_BASE}/api/countries`);
          if (!res.ok) throw new Error('fetch failed');
          const raw = await res.json();
          const list: any[] = Array.isArray(raw) ? raw : (raw.data ?? []);
          const currencies = buildCurrencies(list);

          if (currencies.length > 0) {
            const currentCode = get().selected.code;
            const newSelected = pickDefaultCurrency(currencies, currentCode);
            set({ currencies, selected: newSelected, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      /**
       * Fetch currencies and automatically detect user's location-based currency
       * This is called on app initialization to set the default currency based on user's IP
       */
      fetchCurrenciesByLocation: async () => {
        set({ isLoading: true });
        try {
          // First, fetch all available currencies
          const currenciesRes = await fetch(`${EFFECTIVE_API_BASE}/api/countries`);
          if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
          const raw = await currenciesRes.json();
          const list: any[] = Array.isArray(raw) ? raw : (raw.data ?? []);
          const currencies = buildCurrencies(list);

          // Then, detect user's location and get the appropriate currency
          const geoRes = await fetch(`${EFFECTIVE_API_BASE}/api/countries/detect/by-ip`);
          if (!geoRes.ok) throw new Error('Failed to detect location');
          const geoData = await geoRes.json();

          let selectedCurrency = pickDefaultCurrency(currencies, get().selected.code);

          if (geoData.success && geoData.country && geoData.country.currencyCode) {
            // Find the currency that matches the detected country
            const detectedCurrency = currencies.find(
              (c) => c.code === geoData.country.currencyCode
            );
            if (detectedCurrency) {
              selectedCurrency = detectedCurrency;
            }
          }

          if (currencies.length > 0) {
            set({
              currencies,
              selected: selectedCurrency,
              // Backend can return either `geoData.countryCode` or `detectedCountryCode`
              detectedCountryCode:
                geoData?.geoData?.countryCode ??
                geoData?.detectedCountryCode ??
                geoData?.geoData?.country_code ??
                undefined,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          // If geolocation fails, fall back to regular currency fetch
          try {
            const res = await fetch(`${EFFECTIVE_API_BASE}/api/countries`);
            if (!res.ok) throw new Error('fetch failed');
            const raw = await res.json();
            const list: any[] = Array.isArray(raw) ? raw : (raw.data ?? []);
            const currencies = buildCurrencies(list);

            if (currencies.length > 0) {
              const currentCode = get().selected.code;
              const newSelected = pickDefaultCurrency(currencies, currentCode);
              set({ currencies, selected: newSelected, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          } catch {
            set({ isLoading: false });
          }
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
