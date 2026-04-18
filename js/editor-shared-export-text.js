/**
 * Export « sans bruit » : textes / HTML encore au verbatim des gabarits éditeur
 * (suggestions) sont sérialisés comme chaînes vides — le joueur / JSON n’embarquent pas le contenu factice.
 * S’appuie sur data-export-suggest-b64 (optionnel), sur le HTML « vide » Quill, et sur un catalogue
 * des snippets par défaut FR/EN (hotspots + selector).
 */
(function (global) {
    "use strict";

    var NORMALIZED_DEFAULTS = [];

    function utf8ToBase64(str) {
        try {
            return btoa(unescape(encodeURIComponent(String(str))));
        } catch (e) {
            return "";
        }
    }

    function base64ToUtf8(b64) {
        try {
            return decodeURIComponent(escape(atob(String(b64))));
        } catch (e) {
            return null;
        }
    }

    function normalizeForExportCompare(s) {
        return String(s || "")
            .trim()
            .replace(/\s+/g, " ")
            .replace(/<br\s*\/?>/gi, "<br>");
    }

    function registerDefaultSnippet(s) {
        var n = normalizeForExportCompare(s);
        if (!n) return;
        if (NORMALIZED_DEFAULTS.indexOf(n) === -1) NORMALIZED_DEFAULTS.push(n);
    }

    function registerMany(arr) {
        for (var i = 0; i < arr.length; i++) registerDefaultSnippet(arr[i]);
    }

    /** HTML considéré comme vide après édition Quill / zones vides. */
    function isEffectivelyEmptyRichHtml(html) {
        var t = String(html || "").trim();
        if (!t) return true;
        if (/^<p>\s*<br\s*\/?>\s*<\/p>$/i.test(t)) return true;
        if (/^<p>\s*<\/p>$/i.test(t)) return true;
        return false;
    }

    function matchesKnownTemplateDefault(html) {
        var n = normalizeForExportCompare(html);
        if (!n) return true;
        return NORMALIZED_DEFAULTS.indexOf(n) !== -1;
    }

    /**
     * @param {HTMLElement|null} el
     * @returns {string}
     */
    function readExportAwareFieldValue(el) {
        if (!el || el.value === undefined) return "";
        var raw = String(el.value);
        var b64 = el.getAttribute && el.getAttribute("data-export-suggest-b64");
        if (b64) {
            var sug = base64ToUtf8(b64);
            if (sug != null && normalizeForExportCompare(raw) === normalizeForExportCompare(sug)) {
                return "";
            }
        }
        if (el.classList && el.classList.contains("editor-rich-text")) {
            if (isEffectivelyEmptyRichHtml(raw)) return "";
            if (matchesKnownTemplateDefault(raw)) return "";
        }
        if (el.classList && el.classList.contains("f-sel-title")) {
            var st = raw.trim();
            if (st === "Choisissez une action" || st === "Choose an action") return "";
        }
        if (
            el.classList &&
            (el.classList.contains("f-trans-btn") || el.classList.contains("sel-scene-btn"))
        ) {
            var tb = raw.trim();
            if (tb === "Continuer" || tb === "Continue" || tb === "Entrer" || tb === "Enter") return "";
        }
        return raw;
    }

    /**
     * @param {string} html
     * @returns {string}
     */
    function stripRichTemplateDefault(html) {
        var raw = String(html || "");
        if (isEffectivelyEmptyRichHtml(raw)) return "";
        if (matchesKnownTemplateDefault(raw)) return "";
        return raw;
    }

    var DEFAULT_TRANS_BTN = {
        fr: ["Continuer", "Entrer"],
        en: ["Continue", "Enter"],
    };

    function stripDefaultTransitionButton(label) {
        var s = String(label || "").trim();
        if (!s) return "";
        var lang = global.document && global.document.documentElement.lang === "en" ? "en" : "fr";
        var arr = DEFAULT_TRANS_BTN[lang] || DEFAULT_TRANS_BTN.fr;
        for (var i = 0; i < arr.length; i++) {
            if (s === arr[i]) return "";
        }
        return s;
    }

    function sanitizeChoice(ch) {
        if (!ch || typeof ch !== "object") return ch;
        var o = {};
        for (var k in ch) {
            if (Object.prototype.hasOwnProperty.call(ch, k)) o[k] = ch[k];
        }
        if (o.txt != null && typeof o.txt === "string") {
            o.txt = stripRichTemplateDefault(o.txt);
        }
        if (o.transTxt != null && typeof o.transTxt === "string") {
            o.transTxt = stripRichTemplateDefault(o.transTxt);
        }
        if (o.transBtn != null && typeof o.transBtn === "string") {
            o.transBtn = stripDefaultTransitionButton(o.transBtn);
        }
        if (o.label != null && typeof o.label === "string") {
            var lb = String(o.label).trim();
            if (lb === "Nouveau choix" || lb === "New choice") o.label = "";
        }
        if (o.nested && typeof o.nested === "object") {
            var nest = {};
            for (var nk in o.nested) {
                if (Object.prototype.hasOwnProperty.call(o.nested, nk)) nest[nk] = o.nested[nk];
            }
            if (nest.introHtml != null && typeof nest.introHtml === "string") {
                nest.introHtml = stripRichTemplateDefault(nest.introHtml);
            }
            if (nest.copy && typeof nest.copy === "object") {
                nest.copy = Object.assign({}, nest.copy);
                if (nest.copy.bodyHtml != null && typeof nest.copy.bodyHtml === "string") {
                    nest.copy.bodyHtml = stripRichTemplateDefault(nest.copy.bodyHtml);
                }
            }
            if (Array.isArray(nest.choices)) {
                nest.choices = nest.choices.map(sanitizeChoice);
            }
            o.nested = nest;
        }
        return o;
    }

    function sanitizeSelectorChoicesForExport(arr) {
        if (!Array.isArray(arr)) return arr;
        return arr.map(sanitizeChoice);
    }

    registerMany([
        "<p>Texte affiché au joueur.</p>",
        "<p>Text shown to the player.</p>",
        "<p>Texte</p>",
        "<p>Text</p>",
        "Bravo.",
        "<p>Bravo.</p>",
        "Well done.",
        "<p>Well done.</p>",
        "Vous trouvez une clé.",
        "<p>Vous trouvez une clé.</p>",
        "You find a key.",
        "<p>You find a key.</p>",
        "Verrouillé.",
        "<p>Verrouillé.</p>",
        "Locked.",
        "<p>Locked.</p>",
        "Ouvert !",
        "<p>Ouvert !</p>",
        "Unlocked!",
        "<p>Unlocked!</p>",
        "Trouvé !",
        "<p>Trouvé !</p>",
        "Found!",
        "<p>Found!</p>",
        "Trouvé.",
        "<p>Trouvé.</p>",
        "Found.",
        "<p>Found.</p>",
        "Déverrouillé !",
        "<p>Déverrouillé !</p>",
        "Code :",
        "<p>Code :</p>",
        "Code:",
        "<p>Code:</p>",
    ]);

    /** Titres / libellés boutons des modales fin (valeurs initiales page éditeur). */
    var END_SCREEN_PLAIN_DEFAULTS = {
        endGameOverTitle: ["Temps écoulé", "Time is up"],
        endVictoryTitle: ["Bravo !", "You win!"],
        endGameOverBtn: ["Rejouer", "Restart"],
        endVictoryBtn: ["Rejouer", "Restart"],
    };

    /**
     * Champs texte simples des écrans de fin (timer) : si la valeur est encore le libellé d’usine, exporter vide.
     * @param {HTMLElement|null} el
     * @returns {string}
     */
    function readTimerEndScreenPlainField(el) {
        if (!el || el.value === undefined) return "";
        var raw = String(el.value).trim();
        var b64 = el.getAttribute && el.getAttribute("data-export-suggest-b64");
        if (b64) {
            var sug = base64ToUtf8(b64);
            if (sug != null && raw === String(sug).trim()) return "";
        }
        var id = el.id || "";
        var defs = END_SCREEN_PLAIN_DEFAULTS[id];
        if (defs) {
            for (var i = 0; i < defs.length; i++) {
                if (raw === defs[i]) return "";
            }
        }
        return el.value;
    }

    global.EditorSharedExportText = {
        utf8ToBase64: utf8ToBase64,
        base64ToUtf8: base64ToUtf8,
        normalizeForExportCompare: normalizeForExportCompare,
        isEffectivelyEmptyRichHtml: isEffectivelyEmptyRichHtml,
        readExportAwareFieldValue: readExportAwareFieldValue,
        stripRichTemplateDefault: stripRichTemplateDefault,
        stripDefaultTransitionButton: stripDefaultTransitionButton,
        sanitizeSelectorChoicesForExport: sanitizeSelectorChoicesForExport,
        registerDefaultSnippet: registerDefaultSnippet,
        readTimerEndScreenPlainField: readTimerEndScreenPlainField,
    };

    global.sanitizeSelectorChoicesForExport = sanitizeSelectorChoicesForExport;
})(typeof window !== "undefined" ? window : this);
