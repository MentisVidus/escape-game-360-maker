/**
 * Quill WYSIWYG (champs .editor-rich-text) + listes déroulantes des IDs de scène
 * (select.f-target, select.sel-scene-target). Chargé après Quill, avant editeur-app.
 */
(function (global) {
    "use strict";

    var NEW_SCENE_VALUE = "__NEW_SCENE__";
    var RICH_CLASS = "editor-rich-text";

    function isEn() {
        return document.documentElement.lang === "en";
    }

    function escapeAttr(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
    }

    global.getAllSceneIdsFromDom = function () {
        var ids = [];
        var seen = {};
        document.querySelectorAll(".scene-block .sc-id").forEach(function (inp) {
            var v = (inp.value || "").trim();
            if (v && !seen[v]) {
                seen[v] = true;
                ids.push(v);
            }
        });
        return ids;
    };

    global.initAllSceneIdStableFields = function () {
        document.querySelectorAll(".scene-block .sc-id").forEach(function (inp) {
            inp.dataset.sceneIdStable = (inp.value || "").trim();
        });
    };

    global.defaultSceneTargetSelectValue = function () {
        var ids = global.getAllSceneIdsFromDom();
        return ids.length ? ids[0] : "scene_2";
    };

    global.buildSceneTargetSelectOptionsHtml = function (selectedVal) {
        var ids = global.getAllSceneIdsFromDom();
        var sel = (selectedVal || "").trim();
        var html = "";
        ids.forEach(function (id) {
            var esc = escapeAttr(id);
            html += '<option value="' + esc + '"' + (id === sel ? " selected" : "") + ">" + esc + "</option>";
        });
        if (sel && ids.indexOf(sel) === -1) {
            var e = escapeAttr(sel);
            html += '<option value="' + e + '" selected>' + e + " (?)</option>";
        }
        var newLabel = isEn() ? "+ New scene…" : "+ Nouvelle scène…";
        html +=
            '<option value="' +
            NEW_SCENE_VALUE +
            '">' +
            escapeAttr(newLabel) +
            "</option>";
        return html;
    };

    /**
     * @param {string} cssClass — f-target | sel-scene-target
     * @param {string} [selectedVal]
     */
    global.buildSceneTargetSelect = function (cssClass, selectedVal) {
        var c = cssClass || "f-target";
        var def =
            selectedVal != null && String(selectedVal).trim()
                ? String(selectedVal).trim()
                : global.defaultSceneTargetSelectValue();
        return (
            '<select class="' +
            escapeAttr(c) +
            '" onchange="onSceneTargetSelectChange(this)">' +
            global.buildSceneTargetSelectOptionsHtml(def) +
            "</select>"
        );
    };

    global.refreshAllSceneTargetSelects = function (opts) {
        opts = opts || {};
        var preferSel = opts.preferSelect;
        var preferVal = opts.preferVal;
        var rename = opts.rename;
        var fromRen = rename && rename.from != null ? String(rename.from).trim() : "";
        var toRen = rename && rename.to != null ? String(rename.to).trim() : "";
        document.querySelectorAll("select.f-target, select.sel-scene-target").forEach(function (sel) {
            var cur =
                sel.value === NEW_SCENE_VALUE
                    ? preferSel === sel && preferVal
                        ? preferVal
                        : sel.dataset.prevValue || ""
                    : (sel.value || "").trim();
            if (fromRen && toRen && cur === fromRen) {
                cur = toRen;
            }
            sel.innerHTML = global.buildSceneTargetSelectOptionsHtml(cur);
            sel.value = cur;
            if (!sel.value || sel.value === NEW_SCENE_VALUE) {
                var ids = global.getAllSceneIdsFromDom();
                if (ids.length) sel.value = ids[0];
            }
            sel.dataset.prevValue = sel.value;
        });
    };

    global.remapSceneIdInTargetSelects = function (oldId, newId) {
        var o = (oldId || "").trim();
        var n = (newId || "").trim();
        if (!o || o === n) {
            global.refreshAllSceneTargetSelects();
            return;
        }
        global.refreshAllSceneTargetSelects({ rename: { from: o, to: n } });
    };

    global.onSceneTargetSelectChange = function (sel) {
        if (!sel) return;
        if (sel.value !== NEW_SCENE_VALUE) {
            sel.dataset.prevValue = sel.value;
            return;
        }
        var msg = isEn()
            ? "Short ID for the new scene (e.g. kitchen):"
            : "ID court de la nouvelle scène (ex : cuisine) :";
        var n = document.querySelectorAll(".scene-block").length;
        var sug = "scene_" + (n + 1);
        var raw = typeof prompt === "function" ? prompt(msg, sug) : null;
        if (raw == null || !String(raw).trim()) {
            sel.value = sel.dataset.prevValue || global.defaultSceneTargetSelectValue();
            return;
        }
        var id = String(raw).trim();
        if (typeof window.addScene === "function") {
            var img = isEn() ? "room.jpg" : "salle.jpg";
            window.addScene(id, img, "");
        }
        global.refreshAllSceneTargetSelects({ preferSelect: sel, preferVal: id });
        if (typeof window.refreshProjectMapGraphInPlace === "function") {
            window.refreshProjectMapGraphInPlace();
        }
    };

    /** Valeurs #pop-font autorisées (stack complet, hors-ligne). */
    var POP_FONT_FALLBACK = "Arial, Helvetica, sans-serif";

    function safeFontFamilyForCss(s) {
        var t = String(s == null ? "" : s).replace(/[;}{!]/g, "").trim();
        return t || POP_FONT_FALLBACK;
    }

    function readPopupThemeForQuill() {
        var useCustom = document.getElementById("useCustomPopup");
        var popFontEl = document.getElementById("pop-font");
        var editorFont = POP_FONT_FALLBACK;
        if (!useCustom || !useCustom.checked) {
            editorFont = "sans-serif";
        } else if (popFontEl && popFontEl.value) {
            editorFont = safeFontFamilyForCss(popFontEl.value);
        }
        if (!useCustom || !useCustom.checked) {
            return {
                editorBg: "rgba(0,0,0,0.9)",
                editorColor: "#ffffff",
                editorFont: editorFont,
            };
        }
        var popBgcEl = document.getElementById("pop-bgc");
        var popBgaEl = document.getElementById("pop-bga");
        var popColorEl = document.getElementById("pop-color");
        if (!popBgcEl || !popBgaEl || !popColorEl) {
            return {
                editorBg: "#ffffff",
                editorColor: "#222222",
                editorFont: editorFont,
            };
        }
        var hexPop = String(popBgcEl.value || "#000000").replace("#", "");
        var rp = parseInt(hexPop.substring(0, 2), 16) || 0;
        var gp = parseInt(hexPop.substring(2, 4), 16) || 0;
        var bp = parseInt(hexPop.substring(4, 6), 16) || 0;
        var a = parseFloat(popBgaEl.value);
        if (isNaN(a)) a = 0.9;
        a = Math.max(0, Math.min(1, a));
        return {
            editorBg: "rgba(" + rp + "," + gp + "," + bp + "," + a + ")",
            editorColor: popColorEl.value || "#ffffff",
            editorFont: editorFont,
        };
    }

    /**
     * Synchronise le rendu des éditeurs Quill avec les couleurs des popups (paramètres globaux).
     * La barre d’outils reste sur fond clair pour la lisibilité des icônes.
     */
    global.updateQuillTheme = function () {
        if (!document.head) return;
        var t = readPopupThemeForQuill();
        var el = document.getElementById("editor-quill-popup-theme-css");
        if (!el) {
            el = document.createElement("style");
            el.id = "editor-quill-popup-theme-css";
            document.head.appendChild(el);
        }
        el.textContent =
            ".wysiwyg-wrap .ql-editor.ql-blank::before { color: inherit !important; opacity: 0.55; }" +
            ".wysiwyg-wrap .ql-toolbar.ql-snow { background: #f5f5f5 !important; border-color: #ccc !important; }" +
            ".wysiwyg-wrap .ql-container.ql-snow { border-color: #ccc !important; background: transparent !important; }" +
            ".wysiwyg-wrap .ql-editor { background: " +
            t.editorBg +
            " !important; color: " +
            t.editorColor +
            " !important; font-family: " +
            t.editorFont +
            " !important; }";
    };

    function bindQuillThemeFromPopupInputs() {
        if (global._quillPopupThemeListenersBound) return;
        if (!document.getElementById("pop-color")) return;
        function onPopupThemeInput() {
            global.updateQuillTheme();
        }
        ["pop-color", "pop-bgc", "pop-bga", "pop-font", "useCustomPopup"].forEach(function (id) {
            var node = document.getElementById(id);
            if (!node) return;
            node.addEventListener("input", onPopupThemeInput);
            node.addEventListener("change", onPopupThemeInput);
        });
        global._quillPopupThemeListenersBound = true;
    }

    function registerQuillRichFormatsOnce() {
        if (!window.Quill || global._quillEditorFormatsRegistered) return;
        var Font = Quill.import("formats/font");
        Font.whitelist = ["arial", "courier", "times", "impact", "comic"];
        Quill.register(Font, true);
        var Size = Quill.import("formats/size");
        Size.whitelist = ["small", "large", "huge"];
        Quill.register(Size, true);
        global._quillEditorFormatsRegistered = true;
    }

    function quillToolbar() {
        return [
            [{ header: [1, 2, 3, false] }],
            [{ font: ["arial", "courier", "times", "impact", "comic", false] }],
            [{ size: ["small", false, "large", "huge"] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            [{ color: [] }],
            ["clean"],
        ];
    }

    global.destroyRichEditorsIn = function (root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("textarea." + RICH_CLASS).forEach(function (ta) {
            var wrap = ta.closest(".wysiwyg-wrap");
            if (wrap) {
                wrap.querySelectorAll(".ql-toolbar, .wysiwyg-quill-host").forEach(function (n) {
                    n.remove();
                });
            }
            ta.style.display = "";
            ta.dataset.richInit = "";
            ta._quill = null;
        });
    };

    global.flushRichEditorsIn = function (root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll("textarea." + RICH_CLASS).forEach(function (ta) {
            if (ta._quill && ta._quill.root) {
                ta.value = ta._quill.root.innerHTML;
            }
        });
    };

    global.initRichEditorsIn = function (root) {
        if (!root || !window.Quill) return;
        registerQuillRichFormatsOnce();
        root.querySelectorAll("textarea." + RICH_CLASS).forEach(function (ta) {
            if (ta.dataset.richInit === "1") return;
            var wrap = ta.closest(".wysiwyg-wrap");
            if (!wrap) return;
            var host = document.createElement("div");
            host.className = "wysiwyg-quill-host";
            wrap.appendChild(host);
            var q = new Quill(host, {
                theme: "snow",
                modules: { toolbar: quillToolbar() },
            });
            var html = (ta.value || "").trim();
            if (html) {
                q.clipboard.dangerouslyPasteHTML(html);
            }
            q.on("text-change", function () {
                ta.value = q.root.innerHTML;
            });
            ta.style.display = "none";
            ta._quill = q;
            ta.dataset.richInit = "1";
        });
        global.updateQuillTheme();
    };

    function bindSceneIdRenameSync() {
        var body = document.body;
        if (!body || body._sceneIdSyncBound) return;
        body.addEventListener(
            "focusin",
            function (ev) {
                var t = ev.target;
                if (!t || !t.matches || !t.matches(".sc-id")) return;
                t.dataset.sceneIdStable = (t.value || "").trim();
            },
            true
        );
        body.addEventListener(
            "blur",
            function (ev) {
                var inp = ev.target;
                if (!inp || !inp.matches || !inp.matches(".sc-id")) return;
                var stable = (inp.dataset.sceneIdStable || "").trim();
                var now = (inp.value || "").trim();
                if (stable !== now) {
                    global.remapSceneIdInTargetSelects(stable, now);
                    inp.dataset.sceneIdStable = now;
                }
            },
            true
        );
        body.addEventListener("change", function (ev) {
            var inp = ev.target;
            if (!inp || !inp.matches || !inp.matches(".sc-id")) return;
            var stable = (inp.dataset.sceneIdStable || "").trim();
            var now = (inp.value || "").trim();
            if (stable !== now) {
                global.remapSceneIdInTargetSelects(stable, now);
                inp.dataset.sceneIdStable = now;
            }
        });
        body._sceneIdSyncBound = true;
    }

    bindSceneIdRenameSync();
    bindQuillThemeFromPopupInputs();
    global.updateQuillTheme();
})(window);
