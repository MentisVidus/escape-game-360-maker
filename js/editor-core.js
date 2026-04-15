/**
 * @fileoverview Noyau éditeur « headless » — modèle projet & action unifiée (schéma v2).
 * Aucune dépendance DOM : utilisable depuis formulaires HTML, Drawflow, ou plus tard React Flow.
 * Les adaptateurs (editeur-app.js, etc.) font le pont DOM ↔ ce module.
 *
 * Normalisation EC :
 * - Audio : même forme { url, volume } pour musique globale, ambiance de scène, et action.sfx.
 * - Texte : payload.copy { bodyHtml, buttonLabel } pour tout contenu narratif / transition / question / échec ;
 *   selector.nested.copy.bodyHtml pour l’intro du menu.
 */
(function (global) {
    "use strict";

    /** Numéro de schéma pour les fichiers projet JSON v2. */
    var SCHEMA_VERSION = 2;

    /**
     * Panorama 360° par défaut pour les nouvelles scènes : grille équirectangulaire du dépôt,
     * servie via jsDelivr (HTTPS, OK en prévisualisation et file:// évité pour le média lui-même).
     * Fichier source : media/equirectangular_placeholder_grid.png
     */
    var DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL =
        "https://cdn.jsdelivr.net/gh/MentisVidus/escape-game-360-maker@main/media/equirectangular_placeholder_grid.png";

    /**
     * Action unifiée (hotspot simple ou entrée d’un selector).
     * @typedef {Object} UnifiedAction
     * @property {string} type - msg | scene | pick | req | pwd | selector | …
     * @property {Object} payload - champs spécifiques au type (+ copy pour les textes)
     * @property {{ url: string, volume: number }} sfx
     * @property {{ requiresItem: string, hiddenIfHasItem: string, clickWhenInvisible?: boolean }} visibility
     */

    function createDefaultSfx() {
        return { url: "", volume: 1 };
    }

    function createDefaultVisibility() {
        return { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };
    }

    function createDefaultCopy() {
        return { bodyHtml: "", buttonLabel: "" };
    }

    /** Clip audio universel (musique globale, ambiance, SFX). */
    function createDefaultAudioClip() {
        return { url: "", volume: 1 };
    }

    function normalizeCopyObject(copy) {
        if (!copy || typeof copy !== "object") return createDefaultCopy();
        return {
            bodyHtml: copy.bodyHtml != null ? String(copy.bodyHtml) : "",
            buttonLabel: copy.buttonLabel != null ? String(copy.buttonLabel) : ""
        };
    }

    /**
     * @param {*} clip - objet { url, volume } ou chaîne URL (héritage)
     * @param {number} [defaultVolume] - si volume absent
     */
    function normalizeAudioClip(clip, defaultVolume) {
        var dv = defaultVolume != null ? defaultVolume : 1;
        if (typeof clip === "string") {
            return { url: String(clip).trim(), volume: dv };
        }
        if (!clip || typeof clip !== "object") {
            return { url: "", volume: dv };
        }
        var vol = clip.volume;
        if (vol === undefined || vol === null || vol === "" || isNaN(Number(vol))) {
            vol = dv;
        } else {
            vol = Math.max(0, Math.min(1, Number(vol)));
        }
        return {
            url: clip.url != null ? String(clip.url) : "",
            volume: vol
        };
    }

    function normalizeSelectorNested(nested) {
        if (!nested || typeof nested !== "object") return;
        if (!nested.copy || typeof nested.copy !== "object") nested.copy = createDefaultCopy();
        else nested.copy = normalizeCopyObject(nested.copy);
        if (nested.introHtml !== undefined) {
            if (!nested.copy.bodyHtml) nested.copy.bodyHtml = String(nested.introHtml || "");
            delete nested.introHtml;
        }
        var choices = nested.choices;
        if (!Array.isArray(choices)) nested.choices = [];
        else {
            for (var i = 0; i < choices.length; i++) {
                var ch = choices[i];
                if (ch && ch.action) normalizeActionPayload(ch.action);
            }
        }
    }

    function normalizeActionPayload(action) {
        if (!action || typeof action !== "object") return;
        var t = action.type || "msg";
        var p = action.payload;
        if (!p || typeof p !== "object") {
            action.payload = p = {};
        }
        if (!p.copy || typeof p.copy !== "object") p.copy = createDefaultCopy();
        else p.copy = normalizeCopyObject(p.copy);

        if (t === "msg" && p.html !== undefined) {
            if (!p.copy.bodyHtml) p.copy.bodyHtml = String(p.html || "");
            delete p.html;
        }
        if (t === "scene") {
            if (p.transitionHtml !== undefined) {
                if (!p.copy.bodyHtml) p.copy.bodyHtml = String(p.transitionHtml || "");
                delete p.transitionHtml;
            }
            if (p.transitionButton !== undefined) {
                if (!p.copy.buttonLabel) p.copy.buttonLabel = String(p.transitionButton || "");
                delete p.transitionButton;
            }
        }
        if (t === "pick" && p.html !== undefined) {
            if (!p.copy.bodyHtml) p.copy.bodyHtml = String(p.html || "");
            delete p.html;
        }
        if (t === "req" && p.failHtml !== undefined) {
            if (!p.copy.bodyHtml) p.copy.bodyHtml = String(p.failHtml || "");
            delete p.failHtml;
        }
        if (t === "pwd" && p.questionHtml !== undefined) {
            if (!p.copy.bodyHtml) p.copy.bodyHtml = String(p.questionHtml || "");
            delete p.questionHtml;
        }
        if (t === "selector" && p.nested) {
            normalizeSelectorNested(p.nested);
        }
        if ((t === "req" || t === "pwd") && p.rewardAction) {
            normalizeActionPayload(p.rewardAction);
        }
        if (action.sfx && typeof action.sfx === "object") {
            action.sfx = normalizeAudioClip(action.sfx, 1);
        } else {
            action.sfx = createDefaultSfx();
        }
        if (!action.visibility || typeof action.visibility !== "object") {
            action.visibility = createDefaultVisibility();
        } else {
            var vis = action.visibility;
            var cwi = vis.clickWhenInvisible;
            if (cwi === false || cwi === "false" || cwi === 0 || cwi === "no" || cwi === "non") {
                vis.clickWhenInvisible = false;
            } else {
                vis.clickWhenInvisible = true;
            }
        }
    }

    function normalizeSceneMedia(media) {
        var m = media || {};
        var amb = m.ambiance;
        if (amb === undefined && m.ambianceUrl !== undefined) {
            amb = m.ambianceUrl;
        }
        return {
            panoramaUrl: m.panoramaUrl != null ? String(m.panoramaUrl) : "",
            ambiance: normalizeAudioClip(amb, 1)
        };
    }

    /**
     * Applique les formes canoniques v2 (audio + copy) après parse JSON.
     * @param {Object} project
     */
    function normalizeProjectV2(project) {
        if (!project || typeof project !== "object") return;

        if (project.globalMusic && typeof project.globalMusic === "object") {
            project.globalMusic = normalizeAudioClip(project.globalMusic, 0.5);
        } else if (project.globalAudioUrl != null) {
            project.globalMusic = normalizeAudioClip(String(project.globalAudioUrl || ""), 0.5);
            delete project.globalAudioUrl;
        } else {
            project.globalMusic = { url: "", volume: 0.5 };
        }

        var scenes = project.scenes;
        if (!Array.isArray(scenes)) project.scenes = [];
        else {
            for (var s = 0; s < scenes.length; s++) {
                var scene = scenes[s];
                if (!scene || typeof scene !== "object") continue;
                scene.media = normalizeSceneMedia(scene.media);
                var hss = scene.hotspots;
                if (!Array.isArray(hss)) scene.hotspots = [];
                else {
                    for (var h = 0; h < hss.length; h++) {
                        var hs = hss[h];
                        if (hs && hs.action) normalizeActionPayload(hs.action);
                    }
                }
            }
        }
    }

    /**
     * @param {string} [type]
     * @returns {UnifiedAction}
     */
    function createDefaultAction(type) {
        var t = type || "msg";
        var payload = {};
        if (t === "msg") {
            payload.copy = createDefaultCopy();
        } else if (t === "scene") {
            payload.target = "";
            payload.copy = { bodyHtml: "", buttonLabel: "Continuer" };
        } else if (t === "pick") {
            payload.itemId = "";
            payload.itemName = "";
            payload.copy = createDefaultCopy();
        } else if (t === "req") {
            payload.itemId = "";
            payload.copy = createDefaultCopy();
            payload.rewardAction = createDefaultAction("scene");
        } else if (t === "pwd") {
            payload.answer = "";
            payload.copy = createDefaultCopy();
            payload.rewardAction = createDefaultAction("scene");
        } else if (t === "selector") {
            payload.nested = {
                title: "",
                copy: createDefaultCopy(),
                displayMode: "buttons",
                choices: []
            };
        }
        return {
            type: t,
            payload: payload,
            sfx: createDefaultSfx(),
            visibility: createDefaultVisibility()
        };
    }

    /**
     * Projet vide conforme au schéma v2 normalisé.
     * @returns {Object}
     */
    function createEmptyProject() {
        return {
            schemaVersion: SCHEMA_VERSION,
            title: "Mon Super Jeu",
            useInv: true,
            invPos: "top-right",
            invIcon: "🎒",
            invBgc: "#000000",
            invBga: 0.8,
            invColor: "#ffffff",
            useCustomPopup: false,
            useGlobalAudio: false,
            globalMusic: { url: "", volume: 0.5 },
            popFont: "Arial, sans-serif",
            popColor: "#ffffff",
            popBgc: "#000000",
            popBga: 0.9,
            popBtnBg: "#27ae60",
            popBtnCol: "#ffffff",
            scenes: []
        };
    }

    /**
     * @param {Object} project
     * @returns {string}
     */
    function serializeProject(project) {
        return JSON.stringify(project, null, 2);
    }

    /**
     * Parse JSON brut du schéma v2 uniquement ; normalise les alias hérités (globalAudioUrl, ambianceUrl, anciens champs texte).
     * @param {string} text
     * @returns {Object}
     */
    function parseProjectJSON(text) {
        var o = JSON.parse(text);
        if (!o || typeof o !== "object") {
            throw new Error("EditorCore: projet JSON invalide");
        }
        if (o.schemaVersion !== SCHEMA_VERSION) {
            throw new Error(
                "EditorCore: format obsolète ou incompatible (schemaVersion=" +
                    String(o.schemaVersion) +
                    ", attendu=" +
                    String(SCHEMA_VERSION) +
                    ")"
            );
        }
        normalizeProjectV2(o);
        return o;
    }

    /**
     * @param {Object} project
     * @returns {boolean}
     */
    function isSchemaV2(project) {
        return project && project.schemaVersion === SCHEMA_VERSION;
    }

    var EditorCore = {
        SCHEMA_VERSION: SCHEMA_VERSION,
        DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL: DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL,
        createEmptyProject: createEmptyProject,
        createDefaultAction: createDefaultAction,
        createDefaultSfx: createDefaultSfx,
        createDefaultVisibility: createDefaultVisibility,
        createDefaultCopy: createDefaultCopy,
        createDefaultAudioClip: createDefaultAudioClip,
        normalizeProjectV2: normalizeProjectV2,
        serializeProject: serializeProject,
        parseProjectJSON: parseProjectJSON,
        isSchemaV2: isSchemaV2
    };

    global.EditorCore = EditorCore;
})(typeof window !== "undefined" ? window : this);
