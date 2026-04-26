/**
 * C6.0 — Intégration de la carte nodale (React) dans la modale « Carte du projet ».
 * Requiert : `xflow/react/dist/editor-map.js` (global `Escape360EditorNodalMap`) chargé avant ce script.
 * Après premier `mount` : `window.__ESCAPE360_NODAL_STORE__` = store Zustand (API C6+).
 */
(function () {
  "use strict";

  var ENGINE_DRAWFLOW = "drawflow";
  var ENGINE_NODAL = "nodal";

  /**
   * @param {"drawflow"|"nodal"} engine
   */
  function setProjectMapEngine(engine) {
    var wrap = document.getElementById("project-map-canvas-wrap");
    var modal = document.getElementById("project-map-modal");
    if (!wrap || !modal) return;

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
      if (host && api && typeof api.mount === "function" && host.dataset.nodalMounted !== "1") {
        api.mount(host);
        host.dataset.nodalMounted = "1";
      }
    }
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

  function init() {
    var modal = document.getElementById("project-map-modal");
    if (!modal) return;
    modal.addEventListener("click", onEngineTabClick);

    if (!wrapOpenProjectMap()) {
      var n = 0;
      var t = setInterval(function () {
        n += 1;
        if (wrapOpenProjectMap() || n > 100) clearInterval(t);
      }, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.setProjectMapEngine = setProjectMapEngine;
})();
