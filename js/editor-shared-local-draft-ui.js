/**
 * Shared UI layer for local draft dock (FR/EN).
 * Keeps all DOM/UI logic in one place; only strings/actions are injected.
 */
(function (global) {
    "use strict";

    function toFn(v, fallback) {
        return typeof v === "function" ? v : fallback;
    }

    function createLocalDraftUi(options) {
        options = options || {};
        var doc = options.document || global.document;
        if (!doc) throw new Error("LocalDraftUi requires document.");
        if (!options.manager) throw new Error("LocalDraftUi requires manager.");
        if (typeof options.applyLoadedProject !== "function") {
            throw new Error("LocalDraftUi requires applyLoadedProject(project).");
        }

        var manager = options.manager;
        var strings = options.strings || {};
        var actions = options.actions || {};
        var autosaveDelayMs =
            Number(options.autosaveDelayMs) > 0 ? Number(options.autosaveDelayMs) : 45000;
        var openSuccessDelayMs =
            Number(options.openSuccessDelayMs) > 0 ? Number(options.openSuccessDelayMs) : 60000;

        var saveJson = toFn(actions.saveJson, function () {});
        var saveBundle = toFn(actions.saveBundle, function () {});
        var triggerLoadFile = toFn(actions.triggerLoadFile, function () {});
        var applyLoadedProject = options.applyLoadedProject;

        var autosaveTimer = null;
        var initDone = false;

        function t(key, fallback) {
            var v = strings[key];
            if (typeof v === "function") return v;
            if (typeof v === "string") return v;
            return fallback;
        }

        function fmtDate(iso) {
            var d = new Date(iso || Date.now());
            if (isNaN(d.getTime())) return String(iso || "");
            var locale = t("dateLocale", "en-GB");
            return d.toLocaleString(locale);
        }

        function sourceLabel(src) {
            if (src === "bundle") return t("sourceBundle", "bundle");
            if (src === "file") return t("sourceFile", "file");
            return t("sourceSession", "session");
        }

        function ensureStyles() {
            if (doc.getElementById("local-draft-dock-style")) return;
            var st = doc.createElement("style");
            st.id = "local-draft-dock-style";
            st.textContent =
                "#local-draft-dock{position:fixed;left:10px;top:22vh;z-index:12050;display:flex;align-items:flex-start;gap:8px;pointer-events:none}" +
                "#local-draft-dock .dock-rail{display:flex;flex-direction:column;gap:8px;pointer-events:auto}" +
                "#local-draft-dock .dock-icon{width:46px;height:46px;border-radius:999px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,.25);transition:transform .15s ease,filter .15s ease}" +
                "#local-draft-dock .dock-icon:hover{transform:translateY(-1px);filter:brightness(1.08)}" +
                "#local-draft-dock .dock-icon svg{width:24px;height:24px;display:block}" +
                "#local-draft-dock .dock-panel{min-width:290px;max-width:min(32vw,380px);background:rgba(31,41,55,.9);backdrop-filter:blur(2px);color:#f9fafb;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px;box-shadow:0 10px 24px rgba(0,0,0,.25);transform:translateX(-14px);opacity:0;pointer-events:none;transition:transform .18s ease,opacity .18s ease}" +
                "#local-draft-dock .dock-panel.is-open{transform:translateX(0);opacity:1;pointer-events:auto}" +
                "#local-draft-dock .dock-section{display:none}" +
                "#local-draft-dock .dock-section.is-open{display:block}" +
                "#local-draft-dock .dock-map-view-btn{background:#334155;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer}" +
                "#local-draft-dock .dock-map-view-btn.is-active{background:#2563eb}" +
                "#local-draft-dock .dock-map-close-btn{background:#334155;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer}" +
                "#local-draft-dock .dock-map-close-btn.is-open{background:#dc2626}";
            doc.head.appendChild(st);
        }

        function ensureDock() {
            var existing = doc.getElementById("local-draft-dock");
            if (existing) return existing;

            ensureStyles();
            var dock = doc.createElement("div");
            dock.id = "local-draft-dock";

            var saveSvg =
                "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 3h11l3 3v15H5z' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/><path d='M8 3v6h8V3M8 21v-7h8v7' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg>";
            var loadSvg =
                "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 5h16v12H4z' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/><path d='M12 8v8M9 13l3 3 3-3' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
            var mapSvg =
                "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/><path d='M9 4v14M15 6v14' fill='none' stroke='currentColor' stroke-width='2'/></svg>";

            dock.innerHTML =
                "<div class='dock-rail'>" +
                "<button type='button' id='local-draft-icon-save' title='" +
                t("titleSave", "Save") +
                "' class='dock-icon' style='background:#2563eb;'>" +
                saveSvg +
                "</button>" +
                "<button type='button' id='local-draft-icon-load' title='" +
                t("titleLoad", "Load") +
                "' class='dock-icon' style='background:#7c3aed;'>" +
                loadSvg +
                "</button>" +
                "<button type='button' id='local-draft-icon-map' title='" +
                t("titleMap", "Map") +
                "' class='dock-icon' style='background:#0f766e;'>" +
                mapSvg +
                "</button>" +
                "</div>" +
                "<div id='local-draft-panel' class='dock-panel'>" +
                "<div id='local-draft-panel-title' style='font-weight:700;margin-bottom:8px;'>" +
                t("panelSaveTitle", "Local draft") +
                "</div>" +
                "<div id='local-draft-panel-save' class='dock-section'>" +
                "<span id='local-draft-status-text' style='display:block;opacity:.95;margin-bottom:8px;'>" +
                t("statusInit", "Initializing...") +
                "</span>" +
                "<label style='display:flex;align-items:center;gap:6px;margin-bottom:6px;'><input type='checkbox' id='local-draft-enable' checked> " +
                t("labelEnable", "Enable") +
                "</label>" +
                "<label style='display:flex;align-items:center;gap:6px;margin-bottom:8px;'><input type='checkbox' id='local-draft-light'> " +
                t("labelLightMode", "Light mode (no media)") +
                "</label>" +
                "<div style='display:flex;flex-wrap:wrap;gap:6px;'>" +
                "<button type='button' id='local-draft-save-now' style='background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer;'>" +
                t("btnSnapshot", "Snapshot") +
                "</button>" +
                "<button type='button' id='local-draft-clear' style='background:#dc2626;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer;'>" +
                t("btnClear", "Clear") +
                "</button>" +
                "<button type='button' id='local-draft-export-json' style='background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer;'>" +
                t("btnSaveJson", "Save .json") +
                "</button>" +
                "<button type='button' id='local-draft-export-bundle' style='background:#0369a1;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer;'>" +
                t("btnSaveBundle", "Save .escapegame") +
                "</button>" +
                "</div>" +
                "</div>" +
                "<div id='local-draft-panel-load' class='dock-section'>" +
                "<p style='margin:0 0 8px 0;opacity:.95;'>" +
                t("loadHelp", "Load a project from a local file.") +
                "</p>" +
                "<button type='button' id='local-draft-load-file' style='background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer;'>" +
                t("btnLoadFile", "Open .json / .escapegame") +
                "</button>" +
                "</div>" +
                "<div id='local-draft-panel-map' class='dock-section'>" +
                "<p style='margin:0 0 8px 0;opacity:.95;'>" +
                t("mapHelp", "Quick map access.") +
                "</p>" +
                "<div style='display:flex;gap:6px;flex-wrap:wrap;'>" +
                "<button type='button' id='local-draft-open-map' style='background:#0f766e;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer;'>" +
                t("btnOpenMap", "Open map") +
                "</button>" +
                "<button type='button' id='local-draft-close-map' class='dock-map-close-btn'>" +
                t("btnCloseMap", "Close map") +
                "</button>" +
                "</div>" +
                "<div style='display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;'>" +
                "<button type='button' id='local-draft-map-view-focus' class='dock-map-view-btn'>" +
                t("btnMapViewFocus", "Focus view") +
                "</button>" +
                "<button type='button' id='local-draft-map-view-full' class='dock-map-view-btn'>" +
                t("btnMapViewFull", "Full graph") +
                "</button>" +
                "<button type='button' id='local-draft-map-view-tree' class='dock-map-view-btn'>" +
                t("btnMapViewTree", "Acyclic view") +
                "</button>" +
                "</div>" +
                "<label style='display:flex;align-items:center;gap:6px;margin-top:8px;'><input type='checkbox' id='local-draft-map-narration-only'> " +
                t("labelMapNarration", "Narration mode") +
                "</label>" +
                "</div>" +
                "</div>";

            doc.body.appendChild(dock);

            function showPanel(kind, anchorEl) {
                var panel = doc.getElementById("local-draft-panel");
                var title = doc.getElementById("local-draft-panel-title");
                var secSave = doc.getElementById("local-draft-panel-save");
                var secLoad = doc.getElementById("local-draft-panel-load");
                var secMap = doc.getElementById("local-draft-panel-map");
                if (!panel || !title || !secSave || !secLoad || !secMap) return;
                var isOpen = panel.classList.contains("is-open");
                var currentKind = panel.getAttribute("data-kind") || "";
                if (isOpen && currentKind === kind) {
                    panel.classList.remove("is-open");
                    panel.setAttribute("data-kind", "");
                    secSave.classList.remove("is-open");
                    secLoad.classList.remove("is-open");
                    secMap.classList.remove("is-open");
                    return;
                }
                panel.classList.add("is-open");
                panel.setAttribute("data-kind", kind);
                secSave.classList.toggle("is-open", kind === "save");
                secLoad.classList.toggle("is-open", kind === "load");
                secMap.classList.toggle("is-open", kind === "map");
                if (kind === "map") refreshMapButtonsState();
                if (anchorEl && typeof anchorEl.offsetTop === "number") {
                    panel.style.marginTop = String(anchorEl.offsetTop) + "px";
                } else {
                    panel.style.marginTop = "0px";
                }
                title.textContent =
                    kind === "save"
                        ? t("panelSaveTitle", "Local draft")
                        : kind === "load"
                        ? t("panelLoadTitle", "Load")
                        : t("panelMapTitle", "Map");
            }
            function closePanel() {
                var panel = doc.getElementById("local-draft-panel");
                if (!panel || !panel.classList.contains("is-open")) return;
                panel.classList.remove("is-open");
                panel.setAttribute("data-kind", "");
                var secSave = doc.getElementById("local-draft-panel-save");
                var secLoad = doc.getElementById("local-draft-panel-load");
                var secMap = doc.getElementById("local-draft-panel-map");
                if (secSave) secSave.classList.remove("is-open");
                if (secLoad) secLoad.classList.remove("is-open");
                if (secMap) secMap.classList.remove("is-open");
            }
            function isMapOpen() {
                var modal = doc.getElementById("project-map-modal");
                return !!(modal && modal.style.display !== "none");
            }
            function refreshMapButtonsState() {
                var btnFocus = doc.getElementById("local-draft-map-view-focus");
                var btnFull = doc.getElementById("local-draft-map-view-full");
                var btnTree = doc.getElementById("local-draft-map-view-tree");
                var btnClose = doc.getElementById("local-draft-close-map");
                if (!btnFocus || !btnFull || !btnTree || !btnClose) return;
                var mode = String(global._projectMapViewMode || "focus");
                btnFocus.classList.toggle("is-active", mode === "focus");
                btnFull.classList.toggle("is-active", mode === "full");
                btnTree.classList.toggle("is-active", mode === "tree");
                btnClose.classList.toggle("is-open", isMapOpen());
            }
            function setupOutsideClickClose() {
                if (dock.__outsideCloseBound) return;
                dock.__outsideCloseBound = true;
                doc.addEventListener(
                    "mousedown",
                    function (ev) {
                        var panel = doc.getElementById("local-draft-panel");
                        if (!panel || !panel.classList.contains("is-open")) return;
                        var target = ev.target;
                        if (!target) return;
                        if (dock.contains(target)) return;
                        closePanel();
                    },
                    true
                );
            }

            doc.getElementById("local-draft-icon-save").addEventListener("click", function () {
                showPanel("save", this);
            });
            doc.getElementById("local-draft-icon-load").addEventListener("click", function () {
                showPanel("load", this);
            });
            doc.getElementById("local-draft-icon-map").addEventListener("click", function () {
                showPanel("map", this);
            });
            doc.getElementById("local-draft-enable").addEventListener("change", async function (e) {
                manager.setEnabled(!!e.target.checked);
                await refreshStatusUi();
            });
            doc.getElementById("local-draft-light").addEventListener("change", async function (e) {
                manager.setLightMode(!!e.target.checked);
                await refreshStatusUi();
            });
            doc.getElementById("local-draft-save-now").addEventListener("click", async function () {
                try {
                    await manager.captureSnapshot("manual");
                } catch (e) {
                    console.error("draft.error", e);
                    alert(
                        t("alertSnapshotFailPrefix", "Snapshot failed: ") +
                            (e && e.message ? e.message : String(e))
                    );
                }
                await refreshStatusUi();
                closePanel();
            });
            doc.getElementById("local-draft-clear").addEventListener("click", async function () {
                if (!confirm(t("confirmClearDrafts", "Clear local drafts for this tab?"))) return;
                try {
                    await manager.purgeCurrentTabDrafts();
                } catch (e) {
                    console.error("draft.error", e);
                }
                await refreshStatusUi();
                closePanel();
            });
            doc.getElementById("local-draft-export-json").addEventListener("click", function () {
                saveJson();
                closePanel();
            });
            doc.getElementById("local-draft-export-bundle").addEventListener("click", function () {
                saveBundle();
                closePanel();
            });
            doc.getElementById("local-draft-load-file").addEventListener("click", function () {
                triggerLoadFile();
                closePanel();
            });
            doc.getElementById("local-draft-open-map").addEventListener("click", function () {
                if (typeof global.openProjectMap === "function") global.openProjectMap();
                refreshMapButtonsState();
                closePanel();
            });
            doc.getElementById("local-draft-close-map").addEventListener("click", function () {
                if (typeof global.closeProjectMap === "function") global.closeProjectMap();
                refreshMapButtonsState();
                closePanel();
            });
            doc.getElementById("local-draft-map-view-focus").addEventListener("click", function () {
                if (typeof global.setProjectMapView === "function") global.setProjectMapView("focus");
                refreshMapButtonsState();
                closePanel();
            });
            doc.getElementById("local-draft-map-view-full").addEventListener("click", function () {
                if (typeof global.setProjectMapView === "function") global.setProjectMapView("full");
                refreshMapButtonsState();
                closePanel();
            });
            doc.getElementById("local-draft-map-view-tree").addEventListener("click", function () {
                if (typeof global.setProjectMapView === "function") global.setProjectMapView("tree");
                refreshMapButtonsState();
                closePanel();
            });
            doc.getElementById("local-draft-map-narration-only").addEventListener("change", function (e) {
                var ch = doc.getElementById("project-map-narration-only");
                if (ch) {
                    ch.checked = !!e.target.checked;
                    ch.dispatchEvent(new Event("change", { bubbles: true }));
                }
            });
            setupOutsideClickClose();
            refreshMapButtonsState();

            return dock;
        }

        function setMapHeaderCompactMode(enabled) {
            var hdr = doc.querySelector("#project-map-modal > .modal-header");
            if (!hdr) return;
            hdr.style.display = enabled ? "none" : "";
        }

        function installMapHeaderHook() {
            if (global.__localDraftMapHookInstalled) return;
            if (typeof global.openProjectMap !== "function" || typeof global.closeProjectMap !== "function") {
                return;
            }
            var _open = global.openProjectMap;
            var _close = global.closeProjectMap;
            global.openProjectMap = function () {
                _open.apply(this, arguments);
                setMapHeaderCompactMode(true);
                var src = doc.getElementById("project-map-narration-only");
                var dst = doc.getElementById("local-draft-map-narration-only");
                if (src && dst) dst.checked = !!src.checked;
                var closeBtn = doc.getElementById("local-draft-close-map");
                if (closeBtn) closeBtn.classList.add("is-open");
            };
            global.closeProjectMap = function () {
                setMapHeaderCompactMode(false);
                _close.apply(this, arguments);
                var closeBtn = doc.getElementById("local-draft-close-map");
                if (closeBtn) closeBtn.classList.remove("is-open");
            };
            global.__localDraftMapHookInstalled = true;
        }

        async function refreshStatusUi() {
            ensureDock();
            var info;
            try {
                info = await manager.getUiStorageState();
            } catch (e) {
                var failText = doc.getElementById("local-draft-status-text");
                if (failText) {
                    failText.textContent = t(
                        "statusUnavailable",
                        "Local draft unavailable (IndexedDB blocked or unsupported)."
                    );
                    failText.style.color = "#fca5a5";
                }
                console.error("draft.error", e);
                return;
            }
            var textEl = doc.getElementById("local-draft-status-text");
            var enEl = doc.getElementById("local-draft-enable");
            var lmEl = doc.getElementById("local-draft-light");
            var srcNarr = doc.getElementById("project-map-narration-only");
            var dstNarr = doc.getElementById("local-draft-map-narration-only");
            if (enEl) enEl.checked = !!info.enabled;
            if (lmEl) lmEl.checked = !!info.lightMode;
            if (srcNarr && dstNarr) dstNarr.checked = !!srcNarr.checked;
            if (!textEl) return;
            if (!info.estimate.supported) {
                textEl.textContent = t(
                    "statusNoEstimate",
                    "IndexedDB without quota estimate in this browser."
                );
                textEl.style.color = "#f9fafb";
                return;
            }
            var used = info.estimate.usedMo.toFixed(1);
            var quota = info.estimate.quotaMo.toFixed(1);
            var ratio = (info.estimate.ratio * 100).toFixed(1);
            var msg =
                t("statusStoragePrefix", "Storage: ") +
                used +
                " " +
                t("unitMo", "MB") +
                " / " +
                quota +
                " " +
                t("unitMo", "MB") +
                " (" +
                ratio +
                "%)";
            if (info.warnLevel === "high") {
                msg += " - " + t("statusWarnHigh", "High warning (>=90%): consider light mode.");
                textEl.style.color = "#fca5a5";
            } else if (info.warnLevel === "low") {
                msg += " - " + t("statusWarnLow", "Warning (>=80%).");
                textEl.style.color = "#fcd34d";
            } else {
                textEl.style.color = "#86efac";
            }
            textEl.textContent = msg;
        }

        function scheduleAutosave(reason) {
            if (!manager.isEnabled()) return;
            if (autosaveTimer) clearTimeout(autosaveTimer);
            autosaveTimer = setTimeout(async function () {
                try {
                    await manager.captureSnapshot(reason || "autosave");
                    await refreshStatusUi();
                } catch (e) {
                    console.error("draft.error", e);
                }
            }, autosaveDelayMs);
        }

        function noteDirty() {
            if (!manager.isEnabled()) return;
            scheduleAutosave("dirty");
        }

        async function maybeRestoreOnStartup() {
            var incompatible = await manager.listIncompatibleDrafts();
            if (incompatible.length > 0) {
                var purgeOld = confirm(
                    t(
                        "confirmIncompatiblePurge",
                        "Incompatible local drafts were found. Ignore and delete?"
                    ).replace("{count}", String(incompatible.length))
                );
                if (purgeOld) await manager.clearIncompatibleDrafts();
            }
            var drafts = await manager.listRestorableDrafts();
            if (!drafts.length) return;
            var max = Math.min(drafts.length, 9);
            var lines = [];
            for (var i = 0; i < max; i++) {
                var d = drafts[i];
                var flags = [];
                if (d.status === "synchronized") flags.push(t("flagSync", "sync"));
                if (d.lightMode) flags.push(t("flagLight", "light"));
                lines.push(
                    i +
                        1 +
                        ". " +
                        (d.projectTitleSnapshot || t("untitledProject", "(Untitled)")) +
                        " - " +
                        fmtDate(d.savedAt) +
                        " - " +
                        (d.sceneCount || 0) +
                        " " +
                        t("labelScenes", "scene(s)") +
                        " - " +
                        sourceLabel(d.sourceHint) +
                        (flags.length ? " [" + flags.join(", ") + "]" : "")
                );
            }
            lines.push("");
            lines.push(t("restorePromptHelp", "Enter a number to restore (empty to skip)."));
            var pick = prompt(t("restorePromptTitle", "Local drafts found:") + "\n\n" + lines.join("\n"), "1");
            if (pick == null || String(pick).trim() === "") return;
            var idx = Number(pick);
            if (!isFinite(idx) || idx < 1 || idx > max) return;
            var selected = drafts[idx - 1];
            var restored = await manager.restoreDraftById(selected.id);
            applyLoadedProject(restored.project);
            manager.setSourceHint(restored.draft.sourceHint || "none");
            if (restored.missingMedia && restored.missingMedia.length > 0) {
                alert(
                    t("alertPartialRestorePrefix", "Partial restore: ") +
                        restored.missingMedia.length +
                        " " +
                        t("alertPartialRestoreSuffix", "missing media file(s). Check related fields.")
                );
            }
        }

        async function init() {
            if (initDone) return;
            initDone = true;
            ensureDock();
            installMapHeaderHook();
            doc.addEventListener("input", noteDirty, true);
            doc.addEventListener("change", noteDirty, true);
            try {
                await refreshStatusUi();
                await maybeRestoreOnStartup();
                await refreshStatusUi();
            } catch (e) {
                console.error("draft.error", e);
            }
            setTimeout(async function () {
                try {
                    await manager.markOpeningSuccessfulAndPurgeSynced();
                    await refreshStatusUi();
                } catch (e) {
                    console.error("draft.error", e);
                }
            }, openSuccessDelayMs);
        }

        return {
            init: init,
            refreshStatusUi: refreshStatusUi,
            noteDirty: noteDirty,
            scheduleAutosave: scheduleAutosave
        };
    }

    global.EditorSharedLocalDraftUi = {
        createLocalDraftUi: createLocalDraftUi
    };
})(typeof window !== "undefined" ? window : this);
