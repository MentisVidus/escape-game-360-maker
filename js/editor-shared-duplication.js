/**
 * Shared FR/EN duplication helpers (hotspot across scenes, full scene clone).
 */
(function (global) {
    "use strict";

    function createDuplicationHelpers(opts) {
        var options = opts || {};
        var doc = options.document || global.document;
        var addHotspot = options.addHotspot;
        var extractHotspotData = options.extractHotspotData;
        var addScene = options.addScene;
        var refreshAllSceneTargetSelects = options.refreshAllSceneTargetSelects;
        var strings = options.strings || {};

        if (!doc) throw new Error("document is required for duplication helpers.");
        if (typeof addHotspot !== "function") throw new Error("addHotspot is required.");
        if (typeof extractHotspotData !== "function") throw new Error("extractHotspotData is required.");
        if (typeof addScene !== "function") throw new Error("addScene is required.");

        var duplicateHotspotPrompt = strings.duplicateHotspotPrompt;
        var duplicateHotspotInvalidNumber = strings.duplicateHotspotInvalidNumber || "Invalid number.";
        var sceneDefaultTitlePrefix = strings.sceneDefaultTitlePrefix || "Scene ";
        var sceneIdCopySuffix = strings.sceneIdCopySuffix || "_copy";
        var sceneTitleCopySuffix = strings.sceneTitleCopySuffix || " (Copy)";

        if (typeof duplicateHotspotPrompt !== "function") {
            throw new Error("strings.duplicateHotspotPrompt(sceneList) is required.");
        }

        function duplicateHotspot(currentSId, hId) {
            var sceneList = "";
            var mapIds = [];
            doc.querySelectorAll(".scene-block").forEach(function (sDiv, idx) {
                var sid = sDiv.id.split("_")[1];
                var titleEl = sDiv.querySelector(".sc-title");
                var idEl = sDiv.querySelector(".sc-id");
                var title =
                    (titleEl && titleEl.value) ||
                    (idEl && idEl.value) ||
                    sceneDefaultTitlePrefix + sid;
                sceneList += idx + 1 + " : " + title + "\n";
                mapIds.push(sid);
            });

            var dest = prompt(duplicateHotspotPrompt(sceneList), "");
            var targetSId = currentSId;

            if (dest !== null && String(dest).trim() !== "") {
                var idx = parseInt(dest, 10) - 1;
                if (idx >= 0 && idx < mapIds.length) targetSId = mapIds[idx];
                else alert(duplicateHotspotInvalidNumber);
            } else if (dest === null) return;

            addHotspot(targetSId, extractHotspotData(hId));
        }

        function duplicateScene(sId) {
            var sDiv = doc.getElementById("scene_" + sId);
            if (!sDiv) return;

            var scId = sDiv.querySelector(".sc-id");
            var scImg = sDiv.querySelector(".sc-img");
            var scTitle = sDiv.querySelector(".sc-title");
            var newSId = addScene(
                (scId && scId.value ? scId.value : "") + sceneIdCopySuffix,
                scImg && scImg.value != null ? scImg.value : "",
                (scTitle && scTitle.value ? scTitle.value : "") + sceneTitleCopySuffix
            );

            var newScDiv = doc.getElementById("scene_" + newSId);
            var oldAudio = sDiv.querySelector(".sc-audio");
            var newAudio = newScDiv && newScDiv.querySelector(".sc-audio");
            if (newAudio && oldAudio) newAudio.value = oldAudio.value;

            var oldVol = sDiv.querySelector(".sc-audio-vol");
            var newVol = newScDiv && newScDiv.querySelector(".sc-audio-vol");
            if (newVol && oldVol) newVol.value = oldVol.value;

            sDiv.querySelectorAll(".hotspot-block").forEach(function (hsDiv) {
                var hid = hsDiv.id.split("_")[1];
                addHotspot(newSId, extractHotspotData(hid));
            });

            var refresh =
                typeof refreshAllSceneTargetSelects === "function"
                    ? refreshAllSceneTargetSelects
                    : global.refreshAllSceneTargetSelects;
            if (typeof refresh === "function") refresh();
        }

        return {
            duplicateHotspot: duplicateHotspot,
            duplicateScene: duplicateScene
        };
    }

    global.EditorSharedDuplication = {
        createDuplicationHelpers: createDuplicationHelpers
    };
})(typeof window !== "undefined" ? window : this);
