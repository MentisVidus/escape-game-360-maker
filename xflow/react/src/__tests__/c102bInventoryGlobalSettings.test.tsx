/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import { InventoryGlobalSettingsPopup } from "../view/popups/InventoryGlobalSettingsPopup";

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
  delete (window as Window & { __escape360EditorDomApi?: unknown }).__escape360EditorDomApi;
  delete (window as Window & { EditorSharedNodalToDom?: unknown }).EditorSharedNodalToDom;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe("C10.2.b — InventoryGlobalSettingsPopup", () => {
  it("met à jour inventoryGlobal + flush DOM", () => {
    const store = createNodalProjectStore();
    const flush = vi.fn();
    vi.stubGlobal("EditorSharedBundle", { flushNodalStoreToEditorDom: flush });
    renderTree(<InventoryGlobalSettingsPopup open onClose={() => {}} store={store} />);
    const iconInput = container.querySelector<HTMLInputElement>("#nodal-inv-icon");
    expect(iconInput).toBeTruthy();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(iconInput!, "🧪");
      iconInput!.dispatchEvent(new Event("input", { bubbles: true }));
      iconInput!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(store.getState().meta.settings?.inventoryGlobal?.icon).toBe("🧪");
    expect(flush).toHaveBeenCalled();
  });

  it("cache les champs avancés quand enabled=false", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsInventory({ enabled: false });
    renderTree(<InventoryGlobalSettingsPopup open onClose={() => {}} store={store} />);
    expect(container.querySelector("#nodal-inv-position")).toBeNull();
  });
});

describe("C10.2.b — inventory settings serialize/hydrate", () => {
  it("round-trip meta.settings.inventoryGlobal", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsInventory({
      enabled: true,
      position: "bottom-left",
      icon: "🎯",
      panelBg: "#123456",
      panelBgAlpha: 0.4,
      textColor: "#fedcba",
    });
    const json = serializeToProjectJson(store.getState());
    expect(json.meta?.settings?.inventoryGlobal).toEqual({
      enabled: true,
      position: "bottom-left",
      icon: "🎯",
      panelBg: "#123456",
      panelBgAlpha: 0.4,
      textColor: "#fedcba",
    });
    const hydrated = deserializeFromProjectJson(json);
    expect(hydrated.meta.settings?.inventoryGlobal).toEqual(json.meta?.settings?.inventoryGlobal);
  });
});

describe("C10.2.b — applyFromStore flush vers DOM legacy", () => {
  it("projette inventoryGlobal vers #useInventory/#inv-* + déclenche change", async () => {
    document.body.innerHTML = `
      <div id="scenes-container"></div>
      <input id="useInventory" type="checkbox" />
      <select id="inv-pos"><option value="top-right">x</option><option value="bottom-left">y</option></select>
      <input id="inv-icon" type="text" />
      <input id="inv-bgc" type="color" />
      <input id="inv-bga" type="range" />
      <input id="inv-color" type="color" />
      <div id="inv-settings-container" style="display:flex"></div>
    `;
    const useInventory = document.getElementById("useInventory") as HTMLInputElement;
    const invContainer = document.getElementById("inv-settings-container") as HTMLDivElement;
    useInventory.addEventListener("change", () => {
      invContainer.style.display = useInventory.checked ? "flex" : "none";
    });
    const updatePreview = vi.fn();
    vi.stubGlobal("updatePreview", updatePreview);

    (window as Window & { __escape360EditorDomApi?: unknown }).__escape360EditorDomApi = {
      addScene: () => 1,
      addHotspot: () => 1,
      EditorCore: {},
      actionV2ToLegacyHotspotData: () => ({}),
      refreshAllSceneTargetSelects: () => {},
      initAllSceneIdStableFields: () => {},
      resyncSceneIdCounterFromDom: () => {},
    };
    await import("../../../../js/editor-shared-nodal-to-dom.js");
    const api = (window as Window & { EditorSharedNodalToDom?: { applyFromStore: (storeApi: unknown) => unknown } })
      .EditorSharedNodalToDom;
    expect(api).toBeTruthy();

    api!.applyFromStore({
      getState: () => ({
        meta: {
          title: "X",
          settings: {
            inventoryGlobal: {
              enabled: false,
              position: "bottom-left",
              icon: "🎒",
              panelBg: "#111111",
              panelBgAlpha: 0.3,
              textColor: "#eeeeee",
            },
          },
        },
        scenes: {},
        actions: {},
        satellites: {},
        media: {},
        edges: [],
        layout: {},
      }),
    });

    expect(useInventory.checked).toBe(false);
    expect(invContainer.style.display).toBe("none");
    expect((document.getElementById("inv-pos") as HTMLSelectElement).value).toBe("bottom-left");
    expect((document.getElementById("inv-icon") as HTMLInputElement).value).toBe("🎒");
    expect((document.getElementById("inv-bgc") as HTMLInputElement).value).toBe("#111111");
    expect((document.getElementById("inv-bga") as HTMLInputElement).value).toBe("0.3");
    expect((document.getElementById("inv-color") as HTMLInputElement).value).toBe("#eeeeee");
    expect(updatePreview).toHaveBeenCalled();
  });
});
