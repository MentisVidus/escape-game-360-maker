/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

import { nodalKeyboardHandleKeyDown } from "../../view/keyboard/useNodalKeyboard";

function handlers(over: Partial<Parameters<typeof nodalKeyboardHandleKeyDown>[1]> = {}) {
  return {
    anyPopupOpen: false,
    deselectAll: vi.fn(),
    focusSearchField: vi.fn(),
    ...over,
  };
}

describe("nodalKeyboardHandleKeyDown", () => {
  it("ignore ? dans un input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const openShortcutsHelp = vi.fn();
    const h = handlers({ openShortcutsHelp });
    const ev = new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(openShortcutsHelp).not.toHaveBeenCalled();
    input.remove();
  });

  it("appelle openShortcutsHelp pour ? sur une div", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const openShortcutsHelp = vi.fn();
    const h = handlers({ openShortcutsHelp });
    const ev = new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(true);
    expect(openShortcutsHelp).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    div.remove();
  });

  it("ne fait rien pour ? si openShortcutsHelp absent", () => {
    const div = document.createElement("div");
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
  });

  it("n’appelle pas openShortcutsHelp si une popup est ouverte", () => {
    const div = document.createElement("div");
    const openShortcutsHelp = vi.fn();
    const h = handlers({ anyPopupOpen: true, openShortcutsHelp });
    const ev = new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(openShortcutsHelp).not.toHaveBeenCalled();
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

  it("Ctrl+C sans handler laissé au navigateur", () => {
    const div = document.createElement("div");
    const h = handlers();
    const ev = new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
  });

  it("Ctrl+C appelle copySelection si fourni", () => {
    const div = document.createElement("div");
    const copySelection = vi.fn();
    const h = handlers({ copySelection });
    const ev = new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(true);
    expect(copySelection).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+V appelle pasteFromClipboard si fourni", () => {
    const div = document.createElement("div");
    const pasteFromClipboard = vi.fn();
    const h = handlers({ pasteFromClipboard });
    const ev = new KeyboardEvent("keydown", { key: "v", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(true);
    expect(pasteFromClipboard).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+C ignoré si popup ouverte", () => {
    const div = document.createElement("div");
    const copySelection = vi.fn();
    const h = handlers({ anyPopupOpen: true, copySelection });
    const ev = new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true, ctrlKey: true });
    div.dispatchEvent(ev);
    expect(nodalKeyboardHandleKeyDown(ev, h)).toBe(false);
    expect(copySelection).not.toHaveBeenCalled();
  });
});
