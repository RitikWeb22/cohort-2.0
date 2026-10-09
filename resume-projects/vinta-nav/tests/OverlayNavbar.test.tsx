import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OverlayNavbar } from "../src/components/OverlayNavbar/OverlayNavbar";
import { NavItem } from "../src/types";

describe("OverlayNavbar Core Functionality", () => {
  const sampleItems: NavItem[] = [
    { label: "Home", href: "/" },
    {
      label: "Products",
      children: [
        { label: "Design Systems", href: "/products/design-systems", description: "UI Component Kits" },
        { label: "Templates", href: "/products/templates", description: "Production Ready Apps" },
      ],
    },
    { label: "Studio", href: "/studio" },
    { label: "Contact", href: "/contact", badge: "New" },
  ];

  it("renders the brand logo and closed trigger button by default", () => {
    render(<OverlayNavbar logo="STUDIO ZERO" items={sampleItems} />);

    expect(screen.getByText("STUDIO ZERO")).toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /open navigation menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the overlay dialog when trigger button is clicked", () => {
    const onOpen = vi.fn();
    render(<OverlayNavbar logo="STUDIO ZERO" items={sampleItems} onOpen={onOpen} />);

    const trigger = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(trigger);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: /site navigation menu/i })).toBeInTheDocument();

    // Navigation links are visible
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("closes the overlay when the close button in the overlay is clicked", () => {
    const onClose = vi.fn();
    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        defaultOpen={true}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Close navigation" });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key press when enabled", () => {
    const onClose = vi.fn();
    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        defaultOpen={true}
        closeOnEscape={true}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onNavigate and closes when a link is clicked", () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();

    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        defaultOpen={true}
        closeOnNavigate={true}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );

    const homeLink = screen.getByText("Home");
    fireEvent.click(homeLink);

    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Home", href: "/" })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("expands dropdown children upon clicking parent item", () => {
    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        defaultOpen={true}
      />
    );

    const dropdownTrigger = screen.getByText("Products");
    fireEvent.click(dropdownTrigger);

    expect(screen.getByText("Design Systems")).toBeInTheDocument();
    expect(screen.getByText("UI Component Kits")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
  });

  it("renders cart count and triggers onCartClick", () => {
    const onCartClick = vi.fn();
    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        showCart={true}
        cartCount={3}
        onCartClick={onCartClick}
      />
    );

    const cartBtn = screen.getByRole("button", { name: /shopping cart with 3 items/i });
    expect(cartBtn).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    fireEvent.click(cartBtn);
    expect(onCartClick).toHaveBeenCalledTimes(1);
  });

  it("handles search input and submits query", () => {
    const onSearch = vi.fn();
    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        showSearch={true}
        onSearch={onSearch}
      />
    );

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "minimalist" } });

    expect(onSearch).toHaveBeenCalledWith("minimalist");
  });

  it("toggles theme and notifies callback", () => {
    const onThemeChange = vi.fn();
    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        theme="dark"
        showThemeToggle={true}
        onThemeChange={onThemeChange}
      />
    );

    const themeBtn = screen.getByRole("button", { name: /switch to light mode/i });
    fireEvent.click(themeBtn);

    expect(onThemeChange).toHaveBeenCalledWith("light");
  });

  it("applies linksAlign and linksLayout classes properly", () => {
    const { container } = render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={sampleItems}
        defaultOpen={true}
        linksAlign="center"
        linksLayout="grid"
      />
    );

    const list = container.querySelector(".vantanav-links-container");
    expect(list).toHaveClass("vantanav-links-container--align-center");
    expect(list).toHaveClass("vantanav-links-container--layout-grid");
  });

  it("displays media preview on link hover when mediaPreviewMode is panel", () => {
    const mediaItems: NavItem[] = [
      {
        label: "Visual Showcase",
        href: "/showcase",
        description: "Kinetic typography and WebGL experiments",
        image: "https://example.com/test-image.jpg",
      },
    ];

    render(
      <OverlayNavbar
        logo="STUDIO ZERO"
        items={mediaItems}
        defaultOpen={true}
        mediaPreviewMode="panel"
      />
    );

    const link = screen.getByText("Visual Showcase");
    fireEvent.mouseEnter(link);

    const img = screen.getByRole("img", { name: "Visual Showcase" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/test-image.jpg");
    expect(screen.getByText("Kinetic typography and WebGL experiments")).toBeInTheDocument();
  });
});
