// Resolve the backend URL — required in production, defaults to localhost in dev
export function getBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_API_URL must be set in production');
    }
    return ''; // Should be handled by environment variable in production
  }
  return raw.replace(/\/api$/, '');
}
export const isProd = process.env.NODE_ENV === 'production';
