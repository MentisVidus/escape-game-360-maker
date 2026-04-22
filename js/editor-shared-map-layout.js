/**
 * Carte React : persistance map-layout.json (ZIP .escapegame) + clé sessionStorage
 * alignée sur xflow/react/src/App.tsx (buildProjectMapGraphBase).
 */
(function (global) {
    "use strict";

    var REWARD_OUT = "reward-out";
    var REWARD_IN = "reward-in";

    function sceneKeyFromScene(scene, index) {
        if (typeof global.sceneKeyFromProjectScene === "function") {
            return global.sceneKeyFromProjectScene(scene, index);
        }
        var k = scene && scene.id != null ? String(scene.id).trim() : "";
        if (k) return k;
        if (scene && scene.scId != null && String(scene.scId).trim()) {
            return String(scene.scId).trim();
        }
        return "__idx_" + index;
    }

    function computeProjectMapLayoutStorageKey(project) {
        var viewMode = global._projectMapViewMode || "full";
        var narrEl = document.getElementById("project-map-narration-only");
        var narr = narrEl && narrEl.checked ? "1" : "0";
        var scenes = project && Array.isArray(project.scenes) ? project.scenes : [];
        var title = String((project && project.title != null ? project.title : "") || "").slice(0, 120);
        return "escape360-reactMap-pos:v1:" + viewMode + ":" + narr + ":" + scenes.length + ":" + title;
    }

    function parseHsNodeId(hsId) {
        if (!hsId || typeof hsId !== "string" || hsId.indexOf("hs:") !== 0) return null;
        var rest = hsId.slice(3);
        var last = rest.lastIndexOf(":");
        if (last <= 0) return null;
        var sk = rest.slice(0, last);
        var hi = parseInt(rest.slice(last + 1), 10);
        if (isNaN(hi)) return null;
        return { sceneKey: sk, hotspotIndex: hi };
    }

    function findHotspotAction(project, sceneKey, hotspotIndex) {
        var scenes = project && Array.isArray(project.scenes) ? project.scenes : [];
        for (var si = 0; si < scenes.length; si++) {
            if (sceneKeyFromScene(scenes[si], si) !== sceneKey) continue;
            var hss = scenes[si].hotspots;
            if (!Array.isArray(hss)) return null;
            return hss[hotspotIndex] || null;
        }
        return null;
    }

    function rewardActionToPatch(rewardAction) {
        if (!rewardAction || typeof rewardAction !== "object") return null;
        var t = String(rewardAction.type || "").trim();
        if (t !== "msg" && t !== "scene" && t !== "pick" && t !== "selector") return null;
        return { rewardType: t, rewardActionDraft: rewardAction };
    }

    function patchForHs(project, hsId) {
        var parsed = parseHsNodeId(hsId);
        if (!parsed) return null;
        var hs = findHotspotAction(project, parsed.sceneKey, parsed.hotspotIndex);
        if (!hs || !hs.action) return null;
        var a = hs.action;
        if (a.type !== "req" && a.type !== "pwd") return null;
        var ra = a.payload && a.payload.rewardAction;
        return rewardActionToPatch(ra);
    }

    function defaultDraftForKind(kind) {
        var sfx = { url: "", volume: 1 };
        var visibility = { requiresItem: "", hiddenIfHasItem: "", clickWhenInvisible: true };
        var copy = { bodyHtml: "", buttonLabel: "" };
        if (kind === "msg") {
            return { type: "msg", payload: { copy: copy }, sfx: sfx, visibility: visibility };
        }
        if (kind === "scene") {
            return {
                type: "scene",
                payload: { target: "", copy: { bodyHtml: "", buttonLabel: "Continuer" } },
                sfx: sfx,
                visibility: visibility
            };
        }
        if (kind === "pick") {
            return {
                type: "pick",
                payload: { itemId: "", itemName: "", copy: copy },
                sfx: sfx,
                visibility: visibility
            };
        }
        return {
            type: "selector",
            payload: {
                nested: {
                    title: "",
                    copy: copy,
                    displayMode: "buttons",
                    choices: []
                }
            },
            sfx: sfx,
            visibility: visibility
        };
    }

    function stubLabel(kind, en) {
        if (en) {
            if (kind === "msg") return "Message";
            if (kind === "scene") return "Scene transition";
            if (kind === "pick") return "Pick";
            return "Selector";
        }
        if (kind === "msg") return "Message";
        if (kind === "scene") return "Transition scène";
        if (kind === "pick") return "Objet (pick)";
        return "Menu (selector)";
    }

    function hostLangEn() {
        return String(document.documentElement.lang || "")
            .toLowerCase()
            .indexOf("en") === 0;
    }

    /**
     * @param {object} project
     * @returns {{ version: number, nodes: object, rewardTargets: array, rewardEdges: array, backgrounds: array }}
     */
    function buildMapLayoutFileV1FromSession(project) {
        var key = computeProjectMapLayoutStorageKey(project);
        var out = {
            version: 1,
            nodes: {},
            rewardTargets: [],
            rewardEdges: [],
            backgrounds: []
        };
        try {
            var pr = global.sessionStorage && global.sessionStorage.getItem(key);
            if (pr) {
                var po = JSON.parse(pr);
                if (po && typeof po === "object") {
                    out.nodes = po;
                }
            }
        } catch (e0) {
            /* ignore */
        }
        try {
            var rr = global.sessionStorage && global.sessionStorage.getItem(key + ":rewardOverlay");
            if (!rr) return out;
            var ro = JSON.parse(rr);
            if (!ro || ro.v !== 1) return out;
            if (Array.isArray(ro.stubNodes)) {
                ro.stubNodes.forEach(function (sn) {
                    if (!sn || sn.type !== "mapRewardTarget") return;
                    var d = sn.data || {};
                    var kind = String(d.rewardKind || "scene");
                    if (kind !== "msg" && kind !== "scene" && kind !== "pick" && kind !== "selector") {
                        kind = "scene";
                    }
                    var pos = sn.position || {};
                    out.rewardTargets.push({
                        id: String(sn.id || ""),
                        kind: kind,
                        x: typeof pos.x === "number" ? pos.x : 0,
                        y: typeof pos.y === "number" ? pos.y : 0
                    });
                });
            }
            if (Array.isArray(ro.edges)) {
                ro.edges.forEach(function (e) {
                    if (!e) return;
                    if (e.sourceHandle !== REWARD_OUT || e.targetHandle !== REWARD_IN) return;
                    out.rewardEdges.push({
                        source: String(e.source),
                        target: String(e.target)
                    });
                });
            }
        } catch (e1) {
            /* ignore */
        }
        return out;
    }

    /**
     * Écrit sessionStorage (positions + overlay récompense sérialisé v1) depuis map-layout.json.
     * @param {object} project — projet déjà normalisé (après applyLoadedProject)
     * @param {string|object|null|undefined} json
     */
    function applyMapLayoutFileV1ToSession(project, json) {
        if (json == null || json === "") return;
        var key = computeProjectMapLayoutStorageKey(project);
        var obj = typeof json === "string" ? JSON.parse(json) : json;
        if (!obj || obj.version !== 1) return;
        var en = hostLangEn();

        if (obj.nodes && typeof obj.nodes === "object" && global.sessionStorage) {
            global.sessionStorage.setItem(key, JSON.stringify(obj.nodes));
        }

        var targets = Array.isArray(obj.rewardTargets) ? obj.rewardTargets : [];
        var targetById = {};
        targets.forEach(function (t) {
            if (!t || !t.id) return;
            var kind = String(t.kind || "scene");
            if (kind !== "msg" && kind !== "scene" && kind !== "pick" && kind !== "selector") {
                kind = "scene";
            }
            targetById[String(t.id)] = {
                id: String(t.id),
                kind: kind,
                x: typeof t.x === "number" ? t.x : 0,
                y: typeof t.y === "number" ? t.y : 0
            };
        });

        var overlay = { v: 1, patchByHotspotId: {}, stubNodes: [], edges: [] };
        targets.forEach(function (t) {
            if (!t || !t.id) return;
            var kind = String(t.kind || "scene");
            if (kind !== "msg" && kind !== "scene" && kind !== "pick" && kind !== "selector") {
                kind = "scene";
            }
            overlay.stubNodes.push({
                id: String(t.id),
                type: "mapRewardTarget",
                position: { x: typeof t.x === "number" ? t.x : 0, y: typeof t.y === "number" ? t.y : 0 },
                draggable: true,
                selectable: true,
                data: {
                    kind: "rewardTarget",
                    rewardKind: kind,
                    label: stubLabel(kind, en),
                    lang: en ? "en" : "fr"
                }
            });
        });

        var edges = Array.isArray(obj.rewardEdges) ? obj.rewardEdges : [];
        edges.forEach(function (e, i) {
            if (!e || !e.source || !e.target) return;
            var src = String(e.source);
            var tgt = String(e.target);
            if (!targetById[tgt]) return;
            overlay.edges.push({
                id: "e:rw:" + src + ">" + tgt + ":" + i,
                source: src,
                target: tgt,
                sourceHandle: REWARD_OUT,
                targetHandle: REWARD_IN,
                type: "smoothstep",
                style: { stroke: "#f59e0b", strokeWidth: 2 }
            });
            var p = patchForHs(project, src);
            if (!p) {
                var rt = targetById[tgt];
                var k = rt && rt.kind ? rt.kind : "scene";
                p = { rewardType: k, rewardActionDraft: defaultDraftForKind(k) };
            }
            overlay.patchByHotspotId[src] = p;
        });

        try {
            if (global.sessionStorage) {
                global.sessionStorage.setItem(key + ":rewardOverlay", JSON.stringify(overlay));
            }
        } catch (e2) {
            /* ignore */
        }
    }

    /**
     * CAS 1 chantier 3 : toute édition legacy des champs de récompense REQ/PWD invalide le marqueur carte.
     * Listeners : délégation document (pas de hub unique dans editeur-app — champs injectés par updateHsFields + rich editors).
     */
    function clearV2RewardDatasetIfPresent(hsDiv) {
        if (!hsDiv || !hsDiv.dataset) return false;
        if (hsDiv.dataset.v2RewardAction == null || String(hsDiv.dataset.v2RewardAction) === "") {
            return false;
        }
        hsDiv.removeAttribute("data-v2-reward-action");
        try {
            if (global.document && typeof global.CustomEvent === "function") {
                global.document.dispatchEvent(
                    new global.CustomEvent("react-project-map", {
                        detail: { type: "rewardOverlayInvalidate", hotspotDomId: hsDiv.id }
                    })
                );
            }
        } catch (eInv) {
            /* ignore */
        }
        return true;
    }

    function onLegacyRewardFieldInteraction(ev) {
        if (ev.isTrusted !== true) return;
        var t = ev.target;
        if (!t || typeof t.closest !== "function") return;
        var hsDiv = t.closest(".hotspot-block");
        if (!hsDiv || !/^hs_\d+$/.test(hsDiv.id)) return;
        var typeEl = hsDiv.querySelector(".hs-type");
        if (!typeEl || (typeEl.value !== "req" && typeEl.value !== "pwd")) return;
        var hid = hsDiv.id.replace(/^hs_/, "");
        var reqWrap = global.document.getElementById("req_res_" + hid);
        var pwdWrap = global.document.getElementById("pwd_res_" + hid);
        if (t.classList && t.classList.contains("f-req-action")) {
            clearV2RewardDatasetIfPresent(hsDiv);
            return;
        }
        if (t.classList && t.classList.contains("f-pwd-action")) {
            clearV2RewardDatasetIfPresent(hsDiv);
            return;
        }
        if (reqWrap && reqWrap.contains(t)) {
            clearV2RewardDatasetIfPresent(hsDiv);
            return;
        }
        if (pwdWrap && pwdWrap.contains(t)) {
            clearV2RewardDatasetIfPresent(hsDiv);
        }
    }

    if (!global.__editorLegacyRewardClearsV2Wired) {
        global.__editorLegacyRewardClearsV2Wired = true;
        if (global.document) {
            global.document.addEventListener("change", onLegacyRewardFieldInteraction, false);
            global.document.addEventListener("input", onLegacyRewardFieldInteraction, false);
        }
    }

    global.EditorSharedMapLayout = {
        computeProjectMapLayoutStorageKey: computeProjectMapLayoutStorageKey,
        buildMapLayoutFileV1FromSession: buildMapLayoutFileV1FromSession,
        applyMapLayoutFileV1ToSession: applyMapLayoutFileV1ToSession,
        clearV2RewardDatasetIfPresent: clearV2RewardDatasetIfPresent
    };
})(typeof window !== "undefined" ? window : this);
