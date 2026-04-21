/**
 * Carte Drawflow à partir du JSON projet (getCurrentProjectData).
 * - focus : une scène active + hotspots ; cibles compactes (double-clic).
 * - full : graphe complet.
 * - tree : flux gauche → droite depuis la 1re scène ; renvois vers scènes déjà vues = nœud alias.
 */
(function () {
    "use strict";

    var SELECTOR_GRAPH_MAX_DEPTH = 48;

    /**
     * Accumule les IDs de scènes cibles depuis une action V2 (récursif pour selector).
     */
    function collectTargetSceneIdsFromAction(action, hsLegacy, outMap, depthLeft) {
        if (!action || typeof action !== "object" || depthLeft <= 0) return;
        var p = action.payload || {};
        var t = action.type;
        if (t === "scene") {
            var v = (p.target || (hsLegacy && hsLegacy.f_target) || "").trim();
            if (v) outMap[v] = true;
            return;
        }
        if (t === "req") {
            var rr = p.rewardAction || {};
            if ((rr.type || (hsLegacy && hsLegacy.f_req_action)) !== "scene") return;
            var r = ((rr.payload && rr.payload.target) || (hsLegacy && hsLegacy.f_target) || "").trim();
            if (r) outMap[r] = true;
            return;
        }
        if (t === "pwd") {
            var rp = p.rewardAction || {};
            if ((rp.type || (hsLegacy && hsLegacy.f_pwd_action)) !== "scene") return;
            var pt = ((rp.payload && rp.payload.target) || (hsLegacy && hsLegacy.f_target) || "").trim();
            if (pt) outMap[pt] = true;
            return;
        }
        if (t === "selector") {
            var nested = p.nested || {};
            var choices = Array.isArray(nested.choices) ? nested.choices : [];
            for (var ci = 0; ci < choices.length; ci++) {
                var ch = choices[ci];
                if (ch && ch.action) {
                    collectTargetSceneIdsFromAction(ch.action, null, outMap, depthLeft - 1);
                }
            }
        }
    }

    /**
     * Toutes les scènes atteignables depuis un hotspot (direct + choix de selector imbriqués).
     * @returns {string[]}
     */
    function getTargetSceneIdsFromHotspot(hs) {
        var out = {};
        if (!hs) return [];
        var a = hs.action;
        if (!a || typeof a !== "object") {
            a = hs;
        }
        collectTargetSceneIdsFromAction(a, hs, out, SELECTOR_GRAPH_MAX_DEPTH);
        return Object.keys(out);
    }

    /**
     * Première cible (compat. ancien code) — préférer getTargetSceneIdsFromHotspot pour le graphe.
     */
    function getTargetSceneIdFromHotspot(hs) {
        var ids = getTargetSceneIdsFromHotspot(hs);
        return ids.length ? ids[0] : null;
    }

    function escapeHtml(s) {
        var d = document.createElement("div");
        d.textContent = s == null ? "" : String(s);
        return d.innerHTML;
    }

    /** Clé stable pour indexation (JSON V2 : scene.id). */
    function sceneKey(scene, index) {
        var k = scene && scene.id != null ? String(scene.id).trim() : "";
        if (k) return k;
        if (scene && scene.scId != null && String(scene.scId).trim()) {
            return String(scene.scId).trim();
        }
        return "__idx_" + index;
    }

    function sceneTitleForGraph(scene, index) {
        if (!scene) return "Scène " + (index + 1);
        var title = scene.title != null ? String(scene.title).trim() : "";
        if (title) return title;
        if (scene.scTitle != null && String(scene.scTitle).trim()) {
            return String(scene.scTitle).trim();
        }
        var id = scene.id != null ? String(scene.id).trim() : "";
        if (id) return id;
        if (scene.scId != null && String(scene.scId).trim()) {
            return String(scene.scId).trim();
        }
        return "Scène " + (index + 1);
    }

    /** Titre / id affichable ; si la scène n’a ni titre ni id métier, utilise keyFallback (ex. clé graphe). */
    function sceneLabelWithFallback(scene, index, keyFallback) {
        if (!scene) return keyFallback != null ? String(keyFallback) : "—";
        var hasAny =
            (scene.title && String(scene.title).trim()) ||
            (scene.id && String(scene.id).trim()) ||
            (scene.scTitle && String(scene.scTitle).trim()) ||
            (scene.scId && String(scene.scId).trim());
        if (!hasAny && keyFallback != null && String(keyFallback).trim()) {
            return String(keyFallback).trim();
        }
        return sceneTitleForGraph(scene, index);
    }

    function sceneIdLabel(scene) {
        if (!scene) return "—";
        var id = scene.id != null ? String(scene.id).trim() : "";
        if (id) return id;
        if (scene.scId != null && String(scene.scId).trim()) {
            return String(scene.scId).trim();
        }
        return "—";
    }

    function hotspotLabel(hs, index) {
        if (!hs) return "Hotspot " + (index + 1);
        var t = hs.title != null ? String(hs.title).trim() : "";
        if (t) return t;
        if (hs.hsTitle != null && String(hs.hsTitle).trim()) {
            return String(hs.hsTitle).trim();
        }
        return "Hotspot " + (index + 1);
    }

    function hotspotActionType(hs) {
        if (hs && hs.action && hs.action.type) return String(hs.action.type);
        if (hs && hs.type) return String(hs.type);
        return "?";
    }

    function findSceneByKey(project, key) {
        var scenes = project.scenes || [];
        for (var i = 0; i < scenes.length; i++) {
            var sk = sceneKey(scenes[i], i);
            if (sk === key) return { scene: scenes[i], index: i, key: sk };
        }
        return null;
    }

    function sceneNodeHtml(title, scId, collapsed) {
        var en = document.documentElement.lang === "en";
        var labScene = en ? "Scene" : "Scène";
        var labId = en ? "ID:" : "ID :";
        var extraClass = collapsed ? " xflow-node-scene-collapsed" : "";
        var hint = "";
        if (collapsed) {
            hint =
                '<div class="xflow-node-collapsed-hint">' +
                (en ? "Double-click to focus" : "Double-clic pour ouvrir") +
                "</div>";
        }
        return (
            '<div class="xflow-node-scene' +
            extraClass +
            '">' +
            '<div class="xflow-node-title">' +
            labScene +
            (collapsed ? " · " + (en ? "compact" : "aperçu") : "") +
            "</div>" +
            '<div class="xflow-node-body">' +
            escapeHtml(title) +
            "</div>" +
            '<div class="xflow-node-sub">' +
            labId +
            ' <code style="font-size:0.75rem;">' +
            escapeHtml(scId || "—") +
            "</code></div>" +
            hint +
            "</div>"
        );
    }

    function hotspotNodeHtml(label, actionType) {
        var at = actionType || "?";
        var en = document.documentElement.lang === "en";
        var labAction = en ? "Action:" : "Action :";
        return (
            '<div class="xflow-node-hotspot">' +
            '<div class="xflow-node-title">Hotspot</div>' +
            '<div class="xflow-node-body">' +
            escapeHtml(label) +
            "</div>" +
            '<div class="xflow-node-sub">' +
            labAction +
            " " +
            escapeHtml(at) +
            "</div></div>"
        );
    }

    /** @type {{ parent: Node, nextSibling: Node|null, el: HTMLElement }|null} */
    var _projectMapPanelStash = null;
    /** Après nodeUnselected : rafraîchir le graphe au prochain tick si aucun nodeSelected n’annule (évite le cas A→B). */
    var _projectMapGraphRefreshPending = false;

    function restoreProjectMapSidePanelDomOnly() {
        if (_projectMapPanelStash && _projectMapPanelStash.el && _projectMapPanelStash.parent) {
            try {
                _projectMapPanelStash.parent.insertBefore(
                    _projectMapPanelStash.el,
                    _projectMapPanelStash.nextSibling
                );
            } catch (e) {
                _projectMapPanelStash.parent.appendChild(_projectMapPanelStash.el);
            }
        }
        _projectMapPanelStash = null;
        var content = document.getElementById("project-map-side-content");
        if (content) {
            while (content.firstChild) {
                content.removeChild(content.firstChild);
            }
        }
        var panel = document.getElementById("project-map-side-panel");
        if (panel) {
            panel.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
        }
        var body = document.getElementById("project-map-body");
        if (body) body.classList.remove("project-map-side-open");
    }

    /**
     * Regénère le graphe (même mode / même scène focus) après édition dans le panneau.
     */
    function refreshProjectMapGraphInPlace() {
        var modal = document.getElementById("project-map-modal");
        if (!modal || modal.style.display === "none") return;
        if (window.__useReactProjectMap) {
            restoreProjectMapSidePanelDomOnly();
            document.dispatchEvent(new CustomEvent("react-project-map", { detail: { type: "refresh" } }));
            return;
        }
        var ed = window._projectMapEditor;
        if (!ed || typeof getCurrentProjectData !== "function") return;
        restoreProjectMapSidePanelDomOnly();
        var project = getCurrentProjectData();
        var mode = window._projectMapViewMode || "focus";
        var opts = { viewMode: mode };
        if (mode === "focus") {
            var k = window._projectMapActiveSceneKey;
            if ((k == null || k === "") && project.scenes && project.scenes.length > 0) {
                k = sceneKey(project.scenes[0], 0);
            }
            opts.activeSceneKey = k;
        }
        ed.clear();
        generateGraphFromJson(ed, project, opts, true);
        updateProjectMapToolbar(mode);
    }

    function scheduleProjectMapGraphRefreshAfterDeselect() {
        _projectMapGraphRefreshPending = true;
        setTimeout(function () {
            if (!_projectMapGraphRefreshPending) return;
            _projectMapGraphRefreshPending = false;
            refreshProjectMapGraphInPlace();
        }, 0);
    }

    function findSceneBlockByIndex(sceneIndex) {
        var container = document.getElementById("scenes-container");
        if (!container || typeof sceneIndex !== "number" || sceneIndex < 0) return null;
        var blocks = container.querySelectorAll(":scope > .scene-block");
        return blocks[sceneIndex] || null;
    }

    /** Scène hors conteneur (ex. panneau latéral carte) ou dans le conteneur, par id logique. */
    function findSceneBlockBySceneKey(sceneKey) {
        if (sceneKey == null || String(sceneKey).trim() === "") return null;
        var want = String(sceneKey).trim();
        var all = document.querySelectorAll(".scene-block");
        for (var i = 0; i < all.length; i++) {
            var sid = all[i].querySelector(".sc-id");
            if (sid && String(sid.value || "").trim() === want) return all[i];
        }
        return null;
    }

    function findHotspotBlockByIndices(sceneIndex, hotspotIndex, sceneKey) {
        var sceneEl = findSceneBlockByIndex(sceneIndex);
        if (!sceneEl && sceneKey) sceneEl = findSceneBlockBySceneKey(sceneKey);
        if (!sceneEl || typeof hotspotIndex !== "number" || hotspotIndex < 0) return null;
        var wrap = sceneEl.querySelector('[id^="hs-container-"]');
        if (!wrap) return null;
        var hss = wrap.querySelectorAll(":scope > .hotspot-block");
        return hss[hotspotIndex] || null;
    }

    function focusSelectorChoiceCardInHotspot(hotspotEl, choicePath) {
        if (!hotspotEl) return;
        var path = Array.isArray(choicePath)
            ? choicePath
            : typeof choicePath === "number" && !isNaN(choicePath)
              ? [choicePath]
              : [];
        if (path.length === 0 || path.some(function (x) { return typeof x !== "number" || x < 0; })) return;
        var idMatch = /^hs_(\d+)$/.exec(hotspotEl.id || "");
        if (!idMatch) return;
        var hId = parseInt(idMatch[1], 10);
        if (isNaN(hId)) return;

        var typeSel = hotspotEl.querySelector(".hs-type");
        if (typeSel && typeSel.value !== "selector") {
            typeSel.value = "selector";
            if (typeof updateHsFields === "function") updateHsFields(hId);
        }
        if (typeof initSelectorChoicesForm === "function") initSelectorChoicesForm(hId);

        var root = hotspotEl.querySelector("#sel_choices_root_" + hId);
        if (!root) return;
        var container = root;
        var card = null;
        for (var pi = 0; pi < path.length; pi++) {
            var cards = container.querySelectorAll(":scope > .sel-choice-card");
            card = cards[path[pi]];
            if (!card) return;
            if (pi < path.length - 1) {
                var nestedList =
                    card.querySelector(".sel-nested-list") ||
                    card.querySelector(".sel-reward-nested-list");
                if (!nestedList) return;
                container = nestedList;
            }
        }
        if (!card) return;
        try {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
            card.scrollIntoView();
        }
        var prev = card.style.outline;
        card.style.outline = "2px solid #f39c12";
        setTimeout(function () {
            card.style.outline = prev || "";
        }, 1300);
    }

    function mountEditorGlobalSettingsInSidePanel() {
        var root = document.getElementById("editor-global-root");
        if (!root) return;
        var en = document.documentElement.lang === "en";
        var title = en ? "Global game settings" : "Paramètres généraux";
        mountBlockInSidePanel(root, title);
    }

    function mountProjectMapSidePanelElement(el, titleText) {
        if (!el) return;
        var title = titleText;
        if (!title) {
            var en = document.documentElement.lang === "en";
            var st = el.querySelector(".sc-title");
            var sid = el.querySelector(".sc-id");
            title =
                (st && st.value.trim()) ||
                (sid && sid.value.trim()) ||
                (en ? "Scene" : "Scène");
        }
        mountBlockInSidePanel(el, title);
    }

    function filterProjectForNarrationSkeleton(project) {
        var p;
        try {
            p = JSON.parse(JSON.stringify(project));
        } catch (e) {
            return project;
        }
        var scenes = p.scenes || [];
        var validIds = {};
        var si;
        for (si = 0; si < scenes.length; si++) {
            var s = scenes[si];
            var id = s && s.id != null ? String(s.id).trim() : "";
            if (id) validIds[id] = true;
        }
        function keepHotspot(hs) {
            var ids = getTargetSceneIdsFromHotspot(hs);
            var i;
            for (i = 0; i < ids.length; i++) {
                var t = (ids[i] || "").trim();
                if (t && validIds[t]) return true;
            }
            return false;
        }
        for (si = 0; si < scenes.length; si++) {
            var sc = scenes[si];
            if (!sc || !Array.isArray(sc.hotspots)) continue;
            sc.hotspots = sc.hotspots.filter(keepHotspot);
        }
        return p;
    }

    function mountBlockInSidePanel(el, titleText) {
        restoreProjectMapSidePanelDomOnly();
        if (!el) return;
        var rfWrap = document.getElementById("react-map-root");
        if (rfWrap) {
            var ae = document.activeElement;
            if (ae && rfWrap.contains(ae) && typeof ae.blur === "function") {
                try {
                    ae.blur();
                } catch (e) {
                    /* ignore */
                }
            }
        }
        var parent = el.parentNode;
        var nextSibling = el.nextSibling;
        _projectMapPanelStash = { parent: parent, nextSibling: nextSibling, el: el };
        var content = document.getElementById("project-map-side-content");
        var panel = document.getElementById("project-map-side-panel");
        var titleEl = document.getElementById("project-map-side-title");
        if (titleEl) titleEl.textContent = titleText || "";
        if (content) content.appendChild(el);
        if (panel) {
            panel.classList.add("is-open");
            panel.setAttribute("aria-hidden", "false");
        }
        var body = document.getElementById("project-map-body");
        if (body) body.classList.add("project-map-side-open");
    }

    /**
     * Montage panneau latéral depuis les métadonnées d’un nœud (Drawflow ou React Flow).
     * @param {object|null|undefined} d — node.data (kind scene|hotspot|redirect)
     */
    function mountProjectMapSelectionFromMapData(d) {
        var mode = window._projectMapViewMode;
        if (mode !== "focus" && mode !== "tree" && mode !== "full") return;
        if (!d || d.kind === "redirect") return;

        var el = null;
        var title = "";
        var en = document.documentElement.lang === "en";
        if (d.kind === "scene" && typeof d.sceneIndex === "number") {
            el =
                findSceneBlockByIndex(d.sceneIndex) ||
                (d.sceneKey ? findSceneBlockBySceneKey(d.sceneKey) : null);
            title = d.label || (en ? "Scene" : "Scène");
        } else if (
            d.kind === "hotspot" &&
            typeof d.sceneIndex === "number" &&
            typeof d.hotspotIndex === "number"
        ) {
            el = findHotspotBlockByIndices(d.sceneIndex, d.hotspotIndex, d.parentSceneKey);
            title = d.label || "Hotspot";
        } else if (
            d.kind === "selectorChoice" &&
            typeof d.sceneIndex === "number" &&
            typeof d.hotspotIndex === "number" &&
            (Array.isArray(d.choicePath) ||
                (typeof d.choiceIndex === "number" && !isNaN(d.choiceIndex)))
        ) {
            el = findHotspotBlockByIndices(d.sceneIndex, d.hotspotIndex, d.parentSceneKey);
            title = d.label || (en ? "Choice" : "Choix");
        } else if (d.kind === "resource") {
            if (typeof d.sceneIndex === "number" && typeof d.hotspotIndex === "number") {
                el = findHotspotBlockByIndices(d.sceneIndex, d.hotspotIndex, d.parentSceneKey);
                title = d.label || (en ? "Resource" : "Ressource");
            } else if (typeof d.sceneIndex === "number") {
                el =
                    findSceneBlockByIndex(d.sceneIndex) ||
                    (d.sceneKey ? findSceneBlockBySceneKey(d.sceneKey) : null);
                title = d.label || (en ? "Resource" : "Ressource");
            }
        }
        if (!el) return;
        if (
            _projectMapPanelStash &&
            _projectMapPanelStash.el &&
            _projectMapPanelStash.el === el &&
            document.getElementById("project-map-side-content") &&
            document.getElementById("project-map-side-content").contains(el)
        ) {
            var titleKeep = document.getElementById("project-map-side-title");
            if (titleKeep) titleKeep.textContent = title || "";
            return;
        }
        mountBlockInSidePanel(el, title);
        var choicePathForFocus = null;
        if (d.kind === "selectorChoice") {
            choicePathForFocus = Array.isArray(d.choicePath)
                ? d.choicePath
                : typeof d.choiceIndex === "number"
                  ? [d.choiceIndex]
                  : null;
        } else if (d.kind === "resource" && d.resourceType === "choiceSfx") {
            choicePathForFocus = Array.isArray(d.choicePath)
                ? d.choicePath
                : typeof d.choiceIndex === "number"
                  ? [d.choiceIndex]
                  : null;
        }
        if (choicePathForFocus && choicePathForFocus.length > 0) {
            focusSelectorChoiceCardInHotspot(el, choicePathForFocus);
        }
    }

    function onProjectMapNodeSelected(nodeId) {
        var ed = window._projectMapEditor;
        if (!ed || typeof ed.getNodeFromId !== "function") return;
        var node = ed.getNodeFromId(String(nodeId));
        if (!node || !node.data) return;
        mountProjectMapSelectionFromMapData(node.data);
    }

    function setReactProjectMapLayout(active) {
        var wrap = document.getElementById("project-map-canvas-wrap");
        var draw = document.getElementById("project-drawflow");
        if (!wrap || !draw) return;
        if (active) {
            wrap.classList.add("project-map-react-primary");
            draw.style.display = "none";
        } else {
            wrap.classList.remove("project-map-react-primary");
            draw.style.display = "";
        }
    }

    function ensureProjectMapDrawflowEvents() {
        var ed = window._projectMapEditor;
        if (!ed || window._projectMapDrawflowEventsBound) return;
        if (typeof ed.on === "function") {
            ed.on("nodeSelected", function (id) {
                _projectMapGraphRefreshPending = false;
                onProjectMapNodeSelected(id);
            });
            ed.on("nodeUnselected", function () {
                restoreProjectMapSidePanelDomOnly();
                scheduleProjectMapGraphRefreshAfterDeselect();
            });
        }
        window._projectMapDrawflowEventsBound = true;
    }

    function ensureProjectMapSideCloseButton() {
        var btn = document.getElementById("project-map-side-close");
        if (!btn || btn._projectMapSideCloseBound) return;
        btn.addEventListener("click", function () {
            restoreProjectMapSidePanelDomOnly();
            refreshProjectMapGraphInPlace();
        });
        btn._projectMapSideCloseBound = true;
    }

    function ensureProjectMapFabButtons() {
        var gear = document.getElementById("project-map-fab-settings");
        var addSceneBtn = document.getElementById("project-map-fab-add-scene");
        if (gear && !gear._projectMapFabBound) {
            gear.addEventListener("click", function (ev) {
                ev.preventDefault();
                mountEditorGlobalSettingsInSidePanel();
            });
            gear._projectMapFabBound = true;
        }
        if (addSceneBtn && !addSceneBtn._projectMapFabAddBound) {
            addSceneBtn.addEventListener("click", function (ev) {
                ev.preventDefault();
                if (typeof window.addSceneFromMap === "function") {
                    window.addSceneFromMap();
                }
            });
            addSceneBtn._projectMapFabAddBound = true;
        }
    }

    function ensureProjectMapNarrationCheckbox() {
        var cb = document.getElementById("project-map-narration-only");
        if (!cb || cb._projectMapNarrationBound) return;
        cb.addEventListener("change", function () {
            refreshProjectMapGraphInPlace();
        });
        cb._projectMapNarrationBound = true;
    }

    /**
     * Positions pour la vue complète : BFS depuis la 1re scène = « profondeur » (flux gauche → droite).
     * Scènes non atteignables depuis l’entrée : colonne supplémentaire après le max.
     */
    function computeFullViewPositionsByDepth(project) {
        var scenes = project.scenes || [];
        var posByKey = {};
        if (scenes.length === 0) return posByKey;

        var entryKey = sceneKey(scenes[0], 0);
        var queue = [{ key: entryKey, level: 0 }];
        var visited = new Set();
        var levelByKey = {};

        while (queue.length > 0) {
            var cur = queue.shift();
            var k = cur.key;
            var lv = cur.level;
            if (visited.has(k)) continue;
            visited.add(k);
            levelByKey[k] = lv;

            var meta = findSceneByKey(project, k);
            if (!meta) continue;
            var hsList = Array.isArray(meta.scene.hotspots) ? meta.scene.hotspots : [];
            for (var hi = 0; hi < hsList.length; hi++) {
                var tids = getTargetSceneIdsFromHotspot(hsList[hi]);
                for (var ti = 0; ti < tids.length; ti++) {
                    var t = tids[ti];
                    if (t && findSceneByKey(project, t) && !visited.has(t)) {
                        queue.push({ key: t, level: lv + 1 });
                    }
                }
            }
        }

        var maxL = 0;
        Object.keys(levelByKey).forEach(function (k2) {
            maxL = Math.max(maxL, levelByKey[k2]);
        });

        scenes.forEach(function (scene, si) {
            var sk = sceneKey(scene, si);
            if (levelByKey[sk] === undefined) {
                levelByKey[sk] = maxL + 1;
            }
        });

        maxL = 0;
        Object.keys(levelByKey).forEach(function (k3) {
            maxL = Math.max(maxL, levelByKey[k3]);
        });

        var byLevel = {};
        scenes.forEach(function (scene, si) {
            var sk = sceneKey(scene, si);
            var lev = levelByKey[sk];
            if (!byLevel[lev]) byLevel[lev] = [];
            byLevel[lev].push(sk);
        });

        var LEVEL_DX = 520;
        var ROW_DY = 280;
        var ORIGIN_X = 50;
        var ORIGIN_Y = 50;

        Object.keys(byLevel)
            .map(function (x) {
                return parseInt(x, 10);
            })
            .sort(function (a, b) {
                return a - b;
            })
            .forEach(function (lev) {
                var list = byLevel[lev];
                for (var j = 0; j < list.length; j++) {
                    posByKey[list[j]] = {
                        sx: ORIGIN_X + lev * LEVEL_DX,
                        sy: ORIGIN_Y + j * ROW_DY
                    };
                }
            });

        return posByKey;
    }

    /** Graphe complet : colonnes = profondeur depuis la scène d’entrée ; hotspots à droite de chaque scène. */
    function generateGraphFull(editor, project) {
        var scenes = project.scenes;
        var sceneKeyToDrawflowId = {};
        var posByKey = computeFullViewPositionsByDepth(project);
        var HS_OFFSET_X = 240;
        var HS_OFFSET_Y = 30;
        var HS_STEP_Y = 108;

        scenes.forEach(function (scene, si) {
            var sk = sceneKey(scene, si);
            var title = sceneTitleForGraph(scene, si);
            var html = sceneNodeHtml(title, sceneIdLabel(scene), false);
            var data = {
                kind: "scene",
                scId: sceneIdLabel(scene),
                sceneKey: sk,
                sceneIndex: si,
                label: title,
                viewMode: "full"
            };
            var p = posByKey[sk] || { sx: 50, sy: 50 + si * 280 };
            var sx = p.sx;
            var sy = p.sy;
            var nid = editor.addNode("scene", 1, 1, sx, sy, "xflow-node-scene xflow-node-full-scene", data, html);
            sceneKeyToDrawflowId[sk] = nid;
        });

        scenes.forEach(function (scene, si) {
            var sk = sceneKey(scene, si);
            var sceneNodeId = sceneKeyToDrawflowId[sk];
            if (sceneNodeId === undefined) return;

            var p = posByKey[sk] || { sx: 50, sy: 50 + si * 280 };
            var sx = p.sx;
            var sy = p.sy;

            var hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
            hotspots.forEach(function (hs, hi) {
                var label = hotspotLabel(hs, hi);
                var at = hotspotActionType(hs);
                var html = hotspotNodeHtml(label, at);
                var data = {
                    kind: "hotspot",
                    parentSceneKey: sk,
                    parentScId: sceneIdLabel(scene),
                    sceneIndex: si,
                    hotspotIndex: hi,
                    index: hi,
                    type: at,
                    label: label
                };
                var hx = sx + HS_OFFSET_X;
                var hy = sy + HS_OFFSET_Y + hi * HS_STEP_Y;
                var hsNid = editor.addNode("hotspot", 1, 1, hx, hy, "xflow-node-hotspot", data, html);

                try {
                    editor.addConnection(sceneNodeId, hsNid, "output_1", "input_1");
                } catch (e) {
                    console.warn("[Map] Scene → hotspot connection:", e);
                }

                var targetIds = getTargetSceneIdsFromHotspot(hs);
                for (var tj = 0; tj < targetIds.length; tj++) {
                    var targetId = targetIds[tj];
                    var targetNid = sceneKeyToDrawflowId[targetId];
                    if (targetNid !== undefined) {
                        try {
                            editor.addConnection(hsNid, targetNid, "output_1", "input_1");
                        } catch (e2) {
                            console.warn("[Map] Hotspot → scene connection:", e2);
                        }
                    } else {
                        console.warn("[Map] Unknown target scene id:", targetId, "(hotspot:", label + ")");
                    }
                }
            });
        });
    }

    /**
     * Vue focalisée : une scène active (détail + hotspots) ; les cibles de transition en blocs compacts.
     */
    function generateGraphFocus(editor, project, activeSceneKey) {
        var scenes = project.scenes || [];
        if (scenes.length === 0) return;

        var resolved = findSceneByKey(project, activeSceneKey);
        if (!resolved) {
            resolved = { scene: scenes[0], index: 0, key: sceneKey(scenes[0], 0) };
        }

        var activeKey = resolved.key;
        var activeScene = resolved.scene;
        var sceneKeyToDrawflowId = {};

        var ACTIVE_X = 80;
        var ACTIVE_Y = 220;
        var HS_X = 380;
        var HS_START_Y = 60;
        var HS_STEP = 112;
        var STUB_X = 700;
        var STUB_START_Y = 80;
        var STUB_STEP = 100;

        var activeTitle = sceneTitleForGraph(activeScene, resolved.index);
        var activeHtml = sceneNodeHtml(activeTitle, sceneIdLabel(activeScene), false);
        var activeData = {
            kind: "scene",
            scId: sceneIdLabel(activeScene),
            sceneKey: activeKey,
            sceneIndex: resolved.index,
            label: activeTitle,
            viewMode: "active"
        };
        var activeNid = editor.addNode(
            "scene",
            1,
            1,
            ACTIVE_X,
            ACTIVE_Y,
            "xflow-node-scene xflow-node-scene-active",
            activeData,
            activeHtml
        );
        sceneKeyToDrawflowId[activeKey] = activeNid;

        var hotspots = Array.isArray(activeScene.hotspots) ? activeScene.hotspots : [];
        var uniqueTargets = [];
        hotspots.forEach(function (hs) {
            var tids = getTargetSceneIdsFromHotspot(hs);
            for (var ut = 0; ut < tids.length; ut++) {
                var tid = tids[ut];
                if (!tid || tid === activeKey) continue;
                if (uniqueTargets.indexOf(tid) !== -1) continue;
                if (findSceneByKey(project, tid)) uniqueTargets.push(tid);
            }
        });

        uniqueTargets.forEach(function (tid, ti) {
            var meta = findSceneByKey(project, tid);
            if (!meta) return;
            var tTitle = sceneLabelWithFallback(meta.scene, meta.index, tid);
            var stubHtml = sceneNodeHtml(tTitle, sceneIdLabel(meta.scene), true);
            var stubData = {
                kind: "scene",
                scId: sceneIdLabel(meta.scene),
                sceneKey: tid,
                sceneIndex: meta.index,
                label: tTitle,
                viewMode: "collapsed"
            };
            var y = STUB_START_Y + ti * STUB_STEP;
            var nid = editor.addNode(
                "scene",
                1,
                1,
                STUB_X,
                y,
                "xflow-node-scene xflow-node-scene-collapsed",
                stubData,
                stubHtml
            );
            sceneKeyToDrawflowId[tid] = nid;
        });

        hotspots.forEach(function (hs, hi) {
            var label = hotspotLabel(hs, hi);
            var at = hotspotActionType(hs);
            var html = hotspotNodeHtml(label, at);
            var data = {
                kind: "hotspot",
                parentSceneKey: activeKey,
                parentScId: sceneIdLabel(activeScene),
                sceneIndex: resolved.index,
                hotspotIndex: hi,
                index: hi,
                type: at,
                label: label
            };
            var y = HS_START_Y + hi * HS_STEP;
            var hsNid = editor.addNode("hotspot", 1, 1, HS_X, y, "xflow-node-hotspot", data, html);

            try {
                editor.addConnection(activeNid, hsNid, "output_1", "input_1");
            } catch (e) {
                console.warn("[Map] Scene → hotspot connection:", e);
            }

            var targetIds = getTargetSceneIdsFromHotspot(hs);
            for (var tk = 0; tk < targetIds.length; tk++) {
                var targetId = targetIds[tk];
                var targetNid = sceneKeyToDrawflowId[targetId];
                if (targetNid !== undefined) {
                    try {
                        editor.addConnection(hsNid, targetNid, "output_1", "input_1");
                    } catch (e2) {
                        console.warn("[Map] Hotspot → scene connection:", e2);
                    }
                } else {
                    console.warn("[Map] Unknown target scene id:", targetId, "(hotspot:", label + ")");
                }
            }
        });

        window._projectMapActiveSceneKey = activeKey;
    }

    /**
     * Vue acyclique (viewMode tree) : entrée = première scène, expansion vers la droite.
     * visitedFull : scènes déjà « pleines » ; retour vers une scène déjà vue → nœud Renvoi.
     */
    function generateGraphTree(editor, project) {
        var scenes = project.scenes || [];
        if (scenes.length === 0) return;

        var HS_STEP = 108;
        var HOTSPOT_DX = 230;
        var SUBTREE_GAP = 72;
        var REDIRECT_DX = 380;
        var TARGET_STAGGER_Y = 88;

        var visitedFull = new Set();

        function redirectNodeHtml(targetKey) {
            var meta = findSceneByKey(project, targetKey);
            var title = sceneLabelWithFallback(meta ? meta.scene : null, meta ? meta.index : 0, targetKey);
            var en = document.documentElement.lang === "en";
            var head = en ? "Shortcut" : "Renvoi";
            var body = en ? "Back: " + title : "Renvoi : " + title;
            return (
                '<div class="xflow-node-redirect-inner">' +
                '<div class="xflow-node-title">' +
                head +
                "</div>" +
                '<div class="xflow-node-body">' +
                escapeHtml(body) +
                "</div>" +
                '<div class="xflow-node-sub"><code style="font-size:0.7rem;">' +
                escapeHtml(targetKey) +
                "</code></div></div>"
            );
        }

        /**
         * Place une scène (si pas déjà visitée), ses hotspots, et récursivement les nouvelles cibles.
         * @returns {{ right: number, rootSceneNid: number|null }} rootSceneNid = id Drawflow du nœud scène racine (pour arêtes entrantes).
         */
        function placeScene(sk, x, yCenter) {
            var meta = findSceneByKey(project, sk);
            if (!meta) return { right: x, rootSceneNid: null };

            if (visitedFull.has(sk)) {
                return { right: x, rootSceneNid: null };
            }

            visitedFull.add(sk);

            var title = sceneTitleForGraph(meta.scene, meta.index);
            var html = sceneNodeHtml(title, sceneIdLabel(meta.scene), false);
            var data = {
                kind: "scene",
                scId: sceneIdLabel(meta.scene),
                sceneKey: sk,
                sceneIndex: meta.index,
                label: title,
                viewMode: "tree"
            };
            var sceneNid = editor.addNode(
                "scene",
                1,
                1,
                x,
                yCenter,
                "xflow-node-scene xflow-node-tree-scene",
                data,
                html
            );

            var hsList = Array.isArray(meta.scene.hotspots) ? meta.scene.hotspots : [];
            var baseHy = yCenter - ((Math.max(hsList.length, 1) - 1) * HS_STEP) / 2;
            var subtreeRight = x + 200;
            var nextChildX = x + HOTSPOT_DX + 280;

            hsList.forEach(function (hs, i) {
                var hy = baseHy + i * HS_STEP;
                var label = hotspotLabel(hs, i);
                var at = hotspotActionType(hs);
                var hsHtml = hotspotNodeHtml(label, at);
                var hsData = {
                    kind: "hotspot",
                    parentSceneKey: sk,
                    parentScId: sceneIdLabel(meta.scene),
                    sceneIndex: meta.index,
                    hotspotIndex: i,
                    index: i,
                    type: at,
                    label: label,
                    viewMode: "tree"
                };
                var hsNid = editor.addNode(
                    "hotspot",
                    1,
                    1,
                    x + HOTSPOT_DX,
                    hy,
                    "xflow-node-hotspot",
                    hsData,
                    hsHtml
                );

                try {
                    editor.addConnection(sceneNid, hsNid, "output_1", "input_1");
                } catch (e) {
                    console.warn("[Map tree] Scene → hotspot:", e);
                }

                var targets = getTargetSceneIdsFromHotspot(hs);
                if (targets.length === 0) {
                    subtreeRight = Math.max(subtreeRight, x + HOTSPOT_DX + 200);
                    return;
                }

                var branchX = nextChildX;
                for (var tg = 0; tg < targets.length; tg++) {
                    var target = targets[tg];
                    var yBranch = hy + tg * TARGET_STAGGER_Y;
                    if (!visitedFull.has(target)) {
                        var sub = placeScene(target, branchX, yBranch);
                        if (sub.rootSceneNid != null) {
                            try {
                                editor.addConnection(hsNid, sub.rootSceneNid, "output_1", "input_1");
                            } catch (e3) {
                                console.warn("[Map tree] Hotspot → target scene:", e3);
                            }
                        }
                        branchX = sub.right + SUBTREE_GAP;
                        subtreeRight = Math.max(subtreeRight, sub.right);
                    } else {
                        var redHtml = redirectNodeHtml(target);
                        var redData = {
                            kind: "redirect",
                            targetSceneKey: target,
                            viewMode: "tree"
                        };
                        var redNid = editor.addNode(
                            "redirect",
                            1,
                            0,
                            x + REDIRECT_DX,
                            yBranch,
                            "xflow-node-redirect",
                            redData,
                            redHtml
                        );
                        try {
                            editor.addConnection(hsNid, redNid, "output_1", "input_1");
                        } catch (e2) {
                            console.warn("[Map tree] Hotspot → redirect:", e2);
                        }
                        subtreeRight = Math.max(subtreeRight, x + REDIRECT_DX + 200);
                    }
                }
                nextChildX = branchX;
            });

            return { right: subtreeRight, rootSceneNid: sceneNid };
        }

        var entryKey = sceneKey(scenes[0], 0);
        placeScene(entryKey, 60, 320);
    }

    function updateProjectMapToolbar(activeMode) {
        var bar = document.getElementById("project-map-toolbar");
        if (!bar) return;
        var buttons = bar.querySelectorAll(".project-map-tool");
        buttons.forEach(function (btn) {
            var m = btn.getAttribute("data-project-map-view");
            if (m === activeMode) btn.classList.add("active");
            else btn.classList.remove("active");
        });
    }

    /**
     * Regénère la carte (modale ouverte) selon le mode choisi.
     * @param {string} mode — 'focus' | 'full' | 'tree'
     */
    function setProjectMapView(mode) {
        window._projectMapViewMode = mode;
        if (window.__useReactProjectMap) {
            if (typeof getCurrentProjectData !== "function") return;
            document.dispatchEvent(
                new CustomEvent("react-project-map", { detail: { type: "setView", mode: mode } })
            );
            updateProjectMapToolbar(mode);
            return;
        }
        var ed = window._projectMapEditor;
        if (!ed || typeof getCurrentProjectData !== "function") return;
        ed.clear();
        var project = getCurrentProjectData();
        var opts = { viewMode: mode };
        if (mode === "focus") {
            var k = window._projectMapActiveSceneKey;
            if (k == null || k === "") {
                if (project.scenes && project.scenes.length > 0) {
                    k = sceneKey(project.scenes[0], 0);
                }
            }
            opts.activeSceneKey = k;
        }
        generateGraphFromJson(ed, project, opts);
        updateProjectMapToolbar(mode);
    }

    /**
     * @param {Drawflow} editor
     * @param {object} project — getCurrentProjectData()
     * @param {object} [options]
     * @param {string} [options.viewMode] — 'focus' (défaut) | 'full' | 'tree'
     * @param {string} [options.activeSceneKey] — mode focus uniquement
     */
    function generateGraphFromJson(editor, project, options, skipDomRestore) {
        if (!editor || !project || !Array.isArray(project.scenes)) return;
        if (!skipDomRestore) {
            restoreProjectMapSidePanelDomOnly();
        }
        options = options || {};
        var viewMode = options.viewMode || "focus";
        var narrEl = document.getElementById("project-map-narration-only");
        var workProject =
            narrEl && narrEl.checked ? filterProjectForNarrationSkeleton(project) : project;

        if (viewMode === "full") {
            generateGraphFull(editor, workProject);
            window._projectMapActiveSceneKey = null;
            return;
        }

        if (viewMode === "tree") {
            generateGraphTree(editor, workProject);
            window._projectMapActiveSceneKey = null;
            return;
        }

        var key = options.activeSceneKey;
        if (key == null || key === "") {
            if (project.scenes.length > 0) key = sceneKey(project.scenes[0], 0);
        }
        generateGraphFocus(editor, workProject, key);
    }

    function ensureMapDblClickHandler() {
        if (window._projectMapDblClickBound) return;
        var container = document.getElementById("project-drawflow");
        if (!container) return;
        container.addEventListener("dblclick", function (ev) {
            var nodeEl = ev.target.closest(".drawflow-node");
            if (!nodeEl) return;
            var rawId = nodeEl.id || "";
            if (rawId.indexOf("node-") !== 0) return;
            var nid = parseInt(rawId.replace("node-", ""), 10);
            if (isNaN(nid)) return;
            var ed = window._projectMapEditor;
            if (!ed) return;
            var info = ed.getNodeFromId(nid);
            if (!info || !info.data) return;
            if (info.data.kind !== "scene" || info.data.viewMode !== "collapsed") return;
            ev.stopPropagation();
            var sk = info.data.sceneKey;
            window._projectMapViewMode = "focus";
            window._projectMapActiveSceneKey = sk;
            ed.clear();
            generateGraphFromJson(ed, getCurrentProjectData(), {
                viewMode: "focus",
                activeSceneKey: sk
            });
            updateProjectMapToolbar("focus");
        });
        window._projectMapDblClickBound = true;
    }

    function openProjectMap() {
        var modal = document.getElementById("project-map-modal");
        var container = document.getElementById("project-drawflow");
        if (!modal || !container || typeof getCurrentProjectData !== "function") {
            console.error("Map: missing elements or getCurrentProjectData.");
            return;
        }
        var project = getCurrentProjectData();

        if (window.__useReactProjectMap) {
            modal.style.display = "flex";
            setReactProjectMapLayout(true);
            ensureProjectMapSideCloseButton();
            ensureProjectMapFabButtons();
            ensureProjectMapNarrationCheckbox();
            window._projectMapViewMode = "full";
            window._projectMapActiveSceneKey =
                project.scenes && project.scenes.length > 0 ? sceneKey(project.scenes[0], 0) : null;
            updateProjectMapToolbar("full");
            document.dispatchEvent(new CustomEvent("react-project-map", { detail: { type: "open" } }));
            return;
        }

        modal.style.display = "flex";

        if (!window._projectMapEditor) {
            if (typeof Drawflow === "undefined") {
                console.error("Drawflow non chargé.");
                return;
            }
            window._projectMapEditor = new Drawflow(container);
            window._projectMapEditor.reroute = true;
            window._projectMapEditor.start();
        } else {
            window._projectMapEditor.clear();
        }

        ensureMapDblClickHandler();
        ensureProjectMapDrawflowEvents();
        ensureProjectMapSideCloseButton();
        ensureProjectMapFabButtons();
        ensureProjectMapNarrationCheckbox();
        window._projectMapViewMode = "focus";
        window._projectMapActiveSceneKey =
            project.scenes && project.scenes.length > 0 ? sceneKey(project.scenes[0], 0) : null;
        generateGraphFromJson(window._projectMapEditor, project, {
            viewMode: "focus",
            activeSceneKey: window._projectMapActiveSceneKey
        });
        updateProjectMapToolbar("focus");
    }

    function closeProjectMap() {
        restoreProjectMapSidePanelDomOnly();
        if (window.__useReactProjectMap) {
            setReactProjectMapLayout(false);
            document.dispatchEvent(new CustomEvent("react-project-map", { detail: { type: "close" } }));
        }
        var modal = document.getElementById("project-map-modal");
        if (modal) modal.style.display = "none";
    }

    function closeProjectMapSidePanel() {
        restoreProjectMapSidePanelDomOnly();
        refreshProjectMapGraphInPlace();
    }

    window.getTargetSceneIdFromHotspot = getTargetSceneIdFromHotspot;
    window.getTargetSceneIdsFromHotspot = getTargetSceneIdsFromHotspot;
    window.closeProjectMapSidePanel = closeProjectMapSidePanel;
    window.refreshProjectMapGraphInPlace = refreshProjectMapGraphInPlace;
    window.generateGraphFromJson = generateGraphFromJson;
    window.openProjectMap = openProjectMap;
    window.closeProjectMap = closeProjectMap;
    window.setProjectMapView = setProjectMapView;
    window.sceneKeyFromProjectScene = sceneKey;
    window.mountProjectMapSidePanelElement = mountProjectMapSidePanelElement;
    window.mountProjectMapSelectionFromMapData = mountProjectMapSelectionFromMapData;
    window.updateProjectMapToolbar = updateProjectMapToolbar;
    window._projectMapReactBridge = {
        mountFromNodeData: mountProjectMapSelectionFromMapData,
        clearSelectionAndRefresh: function () {
            restoreProjectMapSidePanelDomOnly();
            document.dispatchEvent(new CustomEvent("react-project-map", { detail: { type: "refresh" } }));
        },
        setToolbar: updateProjectMapToolbar
    };
    window.restoreProjectMapSidePanelDomOnly = restoreProjectMapSidePanelDomOnly;
    window.projectMapSidePanelHasStash = function () {
        return !!(_projectMapPanelStash && _projectMapPanelStash.el);
    };
    window.mountProjectMapGlobalSettings = mountEditorGlobalSettingsInSidePanel;
})();
