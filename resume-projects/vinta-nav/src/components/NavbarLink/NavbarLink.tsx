import { useState, forwardRef, MouseEvent, Ref } from "react";
import { NavItem } from "../../types";
import { useNavbar } from "../../context/NavbarContext";

export interface NavbarLinkProps {
  item: NavItem;
  index: number;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, item: NavItem) => void;
}

export const NavbarLink = forwardRef<HTMLAnchorElement | HTMLButtonElement, NavbarLinkProps>(
  ({ item, index, className = "", onClick }, ref) => {
    const {
      close,
      closeOnNavigate,
      onNavigate,
      hoverEffect,
      setHoveredItem,
      setMousePos,
    } = useNavbar();
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = (e: MouseEvent) => {
      setIsHovered(true);
      setHoveredItem(item);
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setHoveredItem(null);
    };

    const handleClick = (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (item.disabled) {
        e.preventDefault();
        return;
      }

      item.onClick?.(e, item);
      onClick?.(e, item);
      onNavigate?.(item);

      if (closeOnNavigate && item.href) {
        close();
      }
    };

    const formattedIndex = String(index + 1).padStart(2, "0");

    if (item.render) {
      return (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`vantanav-link-custom ${className}`.trim()}
        >
          {item.render(item, isHovered)}
        </div>
      );
    }

    const badgeContent =
      typeof item.badge === "object" ? (
        <span
          className={`vantanav-badge vantanav-badge--${item.badge.variant || "accent"}`}
        >
          {item.badge.text}
        </span>
      ) : item.badge !== undefined ? (
        <span className="vantanav-badge vantanav-badge--accent">{item.badge}</span>
      ) : null;

    const content = (
      <>
        <span className="vantanav-link-index" aria-hidden="true">
          {formattedIndex}
        </span>
        {item.icon && <span className="vantanav-link-icon">{item.icon}</span>}
        <span className="vantanav-link-label">{item.label}</span>
        {badgeContent}
        {item.isExternal && (
          <svg
            className="vantanav-external-icon"
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
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        )}
      </>
    );

    const linkClasses = [
      "vantanav-link",
      `vantanav-link--hover-${hoverEffect || "slide"}`,
      item.isActive ? "vantanav-link--active" : "",
      item.disabled ? "vantanav-link--disabled" : "",
      item.className || "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (item.href) {
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={item.href}
          className={linkClasses}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          target={item.isExternal ? "_blank" : undefined}
          rel={item.isExternal ? "noopener noreferrer" : undefined}
          aria-disabled={item.disabled}
          tabIndex={item.disabled ? -1 : 0}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        className={linkClasses}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        disabled={item.disabled}
      >
        {content}
      </button>
    );
  }
);

NavbarLink.displayName = "NavbarLink";
