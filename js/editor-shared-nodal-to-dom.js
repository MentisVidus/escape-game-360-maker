/**
 * C6.2 — Projection « état carte nodale (Zustand) → DOM legacy ».
 * Aucune logique FR/EN : lit `window.__escape360EditorDomApi` (rempli par *-app.js).
 *
 * Scènes + hotspots (edges `flow` depuis chaque scène, tri `layout.y`).
 * Satellites : `object` (meta → pick/req `itemId`), `coords-options` / `choice-options` (visibilité + pitch/yaw).
 * SFX actions : nœud `media-audio` lié en meta à l’action ; image 360 scène : `media-image` lié en meta à la scène.
 * Selector : choix reconstruits depuis les actions enfants (`layout.parentId`).
 * Garde ré-entrance : ignore les rappels pendant une passe `apply`.
 */
(function (global) {
    "use strict";

    var applying = false;

    function getApi() {
        return global.__escape360EditorDomApi || null;
    }

    function clone(o) {
        if (o == null || typeof o !== "object") return o;
        try {
            return JSON.parse(JSON.stringify(o));
        } catch (e) {
            return o;
        }
    }

    function defSfx() {
        return { url: "", volume: 1 };
    }

    function defVis() {
        return { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };
    }

    var DEFAULT_HOTSPOT_APP = {
        ui_w: 120,
        ui_h: 120,
        ui_shape: "0px",
        ui_bgc: "#ff0000",
        ui_bga: 0.2,
        ui_img: "",
        ui_brd_style: "none",
        ui_brd_w: 2,
        ui_brd_c: "#ffffff"
    };

    function mergeHotspotAppLo(partial) {
        var o = clone(DEFAULT_HOTSPOT_APP);
        if (!partial || typeof partial !== "object") return o;
        var k;
        for (k in partial) {
            if (Object.prototype.hasOwnProperty.call(partial, k)) o[k] = partial[k];
        }
        return o;
    }

    function byteFromHexPair(hexNoHash, start) {
        var n = parseInt(hexNoHash.slice(start, start + 2), 16);
        if (isNaN(n)) return 0;
        return Math.max(0, Math.min(255, n));
    }

    function hexToRgbaLo(hex, alpha) {
        var h = String(hex || "#ff0000").replace(/^#/, "");
        var r = byteFromHexPair(h, 0);
        var g = byteFromHexPair(h, 2);
        var b = byteFromHexPair(h, 4);
        var a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    }

    /** Même logique que `hotspotAppearance.buildCustomCssFromAppearance` / `EditorSharedUi.buildCss`. */
    function buildCssFromAppLo(app) {
        var a = app || DEFAULT_HOTSPOT_APP;
        var w = Number.isFinite(Number(a.ui_w)) ? Number(a.ui_w) : 120;
        var h = Number.isFinite(Number(a.ui_h)) ? Number(a.ui_h) : 120;
        var shape = a.ui_shape || "0px";
        var bgc = a.ui_bgc || "#ff0000";
        var bga = Number.isFinite(Number(a.ui_bga)) ? Number(a.ui_bga) : 0.2;
        var brdStyle = a.ui_brd_style || "none";
        var brdW = Number.isFinite(Number(a.ui_brd_w)) ? Number(a.ui_brd_w) : 2;
        var brdC = a.ui_brd_c || "#ffffff";
        var img = String(a.ui_img || "").trim();
        var css =
            "width: " +
            w +
            "px; height: " +
            h +
            "px; background: " +
            hexToRgbaLo(bgc, bga) +
            "; border-radius: " +
            shape +
            "; cursor: pointer; display: flex; align-items: center; justify-content: center;";
        if (brdStyle !== "none") {
            css += " border: " + brdW + "px " + brdStyle + " " + brdC + ";";
        }
        if (img) {
            css +=
                " background-image: url('" +
                img.replace(/'/g, "\\'") +
                "'); background-size: contain; background-repeat: no-repeat; background-position: center;";
        }
        return css;
    }

    /** Satellites `meta` dont la source est `actionId`. */
    function metaSatellitesForAction(state, actionId) {
        var edges = state.edges || [];
        var sats = state.satellites || {};
        var out = [];
        var i;
        for (i = 0; i < edges.length; i++) {
            var e = edges[i];
            if (!e || e.family !== "meta" || e.sourceId !== actionId) continue;
            var s = sats[e.targetId];
            if (s) out.push(s);
        }
        return out;
    }

    function objectIdFromSatellite(state, actionId) {
        if (!state) return "";
        var list = metaSatellitesForAction(state, actionId);
        var j;
        for (j = 0; j < list.length; j++) {
            if (list[j].satelliteType === "object" && list[j].data) {
                var oid = String(list[j].data.objectId || "").trim();
                if (oid) return oid;
            }
        }
        return "";
    }

    function coordsFromSatellites(state, actionId) {
        var list = metaSatellitesForAction(state, actionId);
        var j;
        for (j = 0; j < list.length; j++) {
            if (list[j].satelliteType === "coords-options" && list[j].data) {
                var d = list[j].data;
                return {
                    pitch: Number(d.pitch) || 0,
                    yaw: Number(d.yaw) || 0,
                    visibility: clone(d.visibility) || null,
                    sfx: clone(d.sfx) || null,
                    appearance: d.appearance && typeof d.appearance === "object" ? clone(d.appearance) : null,
                    customCss: d.customCss != null ? String(d.customCss) : "",
                    hotspotCssExpert: !!d.hotspotCssExpert
                };
            }
        }
        return {
            pitch: 0,
            yaw: 0,
            visibility: null,
            sfx: null,
            appearance: null,
            customCss: "",
            hotspotCssExpert: false
        };
    }

    function choiceOptionsFromSatellites(state, actionId) {
        var list = metaSatellitesForAction(state, actionId);
        var j;
        for (j = 0; j < list.length; j++) {
            if (list[j].satelliteType === "choice-options" && list[j].data) {
                return {
                    visibility: clone(list[j].data.visibility) || null,
                    sfx: clone(list[j].data.sfx) || null
                };
            }
        }
        return { visibility: null, sfx: null };
    }

    /** Arête meta action → nœud `media-audio` : SFX projeté depuis le média (remplace l’`sfx` de l’action seule). */
    function mediaAudioLinkedFromAction(state, actionId) {
        var edges = state.edges || [];
        var mediaMap = state.media || {};
        var i;
        for (i = 0; i < edges.length; i++) {
            var e = edges[i];
            if (!e || e.family !== "meta" || e.sourceId !== actionId) continue;
            var m = mediaMap[e.targetId];
            if (m && m.mediaType === "media-audio" && m.data) {
                return m;
            }
        }
        return null;
    }

    /** Arête meta scène → nœud `media-image` : URL 360° projetée dans le champ legacy `.sc-img` (prioritaire sur `scene.panoramaUrl`). */
    function mediaImageLinkedFromScene(state, sceneNodeId) {
        var edges = state.edges || [];
        var mediaMap = state.media || {};
        var i;
        for (i = 0; i < edges.length; i++) {
            var e = edges[i];
            if (!e || e.family !== "meta" || e.sourceId !== sceneNodeId) continue;
            var m = mediaMap[e.targetId];
            if (m && m.mediaType === "media-image" && m.data) {
                return m;
            }
        }
        return null;
    }

    function displayNameForObject(state, objectId) {
        if (!state) return "";
        var objs = state.meta && state.meta.objects;
        if (!objs || !objectId) return "";
        var ent = objs[objectId];
        return ent && ent.displayName != null ? String(ent.displayName) : "";
    }

    /**
     * C3 : les choix selector vivent comme actions enfants (`layout.parentId`), pas dans `payload.nested.choices`.
     */
    function selectorNestedWithChildren(state, selectorAction, EditorCore) {
        var pay = selectorAction.payload || {};
        var nest = clone(pay.nested) || {};
        if (!nest.copy) nest.copy = { bodyHtml: "", buttonLabel: "" };
        if (!nest.displayMode) nest.displayMode = "buttons";
        var layout = state.layout || {};
        var actions = state.actions || {};
        var childIds = [];
        var aid;
        for (aid in actions) {
            if (!Object.prototype.hasOwnProperty.call(actions, aid)) continue;
            var L = layout[aid];
            if (L && L.parentId === selectorAction.id) childIds.push(aid);
        }
        childIds.sort(function (a, b) {
            return ((layout[a] || {}).y || 0) - ((layout[b] || {}).y || 0);
        });
        nest.choices = childIds.map(function (cid, idx) {
            var node = actions[cid];
            return {
                id: cid || "choice_" + (idx + 1),
                label: (node && node.label) || "Option " + (idx + 1),
                action: nodalActionToUnified(state, node, actions, EditorCore)
            };
        });
        return nest;
    }

    function nodalActionToUnified(state, actionNode, actionsById, EditorCore) {
        if (!actionNode || !actionNode.actionType) {
            return EditorCore.createDefaultAction("msg");
        }
        var at = actionNode.actionType;
        var sfx = actionNode.sfx || defSfx();
        var vis = actionNode.visibility || defVis();
        var pay = clone(actionNode.payload) || {};

        if (at === "req" || at === "pwd") {
            var rid = actionNode.rewardActionId;
            if (rid && actionsById[rid]) {
                pay.rewardAction = nodalActionToUnified(state, actionsById[rid], actionsById, EditorCore);
            } else if (!pay.rewardAction) {
                pay.rewardAction = EditorCore.createDefaultAction("scene");
            }
        }

        if (at === "pick" || at === "req") {
            pay = clone(pay);
            var fromSat = objectIdFromSatellite(state, actionNode.id);
            var effId = fromSat || String(pay.itemId || "").trim();
            pay.itemId = effId;
            if (at === "pick" && (!pay.itemName || !String(pay.itemName).trim())) {
                pay.itemName = displayNameForObject(state, effId);
            }
        }

        if (at === "selector") {
            pay = clone(pay) || {};
            var nestedSrc = pay.nested;
            var hasChoices = nestedSrc && Array.isArray(nestedSrc.choices) && nestedSrc.choices.length > 0;
            if (!hasChoices) {
                pay.nested = selectorNestedWithChildren(state, actionNode, EditorCore);
            } else {
                pay.nested = clone(nestedSrc);
                pay.nested.choices = pay.nested.choices.map(function (c) {
                    var sub = c && c.action;
                    var ua = sub
                        ? sub.actionType
                            ? nodalActionToUnified(state, sub, actionsById, EditorCore)
                            : sub.type
                              ? sub
                              : EditorCore.createDefaultAction("msg")
                        : EditorCore.createDefaultAction("msg");
                    return { id: c.id, label: c.label, action: ua };
                });
            }
        }
        if (at === "goto") {
            at = "scene";
        }

        var coordsOpt = coordsFromSatellites(state, actionNode.id);
        var choiceOpt = choiceOptionsFromSatellites(state, actionNode.id);
        if (coordsOpt.visibility) {
            vis = {
                requiresItem: coordsOpt.visibility.requiresItem || "",
                hiddenIfHasItem: coordsOpt.visibility.hiddenIfHasItem || "",
                clickWhenInvisible: coordsOpt.visibility.clickWhenInvisible !== false
            };
        } else if (choiceOpt.visibility) {
            vis = {
                requiresItem: choiceOpt.visibility.requiresItem || "",
                hiddenIfHasItem: choiceOpt.visibility.hiddenIfHasItem || "",
                clickWhenInvisible: vis.clickWhenInvisible !== false
            };
        }
        var linkedAudio = mediaAudioLinkedFromAction(state, actionNode.id);
        if (linkedAudio && linkedAudio.data) {
            var av = linkedAudio.data.volume;
            sfx = {
                url: String(linkedAudio.data.url || ""),
                volume: av !== undefined && !isNaN(Number(av)) ? Math.max(0, Math.min(1, Number(av))) : 1
            };
        }

        return {
            type: at,
            payload: pay,
            sfx: sfx,
            visibility: vis
        };
    }

    function nodalActionToHotspotShape(state, actionNode, actionsById, EditorCore) {
        var c = coordsFromSatellites(state, actionNode.id);
        var app = mergeHotspotAppLo(c.appearance);
        var cssTrim = String(c.customCss || "").trim();
        var customCss = cssTrim || buildCssFromAppLo(app);
        return {
            title: actionNode.label != null ? String(actionNode.label) : "",
            pitch: c.pitch,
            yaw: c.yaw,
            customCss: customCss,
            appearance: app,
            action: nodalActionToUnified(state, actionNode, actionsById, EditorCore)
        };
    }

    function flowActionsForScene(state, sceneNodeId) {
        var edges = state.edges || [];
        var actions = state.actions || {};
        var out = [];
        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            if (!e || e.family !== "flow") continue;
            if (e.sourceId !== sceneNodeId) continue;
            var t = e.targetId;
            if (!t || !actions[t]) continue;
            out.push(actions[t]);
        }
        out.sort(function (a, b) {
            var la = (state.layout && state.layout[a.id]) || {};
            var lb = (state.layout && state.layout[b.id]) || {};
            return (la.y || 0) - (lb.y || 0);
        });
        return out;
    }

    function sortedScenes(state) {
        var scenes = state.scenes || {};
        var list = [];
        for (var k in scenes) {
            if (Object.prototype.hasOwnProperty.call(scenes, k)) list.push(scenes[k]);
        }
        list.sort(function (a, b) {
            var la = (state.layout && state.layout[a.id]) || {};
            var lb = (state.layout && state.layout[b.id]) || {};
            return (la.x || 0) - (lb.x || 0);
        });
        return list;
    }

    function findSceneBlock(container, shortId) {
        if (!container) return null;
        var want = String(shortId || "").trim();
        var blocks = container.querySelectorAll(":scope > .scene-block");
        var bi;
        for (bi = 0; bi < blocks.length; bi++) {
            var inp = blocks[bi].querySelector(".sc-id");
            if (inp && String(inp.value || "").trim() === want) return blocks[bi];
        }
        return null;
    }

    function numericSceneIdFromBlock(block) {
        if (!block || !block.id) return NaN;
        var m = /^scene_(\d+)$/.exec(block.id);
        return m ? parseInt(m[1], 10) : NaN;
    }

    function clearHotspotContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    function applyNodalStateToLegacyDom(state) {
        if (applying) return { ok: false, reason: "reentrant" };
        applying = true;
        try {
            var api = getApi();
            if (!api || typeof api.addScene !== "function" || typeof api.addHotspot !== "function") {
                return { ok: false, reason: "missing __escape360EditorDomApi" };
            }
            if (!api.EditorCore || typeof api.actionV2ToLegacyHotspotData !== "function") {
                return { ok: false, reason: "missing EditorCore or actionV2ToLegacyHotspotData" };
            }
            var EditorCore = api.EditorCore;
            var container = document.getElementById("scenes-container");
            if (!container) return { ok: false, reason: "no #scenes-container" };

            var actionsById = state.actions || {};
            var scenes = sortedScenes(state);
            var wantSceneIds = {};
            var si0;
            for (si0 = 0; si0 < scenes.length; si0++) {
                if (scenes[si0] && scenes[si0].sceneId) {
                    wantSceneIds[String(scenes[si0].sceneId).trim()] = true;
                }
            }
            var orphanBlocks = container.querySelectorAll(":scope > .scene-block");
            var oi;
            for (oi = 0; oi < orphanBlocks.length; oi++) {
                var ob = orphanBlocks[oi];
                var scInp = ob.querySelector(".sc-id");
                var shortId = scInp ? String(scInp.value || "").trim() : "";
                if (!shortId || !wantSceneIds[shortId]) {
                    ob.remove();
                }
            }
            if (typeof api.resyncSceneIdCounterFromDom === "function") {
                api.resyncSceneIdCounterFromDom();
            }

            var si;
            for (si = 0; si < scenes.length; si++) {
                var sc = scenes[si];
                if (!sc || !sc.sceneId) continue;
                var block = findSceneBlock(container, sc.sceneId);
                var sNum;
                var linkedImg = mediaImageLinkedFromScene(state, sc.id);
                var panFromMedia =
                    linkedImg && linkedImg.data && String(linkedImg.data.url || "").trim()
                        ? String(linkedImg.data.url).trim()
                        : "";
                var pan =
                    panFromMedia ||
                    (sc.panoramaUrl != null && String(sc.panoramaUrl).trim()) ||
                    EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL;
                var title = sc.label != null ? String(sc.label) : "";
                if (!block) {
                    sNum = api.addScene(sc.sceneId, pan, title);
                    block = document.getElementById("scene_" + sNum);
                } else {
                    sNum = numericSceneIdFromBlock(block);
                    if (isNaN(sNum)) continue;
                    var scImg = block.querySelector(".sc-img");
                    var scTitle = block.querySelector(".sc-title");
                    if (scImg) scImg.value = pan;
                    if (scTitle) scTitle.value = title;
                }
                var hsCont = document.getElementById("hs-container-" + sNum);
                if (!hsCont) continue;
                clearHotspotContainer(hsCont);
                var acts = flowActionsForScene(state, sc.id);
                var ai;
                for (ai = 0; ai < acts.length; ai++) {
                    var hsShape = nodalActionToHotspotShape(state, acts[ai], actionsById, EditorCore);
                    var legacy = api.actionV2ToLegacyHotspotData(hsShape);
                    api.addHotspot(sNum, legacy);
                }
            }
            if (typeof api.refreshAllSceneTargetSelects === "function") {
                api.refreshAllSceneTargetSelects();
            }
            if (typeof api.initAllSceneIdStableFields === "function") {
                api.initAllSceneIdStableFields();
            }
            if (typeof global.refreshProjectMapGraphInPlace === "function") {
                global.refreshProjectMapGraphInPlace();
            }
            return { ok: true, scenes: scenes.length };
        } finally {
            applying = false;
        }
    }

    function snapProjectSlice(raw) {
        if (!raw) return null;
        return {
            meta: raw.meta,
            actions: raw.actions,
            scenes: raw.scenes,
            satellites: raw.satellites,
            media: raw.media,
            edges: raw.edges,
            layout: raw.layout,
            playerPopupTheme: raw.playerPopupTheme || null
        };
    }

    function projectPlayerPopupThemeToDom(theme) {
        if (!theme || typeof document === "undefined") return;
        var useCustom = document.getElementById("useCustomPopup");
        var container = document.getElementById("popup-settings-container");
        var popFont = document.getElementById("pop-font");
        var popColor = document.getElementById("pop-color");
        var popBgc = document.getElementById("pop-bgc");
        var popBga = document.getElementById("pop-bga");
        var popBtnBg = document.getElementById("pop-btn-bg");
        var popBtnCol = document.getElementById("pop-btn-col");

        if (useCustom) useCustom.checked = !!theme.useCustomPopup;
        if (container && useCustom) container.style.display = useCustom.checked ? "flex" : "none";
        if (popFont && theme.popFont != null) popFont.value = String(theme.popFont);
        if (popColor && theme.popColor != null) popColor.value = String(theme.popColor);
        if (popBgc && theme.popBgc != null) popBgc.value = String(theme.popBgc);
        if (popBga && theme.popBga != null) popBga.value = String(theme.popBga);
        if (popBtnBg && theme.popBtnBg != null) popBtnBg.value = String(theme.popBtnBg);
        if (popBtnCol && theme.popBtnCol != null) popBtnCol.value = String(theme.popBtnCol);

        if (typeof global.updatePreview === "function") global.updatePreview();
        if (typeof global.updateQuillTheme === "function") global.updateQuillTheme();
    }

    function applyFromStore(storeApi) {
        if (!storeApi || typeof storeApi.getState !== "function") {
            return { ok: false, reason: "invalid store" };
        }
        var st = snapProjectSlice(storeApi.getState());
        if (!st) return { ok: false, reason: "empty state" };
        var out = applyNodalStateToLegacyDom(st);
        projectPlayerPopupThemeToDom(st.playerPopupTheme);
        return out;
    }

    global.EditorSharedNodalToDom = {
        applyNodalStateToLegacyDom: applyNodalStateToLegacyDom,
        applyFromStore: applyFromStore
    };
})(typeof window !== "undefined" ? window : this);
