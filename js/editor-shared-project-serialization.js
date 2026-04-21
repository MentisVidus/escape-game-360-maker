/**
 * Shared FR/EN project serialization core (DOM -> schema v2).
 */
(function (global) {
    "use strict";

    function clamp01(value, fallback) {
        var parsed = parseFloat(value);
        if (isNaN(parsed)) return fallback;
        return Math.max(0, Math.min(1, parsed));
    }

    function createSerializer(opts) {
        var options = opts || {};
        var EditorCore = options.EditorCore || global.EditorCore;
        var hotspotDomToV2 = options.hotspotDomToV2;
        var doc = options.document || global.document;
        var readTimerSettings = options.readTimerSettings;

        if (!EditorCore || typeof EditorCore.createEmptyProject !== "function") {
            throw new Error("EditorCore with createEmptyProject() is required.");
        }
        if (typeof hotspotDomToV2 !== "function") {
            throw new Error("hotspotDomToV2() is required for project serialization.");
        }
        if (!doc) {
            throw new Error("document is required for project serialization.");
        }

        function readSceneTimerOverrideFromDiv(sceneDiv) {
            var en = sceneDiv.querySelector(".sc-timer-override-enabled");
            var secEl = sceneDiv.querySelector(".sc-timer-override-seconds");
            var expEl = sceneDiv.querySelector(".sc-timer-override-on-expire");
            var tgtEl = sceneDiv.querySelector(".sc-timer-override-target-scene");
            var msgEl = sceneDiv.querySelector(".sc-timer-override-message-html");
            var exp = expEl && expEl.value ? String(expEl.value) : "gameOver";
            if (exp !== "gotoScene" && exp !== "showMessage") exp = "gameOver";
            return {
                enabled: !!(en && en.checked),
                seconds: secEl && secEl.value != null ? parseInt(secEl.value, 10) : 60,
                onExpire: exp,
                targetScene: tgtEl && tgtEl.value != null ? String(tgtEl.value).trim() : "",
                messageHtml: msgEl && msgEl.value != null ? String(msgEl.value) : ""
            };
        }

        function getCurrentProjectData() {
            var scenesRoot = doc.getElementById("scenes-container");
            if (scenesRoot && typeof global.flushRichEditorsIn === "function") {
                global.flushRichEditorsIn(scenesRoot);
            }
            var endScreensRoot = doc.getElementById("end-screens-form-container");
            if (endScreensRoot && typeof global.flushRichEditorsIn === "function") {
                global.flushRichEditorsIn(endScreensRoot);
            }

            var project = EditorCore.createEmptyProject();
            project.title = (doc.getElementById("gameTitle") || { value: "" }).value;
            project.useInv = !!(doc.getElementById("useInventory") || {}).checked;
            project.invPos = (doc.getElementById("inv-pos") || { value: "bottom-right" }).value;
            project.invIcon = (doc.getElementById("inv-icon") || { value: "" }).value;
            project.invBgc = (doc.getElementById("inv-bgc") || { value: "#000000" }).value;
            project.invBga = clamp01((doc.getElementById("inv-bga") || { value: "0.8" }).value, 0.8);
            project.invColor = (doc.getElementById("inv-color") || { value: "#ffffff" }).value;
            project.useCustomPopup = !!(doc.getElementById("useCustomPopup") || {}).checked;
            project.useGlobalAudio = !!(doc.getElementById("useGlobalAudio") || {}).checked;
            project.globalMusic = {
                url: (doc.getElementById("globalAudioUrl") || { value: "" }).value,
                volume: clamp01((doc.getElementById("globalAudioVol") || { value: "0.5" }).value, 0.5)
            };
            project.popFont = (doc.getElementById("pop-font") || { value: "Arial, sans-serif" }).value;
            project.popColor = (doc.getElementById("pop-color") || { value: "#ffffff" }).value;
            project.popBgc = (doc.getElementById("pop-bgc") || { value: "#000000" }).value;
            project.popBga = clamp01((doc.getElementById("pop-bga") || { value: "0.9" }).value, 0.9);
            project.popBtnBg = (doc.getElementById("pop-btn-bg") || { value: "#ffffff" }).value;
            project.popBtnCol = (doc.getElementById("pop-btn-col") || { value: "#000000" }).value;
            var psm = (doc.getElementById("playerSaveMode") || { value: "manual" }).value;
            if (psm !== "none" && psm !== "auto") psm = "manual";
            project.playerSave = { mode: psm };
            if (typeof readTimerSettings === "function") {
                var timerCfg = readTimerSettings(doc);
                if (timerCfg && typeof timerCfg === "object") {
                    project.timer = timerCfg.timer || project.timer;
                    project.victorySceneId = timerCfg.victorySceneId || "";
                    project.gameOverSceneId = timerCfg.gameOverSceneId || "";
                    project.endScreens = timerCfg.endScreens || project.endScreens;
                }
            }

            doc.querySelectorAll(".scene-block").forEach(function (sceneDiv) {
                var titleEl = sceneDiv.querySelector(".sc-title");
                var titleVal =
                    titleEl && global.EditorSharedExportText &&
                    typeof global.EditorSharedExportText.readExportAwareFieldValue === "function"
                        ? global.EditorSharedExportText.readExportAwareFieldValue(titleEl)
                        : (sceneDiv.querySelector(".sc-title") || { value: "" }).value;
                var editorOnly = sceneDiv.getAttribute("data-editor-map-staging") === "1";
                var scene = {
                    id: (sceneDiv.querySelector(".sc-id") || { value: "" }).value.trim(),
                    title: titleVal,
                    media: {
                        panoramaUrl: (sceneDiv.querySelector(".sc-img") || { value: "" }).value,
                        ambiance: {
                            url: sceneDiv.querySelector(".sc-audio")
                                ? sceneDiv.querySelector(".sc-audio").value
                                : "",
                            volume: clamp01(
                                (sceneDiv.querySelector(".sc-audio-vol") || { value: "1" }).value,
                                1
                            )
                        }
                    },
                    hotspots: [],
                    timerOverride: readSceneTimerOverrideFromDiv(sceneDiv)
                };
                if (editorOnly) scene.editorOnly = true;
                sceneDiv.querySelectorAll(".hotspot-block").forEach(function (hsDiv) {
                    scene.hotspots.push(hotspotDomToV2(hsDiv));
                });
                project.scenes.push(scene);
            });

            var startEl = doc.getElementById("project-start-scene-id");
            var startRaw = startEl && startEl.value != null ? String(startEl.value).trim() : "";
            if (startRaw) {
                project.startSceneId = startRaw;
            } else {
                delete project.startSceneId;
            }

            return project;
        }

        return {
            getCurrentProjectData: getCurrentProjectData
        };
    }

    global.EditorSharedProjectSerialization = {
        createSerializer: createSerializer
    };
})(typeof window !== "undefined" ? window : this);
