# VantaNav UI 🌌

> **Production-Ready Animated Overlay Navigation System for Modern React Applications**  
> Transform standard website navigation into an immersive, cinema-grade overlay experience with staggered multi-slice reveals, fluid hover video/image reels, responsive mega-menus, and built-in accessibility.

<p align="center">
  <a href="https://www.npmjs.com/package/vanta-nav"><img src="https://img.shields.io/npm/v/vanta-nav.svg?color=indigo" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/vanta-nav"><img src="https://img.shields.io/npm/dm/vanta-nav.svg" alt="npm downloads" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg" alt="TypeScript" /></a>
  <a href="https://motion.dev"><img src="https://img.shields.io/badge/Animated_with-Motion-f43f5e.svg" alt="Motion" /></a>
</p>

---

## 🎬 Live Showcase Demo

<p align="center">
  <img 
    src="https://raw.githubusercontent.com/RitikWeb22/cohort-2.0/main/resume-projects/vinta-nav/assets/vantanav-demo.gif" 
    alt="VantaNav UI Animated Overlay Navigation Demo" 
    width="100%" 
    style="border-radius: 12px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.1);" 
  />
</p>

---

## 📑 Table of Contents

- [✨ Highlights](#-highlights)
- [📦 Installation & Required Dependencies](#-installation--required-dependencies)
- [🚀 Quick Start (60 Seconds)](#-quick-start-60-seconds)
- [🖼️ Hover Media Previews (Images & Videos)](#️-hover-media-previews-images--videos)
- [📐 Layouts & Directional Alignment](#-layouts--directional-alignment)
- [🎛️ Side Card Customization & Removal](#️-side-card-customization--removal)
- [🎭 Animation Presets](#-animation-presets)
- [🎨 Theming & CSS Variables](#-theming--css-variables)
- [🧩 Compound Component Architecture](#-compound-component-architecture)
- [🌐 Next.js & Server Components Guide](#-nextjs--server-components-guide)
- [📋 Complete Props API Reference](#-complete-props-api-reference)
- [♿ Accessibility (A11y)](#-accessibility-a11y)
- [📄 License](#-license)

---

## ✨ Highlights

- 🎭 **Signature Slice Reveal Engine**: Multi-panel staggered curtains (2 to 6 panels) with smooth cubic-bezier easing.
- 🚀 **6 Built-in Animation Presets**: `slice`, `curtain`, `split`, `slide`, `fade`, and `scale`.
- 🖼️ **Hover Media Reels**: Autoplaying videos and images that react dynamically when visitors hover over links.
- 📐 **Directional Customization**: 5 modern layout structures (`vertical`, `grid`, `staggered-zigzag`, `split-columns`, `horizontal`).
- 🎛️ **Modular Side Panel**: Keep the contact card, customize all its fields, remove it completely, or replace it with custom JSX (newsletter, stats, etc.).
- 🎨 **Deep Theming via CSS Tokens**: 6 curated presets (`dark`, `light`, `cyber`, `emerald`, `sunset`, `minimal`) + full CSS variable overrides.
- ⚡ **Lightweight & High-Performance**: Tree-shakeable ESM/CJS build under 25 kB CSS and 50 kB JS.
- ♿ **Strict Accessibility (A11y)**: Automatic focus trap, Escape key dismiss, body scroll lock with scrollbar compensation, and `prefers-reduced-motion` detection.

---

## 📦 Installation & Required Dependencies

### 1. Install `vanta-nav` and Peer Dependencies

VantaNav uses **[Motion for React](https://motion.dev)** for GPU-accelerated 60fps animations and **[Lucide React](https://lucide.dev)** for clean icons:

```bash
# npm
npm install vanta-nav motion lucide-react

# pnpm
pnpm add vanta-nav motion lucide-react

# yarn
yarn add vanta-nav motion lucide-react

# bun
bun add vanta-nav motion lucide-react
```

### 2. Dependency Breakdown

| Dependency | Required? | Recommended Version | Purpose |
| :--- | :---: | :--- | :--- |
| **`react`** | **Yes** | `^18.0.0` or `^19.0.0` | Core UI runtime |
| **`react-dom`** | **Yes** | `^18.0.0` or `^19.0.0` | Portal & DOM management |
| **`motion`** | **Yes** | `^11.0.0` or `^12.0.0` | Physics, gestures, and slice animations |
| **`lucide-react`** | Optional | `^0.400.0`+ | Search, cart, menu, & social icons |

---

## 🚀 Quick Start (60 Seconds)

Import `OverlayNavbar`, the TypeScript types, and the **built-in stylesheet**:

```tsx
import React from "react";
import { OverlayNavbar } from "vanta-nav";
import type { NavItem } from "vanta-nav";

// ⚠️ IMPORTANT: Import styles once in your root or layout file
import "vanta-nav/styles.css";

const navigationItems: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Case Studies",
    href: "/work",
    badge: "Featured",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    description: "High-impact digital products & systems",
  },
  {
    label: "Agency Reel",
    href: "/reel",
    video: "https://assets.mixkit.co/videos/preview/mixkit-abstract-flowing-neon-lights-42993-large.mp4",
    description: "Watch our kinetic design studio reel",
  },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function App() {
  return (
    <OverlayNavbar
      logo="ATELIER"
      items={navigationItems}
      animation="slice"
      theme="dark"
      ctaText="Start Project"
      ctaHref="/contact"
    />
  );
}
```

---

## 🖼️ Hover Media Previews (Images & Videos)

Attach photography or autoplaying video reels to any link. When the user hovers, VantaNav transitions the media in real time:

```tsx
<OverlayNavbar
  items={navigationItems}
  mediaPreviewMode="panel" // 'panel' | 'floating' | 'backdrop' | 'none'
/>
```

### Preview Modes

| Mode | Description |
| :--- | :--- |
| **`panel`** *(Default)* | Shows interactive photo/video card in the secondary column with title badge and summary. |
| **`floating`** | Renders a magnetic floating preview card that smoothly follows the cursor across the screen. |
| **`backdrop`** | Ambient cinematic background crossfade behind the entire navigation menu. |
| **`none`** | Disables media previews (typographic focus). |

---

## 📐 Layouts & Directional Alignment

Easily adapt the overlay menu from minimalist vertical typography to editorial grids and asymmetric staggered layouts:

```tsx
<OverlayNavbar
  items={navigationItems}
  linksLayout="grid"       // 'vertical' | 'grid' | 'staggered-zigzag' | 'split-columns' | 'horizontal'
  linksAlign="center"      // 'left' | 'center' | 'right'
  hoverEffect="underline"  // 'slide' | 'underline' | 'scale' | 'glow'
/>
```

### Layout Options

- **`vertical`** *(Default)*: Clean high-impact vertical typographic stack with staggered entrance.
- **`grid`**: Responsive 2-column studio layout with preview cards.
- **`staggered-zigzag`**: Editorial high-fashion diagonal zig-zag pattern with alternating offsets.
- **`split-columns`**: Categorical multi-column layout for mega-menu hierarchies.
- **`horizontal`**: Inline horizontal navigation strip with wrapping.

---

## 🎛️ Side Card Customization & Removal

The secondary right-side panel ("Direct Inquiries") can be completely customized, replaced, or removed:

### 1. Remove the Card Completely (Full-Width Menu)

```tsx
<OverlayNavbar
  items={navigationItems}
  showSecondaryPanel={false} // 👈 Removes the card & expands links across the full width
/>
```

### 2. Custom Contact Details

```tsx
<OverlayNavbar
  items={navigationItems}
  contactInfo={{
    title: "Client Partnerships",
    description: "Looking for enterprise consulting or design collaboration?",
    email: "partners@yourdomain.com",
    phone: "+1 (555) 234-5678",
    hours: "24/7 Priority Support",
    address: "SoHo, Manhattan, NY",
  }}
/>
```

### 3. Replace with Any Custom React Component

Pass your own custom component (newsletter, live stats, player, or booking calendar):

```tsx
<OverlayNavbar
  items={navigationItems}
  secondaryContent={
    <div className="newsletter-card">
      <h3>Stay in the Loop</h3>
      <p>Subscribe for weekly architecture & design insights.</p>
      <form onSubmit={(e) => { e.preventDefault(); alert("Subscribed!"); }}>
        <input type="email" placeholder="you@company.com" />
        <button type="submit">Join Newsletter</button>
      </form>
    </div>
  }
/>
```

---

## 🎭 Animation Presets

Choose from 6 distinctive physics-based transitions:

```tsx
<OverlayNavbar
  animation="slice"
  sliceCount={4}              // 2 to 6 panels
  sliceDirection="vertical"   // 'vertical' | 'horizontal'
  duration={0.65}             // Animation duration in seconds
  stagger={0.08}              // Delay between slice entrances
/>
```

| Preset | Visual Effect |
| :--- | :--- |
| **`slice`** *(Signature)* | Multi-panel staggered curtains revealing content with velocity easing. |
| **`curtain`** | High-fashion theatre drape drop from top to bottom. |
| **`split`** | Center-out cinematic division parting from center axis. |
| **`slide`** | Directional slide from `top`, `bottom`, `left`, or `right`. |
| **`fade`** | Minimal glassmorphic opacity fade with backdrop blur. |
| **`scale`** | Radial clip-path expansion with subtle scale acceleration. |

---

## 🎨 Theming & CSS Variables

Switch themes with the `theme` prop or override CSS variables globally:

```tsx
<OverlayNavbar theme="cyber" />
```

Available theme presets: `dark` (default), `light`, `cyber`, `emerald`, `sunset`, `minimal`.

### CSS Custom Properties Reference

```css
:root {
  /* Colors */
  --vantanav-bg: #0b0c10;
  --vantanav-surface: #14161f;
  --vantanav-surface-hover: #1f2330;
  --vantanav-fg: #f3f4f6;
  --vantanav-fg-muted: #9ca3af;
  --vantanav-accent: #6366f1;
  --vantanav-accent-hover: #4f46e5;
  --vantanav-border: rgba(255, 255, 255, 0.08);

  /* Slice Panel Backgrounds */
  --vantanav-slice-bg-1: #090a0f;
  --vantanav-slice-bg-2: #0e1017;
  --vantanav-slice-bg-3: #131620;
  --vantanav-slice-bg-4: #191d2a;
  --vantanav-slice-bg-5: #1e2333;

  /* Dimensions & Blur */
  --vantanav-header-height: 72px;
  --vantanav-glass-blur: 16px;
  --vantanav-overlay-backdrop: rgba(0, 0, 0, 0.75);
}
```

---

## 🧩 Compound Component Architecture

For fully bespoke headers, compose primitives directly:

```tsx
import {
  OverlayNavbar,
  NavbarBrand,
  NavbarTrigger,
  NavbarOverlay,
  NavbarLinks,
  NavbarActions,
  NavbarSearch,
  NavbarThemeToggle,
} from "vanta-nav";
import "vanta-nav/styles.css";

export function CustomHeader() {
  return (
    <OverlayNavbar animation="slice">
      <NavbarBrand href="/">ATELIER</NavbarBrand>

      <NavbarActions>
        <NavbarSearch onSearch={(query) => console.log(query)} />
        <NavbarThemeToggle />
        <NavbarTrigger />
      </NavbarActions>

      <NavbarOverlay
        secondaryContent={
          <div>
            <h3>Studio HQ</h3>
            <p>Tokyo · London · New York</p>
          </div>
        }
      >
        <NavbarLinks items={navigationItems} />
      </NavbarOverlay>
    </OverlayNavbar>
  );
}
```

---

## 🌐 Next.js & Server Components Guide

Because VantaNav utilizes browser window events (Escape key, body scroll-lock, portal mounting) and Motion for React, add `"use client"` at the top of your nav wrapper:

```tsx
// components/SiteHeader.tsx
"use client";

import { OverlayNavbar } from "vanta-nav";
import "vanta-nav/styles.css";

export function SiteHeader() {
  return <OverlayNavbar logo="MY APP" items={navigationItems} />;
}
```

---

## 📋 Complete Props API Reference

### `<OverlayNavbar />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `items` | `NavItem[]` | `[]` | Array of navigation links, dropdowns, and media previews |
| `logo` | `ReactNode` | `"VANTANAV"` | Brand logo element or text string |
| `animation` | `'slice' \| 'curtain' \| 'split' \| 'slide' \| 'fade' \| 'scale'` | `'slice'` | Active overlay animation preset |
| `theme` | `'dark' \| 'light' \| 'cyber' \| 'emerald' \| 'sunset' \| 'minimal'` | `'dark'` | Visual theme palette |
| `sliceCount` | `number` (2 to 6) | `5` | Number of slices for the `slice` animation |
| `sliceDirection` | `'vertical' \| 'horizontal'` | `'vertical'` | Slice orientation |
| `duration` | `number` | `0.65` | Animation duration in seconds |
| `stagger` | `number` | `0.08` | Delay between consecutive slices |
| `mediaPreviewMode` | `'panel' \| 'floating' \| 'backdrop' \| 'none'` | `'panel'` | Hover video/image preview presentation |
| `linksLayout` | `'vertical' \| 'grid' \| 'staggered-zigzag' \| 'split-columns' \| 'horizontal'` | `'vertical'` | Layout geometry of navigation items |
| `linksAlign` | `'left' \| 'center' \| 'right'` | `'left'` | Typographic text alignment |
| `hoverEffect` | `'slide' \| 'underline' \| 'scale' \| 'glow'` | `'slide'` | Link hover micro-interaction |
| `showSecondaryPanel`| `boolean` | `true` | When `false`, hides the side card and expands menu full-width |
| `secondaryContent` | `ReactNode` | `undefined` | Custom JSX to replace the side card completely |
| `contactInfo` | `ContactInfo` | *(Default)* | Custom text, email, phone, hours, and address |
| `showSearch` | `boolean` | `true` | Show search bar in header |
| `showCart` | `boolean` | `true` | Show shopping cart button in header |
| `showThemeToggle` | `boolean` | `true` | Show light/dark mode switch in header |
| `ctaText` | `string` | `undefined` | Optional CTA button label |
| `ctaHref` | `string` | `undefined` | Optional CTA destination link |

---

## ♿ Accessibility (A11y)

- **Focus Trapping**: Keyboard focus is trapped within the overlay when opened and returned to the trigger button when dismissed.
- **Escape Key**: Automatically dismisses the overlay and returns focus.
- **Body Scroll Lock**: Background scroll is locked without page jump or layout shift by compensating for scrollbar width.
- **Reduced Motion**: Automatically respects `prefers-reduced-motion: reduce` by replacing multi-slice choreography with instant, comfortable fades.
- **WAI-ARIA Compliant**: Proper `aria-expanded`, `aria-haspopup`, `aria-controls`, and `role="dialog"` attributes.

---

## 📄 License

MIT © [RitikWeb22](https://github.com/RitikWeb22)
