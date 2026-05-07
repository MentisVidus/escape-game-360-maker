/**
 * C10.4 — formulaire legacy en **vue de vérification** uniquement :
 * bandeau + désactivation controls + MutationObserver pour le contenu projeté depuis la carte.
 * FR/EN : messages et classe sur `<html>` via `document.documentElement.lang`.
 */
(function (global) {
    var DOC = global.document;
    var BANNER_ID = "editor-legacy-verify-banner";
    /** Installé au plus une fois (évite plusieurs MutationObserver au re-bootstrap manuel). */
    var mutationObserverInstalled = false;
    /** Boutons carte — restent utilisables depuis le formulaire. */
    var TOOLBAR_MAP_IDS = {
        "toolbar-open-drawflow-map": true,
        "toolbar-open-nodal-map": true,
    };

    /** Entrées fichier : gardées actives (palette / triggers programmatiques). */
    function isExemptInput(el) {
        if (!el || el.tagName !== "INPUT") return false;
        var t = (el.type || "").toLowerCase();
        if (t === "hidden" || t === "file") return true;
        if (el.id === "file-import" || el.id === "bundle-media-file") return true;
        return false;
    }

    function isInsideProjectMapModal(el) {
        return !!(el.closest && el.closest("#project-map-modal"));
    }

    function shouldWalkRoot(root) {
        if (!root || root.nodeType !== 1) return false;
        if (isInsideProjectMapModal(root)) return false;
        return true;
    }

    function bannerText(messages) {
        var lang = (DOC.documentElement.lang || "").toLowerCase();
        return lang.indexOf("en") === 0 ? messages.en : messages.fr;
    }

    function insertBanner(messages) {
        var root = DOC.getElementById("editor-global-root");
        if (!root || DOC.getElementById(BANNER_ID)) return;

        var bar = DOC.createElement("div");
        bar.id = BANNER_ID;
        bar.className = "editor-legacy-verify-banner";
        bar.setAttribute("role", "status");
        bar.textContent = bannerText(messages);
        root.insertBefore(bar, root.firstChild);

        var icon = DOC.createElement("span");
        icon.className = "editor-legacy-verify-banner-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "ℹ";
        bar.insertBefore(icon, bar.firstChild);
    }

    /** Désactive l’édition Quill (DOM existant sous `root`). */
    function freezeQuillUnder(rootEl) {
        if (!rootEl || !rootEl.querySelectorAll) return;
        var eds = rootEl.querySelectorAll(".ql-editor");
        for (var i = 0; i < eds.length; i++) {
            eds[i].setAttribute("contenteditable", "false");
        }
        var tbBtns = rootEl.querySelectorAll(
            ".ql-toolbar button, .ql-toolbar .ql-picker-label"
        );
        for (var j = 0; j < tbBtns.length; j++) {
            tbBtns[j].disabled = true;
        }
        var pickerItems = rootEl.querySelectorAll(".ql-toolbar .ql-picker-options .ql-picker-item");
        for (var k = 0; k < pickerItems.length; k++) {
            pickerItems[k].setAttribute("tabindex", "-1");
            pickerItems[k].style.pointerEvents = "none";
        }
    }

    function disableInteractivesInSubtree(rootEl) {
        if (!shouldWalkRoot(rootEl)) return;
        var list = rootEl.querySelectorAll("input, textarea, select, button");
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            if (!el || !el.closest) continue;
            if (isInsideProjectMapModal(el)) continue;
            if (isExemptInput(el)) continue;
            var tag = el.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                el.disabled = true;
                continue;
            }
            if (tag === "BUTTON") {
                el.disabled = true;
            }
        }
        freezeQuillUnder(rootEl);
    }

    /** En-têtes `onclick=toggleCollapse` etc. — pas des `<button>`. */
    function blockInlineOnclickZones(rootEl) {
        if (!shouldWalkRoot(rootEl)) return;
        var hosts = rootEl.querySelectorAll("[onclick]");
        for (var i = 0; i < hosts.length; i++) {
            var h = hosts[i];
            if (!h.closest) continue;
            if (isInsideProjectMapModal(h)) continue;
            h.classList.add("legacy-verify-no-pointer");
        }
    }

    function disableTopToolbarExceptMapButtons() {
        var bar = DOC.querySelector(".top-toolbar");
        if (!bar) return;
        var btns = bar.querySelectorAll("button");
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            if (b.id && TOOLBAR_MAP_IDS[b.id]) continue;
            b.disabled = true;
        }
    }

    function disableStandaloneActionButtons() {
        var sel = ".btn-add-scene, .btn-generate, .btn-export-offline";
        var arr = DOC.querySelectorAll(sel);
        for (var i = 0; i < arr.length; i++) {
            arr[i].disabled = true;
        }
    }

    /** Modales coordonnées / aperçu scène hors `#editor-global-root` : pas d’édition depuis le flux legacy. */
    function disableLegacyUtilityModals() {
        ["picker-modal", "scene-preview-modal"].forEach(function (id) {
            var modal = DOC.getElementById(id);
            if (!modal) return;
            disableInteractivesInSubtree(modal);
            blockInlineOnclickZones(modal);
        });
    }

    function applyVerificationMode(messages) {
        insertBanner(messages);
        DOC.documentElement.classList.add("legacy-verify-mode-active");

        var egr = DOC.getElementById("editor-global-root");
        var scenes = DOC.getElementById("scenes-container");
        if (egr && shouldWalkRoot(egr)) {
            disableInteractivesInSubtree(egr);
            blockInlineOnclickZones(egr);
        }
        if (scenes && shouldWalkRoot(scenes)) {
            disableInteractivesInSubtree(scenes);
            blockInlineOnclickZones(scenes);
        }
        disableTopToolbarExceptMapButtons();
        disableStandaloneActionButtons();
        disableLegacyUtilityModals();
    }

    function debounce(fn, ms) {
        var tid = null;
        return function () {
            global.clearTimeout(tid);
            tid = global.setTimeout(fn, ms);
        };
    }

    function bootstrap(messages) {
        var msg = messages || {
            fr: "Vue de vérification — l'édition se fait via la carte nodale.",
            en: "Verification view — editing happens via the nodal map.",
        };

        function apply() {
            applyVerificationMode(msg);
        }

        var debouncedApply = debounce(apply, 72);

        function installObserverOnce() {
            if (mutationObserverInstalled || typeof MutationObserver === "undefined") return;
            mutationObserverInstalled = true;
            var roots = [];
            var a = DOC.getElementById("editor-global-root");
            var b = DOC.getElementById("scenes-container");
            if (a) roots.push(a);
            if (b) roots.push(b);
            if (!roots.length) return;
            var mo = new MutationObserver(function () {
                debouncedApply();
            });
            roots.forEach(function (r) {
                mo.observe(r, { childList: true, subtree: true });
            });
        }

        function onReady() {
            apply();
            installObserverOnce();
        }

        if (DOC.readyState === "loading") {
            DOC.addEventListener("DOMContentLoaded", onReady);
        } else {
            global.setTimeout(onReady, 0);
        }
    }

    bootstrap();

    global.EditorSharedLegacyVerifyMode = {
        bootstrap: bootstrap,
        /** Recalcul manuel (tests / debug) : réapplique sans réinstaller l’observer. */
        applyVerificationModeOnce: applyVerificationMode,
    };
})(typeof window !== "undefined" ? window : {});
