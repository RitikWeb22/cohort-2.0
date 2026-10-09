import { Variants } from "motion/react";
import { AnimationPreset, SliceDirection, SlideDirection } from "../types";
import {
  getSlicePanelVariants,
  getSliceContentVariants,
  getSliceLinkItemVariants,
  DEFAULT_EASE,
} from "./slice";
import { getCurtainVariants } from "./curtain";
import { getSplitVariants } from "./split";
import { getSlideVariants } from "./slide";
import { getFadeVariants, getScaleVariants } from "./fade";
import {
  reducedMotionPanelVariants,
  reducedMotionContentVariants,
  reducedMotionLinkVariants,
} from "./reduced-motion";

export interface AnimationEngineConfig {
  preset: AnimationPreset;
  sliceCount?: number;
  sliceDirection?: SliceDirection;
  slideDirection?: SlideDirection;
  duration?: number;
  stagger?: number;
  easing?: any;
  reducedMotion?: boolean;
}

export function getOverlayAnimation(config: AnimationEngineConfig) {
  const {
    preset,
    sliceCount = 4,
    sliceDirection = "vertical",
    slideDirection = "top",
    duration = 0.65,
    stagger = 0.08,
    easing = DEFAULT_EASE,
    reducedMotion = false,
  } = config;

  if (reducedMotion) {
    return {
      getPanelVariants: () => reducedMotionPanelVariants,
      contentVariants: reducedMotionContentVariants,
      getLinkVariants: () => reducedMotionLinkVariants,
      backdropVariants: {
        closed: { opacity: 0, transition: { duration: 0.1 } },
        open: { opacity: 1, transition: { duration: 0.1 } },
      },
    };
  }

  const backdropVariants: Variants = {
    closed: {
      opacity: 0,
      transition: { duration: 0.3, ease: "easeIn" },
    },
    open: {
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  switch (preset) {
    case "curtain":
      return {
        getPanelVariants: (index: number) =>
          getCurtainVariants(index === 0 ? "top" : "bottom", duration, easing),
        contentVariants: getSliceContentVariants(duration, 0.25),
        getLinkVariants: (i: number) => getSliceLinkItemVariants(i, stagger, 0.3),
        backdropVariants,
      };

    case "split":
      return {
        getPanelVariants: (index: number) =>
          getSplitVariants(index === 0 ? "left" : "right", duration, easing),
        contentVariants: getSliceContentVariants(duration, 0.25),
        getLinkVariants: (i: number) => getSliceLinkItemVariants(i, stagger, 0.3),
        backdropVariants,
      };

    case "slide":
      return {
        getPanelVariants: () => getSlideVariants(slideDirection, duration, easing),
        contentVariants: getSliceContentVariants(duration, 0.2),
        getLinkVariants: (i: number) => getSliceLinkItemVariants(i, stagger, 0.25),
        backdropVariants,
      };

    case "fade":
      return {
        getPanelVariants: () => getFadeVariants(duration, easing),
        contentVariants: getSliceContentVariants(duration * 0.8, 0.15),
        getLinkVariants: (i: number) => getSliceLinkItemVariants(i, stagger * 0.8, 0.18),
        backdropVariants,
      };

    case "scale":
    case "center-reveal":
      return {
        getPanelVariants: () => getScaleVariants(duration, easing),
        contentVariants: getSliceContentVariants(duration * 0.8, 0.2),
        getLinkVariants: (i: number) => getSliceLinkItemVariants(i, stagger, 0.25),
        backdropVariants,
      };

    case "slice":
    default:
      return {
        getPanelVariants: (index: number) =>
          getSlicePanelVariants(
            index,
            sliceCount,
            sliceDirection,
            duration,
            stagger,
            easing
          ),
        contentVariants: getSliceContentVariants(duration, 0.3),
        getLinkVariants: (i: number) => getSliceLinkItemVariants(i, stagger, 0.35),
        backdropVariants,
      };
  }
}
