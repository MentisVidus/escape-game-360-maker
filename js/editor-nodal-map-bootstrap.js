/**
 * C6.0–C6.3 — Carte nodale (React) dans la modale « Carte du projet ».
 * Requiert : `xflow/react/dist/editor-map.js` (global `Escape360EditorNodalMap`) chargé avant ce script.
 * Après premier `mount` : `window.__ESCAPE360_NODAL_STORE__` = store Zustand (API C6+).
 * C6.1 : bandeau + masquage FAB + `escape360-nodal-map-ro`.
 * C10.1 : suppression du flush périodique 8 s — le flush DOM ← store est désormais
 * garanti **sur demande** côté legacy (`saveProject` / `generateGame` / `exportGameWebZip`,
 * defense in depth Q-C10.1.x-3) et aux transitions onglet nodal → Drawflow / fermeture
 * de la modale Carte (handlers `setProjectMapEngine` / `wrapCloseProjectMap` ci-dessous).
 * Le hook subscribe `startSceneId` (C8.3.x) reste actif pour propager immédiatement
 * un changement de scène de départ vers le DOM legacy hors-modale.
 *
 * C10.3 — ouverture nodale par défaut : après hydrate brouillon (load) ou après
 * `hydrateFromBundle`, `editeur-app` / `editor-en-app` appellent
 * `window.escape360TryOpenDefaultNodalMap()` (même flux que `openNodalMapEditor`).
 */
(function () {
  "use strict";

  var ENGINE_DRAWFLOW = "drawflow";
  var ENGINE_NODAL = "nodal";
  var BODY_RO_CLASS = "escape360-nodal-map-ro";

  function isNodalEngineActive() {
    var wrap = document.getElementById("project-map-canvas-wrap");
    return !!(wrap && wrap.classList.contains("project-map-engine-nodal"));
  }

  /** C8.3.x — flush immédiat quand `meta.startSceneId` change (subscribe Zustand). */
  var startSceneHookStore = null;
  var startSceneHookUnsub = null;

  function ensureStartSceneChangeFlushHook() {
    var st = window.__ESCAPE360_NODAL_STORE__;
    if (!st || typeof st.subscribe !== "function") return;
    if (startSceneHookStore === st) return;
    if (typeof startSceneHookUnsub === "function") {
      try {
        startSceneHookUnsub();
      } catch (e) {
        /* ignore */
      }
      startSceneHookUnsub = null;
    }
    startSceneHookStore = st;
    var prevStart = (st.getState().meta && st.getState().meta.startSceneId) || null;
    startSceneHookUnsub = st.subscribe(function (state) {
      var nextStart = (state.meta && state.meta.startSceneId) || null;
      if (nextStart !== prevStart) {
        prevStart = nextStart;
        flushNodalProjectionToDomInner();
      }
    });
  }

  function flushNodalProjectionToDomInner() {
    var st = window.__ESCAPE360_NODAL_STORE__;
    var Ex = window.EditorSharedNodalToDom;
    if (!st || !Ex || typeof Ex.applyFromStore !== "function") return;
    Ex.applyFromStore(st);
  }

  function flushNodalProjectionToDom() {
    ensureStartSceneChangeFlushHook();
    flushNodalProjectionToDomInner();
  }

  function syncNodalReadOnlyChrome(engine) {
    var isNodal = engine === ENGINE_NODAL;
    var modal = document.getElementById("project-map-modal");
    var banner = document.getElementById("project-map-nodal-ro-banner");
    var body = document.body;

    if (modal) {
      modal.classList.toggle("project-map-nodal-engine-active", isNodal);
    }
    if (banner) {
      if (isNodal) {
        banner.removeAttribute("hidden");
      } else {
        banner.setAttribute("hidden", "");
      }
    }
    if (body) {
      body.classList.toggle(BODY_RO_CLASS, isNodal);
    }
  }

  /**
   * @param {"drawflow"|"nodal"} engine
   */
  function setProjectMapEngine(engine) {
    var wrap = document.getElementById("project-map-canvas-wrap");
    var modal = document.getElementById("project-map-modal");
    if (!wrap || !modal) return;

    if (engine !== ENGINE_NODAL) {
      flushNodalProjectionToDom();
    }

    wrap.classList.remove("project-map-engine-drawflow", "project-map-engine-nodal");
    wrap.classList.add(engine === ENGINE_NODAL ? "project-map-engine-nodal" : "project-map-engine-drawflow");

    modal.querySelectorAll(".project-map-engine-tab").forEach(function (btn) {
      var tabEngine = btn.getAttribute("data-project-map-engine");
      var isActive = tabEngine === engine;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (engine === ENGINE_NODAL) {
      var host = document.getElementById("nodal-map-root");
      var api = window.Escape360EditorNodalMap;
      if (host && api) {
        if (host.dataset.nodalMounted !== "1") {
          /* Pas d’hydratation depuis le DOM : graphe = démo (mount) ou état issu du bundle (hydrateFromBundle). */
          if (typeof api.mount === "function") {
            api.mount(host);
            host.dataset.nodalMounted = "1";
          }
        }
      }
      flushNodalProjectionToDom();
    }

    syncNodalReadOnlyChrome(engine);
  }

  function onEngineTabClick(ev) {
    var btn = ev.target.closest(".project-map-engine-tab");
    if (!btn) return;
    var engine = btn.getAttribute("data-project-map-engine");
    if (!engine) return;
    setProjectMapEngine(engine);
  }

  function wrapOpenProjectMap() {
    var orig = window.openProjectMap;
    if (typeof orig !== "function") return false;
    window.openProjectMap = function () {
      orig.apply(this, arguments);
      setProjectMapEngine(ENGINE_DRAWFLOW);
    };
    return true;
  }

  function wrapCloseProjectMap() {
    var orig = window.closeProjectMap;
    if (typeof orig !== "function") return false;
    window.closeProjectMap = function () {
      flushNodalProjectionToDom();
      setProjectMapEngine(ENGINE_DRAWFLOW);
      orig.apply(this, arguments);
    };
    return true;
  }

  function openNodalMapEditor() {
    if (typeof window.openProjectMap === "function") {
      window.openProjectMap();
      setProjectMapEngine(ENGINE_NODAL);
    }
  }

  /** C10.3 — équivalent clic « Éditeur Nodal » ; safe si bundle React absent. */
  function tryOpenDefaultNodalMap(reason) {
    try {
      openNodalMapEditor();
    } catch (e) {
      console.warn("escape360TryOpenDefaultNodalMap", reason || "", e);
    }
  }

  function pollUntil(fn, maxTries) {
    if (fn()) return;
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (fn() || n >= (maxTries || 100)) clearInterval(t);
    }, 50);
  }

  function init() {
    var modal = document.getElementById("project-map-modal");
    if (!modal) return;
    modal.addEventListener("click", onEngineTabClick);

    if (!wrapOpenProjectMap()) {
      pollUntil(wrapOpenProjectMap);
    }
    if (!wrapCloseProjectMap()) {
      pollUntil(wrapCloseProjectMap);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.setProjectMapEngine = setProjectMapEngine;
  window.openNodalMapEditor = openNodalMapEditor;
  window.escape360TryOpenDefaultNodalMap = tryOpenDefaultNodalMap;
})();
