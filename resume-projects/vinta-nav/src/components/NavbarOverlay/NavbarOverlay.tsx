import { useRef, ReactNode, forwardRef, MutableRefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavbar } from "../../context/NavbarContext";
import { getOverlayAnimation } from "../../animations/presets";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import { SocialLink, ContactInfo } from "../../types";

export interface NavbarOverlayProps {
  children?: ReactNode;
  showSecondaryPanel?: boolean;
  contactInfo?: ContactInfo | false;
  secondaryContent?: ReactNode;
  socialLinks?: SocialLink[];
  className?: string;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

export const NavbarOverlay = forwardRef<HTMLDivElement, NavbarOverlayProps>(
  (
    {
      children,
      showSecondaryPanel: propShowSecondaryPanel,
      contactInfo: propContactInfo,
      secondaryContent,
      socialLinks = [
        { name: "Twitter / X", href: "https://twitter.com" },
        { name: "GitHub", href: "https://github.com" },
        { name: "LinkedIn", href: "https://linkedin.com" },
        { name: "Dribbble", href: "https://dribbble.com" },
      ],
      className = "",
      closeOnEscape = true,
      closeOnOutsideClick = true,
    },
    ref
  ) => {
    const {
      isOpen,
      close,
      animation,
      sliceCount,
      sliceDirection,
      slideDirection,
      duration,
      stagger,
      overlayRef,
      triggerRef,
      reducedMotion,
      mediaPreviewMode,
      hoveredItem,
      mousePos,
      showSecondaryPanel: contextShowSecondaryPanel,
      contactInfo: contextContactInfo,
    } = useNavbar();

    const showSecondary = propShowSecondaryPanel !== undefined ? propShowSecondaryPanel : (contextShowSecondaryPanel ?? true);
    const resolvedContactInfo = propContactInfo !== undefined ? propContactInfo : contextContactInfo;

    const localRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Escape key handling
    useEscapeKey(close, isOpen && closeOnEscape);

    // Focus trapping
    useFocusTrap(localRef, isOpen, triggerRef);

    // Outside click dismissal
    useOutsideClick(contentRef, close, isOpen && closeOnOutsideClick);

    const animationEngine = getOverlayAnimation({
      preset: animation,
      sliceCount,
      sliceDirection,
      slideDirection,
      duration,
      stagger,
      reducedMotion,
    });

    const isSliceOrCurtain = animation === "slice" || animation === "curtain" || animation === "split";
    const panelCount = animation === "curtain" || animation === "split" ? 2 : sliceCount;

    // Resolve media from hoveredItem
    const activeMedia = hoveredItem
      ? hoveredItem.media || (hoveredItem.video ? { type: "video" as const, src: hoveredItem.video } : hoveredItem.image ? { type: "image" as const, src: hoveredItem.image } : null)
      : null;

    return (
      <AnimatePresence>
        {isOpen && (
          <div
            id="vantanav-overlay"
            ref={(node) => {
              (localRef as MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                (ref as MutableRefObject<HTMLDivElement | null>).current = node;
              }
              if (overlayRef) {
                (overlayRef as MutableRefObject<HTMLDivElement | null>).current = node;
              }
            }}
            className={`vantanav-overlay ${className}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation menu"
          >
            {/* Backdrop */}
            <motion.div
              className="vantanav-backdrop"
              variants={animationEngine.backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              aria-hidden="true"
            />

            {/* Ambient Background Media Preview (if mediaPreviewMode === 'backdrop') */}
            {mediaPreviewMode === "backdrop" && activeMedia && (
              <motion.div
                key={`backdrop-${activeMedia.src}`}
                className="vantanav-backdrop-media"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                aria-hidden="true"
              >
                {activeMedia.type === "video" ? (
                  <video src={activeMedia.src} autoPlay muted loop playsInline />
                ) : (
                  <img src={activeMedia.src} alt="" />
                )}
              </motion.div>
            )}

            {/* Slices or Animated Panels */}
            {isSliceOrCurtain ? (
              <div
                className={`vantanav-slices-container vantanav-slices-container--${sliceDirection}`}
                aria-hidden="true"
              >
                {Array.from({ length: panelCount }).map((_, index) => {
                  const sliceBgVar = `var(--vantanav-slice-bg-${(index % 5) + 1})`;
                  const panelVariants = animationEngine.getPanelVariants(index);

                  return (
                    <motion.div
                      key={`slice-${index}`}
                      className="vantanav-slice"
                      style={{ backgroundColor: sliceBgVar }}
                      variants={panelVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                    />
                  );
                })}
              </div>
            ) : (
              <motion.div
                className="vantanav-slice"
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "var(--vantanav-slice-bg-1)",
                }}
                variants={animationEngine.getPanelVariants(0)}
                initial="closed"
                animate="open"
                exit="closed"
                aria-hidden="true"
              />
            )}

            {/* Floating Magnetic Cursor Follower Media Preview */}
            <AnimatePresence>
              {mediaPreviewMode === "floating" && activeMedia && (
                <motion.div
                  key={`floating-${activeMedia.src}`}
                  className="vantanav-floating-media-preview"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: Math.min(mousePos.x + 24, typeof window !== "undefined" ? window.innerWidth - 340 : 800),
                    y: Math.min(Math.max(mousePos.y - 100, 20), typeof window !== "undefined" ? window.innerHeight - 220 : 600),
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.5 }}
                  aria-hidden="true"
                >
                  {activeMedia.type === "video" ? (
                    <video src={activeMedia.src} autoPlay muted loop playsInline />
                  ) : (
                    <img src={activeMedia.src} alt={hoveredItem?.label || ""} />
                  )}
                  {hoveredItem?.label && (
                    <div className="vantanav-floating-media-caption">
                      {hoveredItem.label}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Button in corner */}
            <button
              type="button"
              className="vantanav-overlay-close-btn"
              onClick={close}
              aria-label="Close navigation"
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
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Overlay Navigation Content */}
            <motion.div
              ref={contentRef}
              className="vantanav-overlay-content"
              variants={animationEngine.contentVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div
                className={`vantanav-overlay-grid ${
                  !showSecondary ? "vantanav-overlay-grid--full-width" : ""
                }`}
              >
                {/* Main navigation links */}
                <nav aria-label="Main Navigation">{children}</nav>

                {/* Secondary side panel (removable & customizable) */}
                {showSecondary && (
                  <div className="vantanav-secondary-panel">
                    {/* Media Preview in Panel if configured */}
                    {mediaPreviewMode === "panel" && activeMedia && (
                      <motion.div
                        key={`panel-preview-${activeMedia.src}`}
                        className="vantanav-panel-media-preview"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {activeMedia.type === "video" ? (
                          <video src={activeMedia.src} autoPlay muted loop playsInline />
                        ) : (
                          <img src={activeMedia.src} alt={hoveredItem?.label || "Preview"} />
                        )}
                        <div className="vantanav-panel-media-overlay">
                          <h4 className="vantanav-panel-media-title">{hoveredItem?.label}</h4>
                          {hoveredItem?.description && (
                            <p className="vantanav-panel-media-desc">{hoveredItem.description}</p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Custom Secondary Slot Content */}
                    {secondaryContent !== undefined ? (
                      secondaryContent
                    ) : (
                      <>
                        {resolvedContactInfo !== false && (
                          <div>
                            <div className="vantanav-secondary-title">
                              {resolvedContactInfo?.title || "Get in touch"}
                            </div>
                            {resolvedContactInfo?.subtitle && (
                              <div style={{ color: "var(--vantanav-fg-subtle)", fontSize: "0.85rem", marginBottom: "8px" }}>
                                {resolvedContactInfo.subtitle}
                              </div>
                            )}
                            <div style={{ color: "var(--vantanav-fg-muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                              {resolvedContactInfo ? (
                                <>
                                  {resolvedContactInfo.email && <div>{resolvedContactInfo.email}</div>}
                                  {resolvedContactInfo.phone && <div>{resolvedContactInfo.phone}</div>}
                                  {resolvedContactInfo.hours && (
                                    <div style={{ color: "var(--vantanav-fg-subtle)", fontSize: "0.85rem", marginTop: "4px" }}>
                                      {resolvedContactInfo.hours}
                                    </div>
                                  )}
                                  {resolvedContactInfo.address && (
                                    <div style={{ color: "var(--vantanav-fg-subtle)", fontSize: "0.85rem", marginTop: "4px" }}>
                                      {resolvedContactInfo.address}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  hello@company.design
                                  <br />
                                  +1 (555) 234-8900
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {socialLinks && socialLinks.length > 0 && (
                          <div>
                            <div className="vantanav-secondary-title">Connect</div>
                            <ul className="vantanav-socials-list" role="list">
                              {socialLinks.map((social) => (
                                <li key={social.name}>
                                  <a
                                    href={social.href}
                                    className="vantanav-social-pill"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {social.icon}
                                    <span>{social.label || social.name}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Overlay Footer */}
              <footer className="vantanav-overlay-footer">
                <div>&copy; {new Date().getFullYear()} All rights reserved.</div>
                <div>Designed with VantaNav Animation Engine</div>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

NavbarOverlay.displayName = "NavbarOverlay";
