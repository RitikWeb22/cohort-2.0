import { useState } from "react";
import {
  OverlayNavbar,
  NavItem,
  AnimationPreset,
  SliceDirection,
  ThemeName,
  LinksAlign,
  LinksLayout,
  MediaPreviewMode,
  LinkHoverEffect,
} from "../src";
import "./demo.css";

export function App() {
  const [animation, setAnimation] = useState<AnimationPreset>("slice");
  const [sliceCount, setSliceCount] = useState<number>(4);
  const [sliceDirection, setSliceDirection] = useState<SliceDirection>("vertical");
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [linksAlign, setLinksAlign] = useState<LinksAlign>("left");
  const [linksLayout, setLinksLayout] = useState<LinksLayout>("vertical");
  const [mediaPreviewMode, setMediaPreviewMode] = useState<MediaPreviewMode>("panel");
  const [hoverEffect, setHoverEffect] = useState<LinkHoverEffect>("slide");
  const [showSearch, setShowSearch] = useState<boolean>(true);
  const [showCart, setShowCart] = useState<boolean>(true);
  const [cartCount, setCartCount] = useState<number>(2);
  const [showThemeToggle, setShowThemeToggle] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [lastNavigated, setLastNavigated] = useState<string>("");

  // Secondary Card Customization State
  const [secondaryCardType, setSecondaryCardType] = useState<
    "default" | "newsletter" | "stats" | "custom" | "none"
  >("default");
  const [contactTitle, setContactTitle] = useState<string>("Direct Inquiries");
  const [contactEmail, setContactEmail] = useState<string>("support@vantanav.io");

  const navigationItems: NavItem[] = [
    {
      label: "Overview",
      href: "#overview",
      description: "Architecture, motion engine & design tokens",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80",
    },
    {
      label: "Products",
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
      children: [
        {
          label: "Design Systems",
          href: "#design-systems",
          description: "Curated component tokens & animations",
          image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=80",
        },
        {
          label: "SaaS Dashboards",
          href: "#dashboards",
          description: "Production high-density workspace apps",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
        },
        {
          label: "E-Commerce Suite",
          href: "#ecommerce",
          description: "Ultra-fast headless checkout experiences",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
        },
      ],
    },
    {
      label: "Agency Studio",
      href: "#agency",
      description: "Bespoke digital experiences & brand direction",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    },
    {
      label: "Showcase",
      href: "#showcase",
      description: "Award-winning creative portfolio interactions",
      badge: { text: "2026", variant: "accent" },
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80",
    },
    {
      label: "Documentation",
      href: "#docs",
      description: "Quick start guides, API reference & recipes",
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80",
    },
    {
      label: "Contact",
      href: "#contact",
      description: "Global studios in Tokyo, London & New York",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
    },
  ];

  const renderSecondaryContent = () => {
    if (secondaryCardType === "none") return undefined;

    if (secondaryCardType === "newsletter") {
      return (
        <div>
          <div className="vantanav-secondary-title">Newsletter Dispatch</div>
          <p style={{ color: "var(--vantanav-fg-muted)", margin: "0 0 16px", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Subscribe to our weekly dispatch of design engineering, Motion recipes, and front-end architectures.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              placeholder="name@company.com"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid var(--vantanav-border)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#ffffff",
                fontSize: "0.85rem",
                flex: 1,
                outline: "none",
              }}
            />
            <button
              type="button"
              style={{
                background: "var(--vantanav-accent)",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontWeight: 600,
                padding: "8px 14px",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Join
            </button>
          </div>
        </div>
      );
    }

    if (secondaryCardType === "stats") {
      return (
        <div>
          <div className="vantanav-secondary-title">Agency Metrics</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "10px", border: "1px solid var(--vantanav-border)" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--vantanav-fg)" }}>150+</div>
              <div style={{ fontSize: "0.75rem", color: "var(--vantanav-fg-subtle)" }}>Projects Shipped</div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "10px", border: "1px solid var(--vantanav-border)" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--vantanav-fg)" }}>42</div>
              <div style={{ fontSize: "0.75rem", color: "var(--vantanav-fg-subtle)" }}>Design Honors</div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "10px", border: "1px solid var(--vantanav-border)", gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--vantanav-fg)" }}>Currently Booking Q3/Q4</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (secondaryCardType === "custom") {
      return (
        <div>
          <div className="vantanav-secondary-title">{contactTitle}</div>
          <div style={{ color: "var(--vantanav-fg)", fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>
            {contactEmail}
          </div>
          <div style={{ color: "var(--vantanav-fg-subtle)", fontSize: "0.85rem" }}>
            Customizable text or any React component
          </div>
        </div>
      );
    }

    return undefined;
  };

  const handleCopyCode = () => {
    const isHidden = secondaryCardType === "none";
    const customProp = isHidden
      ? `showSecondaryPanel={false}`
      : secondaryCardType === "newsletter"
      ? `secondaryContent={<NewsletterWidget />}`
      : secondaryCardType === "stats"
      ? `secondaryContent={<StudioStatsWidget />}`
      : `contactInfo={{
    title: "${contactTitle}",
    email: "${contactEmail}",
  }}`;

    const code = `<OverlayNavbar
  logo="VANTANAV"
  items={links}
  animation="${animation}"
  sliceCount={${sliceCount}}
  sliceDirection="${sliceDirection}"
  linksAlign="${linksAlign}"
  linksLayout="${linksLayout}"
  mediaPreviewMode="${mediaPreviewMode}"
  hoverEffect="${hoverEffect}"
  ${customProp}
  theme="${theme}"
  position="fixed"
  showSearch={${showSearch}}
  showCart={${showCart}}
  cartCount={${cartCount}}
  showThemeToggle={${showThemeToggle}}
  cta={{
    label: "Get Started",
    href: "https://github.com",
    variant: "primary",
  }}
  closeOnNavigate
/>`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="demo-container">
      <div className="demo-bg-glow" />

      {/* Main VantaNav Component */}
      <OverlayNavbar
        logo={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--vantanav-accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: "#ffffff",
                fontSize: "15px",
              }}
            >
              V
            </span>
            <span>VANTANAV</span>
          </div>
        }
        items={navigationItems}
        animation={animation}
        sliceCount={sliceCount}
        sliceDirection={sliceDirection}
        linksAlign={linksAlign}
        linksLayout={linksLayout}
        mediaPreviewMode={mediaPreviewMode}
        hoverEffect={hoverEffect}
        showSecondaryPanel={secondaryCardType !== "none"}
        contactInfo={
          secondaryCardType === "custom"
            ? { title: contactTitle, email: contactEmail }
            : undefined
        }
        secondaryContent={renderSecondaryContent()}
        theme={theme}
        position="fixed"
        showSearch={showSearch}
        searchPlaceholder="Explore library..."
        onSearch={(q) => console.log("Search query:", q)}
        showCart={showCart}
        cartCount={cartCount}
        onCartClick={() => setCartCount((prev) => prev + 1)}
        showThemeToggle={showThemeToggle}
        onThemeChange={(t) => setTheme(t)}
        cta={{
          label: "Documentation",
          href: "https://github.com",
          variant: "primary",
        }}
        onNavigate={(item) => setLastNavigated(item.label)}
      />

      {/* Hero Section */}
      <section className="demo-hero">
        <div className="demo-pill-badge">
          ✨ Production-Ready Animated Overlay Navigation
        </div>

        <h1 className="demo-title">
          Motion-First Navigation
          <br />
          Built for Modern React
        </h1>

        <p className="demo-subtitle">
          Hover over links to preview images & videos. Fully customize the secondary panel:
          hide the contact card completely, replace it with a newsletter signup, metrics widget,
          or any custom React component.
        </p>

        <div className="demo-cta-row">
          <button
            type="button"
            className="demo-button demo-button--primary"
            onClick={() => {
              const trigger = document.querySelector(".vantanav-trigger") as HTMLButtonElement | null;
              trigger?.click();
            }}
          >
            <span>Open Menu & Inspect Cards</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="demo-button demo-button--secondary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            <span>GitHub Repository</span>
          </a>
        </div>

        {lastNavigated && (
          <div
            style={{
              padding: "10px 18px",
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "10px",
              display: "inline-block",
              fontSize: "0.875rem",
              color: "#a5b4fc",
            }}
          >
            Last navigated item: <strong>{lastNavigated}</strong>
          </div>
        )}
      </section>

      {/* Interactive Control Panel */}
      <section className="demo-playground">
        <div className="demo-control-card">
          <div className="demo-control-header">
            <h2 className="demo-control-title">
              <span>⚙️</span> Secondary Card Customization & Studio Sandbox
            </h2>
            <span style={{ fontSize: "0.8125rem", color: "var(--fg-muted)" }}>
              Customize or remove the right-side contact card and test live
            </span>
          </div>

          <div className="demo-grid-controls">
            {/* Secondary Card Selector */}
            <div style={{ gridColumn: "1 / -1", background: "rgba(99, 102, 241, 0.08)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
              <label className="demo-field-label" style={{ color: "#a5b4fc" }}>
                🎯 Right-Side Card Mode (Remove or Replace Card)
              </label>
              <div className="demo-toggle-group">
                <button
                  type="button"
                  className={`demo-toggle-chip ${secondaryCardType === "default" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setSecondaryCardType("default")}
                >
                  Standard Direct Inquiries
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${secondaryCardType === "newsletter" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setSecondaryCardType("newsletter")}
                >
                  Newsletter Subscribe Form
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${secondaryCardType === "stats" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setSecondaryCardType("stats")}
                >
                  Studio Impact Metrics
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${secondaryCardType === "custom" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setSecondaryCardType("custom")}
                >
                  Custom Contact Fields
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${secondaryCardType === "none" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setSecondaryCardType("none")}
                  style={{ borderColor: "#ef4444", color: secondaryCardType === "none" ? "#ffffff" : "#fca5a5" }}
                >
                  ✕ Remove Card (Full Width Links)
                </button>
              </div>

              {secondaryCardType === "custom" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--fg-muted)", display: "block", marginBottom: "4px" }}>Card Title</label>
                    <input
                      type="text"
                      className="demo-input"
                      value={contactTitle}
                      onChange={(e) => setContactTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--fg-muted)", display: "block", marginBottom: "4px" }}>Card Email</label>
                    <input
                      type="text"
                      className="demo-input"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Links Layout Format */}
            <div>
              <label className="demo-field-label">Links Layout Format</label>
              <select
                className="demo-select"
                value={linksLayout}
                onChange={(e) => setLinksLayout(e.target.value as LinksLayout)}
              >
                <option value="vertical">Vertical (Classic High-Impact Stack)</option>
                <option value="grid">Grid (2-Column Modern Agency)</option>
                <option value="staggered-zigzag">Staggered Zigzag (Editorial Asymmetric)</option>
                <option value="split-columns">Split Columns (Categorical Flow)</option>
                <option value="horizontal">Horizontal (Inline Flow)</option>
              </select>
            </div>

            {/* Links Text Alignment */}
            <div>
              <label className="demo-field-label">Links Alignment</label>
              <div className="demo-toggle-group">
                <button
                  type="button"
                  className={`demo-toggle-chip ${linksAlign === "left" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setLinksAlign("left")}
                >
                  Left
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${linksAlign === "center" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setLinksAlign("center")}
                >
                  Center
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${linksAlign === "right" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setLinksAlign("right")}
                >
                  Right
                </button>
              </div>
            </div>

            {/* Hover Media Preview Mode */}
            <div>
              <label className="demo-field-label">Hover Media Mode</label>
              <select
                className="demo-select"
                value={mediaPreviewMode}
                onChange={(e) => setMediaPreviewMode(e.target.value as MediaPreviewMode)}
              >
                <option value="panel">Panel (Side Card Preview)</option>
                <option value="floating">Floating (Magnetic Mouse Follower Card)</option>
                <option value="backdrop">Backdrop (Ambient Full-Screen Reveal)</option>
                <option value="none">None (Standard Text Only)</option>
              </select>
            </div>

            {/* Link Hover Effect */}
            <div>
              <label className="demo-field-label">Link Hover Animation</label>
              <div className="demo-toggle-group">
                <button
                  type="button"
                  className={`demo-toggle-chip ${hoverEffect === "slide" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setHoverEffect("slide")}
                >
                  Slide
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${hoverEffect === "underline" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setHoverEffect("underline")}
                >
                  Underline
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${hoverEffect === "scale" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setHoverEffect("scale")}
                >
                  Scale
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${hoverEffect === "glow" ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setHoverEffect("glow")}
                >
                  Glow
                </button>
              </div>
            </div>

            {/* Animation Preset */}
            <div>
              <label className="demo-field-label">Overlay Reveal Preset</label>
              <select
                className="demo-select"
                value={animation}
                onChange={(e) => setAnimation(e.target.value as AnimationPreset)}
              >
                <option value="slice">Slice (Signature Multi-Panel)</option>
                <option value="curtain">Curtain (Center Split)</option>
                <option value="split">Split (Left/Right Reveal)</option>
                <option value="slide">Slide (Directional)</option>
                <option value="fade">Fade (Glassmorphic)</option>
                <option value="scale">Scale (Center-Out Reveal)</option>
              </select>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="demo-field-label">Theme Palette</label>
              <select
                className="demo-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeName)}
              >
                <option value="dark">Dark (Obsidian Charcoal)</option>
                <option value="light">Light (Modern Slate)</option>
                <option value="cyber">Cyber (Neon Violet & Cyan)</option>
                <option value="emerald">Emerald (Luxury Forest)</option>
                <option value="sunset">Sunset (Warm Coral)</option>
                <option value="minimal">Minimal (Swiss Monochrome)</option>
              </select>
            </div>

            {/* Slice Count */}
            <div>
              <label className="demo-field-label">
                Slice Count ({sliceCount} panels)
              </label>
              <input
                type="range"
                min="2"
                max="6"
                value={sliceCount}
                onChange={(e) => setSliceCount(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#6366f1", marginTop: "12px" }}
              />
            </div>

            {/* Slice Direction */}
            <div>
              <label className="demo-field-label">Slice Movement Direction</label>
              <div className="demo-toggle-group">
                <button
                  type="button"
                  className={`demo-toggle-chip ${
                    sliceDirection === "vertical" ? "demo-toggle-chip--active" : ""
                  }`}
                  onClick={() => setSliceDirection("vertical")}
                >
                  Vertical
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${
                    sliceDirection === "horizontal" ? "demo-toggle-chip--active" : ""
                  }`}
                  onClick={() => setSliceDirection("horizontal")}
                >
                  Horizontal
                </button>
              </div>
            </div>

            {/* Header Controls & Feature Toggles */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="demo-field-label">Header Controls & Features</label>
              <div className="demo-toggle-group">
                <button
                  type="button"
                  className={`demo-toggle-chip ${showSearch ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setShowSearch(!showSearch)}
                >
                  {showSearch ? "✓ Search Bar Enabled" : "+ Enable Search Bar"}
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${showCart ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setShowCart(!showCart)}
                >
                  {showCart ? `✓ Cart (${cartCount} items)` : "+ Enable Cart"}
                </button>
                <button
                  type="button"
                  className={`demo-toggle-chip ${showThemeToggle ? "demo-toggle-chip--active" : ""}`}
                  onClick={() => setShowThemeToggle(!showThemeToggle)}
                >
                  {showThemeToggle ? "✓ Theme Switcher" : "+ Enable Theme Switcher"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Code Snippet Box */}
        <div className="demo-code-box">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--fg-muted)", fontWeight: 600 }}>
              LIVE REACT CODE SNIPPET (UPDATED WITH YOUR SELECTIONS)
            </span>
            <button type="button" className="demo-copy-btn" onClick={handleCopyCode}>
              {copiedCode ? "Copied!" : "Copy Code"}
            </button>
          </div>
          <pre>
            <code>{`import { OverlayNavbar } from "vantanav";
import type { NavItem } from "vantanav";
import "vantanav/styles.css";

export default function MyNavbar() {
  return (
    <OverlayNavbar
      logo="VANTANAV"
      items={links}
      animation="${animation}"
      sliceCount={${sliceCount}}
      sliceDirection="${sliceDirection}"
      linksLayout="${linksLayout}"
      linksAlign="${linksAlign}"
      mediaPreviewMode="${mediaPreviewMode}"
      hoverEffect="${hoverEffect}"
      ${
        secondaryCardType === "none"
          ? "showSecondaryPanel={false} // Remove card completely"
          : secondaryCardType === "newsletter"
          ? "secondaryContent={<NewsletterWidget />} // Custom widget"
          : secondaryCardType === "stats"
          ? "secondaryContent={<StudioStatsWidget />} // Custom metrics"
          : `contactInfo={{
        title: "${contactTitle}",
        email: "${contactEmail}",
      }}`
      }
      theme="${theme}"
      position="fixed"
      showSearch={${showSearch}}
      showCart={${showCart}}
      cartCount={${cartCount}}
      showThemeToggle={${showThemeToggle}}
      cta={{
        label: "Get Started",
        href: "/signup",
        variant: "primary",
      }}
      closeOnNavigate
    />
  );
}`}</code>
          </pre>
        </div>

        {/* Feature Highlights Grid */}
        <div className="demo-features-grid">
          <div className="demo-feature-card">
            <div className="demo-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M12 8v8" />
                <path d="m8 12 4 4 4-4" />
              </svg>
            </div>
            <h3 className="demo-feature-title">Removable & Customizable Side Card</h3>
            <p className="demo-feature-desc">
              Completely hide the card using <code>showSecondaryPanel={false}</code> for a full-width links layout, or replace it with custom React nodes via <code>secondaryContent</code>.
            </p>
          </div>

          <div className="demo-feature-card">
            <div className="demo-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
            <h3 className="demo-feature-title">Image & Video Hover Previews</h3>
            <p className="demo-feature-desc">
              Display interactive media in the side card, via a magnetic mouse-following card, or ambient backdrop reveal.
            </p>
          </div>

          <div className="demo-feature-card">
            <div className="demo-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <h3 className="demo-feature-title">Modern Layouts & Alignments</h3>
            <p className="demo-feature-desc">
              Choose between vertical stack, 2-column agency grid, editorial zigzag, split columns, or horizontal flow with left/center/right alignment.
            </p>
          </div>

          <div className="demo-feature-card">
            <div className="demo-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m13 2-2 2.5-4-1 1 4-2.5 2 2.5 2-1 4 4-1 2 2.5 2-2.5 4 1-1-4 2.5-2-2.5-2 1-4-4 1z" />
              </svg>
            </div>
            <h3 className="demo-feature-title">Expressive Hover Effects</h3>
            <p className="demo-feature-desc">
              Choose between translation slide, glowing underline expansion, kinetic scale, or bloom hover animations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
