/**
 * Shared FR/EN selector technical helpers (no localized copy).
 * Depends on global functions provided by app files:
 * - cardToChoice(card)
 */
(function (global) {
    "use strict";

    function getOwnChoiceField(card, selector) {
        var nodes = card.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].closest(".sel-choice-card") === card) return nodes[i];
        }
        return null;
    }

    function collectChoicesFromList(listEl) {
        if (!listEl) return [];
        if (typeof global.flushRichEditorsIn === "function") global.flushRichEditorsIn(listEl);
        var cards = Array.prototype.filter.call(listEl.children || [], function (el) {
            return el.classList && el.classList.contains("sel-choice-card");
        });
        return cards.map(function (c) {
            return global.cardToChoice(c);
        });
    }

    function syncSelectorChoicesToTextarea(hId) {
        var hsDiv = document.getElementById("hs_" + hId);
        if (!hsDiv) return;
        var ta = hsDiv.querySelector(".f-sel-choices");
        if (!ta || !ta.hasAttribute("readonly")) return;
        var root = document.getElementById("sel_choices_root_" + hId);
        if (!root) return;
        var arr = collectChoicesFromList(root);
        ta.value = JSON.stringify(arr, null, 2);
    }

    function attachSelectorChoicesListeners(hId) {
        var wrap = document.getElementById("fields_" + hId);
        if (!wrap) return;
        var root = wrap.querySelector(".sel-choices-root");
        if (!root) return;
        var sync = function () {
            syncSelectorChoicesToTextarea(hId);
        };
        root.removeEventListener("input", root._selSync);
        root.removeEventListener("change", root._selSync);
        root._selSync = sync;
        root.addEventListener("input", sync);
        root.addEventListener("change", sync);
    }

    function maybeSyncHotspotRewardRoot(listEl, hId) {
        if (
            listEl &&
            listEl.classList &&
            listEl.classList.contains("sel-choices-reward-root") &&
            typeof global.syncHotspotRewardSelectorJSON === "function" &&
            !isNaN(hId)
        ) {
            global.syncHotspotRewardSelectorJSON(hId);
        }
    }

    function selectorMoveChoice(btn, dir) {
        var card = btn.closest(".sel-choice-card");
        if (!card) return;
        var list = card.parentElement;
        var hId = parseInt(card.closest(".hotspot-block").id.replace("hs_", ""), 10);
        if (dir < 0 && card.previousElementSibling) list.insertBefore(card, card.previousElementSibling);
        else if (dir > 0 && card.nextElementSibling) list.insertBefore(card.nextElementSibling, card);
        syncSelectorChoicesToTextarea(hId);
        maybeSyncHotspotRewardRoot(list, hId);
    }

    function selectorRemoveChoice(btn) {
        var card = btn.closest(".sel-choice-card");
        if (!card) return;
        var list = card.parentElement;
        var hId = parseInt(card.closest(".hotspot-block").id.replace("hs_", ""), 10);
        card.remove();
        syncSelectorChoicesToTextarea(hId);
        maybeSyncHotspotRewardRoot(list, hId);
    }

    function selectorChoicesFromTextarea(hsDiv, hId) {
        var ta = hsDiv.querySelector(".f-sel-choices");
        if (!ta) return [];
        if (ta.hasAttribute("readonly")) syncSelectorChoicesToTextarea(hId);
        var arr = [];
        try {
            arr = JSON.parse(ta.value || "[]");
        } catch (e) {
            arr = [];
        }
        if (!Array.isArray(arr)) arr = [];
        if (typeof global.sanitizeSelectorChoicesForExport === "function") {
            arr = global.sanitizeSelectorChoicesForExport(arr) || arr;
        }
        return arr;
    }

    global.EditorSharedSelectorCore = {
        getOwnChoiceField: getOwnChoiceField,
        collectChoicesFromList: collectChoicesFromList,
        syncSelectorChoicesToTextarea: syncSelectorChoicesToTextarea,
        attachSelectorChoicesListeners: attachSelectorChoicesListeners,
        selectorMoveChoice: selectorMoveChoice,
        selectorRemoveChoice: selectorRemoveChoice,
        selectorChoicesFromTextarea: selectorChoicesFromTextarea
    };
})(typeof window !== "undefined" ? window : this);
