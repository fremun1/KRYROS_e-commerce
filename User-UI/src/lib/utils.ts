import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats product specifications from various formats into a readable string.
 * Handles:
 * - Structured array: [{key: string, value: string}, ...]
 * - JSON string: '[{"key":"...","value":"..."}]'
 * - Plain string: 'Boxed Warranty'
 */
export function formatSpecs(specs: any): string {
  if (!specs) return '';

  // If it's already a string, try to parse as JSON first
  if (typeof specs === 'string') {
    const trimmed = specs.trim();
    if (!trimmed) return '';

    // Try to parse as JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .map((s: any) => {
              const key = String(s?.key || "").trim();
              const value = String(s?.value || "").trim();
              return key && key.toLowerCase() !== "specifications" ? `${key}: ${value}` : value;
            })
            .filter(Boolean)
            .join(' · ');
        }
      } catch {}
    }

    // Return as plain string
    return trimmed.replace(/^specifications?\s*:\s*/i, '').trim();
  }

  // If it's an array, format it
  if (Array.isArray(specs) && specs.length > 0) {
    return specs
      .map((s: any) => {
        const key = String(s?.key || "").trim();
        const value = String(s?.value || "").trim();
        return key && key.toLowerCase() !== "specifications" ? `${key}: ${value}` : value;
      })
      .filter(Boolean)
      .join(' · ');
  }

  return '';
}
