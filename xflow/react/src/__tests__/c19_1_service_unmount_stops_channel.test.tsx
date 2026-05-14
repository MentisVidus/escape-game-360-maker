/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  getAudioChannelsService,
  resetAudioChannelsServiceForTests,
} from "../services/audioChannelsService";
import { AudioPreviewButton } from "../view/components/AudioPreviewButton";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => {
    root.unmount();
  });
  resetAudioChannelsServiceForTests();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

function renderTree(node: ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe("c19_1_service_unmount_stops_channel", () => {
  it("unmount AudioPreviewButton appelle stop sur son canal uniquement", () => {
    vi.spyOn(HTMLAudioElement.prototype, "play").mockResolvedValue(undefined as never);
    const svc = getAudioChannelsService();
    svc.play("ambient", "https://x.test/keep.mp3", { volume: 1 });

    renderTree(<AudioPreviewButton url="https://x.test/sfx.mp3" channel="sfx" volume={1} />);
    const btn = container.querySelector("button");
    expect(btn).toBeTruthy();
    act(() => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(svc.getState("sfx").currentSrc).toContain("sfx.mp3");

    act(() => {
      root.render(null);
    });

    expect(svc.getState("sfx").currentSrc).toBeNull();
    expect(svc.getState("ambient").currentSrc).toContain("keep.mp3");
  });
});
