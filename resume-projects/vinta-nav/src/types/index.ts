import { ReactNode, CSSProperties, MouseEvent, RefObject } from "react";

export type AnimationPreset =
  | "slice"
  | "curtain"
  | "split"
  | "fade"
  | "slide"
  | "scale"
  | "center-reveal"
  | "custom";

export type SliceDirection = "vertical" | "horizontal";

export type SlideDirection = "top" | "bottom" | "left" | "right";

export type LinksAlign = "left" | "center" | "right";

export type LinksLayout =
  | "vertical"
  | "horizontal"
  | "grid"
  | "split-columns"
  | "staggered-zigzag";

export type MediaPreviewMode = "panel" | "floating" | "backdrop" | "none";

export type LinkHoverEffect = "slide" | "underline" | "scale" | "magnetic" | "glow";

export type ThemeName =
  | "dark"
  | "light"
  | "cyber"
  | "emerald"
  | "sunset"
  | "minimal"
  | string;

export interface NavItemBadge {
  text: string;
  variant?: "primary" | "accent" | "secondary" | "success" | "warning";
}

export interface NavItemMedia {
  type?: "image" | "video";
  src: string;
  alt?: string;
  poster?: string;
}

export interface NavItem {
  id?: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  description?: string;
  badge?: string | number | NavItemBadge;
  image?: string;
  video?: string;
  media?: NavItemMedia;
  isExternal?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  children?: NavItem[];
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, item: NavItem) => void;
  render?: (item: NavItem, isHovered: boolean) => ReactNode;
}

export interface SocialLink {
  name: string;
  href: string;
  icon?: ReactNode;
  label?: string;
}

export interface NavbarCTAProps {
  label: string;
  href?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: ReactNode;
  download?: boolean | string;
  target?: string;
  className?: string;
}

export interface ContactInfo {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  hours?: string;
  address?: string;
}

export interface OverlayNavbarProps {
  /** Brand logo or custom component */
  logo?: ReactNode;
  /** Primary navigation items */
  items?: NavItem[];
  /** Animation preset for the overlay reveal */
  animation?: AnimationPreset;
  /** Number of slices for slice animation (defaults to 4) */
  sliceCount?: number;
  /** Direction of slice movement */
  sliceDirection?: SliceDirection;
  /** Slide direction for slide preset */
  slideDirection?: SlideDirection;
  /** Link text alignment */
  linksAlign?: LinksAlign;
  /** Link layout format (vertical, horizontal, grid, split-columns, staggered-zigzag) */
  linksLayout?: LinksLayout;
  /** Media preview mode on link hover: 'panel', 'floating', 'backdrop', or 'none' */
  mediaPreviewMode?: MediaPreviewMode;
  /** Link hover animation effect */
  hoverEffect?: LinkHoverEffect;
  /** Animation transition duration in seconds */
  duration?: number;
  /** Animation easing function or cubic-bezier array */
  easing?: number[] | string;
  /** Stagger delay between slices and link items */
  stagger?: number;
  /** Positioning mode of the navbar */
  position?: "fixed" | "sticky" | "relative";
  /** Placement on the screen */
  placement?: "top" | "bottom";
  /** Color theme */
  theme?: ThemeName;
  /** Additional CSS class */
  className?: string;
  /** Inline style overrides */
  style?: CSSProperties;
  /** Close overlay when a navigation link is clicked (default true) */
  closeOnNavigate?: boolean;
  /** Close overlay on Escape key press (default true) */
  closeOnEscape?: boolean;
  /** Close overlay when clicking outside content area (default true) */
  closeOnOutsideClick?: boolean;
  /** Prevent body scrolling while overlay is open (default true) */
  lockScroll?: boolean;
  /** Show search bar */
  showSearch?: boolean;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Callback fired when search is submitted or changed */
  onSearch?: (query: string) => void;
  /** Show theme switcher button */
  showThemeToggle?: boolean;
  /** Callback fired when theme is toggled */
  onThemeChange?: (theme: ThemeName) => void;
  /** Show e-commerce cart button */
  showCart?: boolean;
  /** Number of items in shopping cart */
  cartCount?: number;
  /** Callback when cart button is clicked */
  onCartClick?: () => void;
  /** Call-to-action button or configuration */
  cta?: NavbarCTAProps;
  /** Extra actions to render in the header */
  actions?: ReactNode;
  /** Whether to show the secondary side panel in overlay (default true, set false to remove completely) */
  showSecondaryPanel?: boolean;
  /** Customizable contact info displayed in secondary card (or false to hide contact section) */
  contactInfo?: ContactInfo | false;
  /** Secondary content displayed inside the overlay (e.g. social links, newsletter, custom widget) */
  secondaryContent?: ReactNode;
  /** Social links displayed in the overlay footer or secondary panel */
  socialLinks?: SocialLink[];
  /** Controlled open state */
  isOpen?: boolean;
  /** Initial uncontrolled open state */
  defaultOpen?: boolean;
  /** Callback when overlay opens */
  onOpen?: () => void;
  /** Callback when overlay closes */
  onClose?: () => void;
  /** Callback when any navigation link is clicked */
  onNavigate?: (item: NavItem) => void;
  /** Custom Motion variants for advanced customization */
  customVariants?: {
    slice?: any;
    overlay?: any;
    content?: any;
    link?: any;
  };
  /** Custom children for compound component usage */
  children?: ReactNode;
}

export interface NavbarContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  animation: AnimationPreset;
  sliceCount: number;
  sliceDirection: SliceDirection;
  slideDirection: SlideDirection;
  linksAlign: LinksAlign;
  linksLayout: LinksLayout;
  mediaPreviewMode: MediaPreviewMode;
  hoverEffect: LinkHoverEffect;
  hoveredItem: NavItem | null;
  setHoveredItem: (item: NavItem | null) => void;
  mousePos: { x: number; y: number };
  setMousePos: (pos: { x: number; y: number }) => void;
  duration: number;
  stagger: number;
  easing?: any;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  showSecondaryPanel: boolean;
  contactInfo?: ContactInfo | false;
  closeOnNavigate: boolean;
  onNavigate?: (item: NavItem) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  reducedMotion: boolean;
}
