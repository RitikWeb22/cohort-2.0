import { useState, forwardRef, MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NavItem } from "../../types";
import { useNavbar } from "../../context/NavbarContext";

export interface NavbarDropdownProps {
  item: NavItem;
  index: number;
  className?: string;
  defaultExpanded?: boolean;
}

export const NavbarDropdown = forwardRef<HTMLDivElement, NavbarDropdownProps>(
  ({ item, index, className = "", defaultExpanded = false }, ref) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const {
      close,
      closeOnNavigate,
      onNavigate,
      hoverEffect,
      setHoveredItem,
      setMousePos,
    } = useNavbar();

    const toggleExpanded = () => {
      setIsExpanded((prev) => !prev);
    };

    const handleSublinkClick = (
      e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
      subItem: NavItem
    ) => {
      if (subItem.disabled) {
        e.preventDefault();
        return;
      }
      subItem.onClick?.(e, subItem);
      onNavigate?.(subItem);

      if (closeOnNavigate && subItem.href) {
        close();
      }
    };

    const formattedIndex = String(index + 1).padStart(2, "0");

    const linkClasses = [
      "vantanav-link",
      `vantanav-link--hover-${hoverEffect || "slide"}`,
      item.isActive ? "vantanav-link--active" : "",
      item.className || "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={`vantanav-link-item ${className}`.trim()}>
        <button
          type="button"
          className={linkClasses}
          onClick={toggleExpanded}
          onMouseEnter={(e) => {
            setHoveredItem(item);
            setMousePos({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => {
            setHoveredItem(null);
          }}
          aria-expanded={isExpanded}
          aria-controls={`vantanav-submenu-${index}`}
        >
          <span className="vantanav-link-index" aria-hidden="true">
            {formattedIndex}
          </span>
          {item.icon && <span className="vantanav-link-icon">{item.icon}</span>}
          <span className="vantanav-link-label">{item.label}</span>
          <span
            className={`vantanav-dropdown-arrow ${
              isExpanded ? "vantanav-dropdown-arrow--open" : ""
            }`}
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        <AnimatePresence>
          {isExpanded && item.children && (
            <motion.ul
              id={`vantanav-submenu-${index}`}
              className="vantanav-submenu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {item.children.map((subItem, subIndex) => (
                <li key={subItem.id || subItem.label || subIndex}>
                  <a
                    href={subItem.href || "#"}
                    className="vantanav-sublink"
                    onClick={(e) => handleSublinkClick(e, subItem)}
                    onMouseEnter={(e) => {
                      setHoveredItem(subItem.image || subItem.video || subItem.media ? subItem : item);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredItem(item);
                    }}
                    target={subItem.isExternal ? "_blank" : undefined}
                    rel={subItem.isExternal ? "noopener noreferrer" : undefined}
                  >
                    {subItem.icon && (
                      <span className="vantanav-sublink-icon">{subItem.icon}</span>
                    )}
                    <div>
                      <div>{subItem.label}</div>
                      {subItem.description && (
                        <div className="vantanav-sublink-desc">
                          {subItem.description}
                        </div>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

NavbarDropdown.displayName = "NavbarDropdown";
