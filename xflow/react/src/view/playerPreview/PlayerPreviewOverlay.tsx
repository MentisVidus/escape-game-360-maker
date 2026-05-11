import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { ActionNodeId } from "../../model/ids";
import type { SelectorActionNode } from "../../model/nodes";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PlayerPopupPreview } from "../popups/PlayerPopupPreview";
import { playerPopupThemeToPlayerOverlayChrome } from "../popups/playerPopupPreviewFromTheme";
import { usePlayerPopupTheme } from "../popups/usePlayerPopupTheme";
import {
  buildPlayerPreviewVariant,
  type PlayerPreviewLocale,
} from "./buildPlayerPreviewVariant";
import { rewriteQuillHtmlForPlayerPreview } from "./rewriteQuillHtmlForPlayerPreview";
import { getOrderedSelectorChildActionIds } from "./selectorPreviewChildren";

const CLOSE_ARIA: Record<PlayerPreviewLocale, string> = {
  fr: "Fermer",
  en: "Close",
};

const BACK_LABEL: Record<PlayerPreviewLocale, string> = {
  fr: "← Retour",
  en: "← Back",
};

const SELECTOR_TITLE_FB: Record<PlayerPreviewLocale, string> = {
  fr: "Faites un choix",
  en: "Make a choice",
};

const SELECTOR_CHOICE_PH: Record<PlayerPreviewLocale, string> = {
  fr: "Choix",
  en: "Choice",
};

const SELECTOR_NO_CHILD_CLOSE: Record<PlayerPreviewLocale, string> = {
  fr: "Fermer",
  en: "Close",
};

export type PlayerPreviewOverlayProps = {
  actionId: ActionNodeId;
  store: StoreApi<NodalProjectStore>;
  locale: PlayerPreviewLocale;
  onClose: () => void;
};

type ChromeStyles = ReturnType<typeof playerPopupThemeToPlayerOverlayChrome>;

/**
 * C18.5 — Overlay plein écran "comme en jeu" (read-only hotspot dans
 * `<ScenePreviewModal>`). C18.5.1 msg + pick ; C18.5.2 goto + req +
 * pwd + selector multi-niveau (stack `navStack`) + réécriture HTML
 * images à risque (`rewriteQuillHtmlForPlayerPreview`). Aucune mutation
 * du store.
 */
export function PlayerPreviewOverlay({ actionId, store, locale, onClose }: PlayerPreviewOverlayProps) {
  const [navStack, setNavStack] = useState<ActionNodeId[]>([actionId]);

  useEffect(() => {
    setNavStack([actionId]);
  }, [actionId]);

  const snap = useSyncExternalStore(store.subscribe, () => store.getState(), () => store.getState());

  const currentId = navStack[navStack.length - 1] ?? actionId;
  const action = snap.actions[currentId];
  const popupTheme = usePlayerPopupTheme(store);
  const styles = useMemo(() => playerPopupThemeToPlayerOverlayChrome(popupTheme), [popupTheme]);

  const htmlFor = (raw: string) => rewriteQuillHtmlForPlayerPreview(raw, snap, locale);

  const handlePop = () => {
    setNavStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };

  if (!action) return null;

  const backBtn: ReactNode =
    navStack.length > 1 ? (
      <button type="button" className="nodal-player-preview-back" onClick={handlePop}>
        {BACK_LABEL[locale]}
      </button>
    ) : null;

  if (action.actionType === "selector") {
    return (
      <SelectorPreviewBranch
        selector={action}
        snap={snap}
        locale={locale}
        styles={styles}
        backBtn={backBtn}
        htmlFor={htmlFor}
        onClose={onClose}
        onDrill={(childId) => setNavStack((s) => [...s, childId])}
      />
    );
  }

  const variantSpec = buildPlayerPreviewVariant(action, locale);
  if (!variantSpec) return null;

  if (variantSpec.kind === "selector-buttons" || variantSpec.kind === "selector-dropdown") {
    return null;
  }

  const variant =
    variantSpec.kind === "button"
      ? { kind: "button" as const, label: variantSpec.buttonLabel }
      : { kind: "input" as const, buttonLabel: variantSpec.buttonLabel };

  return (
    <div className="nodal-player-preview-overlay" data-action-type={action.actionType}>
      {backBtn}
      <PlayerPopupPreview
        viewportStyle={styles.viewport}
        panelStyle={styles.panel}
        closeBtnStyle={styles.closeBtn}
        buttonStyle={styles.btn}
        closeAriaLabel={CLOSE_ARIA[locale]}
        html={htmlFor(variantSpec.html) || "<p><br></p>"}
        titleText={variantSpec.titleText}
        variant={variant}
        interactive={{
          onClose,
          onConfirm: onClose,
        }}
        onBackdropClick={onClose}
      />
    </div>
  );
}

function SelectorPreviewBranch({
  selector,
  snap,
  locale,
  styles,
  backBtn,
  htmlFor,
  onClose,
  onDrill,
}: {
  selector: SelectorActionNode;
  snap: ReturnType<StoreApi<NodalProjectStore>["getState"]>;
  locale: PlayerPreviewLocale;
  styles: ChromeStyles;
  backBtn: ReactNode;
  htmlFor: (raw: string) => string;
  onClose: () => void;
  onDrill: (childId: ActionNodeId) => void;
}) {
  const childIds = getOrderedSelectorChildActionIds(snap, selector.id);
  const choicePh = SELECTOR_CHOICE_PH[locale];
  const labels = childIds.map((id, index) => {
    const label = String(snap.actions[id]?.label ?? "").trim();
    return label || `${choicePh} ${index + 1}`;
  });
  const displayMode = selector.payload?.nested?.displayMode === "dropdown" ? "dropdown" : "buttons";
  const titleText =
    String(selector.payload?.nested?.title ?? "").trim() || SELECTOR_TITLE_FB[locale];
  const rawHtml = String(selector.payload?.nested?.copy?.bodyHtml ?? "");
  const html = htmlFor(rawHtml);

  if (childIds.length === 0) {
    return (
      <div
        className="nodal-player-preview-overlay"
        data-action-type="selector"
        data-selector-empty="1"
      >
        {backBtn}
        <PlayerPopupPreview
          viewportStyle={styles.viewport}
          panelStyle={styles.panel}
          closeBtnStyle={styles.closeBtn}
          buttonStyle={styles.btn}
          closeAriaLabel={CLOSE_ARIA[locale]}
          html={html || "<p><br></p>"}
          titleText={titleText}
          variant={{ kind: "button", label: SELECTOR_NO_CHILD_CLOSE[locale] }}
          interactive={{
            onClose,
            onConfirm: onClose,
          }}
          onBackdropClick={onClose}
        />
      </div>
    );
  }

  const variant =
    displayMode === "dropdown"
      ? ({ kind: "selector-dropdown" as const, choices: labels })
      : ({ kind: "selector-buttons" as const, choices: labels });

  return (
    <div className="nodal-player-preview-overlay" data-action-type="selector">
      {backBtn}
      <PlayerPopupPreview
        viewportStyle={styles.viewport}
        panelStyle={styles.panel}
        closeBtnStyle={styles.closeBtn}
        buttonStyle={styles.btn}
        closeAriaLabel={CLOSE_ARIA[locale]}
        html={html || "<p><br></p>"}
        titleText={titleText}
        variant={variant}
        interactive={{
          onClose,
          onChoice: (idx) => {
            const nextId = childIds[idx];
            if (!nextId) return;
            onDrill(nextId);
          },
        }}
        onBackdropClick={onClose}
      />
    </div>
  );
}
