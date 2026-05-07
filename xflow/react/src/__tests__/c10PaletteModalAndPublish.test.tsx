/** @vitest-environment jsdom */
/**
 * C10.1 — tests Vitest pour la modale partagée palette (`PalettePopupModal`)
 * et la modale Publication (`PublishGamePopup`). Cf. Q-C10.1.x-7.
 *
 * Périmètre :
 *   - (t1) PalettePopupModal : rendu, fermeture clic overlay + clic croix,
 *          focus initial sur le titre, focus restauré à la fermeture.
 *   - (t3) PublishGamePopup : rendu des 3 boutons (HTML, ZIP, Déployer disabled),
 *          chaque clic déclenche le bon handler du pont
 *          `__escape360NodalChrome` (mocké via `vi.stubGlobal`).
 *
 * Hors scope (recette manuelle, journal Annexe D) :
 *   - (t2) Bouton [Publier] de `NodePalette.tsx` (couplé à useReactFlow,
 *          NodalUiContext, et tout le chrome React Flow).
 *   - (t1-bis) Priorité Échap dans `closeActiveModal` (couplé à NodalCanvas
 *              entier).
 *   - Flush nodal → DOM legacy (vit dans `editeur-app.js`, hors React).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { PalettePopupModal } from "../view/palette/PalettePopupModal";
import { PublishGamePopup } from "../view/popups/PublishGamePopup";

/* React 19 — activer le flag act pour `useEffect` synchrone dans les tests jsdom. */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  document.documentElement.lang = "fr";
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function renderTree(node: React.ReactNode) {
  act(() => {
    root.render(node);
  });
}

