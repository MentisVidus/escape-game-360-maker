/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAudioChannelsService,
  resetAudioChannelsServiceForTests,
} from "../services/audioChannelsService";

afterEach(() => {
  resetAudioChannelsServiceForTests();
});

describe("c19_1_service_replace_in_channel", () => {
  it("play sur global écrase uniquement global, ambient inchangé", () => {
    const svc = getAudioChannelsService();
    vi.spyOn(HTMLAudioElement.prototype, "play").mockResolvedValue(undefined as never);
    svc.play("global", "https://a.test/1.mp3", { volume: 1 });
    svc.play("ambient", "https://a.test/amb.mp3", { volume: 1 });
    svc.play("global", "https://a.test/2.mp3", { volume: 0.8 });
    expect(svc.getState("global").currentSrc).toContain("2.mp3");
    expect(svc.getState("ambient").currentSrc).toContain("amb.mp3");
  });
});
