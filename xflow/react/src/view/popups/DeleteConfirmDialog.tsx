import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** C8.2.2 — dialogue de confirmation aligné sur les autres popups nodales. */
export function DeleteConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      /* Échap : géré globalement par `useNodalKeyboard` + `closeActiveModal` (NodalCanvas). */
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="nodal-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="nodal-delete-confirm-title">
      <div className="nodal-popup-backdrop" onClick={onCancel} />
      <div className="nodal-popup-panel nodal-popup-panel--delete-confirm">
        <h2 id="nodal-delete-confirm-title">{title}</h2>
        <p className="nodal-delete-confirm-body">{body}</p>
        <div className="nodal-popup-actions nodal-popup-actions--split">
          <button ref={cancelRef} type="button" className="nodal-ha-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="nodal-delete-confirm-btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