function clickByText(text: string) {
  const buttons = Array.from(container.querySelectorAll("button"));
  const btn = buttons.find((b) => (b.textContent || "").includes(text));
  if (!btn) throw new Error(`Bouton introuvable : « ${text} »`);
  act(() => {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function clickByAriaLabel(label: string) {
  const btn = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!btn) throw new Error(`Bouton aria-label introuvable : « ${label} »`);
  act(() => {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function backdrop(): HTMLElement {
  const el = container.querySelector<HTMLElement>(".nodal-popup-backdrop");
  if (!el) throw new Error("Overlay backdrop introuvable");
  return el;
}

describe("C10.1 — PalettePopupModal", () => {
  it("isOpen=false ⇒ rien dans le DOM", () => {
    renderTree(
      <PalettePopupModal title="X" isOpen={false} onClose={() => {}}>
        <p>body</p>
      </PalettePopupModal>
    );
    expect(container.querySelector(".nodal-popup-overlay")).toBeNull();
  });

  it("isOpen=true ⇒ titre + body + croix de fermeture rendus", () => {
    renderTree(
      <PalettePopupModal title="Mon titre" isOpen onClose={() => {}}>
        <p>contenu test</p>
      </PalettePopupModal>
    );
    const overlay = container.querySelector(".nodal-popup-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("role")).toBe("dialog");
    expect(overlay?.getAttribute("aria-modal")).toBe("true");
    expect(container.querySelector("h2")?.textContent).toBe("Mon titre");
    expect(container.textContent).toContain("contenu test");
    expect(container.querySelector(".palette-popup-close")).not.toBeNull();
  });

  it("clic backdrop ⇒ onClose appelé", () => {
    const onClose = vi.fn();
    renderTree(
      <PalettePopupModal title="X" isOpen onClose={onClose}>
        <p>body</p>
      </PalettePopupModal>
    );
    act(() => {
      backdrop().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic croix de fermeture ⇒ onClose appelé", () => {
    const onClose = vi.fn();
    renderTree(
      <PalettePopupModal title="X" isOpen onClose={onClose} locale="fr">
        <p>body</p>
      </PalettePopupModal>
    );
    clickByAriaLabel("Fermer");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focus initial sur le titre à l’ouverture", () => {
    renderTree(
      <PalettePopupModal title="Focus me" isOpen onClose={() => {}}>
        <p>body</p>
      </PalettePopupModal>
    );
    const heading = container.querySelector<HTMLHeadingElement>("h2");
    expect(document.activeElement).toBe(heading);
  });

  it("focus restauré à la fermeture (élément précédemment focalisé)", () => {
    /* Élément focalisé avant ouverture. */
    const trigger = document.createElement("button");
    trigger.textContent = "trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    function Wrapper() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            ferme-toi
          </button>
          <PalettePopupModal title="X" isOpen={open} onClose={() => setOpen(false)}>
            <p>body</p>
          </PalettePopupModal>
        </>
      );
    }
    renderTree(<Wrapper />);
    /* Modale ouverte ⇒ titre focalisé. */
    expect(document.activeElement).toBe(container.querySelector("h2"));
    /* Fermeture interne (state) ⇒ effet cleanup → focus restauré. */
    clickByText("ferme-toi");
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it("locale=en ⇒ croix labellisée « Close »", () => {
    document.documentElement.lang = "en";
    renderTree(
      <PalettePopupModal title="X" isOpen onClose={() => {}} locale="en">
        <p>body</p>
      </PalettePopupModal>
    );
    expect(container.querySelector('button[aria-label="Close"]')).not.toBeNull();
  });

  it("footerActions rendu si fourni", () => {
    renderTree(
      <PalettePopupModal
        title="X"
        isOpen
        onClose={() => {}}
        footerActions={<button type="button">action-footer</button>}
      >
        <p>body</p>
      </PalettePopupModal>
    );
    expect(container.querySelector(".nodal-popup-actions")).not.toBeNull();
    expect(container.textContent).toContain("action-footer");
  });

  it("onBack undefined ⇒ pas de bouton Retour (même si footerActions fournis)", () => {
    renderTree(
      <PalettePopupModal
        title="X"
        isOpen
        onClose={() => {}}
        footerActions={<button type="button">action-footer</button>}
      >
        <p>body</p>
      </PalettePopupModal>
    );
    expect(container.querySelector(".nodal-popup-actions-left")).toBeNull();
    expect(container.textContent).toContain("action-footer");
  });

  it("onBack fourni ⇒ bouton Retour affiché à gauche + footerActions à droite", () => {
    renderTree(
      <PalettePopupModal
        title="X"
        isOpen
        onClose={() => {}}
        onBack={() => {}}
        footerActions={<button type="button">action-footer</button>}
      >
        <p>body</p>
      </PalettePopupModal>
    );
    const actions = container.querySelector(".nodal-popup-actions--with-back");
    expect(actions).not.toBeNull();
    expect(container.querySelector(".nodal-popup-actions-left")).not.toBeNull();
    expect(container.querySelector(".nodal-popup-actions-right")?.textContent).toContain("action-footer");
    expect(container.querySelector(".nodal-popup-actions-left")?.textContent).toContain("Retour");
  });

  it("clic bouton Retour ⇒ appelle onBack", () => {
    const onBack = vi.fn();
    renderTree(
      <PalettePopupModal
        title="X"
        isOpen
        onClose={() => {}}
        onBack={onBack}
        footerActions={<button type="button">action-footer</button>}
      >
        <p>body</p>
      </PalettePopupModal>
    );
    const backBtn = container.querySelector(".nodal-popup-actions-left button");
    expect(backBtn).not.toBeNull();
    act(() => {
      backBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("C10.1 — PublishGamePopup", () => {
  it("open=false ⇒ rien dans le DOM", () => {
    renderTree(<PublishGamePopup open={false} onClose={() => {}} />);
    expect(container.querySelector(".nodal-popup-overlay")).toBeNull();
  });

  it("open=true (FR) ⇒ titre, hint, 3 boutons rendus", () => {
    renderTree(<PublishGamePopup open onClose={() => {}} />);
    expect(container.querySelector("h2")?.textContent).toBe("Publication du jeu");
    expect(container.textContent).toContain("Choisissez un format");
    expect(container.textContent).toContain("HTML autonome");
    expect(container.textContent).toContain("ZIP web hors-ligne");
    expect(container.textContent).toContain("Déployer");
  });

  it("bouton « Déployer » est disabled avec tooltip explicite", () => {
    renderTree(<PublishGamePopup open onClose={() => {}} />);
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button.nodal-publish-btn"));
    const deploy = buttons.find((b) => (b.textContent || "").includes("Déployer"));
    expect(deploy).toBeDefined();
    expect(deploy?.disabled).toBe(true);
    expect(deploy?.title).toBe("Disponible avec C11");
  });

  it("clic « HTML autonome » ⇒ __escape360NodalChrome.generateGameHtml()", () => {
    const generateGameHtml = vi.fn();
    const exportGameWebZip = vi.fn(() => Promise.resolve());
    vi.stubGlobal("__escape360NodalChrome", {
      saveEscapegameBundle: vi.fn(),
      flushThenSaveJson: vi.fn(),
      flushThenLocalDraftSnapshot: vi.fn().mockResolvedValue(undefined),
      triggerLoadEscapegame: vi.fn(),
      closeProjectMapModal: vi.fn(),
      generateGameHtml,
      exportGameWebZip,
    });
    renderTree(<PublishGamePopup open onClose={() => {}} />);
    clickByText("HTML autonome");
    expect(generateGameHtml).toHaveBeenCalledTimes(1);
    expect(exportGameWebZip).not.toHaveBeenCalled();
  });

  it("clic « ZIP web hors-ligne » ⇒ __escape360NodalChrome.exportGameWebZip()", async () => {
    const generateGameHtml = vi.fn();
    let resolveZip: () => void = () => {};
    const exportGameWebZip = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveZip = res;
        })
    );
    vi.stubGlobal("__escape360NodalChrome", {
      saveEscapegameBundle: vi.fn(),
      flushThenSaveJson: vi.fn(),
      flushThenLocalDraftSnapshot: vi.fn().mockResolvedValue(undefined),
      triggerLoadEscapegame: vi.fn(),
      closeProjectMapModal: vi.fn(),
      generateGameHtml,
      exportGameWebZip,
    });
    renderTree(<PublishGamePopup open onClose={() => {}} />);
    clickByText("ZIP web hors-ligne");
    expect(exportGameWebZip).toHaveBeenCalledTimes(1);
    /* Pendant l’export : tous les boutons publish sont disabled (busy state Q-C10.1.x-6 β). */
    const publishBtns = container.querySelectorAll<HTMLButtonElement>(".nodal-publish-btn");
    expect(Array.from(publishBtns).every((b) => b.disabled)).toBe(true);
    /* Résolution promesse ⇒ busy=false. */
    await act(async () => {
      resolveZip();
      await Promise.resolve();
    });
    const standalone = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".nodal-publish-btn")
    ).find((b) => (b.textContent || "").includes("HTML autonome"));
    expect(standalone?.disabled).toBe(false);
  });

  it("alerte si __escape360NodalChrome absent (pont non prêt)", () => {
    vi.stubGlobal("__escape360NodalChrome", undefined);
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);
    renderTree(<PublishGamePopup open onClose={() => {}} />);
    clickByText("HTML autonome");
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const msg = String(alertSpy.mock.calls[0][0] ?? "");
    expect(msg).toContain("Pont éditeur");
  });
});
