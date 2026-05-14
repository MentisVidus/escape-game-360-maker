import type { MediaNodeId } from "../model/ids";
import type { NodalProject } from "../model/project";

export type AudioChannel = "global" | "ambient" | "sfx";

export interface AudioChannelState {
  isPlaying: boolean;
  /** Élément en pause avec `src` encore chargé — permet ▶/⏸ sans perdre la position. */
  readyToResume: boolean;
  currentSrc: string | null;
  progress: number;
  error: string | null;
  lastSfx: { url: string; nodeId: string; volume: number } | null;
}

export interface AudioChannelsService {
  play(channel: AudioChannel, url: string, opts: { volume: number; nodeId?: string }): void;
  pause(channel: AudioChannel): void;
  resume(channel: AudioChannel): void;
  stop(channel: AudioChannel): void;
  stopAll(opts?: { clearLastSfx?: boolean }): void;
  setVolume(channel: AudioChannel, volume: number): void;
  subscribe(channel: AudioChannel, listener: (state: AudioChannelState) => void): () => void;
  getState(channel: AudioChannel): AudioChannelState;
}

const AUDIO_ERR = "Audio non chargé";

function clamp01(v: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 1;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function strictCleanup(el: HTMLAudioElement | null): void {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute("src");
    try {
      el.load();
    } catch {
      // jsdom : load() non implémenté
    }
  } catch {
    // ignore
  }
  if (el.parentNode) el.parentNode.removeChild(el);
}

function defaultState(): AudioChannelState {
  return {
    isPlaying: false,
    readyToResume: false,
    currentSrc: null,
    progress: 0,
    error: null,
    lastSfx: null,
  };
}

/**
 * Canal média-audio nodal : parent = scène (edge meta) → ambiance ;
 * parent = action → SFX. Orphelin → `ambient` (innocu, pas auto-déclenché).
 */
export function getMediaAudioChannel(state: NodalProject, mediaNodeId: MediaNodeId): "ambient" | "sfx" {
  const edge = state.edges.find((e) => e.family === "meta" && e.targetId === mediaNodeId);
  if (!edge) return "ambient";
  if (edge.sourceId in state.scenes) return "ambient";
  if (edge.sourceId in state.actions) return "sfx";
  return "ambient";
}

class AudioChannelsServiceImpl implements AudioChannelsService {
  private readonly audio: Record<AudioChannel, HTMLAudioElement | null> = {
    global: null,
    ambient: null,
    sfx: null,
  };

  private readonly state: Record<AudioChannel, AudioChannelState> = {
    global: defaultState(),
    ambient: defaultState(),
    sfx: defaultState(),
  };

  private readonly listeners: Record<AudioChannel, Set<(s: AudioChannelState) => void>> = {
    global: new Set(),
    ambient: new Set(),
    sfx: new Set(),
  };

  private readonly onTimeUpdate: Record<AudioChannel, () => void> = {
    global: () => this.tick("global"),
    ambient: () => this.tick("ambient"),
    sfx: () => this.tick("sfx"),
  };

  private readonly onEnded: Record<AudioChannel, () => void> = {
    global: () => this.onEndedCh("global"),
    ambient: () => this.onEndedCh("ambient"),
    sfx: () => this.onEndedCh("sfx"),
  };

  private readonly onError: Record<AudioChannel, () => void> = {
    global: () => this.onErrorCh("global"),
    ambient: () => this.onErrorCh("ambient"),
    sfx: () => this.onErrorCh("sfx"),
  };

  private ensureEl(channel: AudioChannel): HTMLAudioElement {
    if (typeof document === "undefined") {
      throw new Error("audioChannelsService: document indisponible");
    }
    let el = this.audio[channel];
    if (!el) {
      el = document.createElement("audio");
      el.preload = "auto";
      el.setAttribute("data-escape360-audio-channel", channel);
      el.style.display = "none";
      document.body.appendChild(el);
      const loop = channel === "global" || channel === "ambient";
      el.loop = loop;
      el.addEventListener("timeupdate", this.onTimeUpdate[channel]);
      el.addEventListener("ended", this.onEnded[channel]);
      el.addEventListener("error", this.onError[channel]);
      this.audio[channel] = el;
    }
    return el;
  }

  private detachListeners(el: HTMLAudioElement, channel: AudioChannel): void {
    el.removeEventListener("timeupdate", this.onTimeUpdate[channel]);
    el.removeEventListener("ended", this.onEnded[channel]);
    el.removeEventListener("error", this.onError[channel]);
  }

