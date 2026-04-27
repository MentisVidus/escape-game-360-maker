/**
 * Shared FR/EN hotspot DOM -> V2 mapper core.
 */
(function (global) {
    "use strict";

    function createHotspotDomMapper(opts) {
        var options = opts || {};
        var defaultTransitionLabel = options.defaultTransitionLabel || "Continue";
        var selectorChoicesFromTextarea = options.selectorChoicesFromTextarea;
        var legacyActionToV2 = options.legacyActionToV2;

        if (typeof selectorChoicesFromTextarea !== "function") {
            throw new Error("selectorChoicesFromTextarea is required for hotspot DOM mapper.");
        }
        if (typeof legacyActionToV2 !== "function") {
            throw new Error("legacyActionToV2 is required for hotspot DOM mapper.");
        }

        function val(el, sel, fallback) {
            var node = el.querySelector(sel);
            if (!node || node.value === undefined) return fallback != null ? fallback : "";
            var Ex = global.EditorSharedExportText;
            if (Ex && typeof Ex.readExportAwareFieldValue === "function") {
                return Ex.readExportAwareFieldValue(node);
            }
            return node.value;
        }

        function hotspotDomToV2(hsDiv) {
            if (typeof global.flushRichEditorsIn === "function") global.flushRichEditorsIn(hsDiv);
            var hId = parseInt(hsDiv.id.replace("hs_", ""), 10);
            var type = hsDiv.querySelector(".hs-type").value;
            if (
                (type === "req" || type === "pwd") &&
                typeof global.syncHotspotRewardSelectorJSON === "function" &&
                !isNaN(hId)
            ) {
                global.syncHotspotRewardSelectorJSON(hId);
            }
            var legacy = {};

            if (type === "msg") {
                legacy.txt = val(hsDiv, ".f-txt", "");
            } else if (type === "scene") {
                legacy.target = val(hsDiv, ".f-target", "");
                legacy.transTxt = val(hsDiv, ".f-trans-txt", "");
                legacy.transBtn = val(hsDiv, ".f-trans-btn", defaultTransitionLabel);
            } else if (type === "pick") {
                legacy.itemId = val(hsDiv, ".f-item-id", "");
                legacy.itemName = val(hsDiv, ".f-item-name", "");
                legacy.txt = val(hsDiv, ".f-pick-msg", "");
            } else if (type === "req") {
                legacy.itemId = val(hsDiv, ".f-item-id", "");
                legacy.ko = val(hsDiv, ".f-ko", "");
                legacy.f_req_action = val(hsDiv, ".f-req-action", "scene");
                legacy.f_reward_chain_json = val(hsDiv, ".f-reward-chain-json", "");
                if (legacy.f_req_action === "selector") {
                    legacy.f_reward_sel_title = val(hsDiv, ".f-reward-sel-title", "");
                    legacy.f_reward_sel_intro = val(hsDiv, ".f-reward-sel-intro", "");
                    legacy.f_reward_sel_display = val(hsDiv, ".f-reward-sel-display", "buttons");
                    legacy.f_reward_sel_choices = val(hsDiv, ".f-reward-sel-choices", "[]");
                } else {
                    legacy.f_target = val(hsDiv, ".f-target", "");
                    legacy.f_trans_txt = val(hsDiv, ".f-trans-txt", "");
                    legacy.f_trans_btn = val(hsDiv, ".f-trans-btn", defaultTransitionLabel);
                    legacy.f_ok_msg = val(hsDiv, ".f-ok-msg", "");
                    legacy.f_pick_id = val(hsDiv, ".f-pick-id", "");
                    legacy.f_pick_name = val(hsDiv, ".f-pick-name", "");
                    legacy.f_pick_msg = val(hsDiv, ".f-pick-msg", "");
                }
            } else if (type === "pwd") {
                legacy.enigmeTxt = val(hsDiv, ".f-enigme-txt", "");
                legacy.pwd = val(hsDiv, ".f-pwd", "");
                legacy.f_pwd_action = val(hsDiv, ".f-pwd-action", "scene");
                legacy.f_reward_chain_json = val(hsDiv, ".f-reward-chain-json", "");
                if (legacy.f_pwd_action === "selector") {
                    legacy.f_reward_sel_title = val(hsDiv, ".f-reward-sel-title", "");
                    legacy.f_reward_sel_intro = val(hsDiv, ".f-reward-sel-intro", "");
                    legacy.f_reward_sel_display = val(hsDiv, ".f-reward-sel-display", "buttons");
                    legacy.f_reward_sel_choices = val(hsDiv, ".f-reward-sel-choices", "[]");
                } else {
                    legacy.f_target = val(hsDiv, ".f-target", "");
                    legacy.f_trans_txt = val(hsDiv, ".f-trans-txt", "");
                    legacy.f_trans_btn = val(hsDiv, ".f-trans-btn", defaultTransitionLabel);
                    legacy.f_ok_msg = val(hsDiv, ".f-ok-msg", "");
                    legacy.f_pick_id = val(hsDiv, ".f-pick-id", "");
                    legacy.f_pick_name = val(hsDiv, ".f-pick-name", "");
                    legacy.f_pick_msg = val(hsDiv, ".f-pick-msg", "");
                }
            } else if (type === "selector") {
                legacy.nested = {
                    title: val(hsDiv, ".f-sel-title", ""),
                    introHtml: val(hsDiv, ".f-sel-intro", ""),
                    displayMode: val(hsDiv, ".f-sel-display", "buttons"),
                    choices: selectorChoicesFromTextarea(hsDiv, hId)
                };
            }

            legacy.requiresItem = val(hsDiv, ".f-hs-req-item", "");
            legacy.f_hs_ghost_click = val(hsDiv, ".f-hs-ghost-click", "yes");
            legacy.hiddenIfHasItem = val(hsDiv, ".f-hs-hidden-if", "");
            legacy.sfxUrl = val(hsDiv, ".f-sfx-url", "");
            legacy.sfxVolume = val(hsDiv, ".f-sfx-vol", "");

            return {
                id: hsDiv.id,
                title: val(hsDiv, ".hs-title", ""),
                pitch: parseFloat(val(hsDiv, ".hs-pitch", "0") || "0"),
                yaw: parseFloat(val(hsDiv, ".hs-yaw", "0") || "0"),
                customCss: val(hsDiv, ".hs-custom-css", ""),
                appearance: {
                    ui_w: val(hsDiv, ".ui-w", ""),
                    ui_h: val(hsDiv, ".ui-h", ""),
                    ui_shape: val(hsDiv, ".ui-shape", ""),
                    ui_bgc: val(hsDiv, ".ui-bgc", ""),
                    ui_bga: val(hsDiv, ".ui-bga", ""),
                    ui_img: val(hsDiv, ".ui-img", ""),
                    ui_brd_style: val(hsDiv, ".ui-brd-style", ""),
                    ui_brd_w: val(hsDiv, ".ui-brd-w", ""),
                    ui_brd_c: val(hsDiv, ".ui-brd-c", "")
                },
                action: legacyActionToV2(type, legacy)
            };
        }

        return {
            hotspotDomToV2: hotspotDomToV2
        };
    }

    global.EditorSharedHotspotDomMapper = {
        createHotspotDomMapper: createHotspotDomMapper
    };
})(typeof window !== "undefined" ? window : this);
