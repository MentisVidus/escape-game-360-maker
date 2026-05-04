/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import { isEditingContext } from "../../view/keyboard/isEditingContext";

describe("isEditingContext", () => {
  it("retourne true pour input", () => {
    const el = document.createElement("input");
    expect(isEditingContext(el)).toBe(true);
  });

  it("retourne true pour textarea", () => {
    const el = document.createElement("textarea");
    expect(isEditingContext(el)).toBe(true);
  });

  it("retourne true pour select", () => {
    const el = document.createElement("select");
    expect(isEditingContext(el)).toBe(true);
  });

  it("retourne true pour contenteditable (ex. .ql-editor)", () => {
    const el = document.createElement("div");
    // jsdom : `contenteditable` n’alimente pas toujours `isContentEditable` ; on force le getter comme en navigateur.
    Object.defineProperty(el, "isContentEditable", {
      configurable: true,
      get: () => true,
    });
    expect(isEditingContext(el)).toBe(true);
  });

  it("retourne false pour une div standard", () => {
    const el = document.createElement("div");
    expect(isEditingContext(el)).toBe(false);
  });

  it("retourne false pour un bouton", () => {
    const el = document.createElement("button");
    expect(isEditingContext(el)).toBe(false);
  });
});
