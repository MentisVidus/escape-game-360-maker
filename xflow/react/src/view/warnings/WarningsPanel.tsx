import { useEffect, useState } from "react";
import { useReactFlow, type Edge as RFEdge, type Node as RFNode } from "@xyflow/react";

import type { Warning } from "../../store/computeWarnings";
import "./WarningsPanel.css";

type WarningPanelProps = {
  warnings: Warning[];
};

export function WarningsPanel({ warnings }: WarningPanelProps) {
  const reactFlow = useReactFlow<RFNode, RFEdge>();
  const [collapsed, setCollapsed] = useState(warnings.length === 0);

  useEffect(() => {
    if (warnings.length === 0) setCollapsed(true);
  }, [warnings.length]);

  return (
    <aside className="warnings-panel">
      <button
        type="button"
        className="warnings-panel-toggle"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label="Avertissements"
      >
        <span className="warnings-panel-icon">⚠</span>
        {warnings.length > 0 ? <span className="warnings-panel-badge">{warnings.length}</span> : null}
      </button>

      {!collapsed ? (
        <div className="warnings-panel-body">
          {warnings.length === 0 ? (
            <div className="warnings-panel-empty">✓ Aucun probleme</div>
          ) : (
            <ul className="warnings-panel-list">
              {warnings.map((warning, index) => (
                <li key={`${warning.code}-${warning.nodeId}-${index}`}>
                  <button
                    type="button"
                    className="warnings-panel-item"
                    onClick={() =>
                      reactFlow.fitView({
                        nodes: [{ id: warning.nodeId }],
                        duration: 400,
                      })
                    }
                  >
                    {warning.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </aside>
  );
}
