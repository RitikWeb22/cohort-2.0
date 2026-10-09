import { forwardRef } from "react";
import { motion } from "motion/react";
import { NavItem } from "../../types";
import { NavbarLink } from "../NavbarLink/NavbarLink";
import { NavbarDropdown } from "../NavbarDropdown/NavbarDropdown";
import { useNavbar } from "../../context/NavbarContext";
import { getSliceLinkItemVariants } from "../../animations/slice";
import { reducedMotionLinkVariants } from "../../animations/reduced-motion";

export interface NavbarLinksProps {
  items: NavItem[];
  className?: string;
}

export const NavbarLinks = forwardRef<HTMLUListElement, NavbarLinksProps>(
  ({ items, className = "" }, ref) => {
    const { stagger, reducedMotion, linksAlign, linksLayout } = useNavbar();

    const listClasses = [
      "vantanav-links-container",
      `vantanav-links-container--align-${linksAlign || "left"}`,
      `vantanav-links-container--layout-${linksLayout || "vertical"}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <ul ref={ref} className={listClasses} role="list">
        {items.map((item, index) => {
          const variants = reducedMotion
            ? reducedMotionLinkVariants
            : getSliceLinkItemVariants(index, stagger);

          return (
            <motion.li
              key={item.id || item.label || index}
              className="vantanav-link-item"
              variants={variants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              {item.children && item.children.length > 0 ? (
                <NavbarDropdown item={item} index={index} />
              ) : (
                <NavbarLink item={item} index={index} />
              )}
            </motion.li>
          );
        })}
      </ul>
    );
  }
);

NavbarLinks.displayName = "NavbarLinks";
