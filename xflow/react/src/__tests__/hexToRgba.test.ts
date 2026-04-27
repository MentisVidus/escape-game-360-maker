import { describe, expect, it } from "vitest";

import { hexToRgba } from "../model/hotspotAppearance";

describe("hexToRgba", () => {
  it("ne remplace pas R=0 par 255 (évite l’anti-pattern parseInt || 255)", () => {
    expect(hexToRgba("#000000", 0.9)).toBe("rgba(0, 0, 0, 0.9)");
    expect(hexToRgba("#000101", 1)).toBe("rgba(0, 1, 1, 1)");
    expect(hexToRgba("#000001", 1)).toBe("rgba(0, 0, 1, 1)");
    expect(hexToRgba("#000100", 1)).toBe("rgba(0, 1, 0, 1)");
  });

  it("couleurs non nulles inchangées", () => {
    expect(hexToRgba("#010000", 1)).toBe("rgba(1, 0, 0, 1)");
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });
});
