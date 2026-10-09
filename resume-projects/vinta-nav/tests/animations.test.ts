import { describe, it, expect } from "vitest";
import { getOverlayAnimation } from "../src/animations/presets";
import { getSlicePanelVariants } from "../src/animations/slice";
import { getCurtainVariants } from "../src/animations/curtain";
import { getSplitVariants } from "../src/animations/split";
import { getSlideVariants } from "../src/animations/slide";
import { getFadeVariants, getScaleVariants } from "../src/animations/fade";

describe("Animation Preset Engine", () => {
  it("resolves slice variants properly for vertical slices", () => {
    const variants = getSlicePanelVariants(0, 4, "vertical", 0.6, 0.08);
    expect(variants.closed).toBeDefined();
    expect(variants.open).toBeDefined();
    expect((variants.closed as any).y).toBe("-100%");
    expect((variants.open as any).y).toBe("0%");
  });

  it("resolves slice variants properly for horizontal slices", () => {
    const variants = getSlicePanelVariants(1, 4, "horizontal", 0.6, 0.08);
    expect((variants.closed as any).x).toBe("-100%");
    expect((variants.open as any).x).toBe("0%");
  });

  it("resolves curtain variants", () => {
    const topVariants = getCurtainVariants("top");
    expect((topVariants.closed as any).y).toBe("-100%");
    const bottomVariants = getCurtainVariants("bottom");
    expect((bottomVariants.closed as any).y).toBe("100%");
  });

  it("resolves split variants", () => {
    const leftVariants = getSplitVariants("left");
    expect((leftVariants.closed as any).x).toBe("-100%");
    const rightVariants = getSplitVariants("right");
    expect((rightVariants.closed as any).x).toBe("100%");
  });

  it("resolves slide variants for all directions", () => {
    const top = getSlideVariants("top");
    expect((top.closed as any).y).toBe("-100%");

    const bottom = getSlideVariants("bottom");
    expect((bottom.closed as any).y).toBe("100%");

    const left = getSlideVariants("left");
    expect((left.closed as any).x).toBe("-100%");

    const right = getSlideVariants("right");
    expect((right.closed as any).x).toBe("100%");
  });

  it("resolves fade and scale variants", () => {
    const fade = getFadeVariants();
    expect((fade.closed as any).opacity).toBe(0);
    expect((fade.open as any).opacity).toBe(1);

    const scale = getScaleVariants();
    expect((scale.closed as any).clipPath).toBeDefined();
    expect((scale.open as any).clipPath).toBeDefined();
  });

  it("returns reduced motion fallback when reducedMotion is true", () => {
    const engine = getOverlayAnimation({
      preset: "slice",
      reducedMotion: true,
    });

    const panelVariants = engine.getPanelVariants(0);
    expect((panelVariants.closed as any).opacity).toBe(0);
    expect((panelVariants.open as any).opacity).toBe(1);
    // Should not have transforms like -100%
    expect((panelVariants.closed as any).y).toBeUndefined();
  });
});
