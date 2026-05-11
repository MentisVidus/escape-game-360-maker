import type { MediaNodeId, SceneNodeId } from "../../model/ids";
import type { ActionNode, ActionSfx } from "../../model/nodes";
import type { NodalProject } from "../../model/project";

/**
 * C18.5.3 — Petit contrôleur audio dédié à l'aperçu joueur dans la carte
 * nodale (`<ScenePreviewModal>` + `<PlayerPreviewOverlay>`). Calqué (en
 * minimaliste) sur `audioSys` du runtime joueur `editeur-generate.js`
 * lignes ~1620-1730 mais sans bus de mixage global ni gain musique : seuls
 * deux canaux suffisent ici car la preview ne joue jamais simultanément
 * musique + ambiance + SFX comme un vrai play.
 *
 * - **Canal SFX** : monoflux ; chaque appel à `playSfx()` coupe le SFX
 *   précédent (équivalent runtime `audioSys.stopSFX()` avant chaque
 *   `playSFX()`).
 * - **Canal ambiance** : loop ; `playAmbiance()` est idempotent — réappelle
 *   avec la même URL = no-op (évite de relancer la lecture à chaque
 *   re-render React).
 *
 * Aucune intégration au mixage `audioGlobal` (master/music/ambiance/sfx) :
 * la preview est volontairement isolée des réglages joueur. Volume passé
 * tel quel (borné [0..1]).
 */
export class PreviewAudioController {
  private sfxAudio: HTMLAudioElement | null = null;
  private ambianceAudio: HTMLAudioElement | null = null;
  private ambianceUrl: string = "";

  playSfx(url: string, volume: number = 1): void {
    this.stopSfx();
    const trimmed = String(url ?? "").trim();
    if (!trimmed) return;
    try {
      const audio = new Audio(trimmed);
      audio.volume = clamp01(volume);
      this.sfxAudio = audio;
      // C18.5.3 — autoplay peut être bloqué (politique navigateur) tant
      // que l'utilisateur n'a pas interagi avec la page. Ici le SFX est
      // toujours déclenché par un clic utilisateur sur un hotspot ou un
      // choix selector, donc la lecture devrait toujours passer.
      void audio.play().catch(() => undefined);
    } catch {
      this.sfxAudio = null;
    }
  }

  stopSfx(): void {
    if (!this.sfxAudio) return;
    try {
      this.sfxAudio.pause();
      this.sfxAudio.src = "";
    } catch {
      // ignore
    }
    this.sfxAudio = null;
  }

  /**
   * Démarre (ou continue) la lecture d'une boucle ambiance. Idempotent
   * sur l'URL : si la même piste est déjà en cours, on ne touche rien
   * (sinon la lecture saute à zéro à chaque re-render React de la modale).
   */
  playAmbiance(url: string, volume: number = 1): void {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) {
      this.stopAmbiance();
      return;
    }
    if (this.ambianceAudio && this.ambianceUrl === trimmed) {
      this.ambianceAudio.volume = clamp01(volume);
      return;
    }
    this.stopAmbiance();
    try {
      const audio = new Audio(trimmed);
      audio.loop = true;
      audio.volume = clamp01(volume);
      this.ambianceAudio = audio;
      this.ambianceUrl = trimmed;
      void audio.play().catch(() => undefined);
    } catch {
      this.ambianceAudio = null;
      this.ambianceUrl = "";
    }
  }

  stopAmbiance(): void {
    if (!this.ambianceAudio) {
      this.ambianceUrl = "";
      return;
    }
    try {
      this.ambianceAudio.pause();
      this.ambianceAudio.src = "";
    } catch {
      // ignore
    }
    this.ambianceAudio = null;
    this.ambianceUrl = "";
  }

  destroy(): void {
    this.stopSfx();
    this.stopAmbiance();
  }
}

function clamp01(v: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 1;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Récupère l'ambiance scène = premier `MediaAudioNode` lié à la scène
 * par une edge `meta` (scène → média). Cohérent avec
 * `resolveScenePanoramaDisplayUrl` (même pattern). Retourne `null` si
 * pas de média audio relié ou URL vide.
 */
export function resolveSceneAmbiance(
  state: NodalProject,
  sceneId: SceneNodeId
): { url: string; volume: number } | null {
  for (const e of state.edges) {
    if (e.family !== "meta" || e.sourceId !== sceneId) continue;
    const tid = e.targetId as MediaNodeId;
    const m = state.media[tid];
    if (!m || m.mediaType !== "media-audio") continue;
    const url = String(m.data.url ?? "").trim();
    if (!url) continue;
    const volume = typeof m.data.volume === "number" ? m.data.volume : 1;
    return { url, volume };
  }
  return null;
}

/**
 * SFX d'une action : source canonique `action.sfx` (cohérent avec la
 * sérialisation `toProjectJson` qui sérialise `action.sfx` directement,
 * pas le satellite coords-options). Retourne `null` si l'URL est vide
 * (cas le plus fréquent : la majorité des actions n'ont pas de SFX).
 */
export function resolveActionSfx(action: ActionNode): { url: string; volume: number } | null {
  const sfx: ActionSfx | undefined = action?.sfx;
  if (!sfx) return null;
  const url = String(sfx.url ?? "").trim();
  if (!url) return null;
  const volume = typeof sfx.volume === "number" ? sfx.volume : 1;
  return { url, volume };
}
