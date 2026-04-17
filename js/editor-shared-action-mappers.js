/**
 * Shared FR/EN action mappers (legacy <-> V2), with locale options.
 */
(function (global) {
    "use strict";

    function createActionMappers(opts) {
        var options = opts || {};
        var EditorCore = options.EditorCore || global.EditorCore;
        if (!EditorCore) {
            throw new Error("EditorCore unavailable for action mappers.");
        }
        var defaultTransitionLabel = options.defaultTransitionLabel || "Continue";

        function selectorChoiceLegacyToV2(ch, idx) {
            var src = ch || {};
            return {
                id: (src.id && String(src.id).trim()) || ("choice_" + (idx + 1)),
                label: (src.label && String(src.label).trim()) || "Option",
                action: legacyActionToV2(src.actionType || "msg", src)
            };
        }

        function legacyActionToV2(type, source) {
            var src = source || {};
            var action = EditorCore.createDefaultAction(type || "msg");
            var p = action.payload;

            if (src.requiresItem) action.visibility.requiresItem = String(src.requiresItem).trim();
            if (src.hiddenIfHasItem) action.visibility.hiddenIfHasItem = String(src.hiddenIfHasItem).trim();
            var gcRaw = src.f_hs_ghost_click != null ? src.f_hs_ghost_click : src.ghostClick;
            if (gcRaw != null && gcRaw !== "") {
                var gcs = String(gcRaw).trim().toLowerCase();
                if (gcs === "no" || gcs === "non" || gcs === "0" || gcRaw === false) action.visibility.clickWhenInvisible = false;
            }
            if (src.sfxUrl) action.sfx.url = String(src.sfxUrl).trim();
            if (src.sfxVolume !== undefined && src.sfxVolume !== null && src.sfxVolume !== "") {
                var v = parseFloat(src.sfxVolume);
                if (!isNaN(v)) action.sfx.volume = v;
            }

            if (action.type === "msg") {
                p.copy.bodyHtml = src.txt || "";
            } else if (action.type === "scene") {
                p.target = src.target || "";
                p.copy.bodyHtml = src.transTxt || "";
                p.copy.buttonLabel = src.transBtn || defaultTransitionLabel;
            } else if (action.type === "pick") {
                p.itemId = src.itemId || "";
                p.itemName = src.itemName || "";
                p.copy.bodyHtml = src.txt || "";
            } else if (action.type === "req") {
                p.itemId = src.itemId || "";
                p.copy.bodyHtml = src.ko || "";
                p.rewardAction = legacyRewardToV2(src.f_req_action || src.reqAction || "scene", src);
            } else if (action.type === "pwd") {
                p.copy.bodyHtml = src.enigmeTxt || src.enigme_txt || src.f_enigme_txt || "";
                p.answer = src.pwd || src.f_pwd || "";
                p.rewardAction = legacyRewardToV2(src.f_pwd_action || src.pwdAction || "scene", src);
            } else if (action.type === "selector") {
                var nested = src.nested || {};
                var intro =
                    (nested.copy && nested.copy.bodyHtml != null ? nested.copy.bodyHtml : null) ||
                    nested.introHtml ||
                    "";
                p.nested = {
                    title: nested.title || "",
                    copy: {
                        bodyHtml: String(intro || ""),
                        buttonLabel: String((nested.copy && nested.copy.buttonLabel) || "")
                    },
                    displayMode: nested.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: (Array.isArray(nested.choices) ? nested.choices : []).map(function (choice, idx) {
                        return selectorChoiceLegacyToV2(choice || {}, idx);
                    })
                };
            }
            if (action.type === "selector") action.visibility.clickWhenInvisible = true;
            return action;
        }

        function legacyRewardToV2(kind, src) {
            if (kind === "msg") {
                return legacyActionToV2("msg", { txt: src.f_ok_msg || src.okMsg || src.ok_msg || "" });
            }
            if (kind === "pick") {
                return legacyActionToV2("pick", {
                    itemId: src.f_pick_id || src.pickId || "",
                    itemName: src.f_pick_name || src.pickName || "",
                    txt: src.f_pick_msg || src.pickMsg || ""
                });
            }
            return legacyActionToV2("scene", {
                target: src.f_target || src.target || "",
                transTxt: src.f_trans_txt || src.transTxt || "",
                transBtn: src.f_trans_btn || src.transBtn || defaultTransitionLabel
            });
        }

        function actionV2ToLegacyChoice(action, label, idx) {
            var a = action || EditorCore.createDefaultAction("msg");
            var p = a.payload || {};
            var out = { label: label || ("Option " + (idx + 1)), actionType: a.type || "msg" };
            var c = p.copy || {};
            if (a.type === "msg") {
                out.txt = c.bodyHtml || "";
            } else if (a.type === "scene") {
                out.target = p.target || "";
                out.transTxt = c.bodyHtml || "";
                out.transBtn = c.buttonLabel || defaultTransitionLabel;
            } else if (a.type === "pick") {
                out.itemId = p.itemId || "";
                out.itemName = p.itemName || "";
                out.txt = c.bodyHtml || "";
            } else if (a.type === "selector") {
                var n = p.nested || {};
                var nc = n.copy || {};
                out.nested = {
                    title: n.title || "",
                    introHtml: nc.bodyHtml || "",
                    displayMode: n.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: (Array.isArray(n.choices) ? n.choices : []).map(function (ch, i) {
                        return actionV2ToLegacyChoice(ch.action, ch.label, i);
                    })
                };
            }
            if (a.visibility && a.visibility.requiresItem) out.requiresItem = a.visibility.requiresItem;
            if (a.visibility && a.visibility.hiddenIfHasItem) out.hiddenIfHasItem = a.visibility.hiddenIfHasItem;
            if (a.sfx && a.sfx.url) out.sfxUrl = a.sfx.url;
            if (a.sfx && a.sfx.volume !== undefined) out.sfxVolume = a.sfx.volume;
            return out;
        }

        return {
            selectorChoiceLegacyToV2: selectorChoiceLegacyToV2,
            legacyActionToV2: legacyActionToV2,
            legacyRewardToV2: legacyRewardToV2,
            actionV2ToLegacyChoice: actionV2ToLegacyChoice
        };
    }

    global.EditorSharedActionMappers = {
        createActionMappers: createActionMappers
    };
})(typeof window !== "undefined" ? window : this);
