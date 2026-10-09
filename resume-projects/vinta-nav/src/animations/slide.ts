import { Variants } from "motion/react";
import { SlideDirection } from "../types";
import { DEFAULT_EASE } from "./slice";

export function getSlideVariants(
  direction: SlideDirection = "top",
  duration: number = 0.55,
  easing: any = DEFAULT_EASE
): Variants {
  let initial = {};
  switch (direction) {
    case "top":
      initial = { y: "-100%" };
      break;
    case "bottom":
      initial = { y: "100%" };
      break;
    case "left":
      initial = { x: "-100%" };
      break;
    case "right":
      initial = { x: "100%" };
      break;
  }

  return {
    closed: {
      ...initial,
      transition: {
        duration: duration * 0.8,
        ease: easing,
      },
    },
    open: {
      x: "0%",
      y: "0%",
      transition: {
        duration,
        ease: easing,
      },
    },
  };
}
