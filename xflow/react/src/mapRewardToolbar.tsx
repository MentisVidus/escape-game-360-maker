import { useCallback } from "react";
import { useReactFlow, type Node } from "@xyflow/react";
import type { EditorLang } from "./mapGraphBuild";
import type { MapRewardTargetKind } from "./mapRewardActionV2";

function stubLabel(kind: MapRewardTargetKind, lang: EditorLang): string {
  if (lang === "en") {
    if (kind === "msg") return "Message";
    if (kind === "scene") return "Scene transition";
    if (kind === "pick") return "Pick";
    return "Selector";
  }
  if (kind === "msg") return "Message";
  if (kind === "scene") return "Transition scène";
  if (kind === "pick") return "Objet (pick)";
  return "Menu (selector)";
}

function newRewardStubId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `rw:${crypto.randomUUID()}`;
  }
  return `rw:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  lang: EditorLang;
  enUi: boolean;
  warnings: string[];
  onAddStub: (node: Node) => void;
};

export function MapRewardToolbar({ lang, enUi, warnings, onAddStub }: Props) {
  const rf = useReactFlow();

  const spawn = useCallback(
    (kind: MapRewardTargetKind) => {
      const p = rf.screenToFlowPosition({
        x: window.innerWidth * 0.55,
        y: window.innerHeight * 0.42,
      });
      const node: Node = {
        id: newRewardStubId(),
        type: "mapRewardTarget",
        position: { x: p.x - 90, y: p.y - 44 },
        draggable: true,
        selectable: true,
        data: {
          kind: "rewardTarget",
          rewardKind: kind,
          label: stubLabel(kind, lang),
          lang,
        },
      };
      onAddStub(node);
    },
    [lang, onAddStub, rf]
  );

  return (
    <div
      className="rf-map-reward-toolbar"
      style={{
        fontSize: 11,
        lineHeight: 1.35,
        maxWidth: 280,
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(15, 23, 42, 0.92)",
        color: "#e2e8f0",
        border: "1px solid rgba(251, 191, 36, 0.35)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#fde68a" }}>
        {enUi ? "Reward targets (map)" : "Cibles récompense (carte)"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {(["msg", "scene", "pick", "selector"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="rf-map-reward-stub-btn"
            onClick={(e) => {
              e.stopPropagation();
              spawn(k);
            }}
          >
            + {stubLabel(k, lang)}
          </button>
        ))}
      </div>
      {warnings.length > 0 ? (
        <div
          style={{
            marginTop: 4,
            paddingTop: 6,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            color: "#fdba74",
          }}
        >
          <strong>{enUi ? "Warnings:" : "Avertissements :"}</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
