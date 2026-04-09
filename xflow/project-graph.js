/**
 * Carte Drawflow à partir du JSON projet (getCurrentProjectData).
 * - focus : une scène active + hotspots ; cibles compactes (double-clic).
 * - full : graphe complet.
 * - tree : flux gauche → droite depuis la 1re scène ; renvois vers scènes déjà vues = nœud alias.
 */
(function () {
    "use strict";

    function getTargetSceneIdFromHotspot(hs) {
        if (!hs || !hs.type) return null;
        var t = hs.type;
        if (t === "scene") {
            var v = (hs.f_target || "").trim();
            return v || null;
        }
        if (t === "req" && hs.f_req_action === "scene") {
            var r = (hs.f_target || "").trim();
            return r || null;
        }
        if (t === "pwd" && hs.f_pwd_action === "scene") {
            var p = (hs.f_target || "").trim();
            return p || null;
        }
        return null;
    }

    function escapeHtml(s) {
        var d = document.createElement("div");
        d.textContent = s == null ? "" : String(s);
        return d.innerHTML;
    }

    function sceneKey(scene, index) {
        var k = (scene.scId || "").trim();
        if (k) return k;
        return "__idx_" + index;
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
                var t = getTargetSceneIdFromHotspot(hsList[hi]);
                if (t && findSceneByKey(project, t) && !visited.has(t)) {
                    queue.push({ key: t, level: lv + 1 });
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
            var title = scene.scTitle || scene.scId || "Scène " + (si + 1);
            var html = sceneNodeHtml(title, scene.scId, false);
            var data = {
                kind: "scene",
                scId: scene.scId,
                sceneKey: sk,
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
                var label = hs.hsTitle || "Hotspot " + (hi + 1);
                var html = hotspotNodeHtml(label, hs.type);
                var data = {
                    kind: "hotspot",
                    parentSceneKey: sk,
                    parentScId: scene.scId,
                    index: hi,
                    type: hs.type,
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

                var targetId = getTargetSceneIdFromHotspot(hs);
                if (targetId) {
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

        var activeTitle = activeScene.scTitle || activeScene.scId || "Scène";
        var activeHtml = sceneNodeHtml(activeTitle, activeScene.scId, false);
        var activeData = {
            kind: "scene",
            scId: activeScene.scId,
            sceneKey: activeKey,
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
            var tid = getTargetSceneIdFromHotspot(hs);
            if (!tid || tid === activeKey) return;
            if (uniqueTargets.indexOf(tid) !== -1) return;
            if (findSceneByKey(project, tid)) uniqueTargets.push(tid);
        });

        uniqueTargets.forEach(function (tid, ti) {
            var meta = findSceneByKey(project, tid);
            if (!meta) return;
            var tTitle = meta.scene.scTitle || meta.scene.scId || tid;
            var stubHtml = sceneNodeHtml(tTitle, meta.scene.scId, true);
            var stubData = {
                kind: "scene",
                scId: meta.scene.scId,
                sceneKey: tid,
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
            var label = hs.hsTitle || "Hotspot " + (hi + 1);
            var html = hotspotNodeHtml(label, hs.type);
            var data = {
                kind: "hotspot",
                parentSceneKey: activeKey,
                parentScId: activeScene.scId,
                index: hi,
                type: hs.type,
                label: label
            };
            var y = HS_START_Y + hi * HS_STEP;
            var hsNid = editor.addNode("hotspot", 1, 1, HS_X, y, "xflow-node-hotspot", data, html);

            try {
                editor.addConnection(activeNid, hsNid, "output_1", "input_1");
            } catch (e) {
                console.warn("[Map] Scene → hotspot connection:", e);
            }

            var targetId = getTargetSceneIdFromHotspot(hs);
            if (targetId) {
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

        var visitedFull = new Set();

        function redirectNodeHtml(targetKey) {
            var meta = findSceneByKey(project, targetKey);
            var title = meta ? meta.scene.scTitle || meta.scene.scId || targetKey : targetKey;
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

            var title = meta.scene.scTitle || meta.scene.scId || sk;
            var html = sceneNodeHtml(title, meta.scene.scId, false);
            var data = {
                kind: "scene",
                scId: meta.scene.scId,
                sceneKey: sk,
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
                var label = hs.hsTitle || "Hotspot " + (i + 1);
                var hsHtml = hotspotNodeHtml(label, hs.type);
                var hsData = {
                    kind: "hotspot",
                    parentSceneKey: sk,
                    parentScId: meta.scene.scId,
                    index: i,
                    type: hs.type,
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

                var target = getTargetSceneIdFromHotspot(hs);
                if (!target) {
                    subtreeRight = Math.max(subtreeRight, x + HOTSPOT_DX + 200);
                    return;
                }

                if (!visitedFull.has(target)) {
                    var sub = placeScene(target, nextChildX, hy);
                    if (sub.rootSceneNid != null) {
                        try {
                            editor.addConnection(hsNid, sub.rootSceneNid, "output_1", "input_1");
                        } catch (e3) {
                            console.warn("[Map tree] Hotspot → target scene:", e3);
                        }
                    }
                    nextChildX = sub.right + SUBTREE_GAP;
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
                        hy,
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
        var ed = window._projectMapEditor;
        if (!ed || typeof getCurrentProjectData !== "function") return;
        window._projectMapViewMode = mode;
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
    function generateGraphFromJson(editor, project, options) {
        if (!editor || !project || !Array.isArray(project.scenes)) return;
        options = options || {};
        var viewMode = options.viewMode || "focus";

        if (viewMode === "full") {
            generateGraphFull(editor, project);
            window._projectMapActiveSceneKey = null;
            return;
        }

        if (viewMode === "tree") {
            generateGraphTree(editor, project);
            window._projectMapActiveSceneKey = null;
            return;
        }

        var key = options.activeSceneKey;
        if (key == null || key === "") {
            if (project.scenes.length > 0) key = sceneKey(project.scenes[0], 0);
        }
        generateGraphFocus(editor, project, key);
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
        modal.style.display = "flex";

        var project = getCurrentProjectData();

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
        var modal = document.getElementById("project-map-modal");
        if (modal) modal.style.display = "none";
    }

    window.getTargetSceneIdFromHotspot = getTargetSceneIdFromHotspot;
    window.generateGraphFromJson = generateGraphFromJson;
    window.openProjectMap = openProjectMap;
    window.closeProjectMap = closeProjectMap;
    window.setProjectMapView = setProjectMapView;
    window.sceneKeyFromProjectScene = sceneKey;
})();
