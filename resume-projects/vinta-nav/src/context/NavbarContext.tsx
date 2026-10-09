import { createContext, useContext } from "react";
import { NavbarContextValue } from "../types";

export const NavbarContext = createContext<NavbarContextValue | null>(null);

export function useNavbar(): NavbarContextValue {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error("useNavbar must be used within an OverlayNavbar provider");
  }
  return context;
}
