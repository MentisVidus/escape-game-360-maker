/**
 * Shared FR/EN timer + end screens settings helpers.
 */
(function (global) {
    "use strict";

    function toBool(value, fallback) {
        if (value === undefined || value === null) return !!fallback;
        if (typeof value === "boolean") return value;
        var s = String(value).trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes" || s === "oui") return true;
        if (s === "false" || s === "0" || s === "no" || s === "non") return false;
        return !!fallback;
    }

    function toInt(value, fallback, min) {
        var n = parseInt(value, 10);
        if (isNaN(n)) n = fallback;
        if (min != null && n < min) n = min;
        return n;
    }

    function sanitizeText(value, fallback) {
        if (value === undefined || value === null) return fallback || "";
        return String(value);
    }

    function normalizeTimerConfig(project) {
        var p = project || {};
        var timer = p.timer || {};
        var endScreens = p.endScreens || {};
        var gameOver = endScreens.gameOver || {};
        var victory = endScreens.victory || {};

        var modeRaw = sanitizeText(timer.mode || "countdown", "countdown").toLowerCase();
        var mode = modeRaw === "countup" ? "countup" : "countdown";

        return {
            timer: {
                enabled: toBool(timer.enabled, false),
                mode: mode,
                startSeconds: toInt(timer.startSeconds, 1800, 0),
                autoStart: toBool(timer.autoStart, true),
                pauseWhenPopupOpen: toBool(timer.pauseWhenPopupOpen, false)
            },
            victorySceneId: sanitizeText(p.victorySceneId, "").trim(),
            gameOverSceneId: sanitizeText(p.gameOverSceneId, "").trim(),
            endScreens: {
                gameOver: {
                    title: sanitizeText(gameOver.title, ""),
                    bodyHtml: sanitizeText(gameOver.bodyHtml, ""),
                    buttonLabel: sanitizeText(gameOver.buttonLabel, "")
                },
                victory: {
                    title: sanitizeText(victory.title, ""),
                    bodyHtml: sanitizeText(victory.bodyHtml, ""),
                    buttonLabel: sanitizeText(victory.buttonLabel, "")
                }
            }
        };
    }

    function readTimerSettingsFromDom(doc) {
        var d = doc || global.document;
        if (!d) throw new Error("document is required for timer settings.");
        var Ex = global.EditorSharedExportText;
        function readPlain(id) {
            var el = d.getElementById(id);
            if (!el) return "";
            if (Ex && typeof Ex.readTimerEndScreenPlainField === "function") {
                return Ex.readTimerEndScreenPlainField(el);
            }
            return el.value != null ? String(el.value) : "";
        }
        function readRich(id) {
            var el = d.getElementById(id);
            if (!el) return "";
            if (Ex && typeof Ex.readExportAwareFieldValue === "function") {
                return Ex.readExportAwareFieldValue(el);
            }
            return el.value != null ? String(el.value) : "";
        }

        var raw = {
            timer: {
                enabled: !!(d.getElementById("useTimer") || {}).checked,
                mode: (d.getElementById("timerMode") || { value: "countdown" }).value,
                startSeconds: (d.getElementById("timerStartSeconds") || { value: "1800" }).value,
                autoStart: !!(d.getElementById("timerAutoStart") || {}).checked,
                pauseWhenPopupOpen: !!(d.getElementById("timerPauseOnPopup") || {}).checked
            },
            victorySceneId: (d.getElementById("victorySceneId") || { value: "" }).value,
            gameOverSceneId: (d.getElementById("gameOverSceneId") || { value: "" }).value,
            endScreens: {
                gameOver: {
                    title: readPlain("endGameOverTitle"),
                    bodyHtml: readRich("endGameOverBody"),
                    buttonLabel: readPlain("endGameOverBtn")
                },
                victory: {
                    title: readPlain("endVictoryTitle"),
                    bodyHtml: readRich("endVictoryBody"),
                    buttonLabel: readPlain("endVictoryBtn")
                }
            }
        };
        return normalizeTimerConfig(raw);
    }

    function applyTimerSettingsToDom(doc, project) {
        var d = doc || global.document;
        if (!d) throw new Error("document is required for timer settings.");
        var cfg = normalizeTimerConfig(project || {});

        var useTimer = d.getElementById("useTimer");
        if (useTimer) useTimer.checked = cfg.timer.enabled;
        var timerWrap = d.getElementById("timer-settings-container");
        if (timerWrap) timerWrap.style.display = cfg.timer.enabled ? "flex" : "none";

        var modeEl = d.getElementById("timerMode");
        if (modeEl) modeEl.value = cfg.timer.mode;
        var secsEl = d.getElementById("timerStartSeconds");
        if (secsEl) secsEl.value = String(cfg.timer.startSeconds);
        var autoEl = d.getElementById("timerAutoStart");
        if (autoEl) autoEl.checked = cfg.timer.autoStart;
        var pauseEl = d.getElementById("timerPauseOnPopup");
        if (pauseEl) pauseEl.checked = cfg.timer.pauseWhenPopupOpen;

        var victorySceneIdEl = d.getElementById("victorySceneId");
        if (victorySceneIdEl) victorySceneIdEl.value = cfg.victorySceneId || "";
        var gameOverSceneIdEl = d.getElementById("gameOverSceneId");
        if (gameOverSceneIdEl) gameOverSceneIdEl.value = cfg.gameOverSceneId || "";

        var goTitle = d.getElementById("endGameOverTitle");
        if (goTitle) goTitle.value = cfg.endScreens.gameOver.title;
        var goBody = d.getElementById("endGameOverBody");
        if (goBody) goBody.value = cfg.endScreens.gameOver.bodyHtml;
        var goBtn = d.getElementById("endGameOverBtn");
        if (goBtn) goBtn.value = cfg.endScreens.gameOver.buttonLabel;

        var vTitle = d.getElementById("endVictoryTitle");
        if (vTitle) vTitle.value = cfg.endScreens.victory.title;
        var vBody = d.getElementById("endVictoryBody");
        if (vBody) vBody.value = cfg.endScreens.victory.bodyHtml;
        var vBtn = d.getElementById("endVictoryBtn");
        if (vBtn) vBtn.value = cfg.endScreens.victory.buttonLabel;

        var endRoot = d.getElementById("end-screens-form-container");
        if (endRoot) {
            if (typeof global.destroyRichEditorsIn === "function") {
                global.destroyRichEditorsIn(endRoot);
            }
            if (typeof global.initRichEditorsIn === "function") {
                global.initRichEditorsIn(endRoot);
            }
        }
    }

    global.EditorSharedTimer = {
        normalizeTimerConfig: normalizeTimerConfig,
        readTimerSettingsFromDom: readTimerSettingsFromDom,
        applyTimerSettingsToDom: applyTimerSettingsToDom
    };
})(typeof window !== "undefined" ? window : this);
