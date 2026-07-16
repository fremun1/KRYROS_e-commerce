
/**
 * Page Context Utility
 * Helps maintain navigation context (homepage, shop, wholesale, get-now)
 * across categories, brands, and section detail pages.
 */

export const PAGE_CONTEXT_SLUGS = ["homepage", "shop", "wholesale", "get-now"];

export type PageContext = "homepage" | "shop" | "wholesale" | "get-now";

/**
 * Normalizes a raw page slug to a valid PageContext.
 * Defaults to "shop" if invalid or missing.
 */
export function normalizePageContext(raw?: string): PageContext {
  if (!raw) return "shop";
  const normalized = raw.toLowerCase().replace(/^\//, "");
  if (PAGE_CONTEXT_SLUGS.includes(normalized)) {
    return normalized as PageContext;
  }
  // Special case: root path or home is homepage
  if (normalized === "" || normalized === "home") return "homepage";
  return "shop";
}

/**
 * Gets the base path for a given page context.
 */
export function getPageContextBasePath(context: PageContext): string {
  if (context === "homepage") return "/homepage"; // Internal routing still needs this
  return `/${context}`;
}

/**
 * Gets the display base path for a given page context (e.g. "/" for homepage)
 */
export function getPageContextDisplayPath(context: PageContext): string {
  if (context === "homepage") return "/";
  return `/${context}`;
}

/**
 * Builds a scoped path for a category or brand.
 */
export function getScopedBrowsePath(
  context: PageContext,
  type: "category" | "brand",
  slug: string
): string {
  const base = getPageContextBasePath(context);
  return `${base}/${type}/${encodeURIComponent(slug)}`;
}

/**
 * Builds a scoped path for a section detail page.
 */
export function getScopedSectionPath(context: PageContext, slug: string): string {
  const base = getPageContextBasePath(context);
  return `${base}/section/${encodeURIComponent(slug)}`;
}

/**
 * Infers the current page context from the window location.
 */
export function inferPageContext(pathname: string): PageContext {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "homepage";
  
  const firstPart = parts[0].toLowerCase();
  if (PAGE_CONTEXT_SLUGS.includes(firstPart)) {
    return firstPart as PageContext;
  }
  
  return "shop";
}
