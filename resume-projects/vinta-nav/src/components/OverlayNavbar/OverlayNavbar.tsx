import { useState, useEffect, useRef, forwardRef } from "react";
import { OverlayNavbarProps, ThemeName, NavItem } from "../../types";
import { NavbarContext } from "../../context/NavbarContext";
import { useOverlayState } from "../../hooks/useOverlayState";
import { useLockScroll } from "../../hooks/useLockScroll";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { NavbarBrand } from "../NavbarBrand/NavbarBrand";
import { NavbarTrigger } from "../NavbarTrigger/NavbarTrigger";
import { NavbarOverlay } from "../NavbarOverlay/NavbarOverlay";
import { NavbarLinks } from "../NavbarLinks/NavbarLinks";
import { NavbarSearch } from "../NavbarSearch/NavbarSearch";
import { NavbarCart } from "../NavbarCart/NavbarCart";
import { NavbarThemeToggle } from "../NavbarThemeToggle/NavbarThemeToggle";
import { NavbarCTA } from "../NavbarCTA/NavbarCTA";
import { NavbarActions } from "../NavbarActions/NavbarActions";

export const OverlayNavbar = forwardRef<HTMLElement, OverlayNavbarProps>(
  (
    {
      logo = "VANTANAV",
      items = [],
      animation = "slice",
      sliceCount = 4,
      sliceDirection = "vertical",
      slideDirection = "top",
      linksAlign = "left",
      linksLayout = "vertical",
      mediaPreviewMode = "panel",
      hoverEffect = "slide",
      duration = 0.65,
      easing,
      stagger = 0.08,
      position = "fixed",
      placement = "top",
      theme = "dark",
      className = "",
      style,
      closeOnNavigate = true,
      closeOnEscape = true,
      closeOnOutsideClick = true,
      lockScroll = true,
      showSearch = false,
      searchPlaceholder = "Search...",
      onSearch,
      showThemeToggle = false,
      onThemeChange,
      showCart = false,
      cartCount = 0,
      onCartClick,
      cta,
      actions,
      showSecondaryPanel = true,
      contactInfo,
      secondaryContent,
      socialLinks,
      isOpen: controlledIsOpen,
      defaultOpen = false,
      onOpen,
      onClose,
      onNavigate,
      children,
    },
    ref
  ) => {
    const [currentTheme, setCurrentTheme] = useState<ThemeName>(theme);
    const [isScrolled, setIsScrolled] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<NavItem | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const reducedMotion = useReducedMotionPreference();

    // Open/close overlay state management
    const { isOpen, open, close, toggle } = useOverlayState({
      isOpen: controlledIsOpen,
      defaultOpen,
      onOpen,
      onClose,
    });

    // Body scroll lock
    useLockScroll(isOpen && lockScroll);

    // Sync theme prop changes
    useEffect(() => {
      setCurrentTheme(theme);
    }, [theme]);

    const handleThemeChange = (newTheme: ThemeName) => {
      setCurrentTheme(newTheme);
      onThemeChange?.(newTheme);
    };

    // Scroll listener for sticky header blur styling
    useEffect(() => {
      if (typeof window === "undefined") return;

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const contextValue = {
      isOpen,
      open,
      close,
      toggle,
      animation,
      sliceCount,
      sliceDirection,
      slideDirection,
      linksAlign,
      linksLayout,
      mediaPreviewMode,
      hoverEffect,
      hoveredItem,
      setHoveredItem,
      mousePos,
      setMousePos,
      duration,
      stagger,
      easing,
      theme: currentTheme,
      setTheme: handleThemeChange,
      showSecondaryPanel,
      contactInfo,
      closeOnNavigate,
      onNavigate,
      triggerRef,
      overlayRef,
      reducedMotion,
    };

    const headerClasses = [
      "vantanav-header",
      `vantanav-header--${position}`,
      `vantanav-header--placement-${placement}`,
      isScrolled ? "vantanav-header--scrolled" : "",
      `vantanav-theme-${currentTheme}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <NavbarContext.Provider value={contextValue}>
        <header
          ref={ref}
          className={headerClasses}
          style={style}
          data-vantanav-theme={currentTheme}
        >
          <div className="vantanav-header-inner">
            {/* If children provided, allow custom composition */}
            {children ? (
              children
            ) : (
              <>
                {/* Brand */}
                <NavbarBrand>{logo}</NavbarBrand>

                {/* Right Side Actions */}
                <NavbarActions>
                  {showSearch && (
                    <NavbarSearch
                      placeholder={searchPlaceholder}
                      onSearch={onSearch}
                    />
                  )}

                  {showThemeToggle && (
                    <NavbarThemeToggle onThemeChange={handleThemeChange} />
                  )}

                  {showCart && (
                    <NavbarCart count={cartCount} onClick={onCartClick} />
                  )}

                  {actions}

                  {cta && <NavbarCTA {...cta} />}

                  {/* Hamburger Menu Trigger */}
                  <NavbarTrigger />
                </NavbarActions>

                {/* Animated Fullscreen Overlay */}
                <NavbarOverlay
                  showSecondaryPanel={showSecondaryPanel}
                  contactInfo={contactInfo}
                  secondaryContent={secondaryContent}
                  socialLinks={socialLinks}
                  closeOnEscape={closeOnEscape}
                  closeOnOutsideClick={closeOnOutsideClick}
                >
                  <NavbarLinks items={items} />
                </NavbarOverlay>
              </>
            )}
          </div>
        </header>
      </NavbarContext.Provider>
    );
  }
);

OverlayNavbar.displayName = "OverlayNavbar";
