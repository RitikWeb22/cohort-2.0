import { Variants } from "motion/react";
import { DEFAULT_EASE } from "./slice";

export function getFadeVariants(
  duration: number = 0.45,
  easing: any = DEFAULT_EASE
): Variants {
  return {
    closed: {
      opacity: 0,
      scale: 0.98,
      transition: {
        duration: duration * 0.7,
        ease: "easeIn",
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        duration,
        ease: easing,
      },
    },
  };
}

export function getScaleVariants(
  duration: number = 0.5,
  easing: any = DEFAULT_EASE
): Variants {
  return {
    closed: {
      opacity: 0,
      scale: 0.92,
      clipPath: "circle(0% at 50% 0%)",
      transition: {
        duration: duration * 0.7,
        ease: "easeInOut",
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      clipPath: "circle(150% at 50% 0%)",
      transition: {
        duration,
        ease: easing,
      },
    },
  };
}
