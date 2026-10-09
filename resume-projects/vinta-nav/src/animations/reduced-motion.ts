import { Variants } from "motion/react";

export const reducedMotionPanelVariants: Variants = {
  closed: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
  open: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
};

export const reducedMotionContentVariants: Variants = {
  closed: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
  open: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
};

export const reducedMotionLinkVariants: Variants = {
  closed: {
    opacity: 0,
    y: 0,
  },
  open: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15 },
  },
};
