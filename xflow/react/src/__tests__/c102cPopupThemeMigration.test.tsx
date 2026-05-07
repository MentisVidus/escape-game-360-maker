/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

import { createNodalProjectStore } from "../store/nodalProjectStore";
import { serializeToProjectJson } from "../serialize/toProjectJson";
import { deserializeFromProjectJson } from "../serialize/fromProjectJson";
import type { MapLayoutJson } from "../serialize/mapLayoutJson";

describe("C10.2.c — popupTheme meta.settings serialize/hydrate", () => {
  it("round-trip project.json écrit et relit meta.settings.popupTheme", () => {
    const store = createNodalProjectStore();
    store.getState().setMetaSettingsPopupTheme({
      useCustom: true,
      font: "Courier, monospace",
      color: "#eeeeee",
      bg: "#202020",
      bgAlpha: 0.7,
      btnBg: "#112233",
      btnColor: "#445566",
    });
    const json = serializeToProjectJson(store.getState());
    expect(json.meta?.settings?.popupTheme).toEqual({
      useCustom: true,
      font: "Courier, monospace",
      color: "#eeeeee",
      bg: "#202020",
      bgAlpha: 0.7,
      btnBg: "#112233",
      btnColor: "#445566",
    });
    const hydrated = deserializeFromProjectJson(json);
    expect(hydrated.meta.settings?.popupTheme).toEqual(json.meta?.settings?.popupTheme);
  });
});

describe("C10.2.c — hydrate compat legacy nodalPlayerPopupTheme", () => {
  it("hydrateFromProject prend le fallback map-layout si project.json absent", () => {
    const store = createNodalProjectStore();
    const projectJson = {
      schemaVersion: 2 as const,
      title: "T",
      startSceneId: null,
      scenes: [],
    };
    const layoutJson: MapLayoutJson = {
      positions: {},
      parentId: {},
      collapsed: {},
      drafts: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodalPlayerPopupTheme: {
        useCustom: true,
        font: "Impact, fantasy",
        color: "#fafafa",
        bg: "#010203",
        bgAlpha: 0.6,
        btnBg: "#123123",
        btnColor: "#ededed",
      },
    };
    store.getState().hydrateFromProject(projectJson, layoutJson);
    expect(store.getState().meta.settings?.popupTheme).toEqual(layoutJson.nodalPlayerPopupTheme);
  });
});

describe("C10.2.c — flush applyFromStore vers DOM preview", () => {
  it("projette meta.settings.popupTheme vers #pop-* et useCustom", async () => {
    document.body.innerHTML = `
      <div id="scenes-container"></div>
      <input id="useCustomPopup" type="checkbox" />
      <div id="popup-settings-container" style="display:none"></div>
      <select id="pop-font"><option value="Arial, sans-serif">Arial</option><option value="Impact, fantasy">Impact</option></select>
      <input id="pop-color" type="color" />
      <input id="pop-bgc" type="color" />
      <input id="pop-bga" type="range" />
      <input id="pop-btn-bg" type="color" />
      <input id="pop-btn-col" type="color" />
    `;
    const updatePreview = vi.fn();
    const updateQuillTheme = vi.fn();
    vi.stubGlobal("updatePreview", updatePreview);
    vi.stubGlobal("updateQuillTheme", updateQuillTheme);
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
            popupTheme: {
              useCustom: true,
              font: "Impact, fantasy",
              color: "#ffffff",
              bg: "#111111",
              bgAlpha: 0.4,
              btnBg: "#222222",
              btnColor: "#eeeeee",
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
    expect((document.getElementById("useCustomPopup") as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById("popup-settings-container") as HTMLDivElement).style.display).toBe("flex");
    expect((document.getElementById("pop-font") as HTMLSelectElement).value).toBe("Impact, fantasy");
    expect((document.getElementById("pop-color") as HTMLInputElement).value).toBe("#ffffff");
    expect((document.getElementById("pop-bgc") as HTMLInputElement).value).toBe("#111111");
    expect((document.getElementById("pop-bga") as HTMLInputElement).value).toBe("0.4");
    expect((document.getElementById("pop-btn-bg") as HTMLInputElement).value).toBe("#222222");
    expect((document.getElementById("pop-btn-col") as HTMLInputElement).value).toBe("#eeeeee");
    expect(updatePreview).toHaveBeenCalled();
    expect(updateQuillTheme).toHaveBeenCalled();
  });
});
