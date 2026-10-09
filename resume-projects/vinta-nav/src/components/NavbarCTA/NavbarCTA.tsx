import { forwardRef, Ref } from "react";
import { NavbarCTAProps } from "../../types";

export const NavbarCTA = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  NavbarCTAProps
>(
  (
    {
      label,
      href,
      onClick,
      variant = "primary",
      icon,
      download,
      target,
      className = "",
    },
    ref
  ) => {
    const classNames = `vantanav-cta-btn vantanav-cta-btn--${variant} ${className}`.trim();

    const content = (
      <>
        <span>{label}</span>
        {icon || (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </>
    );

    if (href) {
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          onClick={onClick}
          download={download}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className={classNames}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={classNames}
      >
        {content}
      </button>
    );
  }
);

NavbarCTA.displayName = "NavbarCTA";
