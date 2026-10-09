import { Variants } from "motion/react";
import { DEFAULT_EASE } from "./slice";

export function getSplitVariants(
  side: "left" | "right",
  duration: number = 0.6,
  easing: any = DEFAULT_EASE
): Variants {
  return {
    closed: {
      x: side === "left" ? "-100%" : "100%",
      transition: {
        duration: duration * 0.8,
        ease: easing,
      },
    },
    open: {
      x: "0%",
      transition: {
        duration,
        ease: easing,
      },
    },
  };
}
