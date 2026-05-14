import { beforeEach, vi } from "vitest";

/**
 * C19.2 — jsdom n’implémente pas pause/load sur HTMLAudioElement ; le service
 * audio les enveloppe déjà en try/catch, mais jsdom émet encore des erreurs
 * bruyantes. No-op silencieux pour toute la suite Vitest (fichiers jsdom
 * uniquement — les tests `environment: node` n’ont pas `HTMLAudioElement`).
 */
beforeEach(() => {
  if (typeof HTMLAudioElement === "undefined") return;
  vi.spyOn(HTMLAudioElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLAudioElement.prototype, "load").mockImplementation(() => {});
});
