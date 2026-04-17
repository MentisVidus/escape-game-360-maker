/**
 * Shared FR/EN 360 tools: picker + scene preview.
 */
(function (global) {
    "use strict";

    function createPreviewPicker(opts) {
        var options = opts || {};
        var doc = options.document || global.document;
        var pannellumApi = options.pannellum || global.pannellum;
        var messages = options.messages || {};
        var missingImageAlert = messages.missingImageAlert || "Missing image!";

        if (!doc) throw new Error("document is required for preview/picker tools.");
        if (!pannellumApi || typeof pannellumApi.viewer !== "function") {
            throw new Error("pannellum.viewer is required for preview/picker tools.");
        }

        var currentPickerHsId = null;
        var pickerViewer = null;
        var tempPitch = 0;
        var tempYaw = 0;
        var scenePreviewViewer = null;

        function normalizePanoramaUrl(rawUrl) {
            var imgUrl = rawUrl || "";
            if (!imgUrl.startsWith("http") && !imgUrl.startsWith("data:") && !imgUrl.startsWith("blob:")) {
                imgUrl = "./" + imgUrl;
            }
            return imgUrl;
        }

        function openPicker(sceneLocalId, hId) {
            var scImgEl = doc.querySelector("#scene_" + sceneLocalId + " .sc-img");
            var scImg = scImgEl ? scImgEl.value : "";
            if (!scImg) return;

            currentPickerHsId = hId;
            var pickerModal = doc.getElementById("picker-modal");
            if (pickerModal) pickerModal.style.display = "flex";

            if (pickerViewer) pickerViewer.destroy();
            pickerViewer = pannellumApi.viewer("picker-panorama", {
                type: "equirectangular",
                panorama: normalizePanoramaUrl(scImg),
                autoLoad: true,
                showControls: false
            });

            pickerViewer.on("load", function () {
                setInterval(function () {
                    var pickerVisible = pickerModal && pickerModal.style.display === "flex";
                    if (pickerViewer && pickerVisible) {
                        tempPitch = pickerViewer.getPitch();
                        tempYaw = pickerViewer.getYaw();
                        var livePitch = doc.getElementById("live-pitch");
                        var liveYaw = doc.getElementById("live-yaw");
                        if (livePitch) livePitch.innerText = tempPitch.toFixed(1);
                        if (liveYaw) liveYaw.innerText = tempYaw.toFixed(1);
                    }
                }, 100);
            });
        }

        function closePicker() {
            var pickerModal = doc.getElementById("picker-modal");
            if (pickerModal) pickerModal.style.display = "none";
            if (pickerViewer) {
                pickerViewer.destroy();
                pickerViewer = null;
            }
            currentPickerHsId = null;
        }

        function validerCoordonnees() {
            if (currentPickerHsId == null) return;
            var pitchEl = doc.querySelector("#hs_" + currentPickerHsId + " .hs-pitch");
            var yawEl = doc.querySelector("#hs_" + currentPickerHsId + " .hs-yaw");
            if (pitchEl) pitchEl.value = tempPitch.toFixed(1);
            if (yawEl) yawEl.value = tempYaw.toFixed(1);
            closePicker();
        }

        function sanitizeCssDeclarationText(value) {
            return String(value || "")
                .replace(/<\/style/gi, "<\\/style")
                .replace(/[\u0000-\u001F\u007F]/g, " ")
                .replace(/[\r\n\f]/g, " ");
        }

        function escapeForCssContentString(value) {
            return String(value || "")
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'")
                .replace(/[\r\n\f]/g, " ")
                .replace(/<\/style/gi, "<\\/style");
        }

        function previewScene(sceneLocalId) {
            var scImgEl = doc.querySelector("#scene_" + sceneLocalId + " .sc-img");
            var scImg = scImgEl ? scImgEl.value : "";
            if (!scImg) {
                alert(missingImageAlert);
                return;
            }

            var previewModal = doc.getElementById("scene-preview-modal");
            if (previewModal) previewModal.style.display = "flex";

            var previewCSS = "";
            var hsArray = [];
            doc.querySelectorAll("#scene_" + sceneLocalId + " .hotspot-block").forEach(function (hsDiv, index) {
                var pitch = parseFloat((hsDiv.querySelector(".hs-pitch") || { value: "0" }).value);
                var yaw = parseFloat((hsDiv.querySelector(".hs-yaw") || { value: "0" }).value);
                var rawCss = sanitizeCssDeclarationText((hsDiv.querySelector(".hs-custom-css") || { value: "" }).value);
                var hsIdText = escapeForCssContentString(
                    (hsDiv.querySelector(".hs-title") || { value: "" }).value || ("HS " + (index + 1))
                );
                var hsClass = "prev-hs-" + sceneLocalId + "-" + index;

                previewCSS += "." + hsClass + " { " + rawCss + " outline: 3px dashed red !important; outline-offset: 2px; pointer-events: auto; display: flex; align-items: center; justify-content: center; }\n";
                previewCSS += "." + hsClass + "::after { content: '" + hsIdText + "'; background: black; color: white; padding: 2px 5px; font-size: 12px; font-weight: bold; border-radius: 3px; }\n";
                hsArray.push({ pitch: pitch, yaw: yaw, cssClass: hsClass });
            });

            var styleEl = doc.getElementById("live-preview-styles");
            if (styleEl) styleEl.textContent = previewCSS;

            if (scenePreviewViewer) scenePreviewViewer.destroy();
            scenePreviewViewer = pannellumApi.viewer("scene-preview-panorama", {
                type: "equirectangular",
                panorama: normalizePanoramaUrl(scImg),
                autoLoad: true,
                hotSpots: hsArray
            });
        }

        function closeScenePreview() {
            var previewModal = doc.getElementById("scene-preview-modal");
            if (previewModal) previewModal.style.display = "none";
            if (scenePreviewViewer) {
                scenePreviewViewer.destroy();
                scenePreviewViewer = null;
            }
        }

        return {
            openPicker: openPicker,
            validerCoordonnees: validerCoordonnees,
            closePicker: closePicker,
            previewScene: previewScene,
            closeScenePreview: closeScenePreview
        };
    }

    global.EditorSharedPreviewPicker = {
        createPreviewPicker: createPreviewPicker
    };
})(typeof window !== "undefined" ? window : this);
