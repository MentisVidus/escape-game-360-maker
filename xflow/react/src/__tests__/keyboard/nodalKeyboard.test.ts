/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

import { nodalKeyboardHandleKeyDown } from "../../view/keyboard/useNodalKeyboard";

function handlers(over: Partial<Parameters<typeof nodalKeyboardHandleKeyDown>[1]> = {}) {
  return {
    anyPopupOpen: false,
    deselectAll: vi.fn(),
    duplicateSelection: vi.fn(),
    focusSearchField: vi.fn(),
    ...over,
  };
}

describe("nodalKeyboardHandleKeyDown", () => {
  it("ignore D dans un input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "d", bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(h.duplicateSelection).not.toHaveBeenCalled();
    input.remove();
  });

  it("appelle duplicateSelection pour D sur une div", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "d", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(true);
    expect(h.duplicateSelection).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    div.remove();
  });

  it("ne duplique pas avec Ctrl+D", () => {
    const div = document.createElement("div");
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "d", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(h.duplicateSelection).not.toHaveBeenCalled();
  });

  it("n’appelle pas duplicateSelection si une popup est ouverte", () => {
    const div = document.createElement("div");
    const h = handlers({ anyPopupOpen: true });
    const ev = new KeyboardEvent("keydown", { key: "d", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(h.duplicateSelection).not.toHaveBeenCalled();
  });

  it("Échap désélectionne hors popup", () => {
    const div = document.createElement("div");
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(true);
    expect(h.deselectAll).toHaveBeenCalledTimes(1);
    div.remove();
  });

  it("Échap ignoré si popup ouverte (la popup gère)", () => {
    const div = document.createElement("div");
    const h = handlers({ anyPopupOpen: true });
    const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(h.deselectAll).not.toHaveBeenCalled();
  });

  it("Ctrl+F focus recherche hors popup", () => {
    const div = document.createElement("div");
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "f", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(true);
    expect(h.focusSearchField).toHaveBeenCalledTimes(1);
    div.remove();
  });

  it("Ctrl+F laissé au navigateur si popup ouverte", () => {
    const div = document.createElement("div");
    const h = handlers({ anyPopupOpen: true });
    const ev = new KeyboardEvent("keydown", { key: "f", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(h.focusSearchField).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });
});
