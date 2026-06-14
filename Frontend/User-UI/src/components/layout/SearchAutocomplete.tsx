import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Tag } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/lib/api";
import { useCurrencyStore } from "@/store/currencyStore";

interface SearchAutocompleteProps {
  placeholder?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  showSearchButton?: boolean;
  rightSlot?: React.ReactNode;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchAutocomplete({
  placeholder = "Search for products, brands and more...",
  inputClassName = "",
  wrapperClassName = "",
  showSearchButton = false,
  rightSlot,
}: SearchAutocompleteProps) {
  const format = useCurrencyStore((s) => s.format);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProducts({ search: debouncedQuery.trim(), take: 6 }).then((data) => {
      if (cancelled) return;
      setResults(data);
      setOpen(data.length > 0);
      setLoading(false);
      setActiveIdx(-1);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const navigate = useCallback((url: string) => {
    setOpen(false);
    setQuery("");
    window.location.href = url;
  }, []);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (activeIdx >= 0 && results[activeIdx]) {
      navigate(`/product/${results[activeIdx].id}`);
    } else {
      navigate(`/shop?search=${encodeURIComponent(q)}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  }

  return (
    <div ref={containerRef} className={`relative flex-1 ${wrapperClassName}`}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-muted rounded-xl border border-border overflow-hidden"
      >
        <Search className="w-4 h-4 ml-3 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) {
              setOpen(false);
              setResults([]);
            }
          }}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`flex-1 px-3 py-2.5 bg-transparent text-sm outline-none ${inputClassName}`}
          data-testid="header-search-input"
        />
        {loading && (
          <Loader2 className="w-4 h-4 mr-2 text-muted-foreground animate-spin flex-shrink-0" />
        )}
        {rightSlot}
        {showSearchButton && (
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </form>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="py-1">
            {results.map((product, idx) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={() => navigate(`/product/${product.id}`)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  activeIdx === idx ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-snug">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[product.brand, product.category].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-primary">
                    {format(product.price)}
                  </p>
                  {product.discount > 0 && (
                    <p className="text-[10px] text-muted-foreground line-through">
                      {format(product.oldPrice)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border px-3 py-2">
            <button
              type="button"
              onMouseDown={() => navigate(`/shop?search=${encodeURIComponent(query.trim())}`)}
              className="w-full flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <Search className="w-3.5 h-3.5" />
              See all results for &ldquo;{query.trim()}&rdquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
