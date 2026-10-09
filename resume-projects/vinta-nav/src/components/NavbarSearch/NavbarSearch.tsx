import { useState, forwardRef, FormEvent } from "react";

export interface NavbarSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export const NavbarSearch = forwardRef<HTMLDivElement, NavbarSearchProps>(
  ({ placeholder = "Search...", onSearch, className = "" }, ref) => {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      onSearch?.(query);
    };

    const handleClear = () => {
      setQuery("");
      onSearch?.("");
    };

    return (
      <div ref={ref} className={`vantanav-search-wrapper ${className}`.trim()}>
        <form onSubmit={handleSubmit} className="vantanav-search-input-box" role="search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder={placeholder}
            className="vantanav-search-input"
            aria-label={placeholder}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--vantanav-fg-muted)",
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
              }}
              aria-label="Clear search"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </form>
      </div>
    );
  }
);

NavbarSearch.displayName = "NavbarSearch";
