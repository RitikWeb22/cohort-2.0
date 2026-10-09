import { forwardRef } from "react";
import { useNavbar } from "../../context/NavbarContext";

export interface NavbarThemeToggleProps {
  className?: string;
  ariaLabel?: string;
  onThemeChange?: (nextTheme: string) => void;
}

export const NavbarThemeToggle = forwardRef<HTMLButtonElement, NavbarThemeToggleProps>(
  ({ className = "", ariaLabel, onThemeChange }, ref) => {
    const { theme, setTheme } = useNavbar();
    const isDark = theme === "dark" || theme === "cyber" || theme === "emerald";

    const handleToggle = () => {
      const nextTheme = isDark ? "light" : "dark";
      setTheme(nextTheme);
      onThemeChange?.(nextTheme);
    };

    return (
      <button
        ref={ref}
        type="button"
        className={`vantanav-icon-btn ${className}`.trim()}
        onClick={handleToggle}
        aria-label={
          ariaLabel || `Switch to ${isDark ? "light" : "dark"} mode (current: ${theme})`
        }
      >
        {isDark ? (
          // Sun icon for dark mode
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          // Moon icon for light mode
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </button>
    );
  }
);

NavbarThemeToggle.displayName = "NavbarThemeToggle";
