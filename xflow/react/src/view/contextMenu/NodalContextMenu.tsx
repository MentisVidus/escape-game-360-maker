import { useEffect, useRef } from "react";

import type { NodalContextMenuAction, NodalContextMenuItem } from "./nodalContextMenuModel";
import "./NodalContextMenu.css";

type Props = {
  items: NodalContextMenuItem[];
  position: { x: number; y: number };
  onSelect: (action: NodalContextMenuAction) => void;
  onClose: () => void;
};

export function NodalContextMenu({ items, position, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* Capture : React Flow stoppe souvent le bubbling du clic gauche sur le canvas — sans capture,
     * le `mousedown` n’atteint pas `document` et le menu reste ouvert. */
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      className="nodal-context-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {items.map((it, index) => (
        <button
          key={`${it.action}-${index}`}
          type="button"
          role="menuitem"
          className={`nodal-context-menu__item${it.disabled ? " nodal-context-menu__item--disabled" : ""}${it.action === "delete" ? " nodal-context-menu__item--danger" : ""}`}
          disabled={it.disabled}
          onClick={() => {
            if (!it.disabled) onSelect(it.action);
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
