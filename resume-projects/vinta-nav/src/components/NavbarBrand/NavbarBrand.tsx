import { ReactNode, forwardRef, MouseEvent } from "react";
import { useNavbar } from "../../context/NavbarContext";

export interface NavbarBrandProps {
  children?: ReactNode;
  href?: string;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement | HTMLDivElement>) => void;
}

export const NavbarBrand = forwardRef<HTMLAnchorElement, NavbarBrandProps>(
  ({ children, href = "/", className = "", onClick }, ref) => {
    const { close } = useNavbar();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      close();
    };

    return (
      <a
        ref={ref}
        href={href}
        className={`vantanav-brand ${className}`.trim()}
        onClick={handleClick}
        aria-label="Brand home"
      >
        {children}
      </a>
    );
  }
);

NavbarBrand.displayName = "NavbarBrand";
