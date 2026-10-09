import { ReactNode, forwardRef } from "react";

export interface NavbarActionsProps {
  children?: ReactNode;
  className?: string;
}

export const NavbarActions = forwardRef<HTMLDivElement, NavbarActionsProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div ref={ref} className={`vantanav-actions ${className}`.trim()}>
        {children}
      </div>
    );
  }
);

NavbarActions.displayName = "NavbarActions";
