export type DeliveryWindow = {
  minDays: number;
  maxDays: number;
};

export type DeliveryItemLike = {
  estimatedDeliveryDays?: number | null;
  estimatedDeliveryMinDays?: number | null;
  estimatedDeliveryMaxDays?: number | null;
  product?: {
    estimatedDeliveryDays?: number | null;
    estimatedDeliveryMinDays?: number | null;
    estimatedDeliveryMaxDays?: number | null;
  } | null;
};

function toPositiveInt(value?: number | string | null): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

export function resolveDeliveryWindow(input: {
  minDays?: number | string | null;
  maxDays?: number | string | null;
  fallbackDays?: number | string | null;
}): DeliveryWindow | null {
  const fallbackDays = toPositiveInt(input.fallbackDays);
  const rawMin = toPositiveInt(input.minDays) ?? fallbackDays;
  const rawMax = toPositiveInt(input.maxDays) ?? fallbackDays;

  if (!rawMin && !rawMax) return null;

  const minDays = Math.min(rawMin ?? rawMax ?? 0, rawMax ?? rawMin ?? 0);
  const maxDays = Math.max(rawMin ?? rawMax ?? 0, rawMax ?? rawMin ?? 0);

  if (!minDays && !maxDays) return null;

  return {
    minDays: minDays || maxDays,
    maxDays: maxDays || minDays,
  };
}

export function resolveDeliveryWindowFromItems(
  items?: DeliveryItemLike[] | null,
  fallbackDays?: number | string | null,
): DeliveryWindow | null {
  const list = Array.isArray(items) ? items : [];

  const minCandidates = list
    .map((item) => toPositiveInt(item?.estimatedDeliveryMinDays ?? item?.product?.estimatedDeliveryMinDays))
    .filter((value): value is number => value !== undefined);

  const maxCandidates = list
    .map((item) => toPositiveInt(item?.estimatedDeliveryMaxDays ?? item?.product?.estimatedDeliveryMaxDays))
    .filter((value): value is number => value !== undefined);

  const fallbackCandidates = [
    ...list
      .map((item) => toPositiveInt(item?.estimatedDeliveryDays ?? item?.product?.estimatedDeliveryDays))
      .filter((value): value is number => value !== undefined),
    toPositiveInt(fallbackDays),
  ].filter((value): value is number => value !== undefined);

  return resolveDeliveryWindow({
    minDays: minCandidates.length ? Math.max(...minCandidates) : undefined,
    maxDays: maxCandidates.length ? Math.max(...maxCandidates) : undefined,
    fallbackDays: fallbackCandidates.length ? Math.max(...fallbackCandidates) : undefined,
  });
}

function toDate(dateLike: Date | string): Date | null {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDeliveryDates(baseDate: Date | string, window: DeliveryWindow) {
  const anchor = toDate(baseDate);
  if (!anchor) return null;

  const startDate = new Date(anchor);
  startDate.setDate(startDate.getDate() + window.minDays);

  const endDate = new Date(anchor);
  endDate.setDate(endDate.getDate() + window.maxDays);

  return { startDate, endDate };
}

export function formatDeliveryDate(
  dateLike: Date | string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  locale = 'en-US',
) {
  const date = toDate(dateLike);
  if (!date) return '—';
  return date.toLocaleDateString(locale, options);
}

export function formatDeliveryWindow(
  baseDate: Date | string,
  window: DeliveryWindow,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  locale = 'en-US',
) {
  const dates = getDeliveryDates(baseDate, window);
  if (!dates) return '—';

  const startText = formatDeliveryDate(dates.startDate, options, locale);
  const endText = formatDeliveryDate(dates.endDate, options, locale);

  return window.minDays === window.maxDays ? endText : `${startText} - ${endText}`;
}

export function formatDeliveryDuration(window: DeliveryWindow) {
  return window.minDays === window.maxDays
    ? `Delivery in ${window.maxDays} day${window.maxDays === 1 ? '' : 's'}`
    : `Delivery in ${window.minDays}-${window.maxDays} days`;
}
