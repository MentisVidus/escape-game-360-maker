/**
 * Shared FR/EN hotspot serialization helpers (no localized copy).
 */
(function (global) {
    "use strict";

    var HOTSPOT_COPY_FIELDS = [
        "f-txt",
        "f-target",
        "f-trans-txt",
        "f-trans-btn",
        "f-enigme-txt",
        "f-pwd",
        "f-pwd-action",
        "f-req-action",
        "f-ok-msg",
        "f-pick-id",
        "f-pick-name",
        "f-pick-msg",
        "f-item-id",
        "f-item-name",
        "f-ok",
        "f-ko",
        "f-sel-title",
        "f-sel-intro",
        "f-sel-display",
        "f-sel-choices",
        "f-hs-req-item",
        "f-hs-ghost-click",
        "f-hs-hidden-if",
        "f-sfx-url",
        "f-sfx-vol",
        "ui-w",
        "ui-h",
        "ui-shape",
        "ui-bgc",
        "ui-bga",
        "ui-brd-style",
        "ui-brd-w",
        "ui-brd-c",
        "ui-img"
    ];

    function extractHotspotData(hId) {
        var hsDiv = document.getElementById("hs_" + hId);
        if (!hsDiv) return null;
        if (typeof global.flushRichEditorsIn === "function") global.flushRichEditorsIn(hsDiv);
        var hs = {
            hsTitle: hsDiv.querySelector(".hs-title").value,
            pitch: hsDiv.querySelector(".hs-pitch").value,
            yaw: hsDiv.querySelector(".hs-yaw").value,
            customCss: hsDiv.querySelector(".hs-custom-css").value,
            type: hsDiv.querySelector(".hs-type").value
        };

        HOTSPOT_COPY_FIELDS.forEach(function (f) {
            var el = hsDiv.querySelector("." + f);
            if (!el) return;
            var Ex = global.EditorSharedExportText;
            hs[f.replace(/-/g, "_")] =
                Ex && typeof Ex.readExportAwareFieldValue === "function"
                    ? Ex.readExportAwareFieldValue(el)
                    : el.value;
        });

        if (!hsDiv.querySelector(".hs-custom-css").hasAttribute("readonly")) hs.expertMode = true;
        if (hs.type === "selector") {
            var fc = hsDiv.querySelector(".f-sel-choices");
            if (fc && !fc.hasAttribute("readonly")) hs.selJsonExpertMode = true;
        }
        return hs;
    }

    global.EditorSharedHotspotSerialization = {
        extractHotspotData: extractHotspotData
    };
})(typeof window !== "undefined" ? window : this);
