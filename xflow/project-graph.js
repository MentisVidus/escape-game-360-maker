/**
 * Carte Drawflow à partir du JSON projet (getCurrentProjectData).
 * Étape 2 : lecture seule — Scène → Hotspots → Scène cible (transition).
 * Les selectors et autres branches sont ignorés pour l’instant.
 */
(function () {
    "use strict";

    /**
     * ID de scène cible pour les transitions (hotspot type "scene", ou récompense req/pwd).
     * Clés alignées sur extractHotspotData / fichier JSON (f_target, f_req_action, f_pwd_action).
     */
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

    function sceneNodeHtml(title, scId) {
        var en = document.documentElement.lang === "en";
        var labScene = en ? "Scene" : "Scène";
        var labId = en ? "ID:" : "ID :";
        return (
            '<div class="xflow-node-scene">' +
            '<div class="xflow-node-title">' +
            labScene +
            "</div>" +
            '<div class="xflow-node-body">' +
            escapeHtml(title) +
            "</div>" +
            '<div class="xflow-node-sub">' +
            labId +
            ' <code style="font-size:0.75rem;">' +
            escapeHtml(scId || "—") +
            "</code></div></div>"
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
     * Clé stable pour indexer les scènes (alignée sur f_target dans le jeu).
     */
    function sceneKey(scene, index) {
        var k = (scene.scId || "").trim();
        if (k) return k;
        return "__idx_" + index;
    }

    /**
     * @param {Drawflow} editor — instance déjà démarrée
     * @param {object} project — retour de getCurrentProjectData()
     */
    function generateGraphFromJson(editor, project) {
        if (!editor || !project || !Array.isArray(project.scenes)) return;

        var scenes = project.scenes;
        var sceneKeyToDrawflowId = {};

        scenes.forEach(function (scene, si) {
            var sk = sceneKey(scene, si);
            var title = scene.scTitle || scene.scId || "Scène " + (si + 1);
            var html = sceneNodeHtml(title, scene.scId);
            var data = { kind: "scene", scId: scene.scId, sceneKey: sk, label: title };
            var y = 80 + si * 280;
            var nid = editor.addNode("scene", 1, 1, 100, y, "xflow-node-scene", data, html);
            sceneKeyToDrawflowId[sk] = nid;
        });

        scenes.forEach(function (scene, si) {
            var sk = sceneKey(scene, si);
            var sceneNodeId = sceneKeyToDrawflowId[sk];
            if (sceneNodeId === undefined) return;

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
                var y = 80 + si * 280 + hi * 108;
                var hsNid = editor.addNode("hotspot", 1, 1, 480, y, "xflow-node-hotspot", data, html);

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
                        console.warn(
                            "[Map] Unknown target scene id:",
                            targetId,
                            "(hotspot:",
                            label + ")"
                        );
                    }
                }
            });
        });
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

        generateGraphFromJson(window._projectMapEditor, project);
    }

    function closeProjectMap() {
        var modal = document.getElementById("project-map-modal");
        if (modal) modal.style.display = "none";
    }

    window.getTargetSceneIdFromHotspot = getTargetSceneIdFromHotspot;
    window.generateGraphFromJson = generateGraphFromJson;
    window.openProjectMap = openProjectMap;
    window.closeProjectMap = closeProjectMap;
})();
