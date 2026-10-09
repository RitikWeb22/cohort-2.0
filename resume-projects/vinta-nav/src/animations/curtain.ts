import { Variants } from "motion/react";
import { DEFAULT_EASE } from "./slice";

export function getCurtainVariants(
  position: "top" | "bottom" | "left" | "right",
  duration: number = 0.65,
  easing: any = DEFAULT_EASE
): Variants {
  const isTop = position === "top";
  const isBottom = position === "bottom";
  const isLeft = position === "left";
  const isRight = position === "right";

  return {
    closed: {
      ...(isTop ? { y: "-100%" } : {}),
      ...(isBottom ? { y: "100%" } : {}),
      ...(isLeft ? { x: "-100%" } : {}),
      ...(isRight ? { x: "100%" } : {}),
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
