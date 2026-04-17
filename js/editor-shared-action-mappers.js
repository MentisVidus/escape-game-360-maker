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

        function actionV2ToLegacyHotspotData(hs) {
            var src = hs || {};
            var a = src.action || EditorCore.createDefaultAction("msg");
            var p = a.payload || {};
            var out = {
                hsTitle: src.title || "",
                pitch: src.pitch != null ? src.pitch : 0,
                yaw: src.yaw != null ? src.yaw : 0,
                customCss: src.customCss || "",
                type: a.type || "msg"
            };
            var app = src.appearance || {};
            if (app.ui_w !== undefined) {
                out.ui_w = app.ui_w;
                out.ui_h = app.ui_h;
                out.ui_shape = app.ui_shape;
                out.ui_bgc = app.ui_bgc;
                out.ui_bga = app.ui_bga;
                out.ui_img = app.ui_img;
                out.ui_brd_style = app.ui_brd_style;
                out.ui_brd_w = app.ui_brd_w;
                out.ui_brd_c = app.ui_brd_c;
            }
            var pc = p.copy || {};
            if (a.type === "msg") {
                out.f_txt = pc.bodyHtml || "";
            } else if (a.type === "scene") {
                out.f_target = p.target || "";
                out.f_trans_txt = pc.bodyHtml || "";
                out.f_trans_btn = pc.buttonLabel || defaultTransitionLabel;
            } else if (a.type === "pick") {
                out.f_item_id = p.itemId || "";
                out.f_item_name = p.itemName || "";
                out.f_pick_msg = pc.bodyHtml || "";
            } else if (a.type === "req") {
                out.f_item_id = p.itemId || "";
                out.f_ko = pc.bodyHtml || "";
                var r = p.rewardAction || EditorCore.createDefaultAction("scene");
                var rc = (r.payload && r.payload.copy) || {};
                out.f_req_action = r.type || "scene";
                if (r.type === "scene") {
                    out.f_target = (r.payload && r.payload.target) || "";
                    out.f_trans_txt = rc.bodyHtml || "";
                    out.f_trans_btn = rc.buttonLabel || defaultTransitionLabel;
                } else if (r.type === "msg") {
                    out.f_ok_msg = rc.bodyHtml || "";
                } else if (r.type === "pick") {
                    out.f_pick_id = (r.payload && r.payload.itemId) || "";
                    out.f_pick_name = (r.payload && r.payload.itemName) || "";
                    out.f_pick_msg = rc.bodyHtml || "";
                }
            } else if (a.type === "pwd") {
                out.f_enigme_txt = pc.bodyHtml || "";
                out.f_pwd = p.answer || "";
                var rp = p.rewardAction || EditorCore.createDefaultAction("scene");
                var rpc = (rp.payload && rp.payload.copy) || {};
                out.f_pwd_action = rp.type || "scene";
                if (rp.type === "scene") {
                    out.f_target = (rp.payload && rp.payload.target) || "";
                    out.f_trans_txt = rpc.bodyHtml || "";
                    out.f_trans_btn = rpc.buttonLabel || defaultTransitionLabel;
                } else if (rp.type === "msg") {
                    out.f_ok_msg = rpc.bodyHtml || "";
                } else if (rp.type === "pick") {
                    out.f_pick_id = (rp.payload && rp.payload.itemId) || "";
                    out.f_pick_name = (rp.payload && rp.payload.itemName) || "";
                    out.f_pick_msg = rpc.bodyHtml || "";
                }
            } else if (a.type === "selector") {
                var n = p.nested || {};
                var ncopy = n.copy || {};
                out.f_sel_title = n.title || "";
                out.f_sel_intro = ncopy.bodyHtml || "";
                out.f_sel_display = n.displayMode === "dropdown" ? "dropdown" : "buttons";
                out.f_sel_choices = JSON.stringify(
                    (Array.isArray(n.choices) ? n.choices : []).map(function (c, i) {
                        return actionV2ToLegacyChoice(c.action, c.label, i);
                    }),
                    null,
                    2
                );
            }
            if (a.sfx && a.sfx.url) out.f_sfx_url = a.sfx.url;
            if (a.sfx && a.sfx.volume !== undefined) out.f_sfx_vol = a.sfx.volume;
            if (a.visibility && a.visibility.requiresItem) out.f_hs_req_item = a.visibility.requiresItem;
            if (a.visibility && a.visibility.clickWhenInvisible === false) out.f_hs_ghost_click = "no";
            if (a.visibility && a.visibility.hiddenIfHasItem) out.f_hs_hidden_if = a.visibility.hiddenIfHasItem;
            return out;
        }

        return {
            selectorChoiceLegacyToV2: selectorChoiceLegacyToV2,
            legacyActionToV2: legacyActionToV2,
            legacyRewardToV2: legacyRewardToV2,
            actionV2ToLegacyChoice: actionV2ToLegacyChoice,
            actionV2ToLegacyHotspotData: actionV2ToLegacyHotspotData
        };
    }

    global.EditorSharedActionMappers = {
        createActionMappers: createActionMappers
    };
})(typeof window !== "undefined" ? window : this);
