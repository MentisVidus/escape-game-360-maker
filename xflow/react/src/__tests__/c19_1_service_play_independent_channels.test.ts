/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAudioChannelsService,
  resetAudioChannelsServiceForTests,
} from "../services/audioChannelsService";

afterEach(() => {
  resetAudioChannelsServiceForTests();
});

describe("c19_1_service_play_independent_channels", () => {
  it("play global + ambient laissent les deux canaux actifs", () => {
    const svc = getAudioChannelsService();
    const play = vi.spyOn(HTMLAudioElement.prototype, "play").mockResolvedValue(undefined as never);
    svc.play("global", "https://a.test/g.mp3", { volume: 0.5 });
    svc.play("ambient", "https://a.test/a.mp3", { volume: 0.7 });
    expect(svc.getState("global").currentSrc).toContain("g.mp3");
    expect(svc.getState("ambient").currentSrc).toContain("a.mp3");
    expect(svc.getState("global").isPlaying).toBe(true);
    expect(svc.getState("ambient").isPlaying).toBe(true);
    play.mockRestore();
  });
});
