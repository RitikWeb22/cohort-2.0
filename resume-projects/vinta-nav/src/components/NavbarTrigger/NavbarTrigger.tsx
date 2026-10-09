import { forwardRef, MutableRefObject } from "react";
import { useNavbar } from "../../context/NavbarContext";

export interface NavbarTriggerProps {
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
}

export const NavbarTrigger = forwardRef<HTMLButtonElement, NavbarTriggerProps>(
  ({ className = "", ariaLabel, onClick }, ref) => {
    const { isOpen, toggle, triggerRef } = useNavbar();

    const handleClick = () => {
      onClick?.();
      toggle();
    };

    return (
      <button
        ref={(node) => {
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
          }
          if (triggerRef) {
            (triggerRef as MutableRefObject<HTMLButtonElement | null>).current = node;
          }
        }}
        type="button"
        className={`vantanav-trigger ${isOpen ? "vantanav-trigger--active" : ""} ${className}`.trim()}
        onClick={handleClick}
        aria-label={ariaLabel || (isOpen ? "Close navigation menu" : "Open navigation menu")}
        aria-expanded={isOpen}
        aria-controls="vantanav-overlay"
        aria-haspopup="dialog"
      >
        <span className="vantanav-hamburger-icon" aria-hidden="true">
          <span className="vantanav-hamburger-line" />
          <span className="vantanav-hamburger-line" />
          <span className="vantanav-hamburger-line" />
        </span>
      </button>
    );
  }
);

NavbarTrigger.displayName = "NavbarTrigger";
