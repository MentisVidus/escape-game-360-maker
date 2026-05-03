import { describe, expect, it } from "vitest";

import { asActionNodeId } from "../model/ids";
import type { ActionNode } from "../model/nodes";
import { createNodalProjectStore } from "../store/nodalProjectStore";
import { computeContainerBounds } from "../view/nesting/containerBounds";

const sfx = { url: "", volume: 1 };
const visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };

function makeSelector(id: string, label: string): ActionNode {
  return {
    id: asActionNodeId(id),
    nodeType: "action",
    actionType: "selector",
    label,
    payload: {
      nested: { title: label, copy: { bodyHtml: "", buttonLabel: "" }, displayMode: "buttons" },
    },
    sfx: { ...sfx },
    visibility: { ...visibility },
  };
}

describe("C8.6.2 — auto-resize selector", () => {
  it("attachChild : enfant déborde la boîte fixe → width/height retirés (taille auto)", () => {
    const store = createNodalProjectStore();
    const s = store.getState();
    const sel = makeSelector("act-c862-sel-grow", "S");
    const msg: ActionNode = {
      id: asActionNodeId("act-c862-msg-grow"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    s.addAction(sel, { x: 0, y: 0, width: 180, height: 80, collapsed: false });
    s.addAction(msg, { x: 300, y: 10 });
    s.attachChild(sel.id, msg.id);

    const lo = store.getState().layout[sel.id];
    expect(lo?.width).toBeUndefined();
    expect(lo?.height).toBeUndefined();
  });

  it("detachChild : selector surdimensionné vs contenu → reset taille auto", () => {
    const store = createNodalProjectStore();
    const s = store.getState();
    const sel = makeSelector("act-c862-sel-shrink", "S");
    const msg: ActionNode = {
      id: asActionNodeId("act-c862-msg-shrink"),
      nodeType: "action",
      actionType: "msg",
      label: "M",
      payload: { copy: { bodyHtml: "x", buttonLabel: "OK" } },
      sfx: { ...sfx },
      visibility: { ...visibility },
    };
    s.addAction(sel, { x: 0, y: 0, width: 500, height: 400, collapsed: false });
    s.addAction(msg, { x: 20, y: 20 });
    s.attachChild(sel.id, msg.id);
    s.detachChild(msg.id, { x: 2000, y: 2000 });

    const lo = store.getState().layout[sel.id];
    expect(lo?.width).toBeUndefined();
    expect(lo?.height).toBeUndefined();
    const b = computeContainerBounds(store.getState(), sel.id);
    expect(b.width).toBeLessThan(500);
  });
});