  private emit(channel: AudioChannel): void {
    const snap = this.snapshot(channel);
    for (const fn of this.listeners[channel]) {
      try {
        fn(snap);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  private snapshot(channel: AudioChannel): AudioChannelState {
    const s = this.state[channel];
    const el = this.audio[channel];
    const readyToResume = !!(el && el.paused && s.currentSrc);
    return {
      isPlaying: s.isPlaying,
      readyToResume,
      currentSrc: s.currentSrc,
      progress: s.progress,
      error: s.error,
      lastSfx: channel === "sfx" ? s.lastSfx : null,
    };
  }

  private tick(channel: AudioChannel): void {
    const el = this.audio[channel];
    const st = this.state[channel];
    if (!el || !st.currentSrc) return;
    const d = el.duration;
    st.progress = Number.isFinite(d) && d > 0 ? el.currentTime / d : 0;
    this.emit(channel);
  }

  private onEndedCh(channel: AudioChannel): void {
    const st = this.state[channel];
    st.isPlaying = false;
    st.readyToResume = false;
    st.progress = 0;
    this.emit(channel);
  }

  private onErrorCh(channel: AudioChannel): void {
    const st = this.state[channel];
    st.error = AUDIO_ERR;
    st.isPlaying = false;
    this.emit(channel);
  }

  getState(channel: AudioChannel): AudioChannelState {
    return this.snapshot(channel);
  }

  subscribe(channel: AudioChannel, listener: (state: AudioChannelState) => void): () => void {
    this.listeners[channel].add(listener);
    listener(this.snapshot(channel));
    return () => {
      this.listeners[channel].delete(listener);
    };
  }

  setVolume(channel: AudioChannel, volume: number): void {
    const el = this.audio[channel];
    const v = clamp01(volume);
    if (el) el.volume = v;
    if (channel === "sfx" && this.state.sfx.lastSfx) {
      const ls = this.state.sfx.lastSfx;
      this.state.sfx.lastSfx = { ...ls, volume: v };
    }
    this.emit(channel);
  }

  pause(channel: AudioChannel): void {
    const el = this.audio[channel];
    if (!el) return;
    try {
      el.pause();
    } catch {
      // ignore
    }
    const st = this.state[channel];
    st.isPlaying = false;
    st.readyToResume = true;
    this.emit(channel);
  }

  resume(channel: AudioChannel): void {
    const el = this.audio[channel];
    const st = this.state[channel];
    if (!el || !st.currentSrc) return;
    void el.play().catch(() => undefined);
    st.isPlaying = true;
    st.readyToResume = false;
    this.emit(channel);
  }

  stop(channel: AudioChannel): void {
    const el = this.audio[channel];
    if (el) {
      strictCleanup(el);
      this.detachListeners(el, channel);
      this.audio[channel] = null;
    }
    const st = this.state[channel];
    st.isPlaying = false;
    st.readyToResume = false;
    st.currentSrc = null;
    st.progress = 0;
    st.error = null;
    this.emit(channel);
  }

  stopAll(opts?: { clearLastSfx?: boolean }): void {
    const clearLast = opts?.clearLastSfx !== false;
    this.stop("global");
    this.stop("ambient");
    this.stop("sfx");
    if (clearLast) {
      this.state.sfx.lastSfx = null;
    }
    this.emit("sfx");
  }

  play(channel: AudioChannel, url: string, opts: { volume: number; nodeId?: string }): void {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) {
      this.stop(channel);
      return;
    }

    const loop = channel === "global" || channel === "ambient";
    const vol = clamp01(opts.volume);
    const st = this.state[channel];

    const existing = this.audio[channel];
    if (loop && existing && st.currentSrc === trimmed && !existing.paused) {
      existing.volume = vol;
      st.error = null;
      st.readyToResume = false;
      this.emit(channel);
      return;
    }
    if (loop && existing && st.currentSrc === trimmed && existing.paused) {
      existing.volume = vol;
      st.error = null;
      void existing.play().catch(() => undefined);
      st.isPlaying = true;
      st.readyToResume = false;
      this.emit(channel);
      return;
    }

    this.stop(channel);
    const el = this.ensureEl(channel);
    el.loop = loop;
    st.error = null;
    st.currentSrc = trimmed;
    st.progress = 0;
    st.readyToResume = false;
    el.volume = vol;

    try {
      el.src = trimmed;
      try {
        el.load();
      } catch {
        // jsdom
      }
      if (channel === "sfx") {
        const nid = opts.nodeId != null ? String(opts.nodeId) : "";
        st.lastSfx = { url: trimmed, volume: vol, nodeId: nid };
      }
      void el.play().catch(() => undefined);
      st.isPlaying = true;
    } catch {
      st.isPlaying = false;
      st.readyToResume = false;
      st.error = AUDIO_ERR;
    }
    this.emit(channel);
  }

  /** Tests uniquement — réinitialise singleton + éléments audio. */
  resetForTests(): void {
    this.stopAll();
    this.state.sfx.lastSfx = null;
    for (const ch of ["global", "ambient", "sfx"] as const) {
      this.listeners[ch].clear();
      this.state[ch] = defaultState();
    }
  }
}

let singleton: AudioChannelsServiceImpl | null = null;

export function getAudioChannelsService(): AudioChannelsService {
  if (!singleton) singleton = new AudioChannelsServiceImpl();
  return singleton;
}

export function resetAudioChannelsServiceForTests(): void {
  singleton?.resetForTests();
  singleton = null;
}
