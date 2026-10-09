// Styles import for bundlers supporting CSS imports
import "./styles/tokens.css";
import "./styles/themes.css";
import "./styles/navbar.css";
import "./styles/overlay.css";

// Components
export { OverlayNavbar } from "./components/OverlayNavbar/OverlayNavbar";
export { NavbarBrand, type NavbarBrandProps } from "./components/NavbarBrand/NavbarBrand";
export { NavbarTrigger, type NavbarTriggerProps } from "./components/NavbarTrigger/NavbarTrigger";
export { NavbarOverlay, type NavbarOverlayProps } from "./components/NavbarOverlay/NavbarOverlay";
export { NavbarLinks, type NavbarLinksProps } from "./components/NavbarLinks/NavbarLinks";
export { NavbarLink, type NavbarLinkProps } from "./components/NavbarLink/NavbarLink";
export { NavbarDropdown, type NavbarDropdownProps } from "./components/NavbarDropdown/NavbarDropdown";
export { NavbarSearch, type NavbarSearchProps } from "./components/NavbarSearch/NavbarSearch";
export { NavbarCart, type NavbarCartProps } from "./components/NavbarCart/NavbarCart";
export { NavbarThemeToggle, type NavbarThemeToggleProps } from "./components/NavbarThemeToggle/NavbarThemeToggle";
export { NavbarCTA } from "./components/NavbarCTA/NavbarCTA";
export { NavbarActions, type NavbarActionsProps } from "./components/NavbarActions/NavbarActions";

// Context & Hook
export { NavbarContext, useNavbar } from "./context/NavbarContext";

// Hooks
export { useOverlayState, type UseOverlayStateOptions } from "./hooks/useOverlayState";
export { useEscapeKey } from "./hooks/useEscapeKey";
export { useOutsideClick } from "./hooks/useOutsideClick";
export { useLockScroll } from "./hooks/useLockScroll";
export { useFocusTrap } from "./hooks/useFocusTrap";
export { useReducedMotionPreference } from "./hooks/useReducedMotionPreference";

// Animations
export {
  getOverlayAnimation,
  type AnimationEngineConfig,
} from "./animations/presets";
export {
  getSlicePanelVariants,
  getSliceContentVariants,
  getSliceLinkItemVariants,
} from "./animations/slice";
export { getCurtainVariants } from "./animations/curtain";
export { getSplitVariants } from "./animations/split";
export { getSlideVariants } from "./animations/slide";
export { getFadeVariants, getScaleVariants } from "./animations/fade";
export {
  reducedMotionPanelVariants,
  reducedMotionContentVariants,
  reducedMotionLinkVariants,
} from "./animations/reduced-motion";

// Types
export type {
  AnimationPreset,
  SliceDirection,
  SlideDirection,
  LinksAlign,
  LinksLayout,
  MediaPreviewMode,
  LinkHoverEffect,
  ThemeName,
  NavItem,
  NavItemBadge,
  NavItemMedia,
  SocialLink,
  ContactInfo,
  NavbarCTAProps,
  OverlayNavbarProps,
  NavbarContextValue,
} from "./types";
