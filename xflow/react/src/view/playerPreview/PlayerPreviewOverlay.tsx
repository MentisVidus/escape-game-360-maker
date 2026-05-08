import { useMemo, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";

import type { ActionNodeId } from "../../model/ids";
import type { ActionNode } from "../../model/nodes";
import type { NodalProjectStore } from "../../store/nodalProjectStore";
import { PlayerPopupPreview } from "../popups/PlayerPopupPreview";
import { playerPopupThemeToPlayerOverlayChrome } from "../popups/playerPopupPreviewFromTheme";
import { usePlayerPopupTheme } from "../popups/usePlayerPopupTheme";
import {
  buildPlayerPreviewVariant,
  type PlayerPreviewLocale,
} from "./buildPlayerPreviewVariant";

const CLOSE_ARIA: Record<PlayerPreviewLocale, string> = {
  fr: "Fermer",
  en: "Close",
};

export type PlayerPreviewOverlayProps = {
  actionId: ActionNodeId;
  store: StoreApi<NodalProjectStore>;
  locale: PlayerPreviewLocale;
  onClose: () => void;
};

/**
 * C18.5.1 — Overlay plein écran "comme en jeu" déclenché par un clic
 * read-only sur un hotspot dans `<ScenePreviewModal>`. Réutilise
 * `<PlayerPopupPreview>` (source de vérité visuelle des popups joueur,
 * partagée avec les éditeurs `MsgContentPopup` / `PickContentPopup` /
 * etc.) avec le mode `interactive` activé (boutons cliquables). Aucune
 * mutation du store : la fermeture (clic close, clic backdrop) ne fait
 * que rappeler `onClose`.
 *
 * L'écoute de la touche Échap est portée par le parent
 * `<ScenePreviewModal>` (priorité unique de la chaîne Échap : overlay →
 * resize → drag → selection → fermeture modale).
 *
 * Sous-jalon C18.5.1 : seules **msg** et **pick** sont rendues. Les
 * autres types d'action renvoient `null` via `buildPlayerPreviewVariant`
 * (à compléter en C18.5.2).
 */
export function PlayerPreviewOverlay({ actionId, store, locale, onClose }: PlayerPreviewOverlayProps) {
  const action = useSyncExternalStore<ActionNode | undefined>(
    store.subscribe,
    () => store.getState().actions[actionId],
    () => store.getState().actions[actionId]
  );
  const popupTheme = usePlayerPopupTheme(store);
  const styles = useMemo(() => playerPopupThemeToPlayerOverlayChrome(popupTheme), [popupTheme]);

  const variantSpec = useMemo(() => {
    if (!action) return null;
    return buildPlayerPreviewVariant(action, locale);
  }, [action, locale]);

  if (!action || !variantSpec) return null;

  if (variantSpec.kind === "selector-buttons" || variantSpec.kind === "selector-dropdown") {
    // C18.5.2 — selector multi-niveau : géré dans le sous-jalon suivant.
    // En C18.5.1 on ne devrait pas atteindre cette branche (helper retourne
    // null pour selector), mais on garde une garde défensive.
    return null;
  }

  const variant =
    variantSpec.kind === "button"
      ? { kind: "button" as const, label: variantSpec.buttonLabel }
      : { kind: "input" as const, buttonLabel: variantSpec.buttonLabel };

  return (
    <div className="nodal-player-preview-overlay" data-action-type={action.actionType}>
      <PlayerPopupPreview
        viewportStyle={styles.viewport}
        panelStyle={styles.panel}
        closeBtnStyle={styles.closeBtn}
        buttonStyle={styles.btn}
        closeAriaLabel={CLOSE_ARIA[locale]}
        html={variantSpec.html || "<p><br></p>"}
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
