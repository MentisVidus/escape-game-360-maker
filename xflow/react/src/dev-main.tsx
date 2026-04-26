import "@xyflow/react/dist/style.css";
import { StrictMode, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { StoreApi } from "zustand/vanilla";

import { markNodalDraftSynchronized, useNodalAutoSave } from "./persistence/useNodalAutoSave";
import { exportProjectEscapegameZip, importProjectEscapegameZip } from "./persistence/zipBundle";
import type { NodalProjectStore } from "./store/nodalProjectStore";
import { NodalCanvas } from "./view/NodalCanvas";
import { createDemoStore } from "./view/demoProject";

function DevToolbar({ store }: { store: StoreApi<NodalProjectStore> }) {
  const draftManager = useNodalAutoSave(store);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const state = store.getState();
    const blob = exportProjectEscapegameZip(state);
    const base = (state.meta.title || "escape-game").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 80) || "escape-game";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.escapegame`;
    a.click();
    URL.revokeObjectURL(a.href);
    void markNodalDraftSynchronized(draftManager.current);
  }

  async function onPickFile(file: File) {
    const buf = await file.arrayBuffer();
    const { projectJson, layoutJson } = importProjectEscapegameZip(buf);
    store.getState().hydrateFromProject(projectJson, layoutJson);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 1000,
        display: "flex",
        gap: 8,
        alignItems: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button type="button" onClick={handleExport}>
        Exporter .escapegame
      </button>
      <button type="button" onClick={() => fileRef.current?.click()}>
        Importer…
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".escapegame,.zip,application/zip"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const rootEl = document.getElementById("app");
if (!rootEl) throw new Error("Missing #app root element");

const store = createDemoStore();
createRoot(rootEl).render(
  <StrictMode>
    <DevToolbar store={store} />
    <NodalCanvas store={store} />
  </StrictMode>
);
