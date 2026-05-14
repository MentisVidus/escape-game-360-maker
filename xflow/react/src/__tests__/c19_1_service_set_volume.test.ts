/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAudioChannelsService,
  resetAudioChannelsServiceForTests,
} from "../services/audioChannelsService";

afterEach(() => {
  resetAudioChannelsServiceForTests();
});

describe("c19_1_service_set_volume", () => {
  it("setVolume met à jour audio.volume sur le canal", () => {
    const svc = getAudioChannelsService();
    vi.spyOn(HTMLAudioElement.prototype, "play").mockResolvedValue(undefined as never);
    svc.play("sfx", "https://a.test/s.mp3", { volume: 0.2 });
    const el = document.querySelector("audio") as HTMLAudioElement;
    expect(el).toBeTruthy();
    svc.setVolume("sfx", 0.9);
    expect(el.volume).toBeCloseTo(0.9, 5);
  });
});
