import { forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface NavbarCartProps {
  count?: number;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export const NavbarCart = forwardRef<HTMLButtonElement, NavbarCartProps>(
  ({ count = 0, onClick, className = "", ariaLabel }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`vantanav-icon-btn ${className}`.trim()}
        onClick={onClick}
        aria-label={ariaLabel || `Shopping Cart with ${count} items`}
      >
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
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>

        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key={count}
              className="vantanav-cart-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }
);

NavbarCart.displayName = "NavbarCart";
