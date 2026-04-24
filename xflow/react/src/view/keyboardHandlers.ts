import { useEffect } from "react";

function shouldIgnoreDelete(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  return target.isContentEditable;
}

type KeyboardDeleteOptions = {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  removeNode: (id: string) => void;
  disconnect: (id: string) => void;
};

export function useKeyboardHandlers({
  selectedNodeIds,
  selectedEdgeIds,
  removeNode,
  disconnect,
}: KeyboardDeleteOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (shouldIgnoreDelete(event)) return;
      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

      event.preventDefault();
      for (const nodeId of selectedNodeIds) removeNode(nodeId);
      for (const edgeId of selectedEdgeIds) disconnect(edgeId);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeIds, selectedEdgeIds, removeNode, disconnect]);
}

