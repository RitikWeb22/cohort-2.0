import { Variants } from "motion/react";
import { SliceDirection } from "../types";

export const DEFAULT_EASE = [0.76, 0, 0.24, 1] as const;

export function getSlicePanelVariants(
  index: number,
  totalSlices: number,
  direction: SliceDirection = "vertical",
  duration: number = 0.65,
  stagger: number = 0.08,
  easing: any = DEFAULT_EASE
): Variants {
  const isVertical = direction === "vertical";

  return {
    closed: {
      ...(isVertical ? { y: "-100%" } : { x: "-100%" }),
      transition: {
        duration: duration * 0.85,
        ease: easing,
        delay: (totalSlices - 1 - index) * (stagger * 0.7),
      },
    },
    open: {
      ...(isVertical ? { y: "0%" } : { x: "0%" }),
      transition: {
        duration,
        ease: easing,
        delay: index * stagger,
      },
    },
  };
}

export function getSliceContentVariants(
  duration: number = 0.6,
  delay: number = 0.3
): Variants {
  return {
    closed: {
      opacity: 0,
      y: 20,
      transition: {
        duration: 0.25,
        ease: "easeIn",
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: DEFAULT_EASE,
        delay,
      },
    },
  };
}

export function getSliceLinkItemVariants(
  index: number,
  stagger: number = 0.06,
  baseDelay: number = 0.35
): Variants {
  return {
    closed: {
      opacity: 0,
      y: 35,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: DEFAULT_EASE,
        delay: baseDelay + index * stagger,
      },
    },
  };
}
