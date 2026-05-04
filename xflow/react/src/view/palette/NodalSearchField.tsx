import { useReactFlow } from "@xyflow/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type Ref,
} from "react";
import type { StoreApi } from "zustand/vanilla";

import type { AnyNodeId } from "../../model/ids";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { searchNodalNodes } from "./searchNodes";
import "./palette.css";

export type NodalSearchFieldHandle = {
  focus: () => void;
};

type Props = {
  store: StoreApi<NodalProjectStore>;
  locale: "fr" | "en";
};

function centerAndSelect(
  reactFlow: ReturnType<typeof useReactFlow>,
  nodeId: AnyNodeId
): void {
  reactFlow.setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === nodeId })));
  void reactFlow.fitView({
    nodes: [{ id: String(nodeId) }],
    duration: 400,
    maxZoom: 1.5,
  });
}

export const NodalSearchField = forwardRef<NodalSearchFieldHandle, Props>(function NodalSearchField(
  { store, locale }: Props,
  ref: Ref<NodalSearchFieldHandle>
) {
  const reactFlow = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const project = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const hits = useMemo(() => searchNodalNodes(project, query), [project, query]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  /** Changement de requête : premier résultat + centrage (C8.4.1). */
  useEffect(() => {
    const h = searchNodalNodes(store.getState(), query);
    if (h.length === 0) return;
    setCurrentIndex(0);
    centerAndSelect(reactFlow, h[0].nodeId);
  }, [query, reactFlow, store]);

  useEffect(() => {
    if (hits.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((i) => Math.min(i, hits.length - 1));
  }, [hits.length]);

  const labels =
    locale === "en"
      ? {
          placeholder: "Find node…",
          prev: "Previous result",
          next: "Next result",
          counter: (k: number, tot: number) => `${k} / ${tot}`,
          emptyCounter: "0 / 0",
        }
      : {
          placeholder: "Rechercher un nœud…",
          prev: "Résultat précédent",
          next: "Résultat suivant",
          counter: (k: number, tot: number) => `${k} / ${tot}`,
          emptyCounter: "0 / 0",
        };

  const go = useCallback(
    (delta: number) => {
      if (hits.length === 0) return;
      const next = (currentIndex + delta + hits.length) % hits.length;
      setCurrentIndex(next);
      centerAndSelect(reactFlow, hits[next].nodeId);
    },
    [currentIndex, hits, reactFlow]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      go(e.shiftKey ? -1 : 1);
    }
  };

  const k = hits.length === 0 ? 0 : currentIndex + 1;
  const n = hits.length;

  return (
    <div className="nodal-palette-search">
      <div className="nodal-palette-search-row">
        <input
          ref={inputRef}
          type="search"
          className="nodal-palette-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="nodal-palette-search-nav">
          <button
            type="button"
            className="nodal-palette-search-nav-btn"
            disabled={n === 0}
            title={labels.prev}
            aria-label={labels.prev}
            onClick={() => go(-1)}
          >
            ◀
          </button>
          <button
            type="button"
            className="nodal-palette-search-nav-btn"
            disabled={n === 0}
            title={labels.next}
            aria-label={labels.next}
            onClick={() => go(1)}
          >
            ▶
          </button>
        </div>
      </div>
      <div className="nodal-palette-search-meta" aria-live="polite">
        {query.trim() === "" ? "" : n === 0 ? labels.emptyCounter : labels.counter(k, n)}
      </div>
    </div>
  );
});
