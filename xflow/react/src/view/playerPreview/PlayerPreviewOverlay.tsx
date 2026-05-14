import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { ActionNodeId, SceneNodeId } from "../../model/ids";
import { resolveGotoTargetSceneId } from "../../model/resolveGotoTargetSceneId";
import type { SelectorActionNode } from "../../model/nodes";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PlayerPopupPreview } from "../popups/PlayerPopupPreview";
import { playerPopupThemeToPlayerOverlayChrome } from "../popups/playerPopupPreviewFromTheme";
import { usePlayerPopupTheme } from "../popups/usePlayerPopupTheme";
import {
  buildPlayerPreviewVariant,
  type PlayerPreviewLocale,
} from "./buildPlayerPreviewVariant";
import { resolveActionSfxPlayOpts } from "./playerPreviewAudio";
import { rewriteQuillHtmlForPlayerPreview } from "./rewriteQuillHtmlForPlayerPreview";
import { getOrderedSelectorChildActionIds } from "./selectorPreviewChildren";

const CLOSE_ARIA: Record<PlayerPreviewLocale, string> = {
  fr: "Fermer",
  en: "Close",
};

/**
 * C18.5.2-fix — libellé du bouton « ← Retour » aligné sur runtime joueur
 * (`editeur-generate.js` ligne ~2286). Passé en prop à `<PlayerPopupPreview>`
 * via `backLabel`. Le bouton est rendu **à l'intérieur du panel** (top bar
 * gauche), comme dans le runtime — pas en overlay externe.
 */
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

/**
 * C18.5.3 — badge discret « Aperçu interactif » affiché au-dessus du panel
 * pour distinguer visuellement l'aperçu vs l'édition (data-attribut
 * `data-player-preview="1"` était déjà présent mais sans affordance
 * visuelle). Rendu côté wrapper overlay, `pointer-events: none` pour ne
 * pas bloquer le clic backdrop.
 */
const PREVIEW_BADGE_LABEL: Record<PlayerPreviewLocale, string> = {
  fr: "Aperçu interactif (lecture seule)",
  en: "Interactive preview (read-only)",
};

export type PlayerPreviewOverlayProps = {
  actionId: ActionNodeId;
  store: StoreApi<NodalProjectStore>;
  locale: PlayerPreviewLocale;
  onClose: () => void;
  /**
   * C18.5.3 — callback déclenché à chaque clic d'un choix selector pour
   * jouer le SFX de l'action enfant (alignement runtime joueur
   * `runSelectorChoice` qui appelle `audioSys.playSFX(choice.sfxUrl,
   * choice.sfxVolume)` avant le drill ou l'exécution). Le SFX initial
   * du hotspot (au moment où la popup s'ouvre) est joué par
   * `<ScenePreviewModal>` directement via le useEffect
   * `playerPreviewActionId`.
   */
  onPlaySfx?: (url: string, volume: number, nodeId?: string) => void;
  /**
   * C19.2-fix — au confirm d’une action `goto` en preview interactif,
   * navigation vers la scène cible (arête `transition`).
   */
  onGotoTransition?: (targetSceneId: SceneNodeId) => void;
};

type ChromeStyles = ReturnType<typeof playerPopupThemeToPlayerOverlayChrome>;

/**
 * C18.5 — Overlay plein écran "comme en jeu" (read-only hotspot dans
 * `<ScenePreviewModal>`). C18.5.1 msg + pick ; C18.5.2 goto + req +
 * pwd + selector multi-niveau (stack `navStack`) + réécriture HTML
 * images à risque (`rewriteQuillHtmlForPlayerPreview`). Aucune mutation
 * du store.
 */
export function PlayerPreviewOverlay({
  actionId,
  store,
  locale,
  onClose,
  onPlaySfx,
  onGotoTransition,
}: PlayerPreviewOverlayProps) {
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

  // C18.5.2-fix — bouton retour rendu **dans le panel** (via prop `onBack`
  // de `<PlayerPopupPreview>`). `undefined` au niveau racine ⇒ pas de
  // bouton (comportement runtime joueur : top bar absent sur la racine).
  const onBack = navStack.length > 1 ? handlePop : undefined;
  const backLabel = BACK_LABEL[locale];

  const badge = <PreviewBadge label={PREVIEW_BADGE_LABEL[locale]} />;

  if (action.actionType === "selector") {
    return (
      <SelectorPreviewBranch
        selector={action}
        snap={snap}
        locale={locale}
        styles={styles}
        onBack={onBack}
        backLabel={backLabel}
        badge={badge}
        htmlFor={htmlFor}
        onClose={onClose}
        onDrill={(childId) => {
          // C18.5.3 — joue le SFX du choix avant de descendre. Le runtime
          // joueur le fait dans `runSelectorChoice` (`audioSys.playSFX`).
          if (onPlaySfx) {
            const child = snap.actions[childId];
            if (child) {
              const sfx = resolveActionSfxPlayOpts(snap, child);
              if (sfx) onPlaySfx(sfx.url, sfx.volume, sfx.nodeId);
            }
          }
          setNavStack((s) => [...s, childId]);
        }}
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

  const onConfirmTerminal =
    action.actionType === "goto" && onGotoTransition
      ? () => {
          const target = resolveGotoTargetSceneId(snap, action.id);
          if (target) {
            onGotoTransition(target);
          }
          onClose();
        }
      : onClose;

  return (
    <div className="nodal-player-preview-overlay" data-action-type={action.actionType}>
      {badge}
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
          onConfirm: onConfirmTerminal,
        }}
        onBackdropClick={onClose}
        onBack={onBack}
        backLabel={backLabel}
      />
    </div>
  );
}

function PreviewBadge({ label }: { label: string }) {
  return (
    <div
      className="nodal-player-preview-badge"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10051,
        pointerEvents: "none",
        padding: "6px 14px",
        borderRadius: 4,
        background: "rgba(0, 0, 0, 0.55)",
        color: "#ffffff",
        font: "13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </div>
  );
}

function SelectorPreviewBranch({
  selector,
  snap,
  locale,
  styles,
  onBack,
  backLabel,
  badge,
  htmlFor,
  onClose,
  onDrill,
}: {
  selector: SelectorActionNode;
  snap: ReturnType<StoreApi<NodalProjectStore>["getState"]>;
  locale: PlayerPreviewLocale;
  styles: ChromeStyles;
  onBack: (() => void) | undefined;
  backLabel: string;
  badge: import("react").ReactNode;
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
        {badge}
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
          onBack={onBack}
          backLabel={backLabel}
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
      {badge}
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
        onBack={onBack}
        backLabel={backLabel}
      />
    </div>
  );
}
