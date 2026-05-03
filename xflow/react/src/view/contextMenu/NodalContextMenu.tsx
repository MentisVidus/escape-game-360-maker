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
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
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
