// --- Player HTML (index.html alone or `exportGameWebZip` hosting ZIP) ---
var OFFLINE_PANNELLUM_CDN_CSS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css";
var OFFLINE_PANNELLUM_CDN_JS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js";

function patchPlayerHtmlForOffline(html) {
    return String(html)
        .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/pannellum@2\.5\.7\/build\/pannellum\.css/g, "./lib/pannellum.css")
        .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/pannellum@2\.5\.7\/build\/pannellum\.js/g, "./lib/pannellum.js");
}

/** Prefix ./ for relative player paths; leave http(s), blob:, data: unchanged. */
function playerRelMediaPathIfLocal(u) {
    var s = String(u || "").trim();
    if (!s) return s;
    if (
        s.startsWith("http://") ||
        s.startsWith("https://") ||
        s.startsWith("blob:") ||
        s.startsWith("data:")
    )
        return s;
    if (s.startsWith("./")) return s;
    return "./" + s;
}

function sanitizeOfflineMediaBaseName(name, fallback) {
    var base = String(name || fallback || "media")
        .split(/[/\\]/)
        .pop();
    base = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
    if (!base || base === "." || base === "..") base = fallback || "media.bin";
    return base.slice(0, 120);
}

function uniqueOfflineMediaName(desired, usedSet) {
    var dot = desired.lastIndexOf(".");
    var stem = dot > 0 ? desired.slice(0, dot) : desired;
    var ext = dot > 0 ? desired.slice(dot) : "";
    var name = desired;
    var n = 0;
    while (usedSet[name]) {
        n++;
        name = stem + "_" + n + ext;
    }
    usedSet[name] = true;
    return name;
}

function computePlayerGameFingerprint(project) {
    var json = "";
    try {
        json = JSON.stringify(project || {});
    } catch (e) {
        json = String((project && project.title) || "");
    }
    var h = 2166136261;
    for (var i = 0; i < json.length; i++) {
        h ^= json.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return "g" + h.toString(16);
}

var WEB_ZIP_BAT_WINDOWS_EN =
    "@echo off\r\n" +
    "echo Starting local server for the escape game...\r\n" +
    "start http://localhost:8000\r\n" +
    "python -m http.server 8000\r\n" +
    "pause\r\n";

var WEB_ZIP_README_EN =
    "=== Play locally on your computer ===\r\n\r\n" +
    "The 360 game does not work if you open index.html directly (double-click): browsers block media loads.\r\n" +
    "You need to serve the folder over HTTP.\r\n\r\n" +
    "--- Quick way (Windows, Python installed) ---\r\n" +
    "1. Install Python from https://www.python.org/ (check \"Add Python to PATH\").\r\n" +
    "2. Double-click start_local_server.bat in this folder.\r\n" +
    "3. The browser opens http://localhost:8000 — click index.html.\r\n\r\n" +
    "--- Manual Python ---\r\n" +
    "Open a terminal in this folder (Shift + right-click > Open in Terminal), then:\r\n" +
    "  python -m http.server 8000\r\n" +
    "Open http://localhost:8000 in Chrome or Firefox.\r\n\r\n" +
    "--- Node.js (npx) ---\r\n" +
    "  npx --yes serve -l 8000\r\n\r\n" +
    "--- Visual Studio Code ---\r\n" +
    "Install the \"Live Server\" extension, right-click index.html > \"Open with Live Server\".\r\n\r\n" +
    "--- Web hosting ---\r\n" +
    "Upload the full ZIP contents (index.html, lib/, media/) to your host or GitHub Pages.\r\n";

/** @returns {string} Full player HTML (Pannellum via CDN links). */
function buildPlayerHtmlTemplate() {
    // 1. Globals from project v2
    const project = getCurrentProjectData();
    const playerGameFingerprint = computePlayerGameFingerprint(project);
    const title = project.title || "My awesome game";
    const hasInv = project.useInv !== false;
    const invPos = project.invPos || "top-right";
    const invIconVal = project.invIcon || "🎒";
	const useGlobalAudio = !!project.useGlobalAudio;
	const gm = project.globalMusic || {};
	const globalMusicUrl = playerRelMediaPathIfLocal(
		String(gm.url != null ? gm.url : project.globalAudioUrl || "").trim()
	);
	const globalMusicVol =
		gm.volume !== undefined && !isNaN(Number(gm.volume))
			? Math.max(0, Math.min(1, Number(gm.volume)))
			: 0.5;

    
    // Map inventory corner → CSS + flex alignment
    let invPosCSS = "top: 15px; right: 15px;"; let alignItems = "flex-end";
    if(invPos === 'top-left') { invPosCSS = "top: 15px; left: 15px;"; alignItems = "flex-start"; } 
    if(invPos === 'bottom-right') { invPosCSS = "bottom: 15px; right: 15px;"; alignItems = "flex-end"; } 
    if(invPos === 'bottom-left') { invPosCSS = "bottom: 15px; left: 15px;"; alignItems = "flex-start"; }
    
    // Inventory toggle: emoji/text or <img> if URL / extension (flexible sizing for future custom assets)
    let invIconHTML = invIconVal;
    if(invIconVal.startsWith('http') || invIconVal.endsWith('.png') || invIconVal.endsWith('.jpg')) {
        invIconHTML = `<img src="${invIconVal}" class="player-hud-icon-img" alt="">`;
    }
	
    // Inventory panel rgba background
    const invBgc = project.invBgc || "#000000";
    const invBga = project.invBga !== undefined ? project.invBga : "0.8";
    const invBg = hexToRgba(invBgc, invBga);
    const invColor = project.invColor || "#ffffff";

    // Dialog theme (or built-in defaults)
    const useCustomPopup = !!project.useCustomPopup;
    const popFont = useCustomPopup ? (project.popFont || "Arial, sans-serif") : "Arial, sans-serif";
    const popColor = useCustomPopup ? (project.popColor || "#ffffff") : "#ffffff";
    const popBgc = useCustomPopup ? (project.popBgc || "#000000") : "#000000";
    const popBga = useCustomPopup ? (project.popBga !== undefined ? project.popBga : "0.95") : "0.95";
    const popBg = hexToRgba(popBgc, popBga);
    const popBtnBg = useCustomPopup ? (project.popBtnBg || "#27ae60") : "#27ae60";
    const popBtnCol = useCustomPopup ? (project.popBtnCol || "#ffffff") : "#ffffff";

    const timerCfg = project.timer || {};
    const timerEnabled = !!timerCfg.enabled;
    const timerMode = timerCfg.mode === "countup" ? "countup" : "countdown";
    const timerStartSeconds = Math.max(0, parseInt(timerCfg.startSeconds, 10) || 0);
    const timerAutoStart = timerCfg.autoStart !== false;
    const timerPauseWhenPopupOpen = !!timerCfg.pauseWhenPopupOpen;
    const endGo = (project.endScreens && project.endScreens.gameOver) || {};
    const playerTimerPayload = {
        enabled: timerEnabled,
        mode: timerMode,
        startSeconds: timerStartSeconds,
        autoStart: timerAutoStart,
        pauseWhenPopupOpen: timerPauseWhenPopupOpen,
        gameOverSceneId: String(project.gameOverSceneId || "").trim(),
        gameOver: {
            title: String(endGo.title || "").trim(),
            bodyHtml: String(endGo.bodyHtml || ""),
            buttonLabel: String(endGo.buttonLabel || "Restart").trim() || "Restart"
        }
    };
    const playerTimerJson = JSON.stringify(playerTimerPayload).replace(/</g, "\\u003c");

    const victorySceneId = String(project.victorySceneId || "").trim();
    const endVictory = (project.endScreens && project.endScreens.victory) || {};
    const playerVictoryPayload = {
        sceneId: victorySceneId,
        title: String(endVictory.title || "").trim(),
        bodyHtml: String(endVictory.bodyHtml || ""),
        buttonLabel: String(endVictory.buttonLabel || "Restart").trim() || "Restart"
    };
    const playerVictoryJson = JSON.stringify(playerVictoryPayload).replace(/</g, "\\u003c");
    var psm = project.playerSave && project.playerSave.mode ? String(project.playerSave.mode).toLowerCase() : "manual";
    if (psm !== "none" && psm !== "auto") psm = "manual";
    const playerSaveCfgJson = JSON.stringify({ mode: psm }).replace(/</g, "\\u003c");

    var sceneTimerOverridesMapBuild = {};
    (project.scenes || []).forEach(function (sc) {
        if (!sc || sc.id == null || String(sc.id).trim() === "") return;
        var ov = sc.timerOverride;
        if (!ov || !ov.enabled) return;
        var sec = Math.max(0, parseInt(ov.seconds, 10) || 0);
        if (sec <= 0) return;
        var exp = String(ov.onExpire || "gameOver").toLowerCase();
        if (exp === "gotoscene") exp = "gotoScene";
        if (exp === "showmessage") exp = "showMessage";
        if (exp !== "gotoScene" && exp !== "showMessage") exp = "gameOver";
        sceneTimerOverridesMapBuild[String(sc.id).trim()] = {
            seconds: sec,
            onExpire: exp,
            targetScene: ov.targetScene != null ? String(ov.targetScene).trim() : "",
            messageHtml: ov.messageHtml != null ? String(ov.messageHtml) : ""
        };
    });
    const sceneTimerOverridesJson = JSON.stringify(sceneTimerOverridesMapBuild).replace(/</g, "\\u003c");

    let scenesConfig = {};
    let firstSceneId = "";
    let customStylesCSS = "";
    let globalHsCount = 0;
	let sceneAmbianceClips = {};
    
    function rewardActionV2ToLegacyNode(action) {
        var a = action || {};
        var p = a.payload || {};
        var c = p.copy || {};
        var out = { actionType: a.type || "msg" };
        if(a.type === "msg") out.txt = c.bodyHtml || "";
        else if(a.type === "scene") {
            out.target = p.target || "";
            out.transTxt = c.bodyHtml || "";
            out.transBtn = c.buttonLabel || "Continue";
        } else if(a.type === "pick") {
            out.itemId = p.itemId || "";
            out.itemName = p.itemName || "";
            out.txt = c.bodyHtml || "";
        } else if(a.type === "selector") {
            var n = p.nested || {};
            var nc = n.copy || {};
            out.nested = {
                title: n.title || "",
                introHtml: nc.bodyHtml || "",
                displayMode: n.displayMode === "dropdown" ? "dropdown" : "buttons",
                choices: (Array.isArray(n.choices) ? n.choices : []).map(choiceV2ToLegacy)
            };
        } else if(a.type === "req") {
            out.itemId = p.itemId || "";
            out.ko = c.bodyHtml || "";
            var rr = p.rewardAction || {};
            out.f_req_action = rr.type || "scene";
            if(rr.type === "req" || rr.type === "pwd") {
                out.next = rewardActionV2ToLegacyNode(rr);
            }
        } else if(a.type === "pwd") {
            out.enigmeTxt = c.bodyHtml || "";
            out.pwd = (p.answer || "").toLowerCase().trim();
            out.f_pwd_remember = p.rememberSuccess === true ? "yes" : "no";
            var rp = p.rewardAction || {};
            out.f_pwd_action = rp.type || "scene";
            if(rp.type === "req" || rp.type === "pwd") {
                out.next = rewardActionV2ToLegacyNode(rp);
            }
        }
        return out;
    }

    function choiceV2ToLegacy(choice) {
        if(!choice || !choice.action) return { label: "Option", actionType: "msg", txt: "" };
        var a = choice.action;
        var p = a.payload || {};
        var c = p.copy || {};
        var out = { label: choice.label || "Option", actionType: a.type || "msg" };
        if(choice.id) out.id = choice.id;
        if(a.type === "msg") out.txt = c.bodyHtml || "";
        else if(a.type === "scene") {
            out.target = p.target || "";
            out.transTxt = c.bodyHtml || "";
            out.transBtn = c.buttonLabel || "Continue";
        } else if(a.type === "pick") {
            out.itemId = p.itemId || "";
            out.itemName = p.itemName || "";
            out.txt = c.bodyHtml || "";
        } else if(a.type === "req") {
            out.itemId = p.itemId || "";
            out.ko = c.bodyHtml || "";
            var r = p.rewardAction || {};
            var rc = (r.payload && r.payload.copy) || {};
            out.f_req_action = r.type || "scene";
            if(r.type === "scene") {
                out.target = (r.payload && r.payload.target) || "";
                out.transTxt = rc.bodyHtml || "";
                out.transBtn = rc.buttonLabel || "Continue";
            } else if(r.type === "msg") out.f_ok_msg = rc.bodyHtml || "";
            else if(r.type === "pick") {
                out.f_pick_id = (r.payload && r.payload.itemId) || "";
                out.f_pick_name = (r.payload && r.payload.itemName) || "";
                out.f_pick_msg = rc.bodyHtml || "";
            } else if(r.type === "selector") {
                var rrn = r.payload && r.payload.nested;
                var rrnc = (rrn && rrn.copy) || {};
                out.rewardNested = {
                    title: (rrn && rrn.title) || "",
                    introHtml: rrnc.bodyHtml || "",
                    displayMode: rrn && rrn.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: (rrn && Array.isArray(rrn.choices) ? rrn.choices : []).map(choiceV2ToLegacy)
                };
            } else if(r.type === "req" || r.type === "pwd") {
                out.f_reward_chain_json = JSON.stringify(rewardActionV2ToLegacyNode(r), null, 2);
            }
        } else if(a.type === "pwd") {
            out.enigmeTxt = c.bodyHtml || "";
            out.pwd = (p.answer || "").toLowerCase().trim();
            out.f_pwd_remember = p.rememberSuccess === true ? "yes" : "no";
            var rp = p.rewardAction || {};
            var rpc = (rp.payload && rp.payload.copy) || {};
            out.f_pwd_action = rp.type || "scene";
            if(rp.type === "scene") {
                out.target = (rp.payload && rp.payload.target) || "";
                out.transTxt = rpc.bodyHtml || "";
                out.transBtn = rpc.buttonLabel || "Continue";
            } else if(rp.type === "msg") out.f_ok_msg = rpc.bodyHtml || "";
            else if(rp.type === "pick") {
                out.f_pick_id = (rp.payload && rp.payload.itemId) || "";
                out.f_pick_name = (rp.payload && rp.payload.itemName) || "";
                out.f_pick_msg = rpc.bodyHtml || "";
            } else if(rp.type === "selector") {
                var rpn = rp.payload && rp.payload.nested;
                var rpnc = (rpn && rpn.copy) || {};
                out.rewardNested = {
                    title: (rpn && rpn.title) || "",
                    introHtml: rpnc.bodyHtml || "",
                    displayMode: rpn && rpn.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: (rpn && Array.isArray(rpn.choices) ? rpn.choices : []).map(choiceV2ToLegacy)
                };
            } else if(rp.type === "req" || rp.type === "pwd") {
                out.f_reward_chain_json = JSON.stringify(rewardActionV2ToLegacyNode(rp), null, 2);
            }
        } else if(a.type === "selector") {
            var n = p.nested || {};
            var nc = n.copy || {};
            out.nested = {
                title: n.title || "",
                introHtml: nc.bodyHtml || "",
                displayMode: n.displayMode === "dropdown" ? "dropdown" : "buttons",
                choices: (Array.isArray(n.choices) ? n.choices : []).map(choiceV2ToLegacy)
            };
        }
        if(a.visibility && a.visibility.requiresItem) out.requiresItem = a.visibility.requiresItem;
        if(a.visibility && a.visibility.hiddenIfHasItem) out.hiddenIfHasItem = a.visibility.hiddenIfHasItem;
        if(a.sfx && a.sfx.url) out.sfxUrl = a.sfx.url;
        if(a.sfx && a.sfx.volume !== undefined) out.sfxVolume = a.sfx.volume;
        return out;
    }

    function actionV2ToPlayerArgs(action) {
        var a = action || {};
        var p = a.payload || {};
        var pc = p.copy || {};
        var args = { type: a.type || "msg" };
        if(args.type === "msg") args.txt = pc.bodyHtml || "";
        else if(args.type === "scene") {
            args.target = p.target || "";
            args.transTxt = pc.bodyHtml || "";
            args.transBtn = pc.buttonLabel || "Continue";
        } else if(args.type === "pick") {
            args.itemId = p.itemId || "";
            args.itemName = p.itemName || "";
            args.txt = pc.bodyHtml || "";
        } else if(args.type === "req") {
            args.itemId = p.itemId || "";
            args.ko = pc.bodyHtml || "";
            var r = p.rewardAction || {};
            var rc = (r.payload && r.payload.copy) || {};
            args.action = r.type || "scene";
            if(args.action === "scene") {
                args.target = (r.payload && r.payload.target) || "";
                args.transTxt = rc.bodyHtml || "";
                args.transBtn = rc.buttonLabel || "Continue";
            } else if(args.action === "msg") args.okMsg = rc.bodyHtml || "";
            else if(args.action === "pick") {
                args.pickId = (r.payload && r.payload.itemId) || "";
                args.pickName = (r.payload && r.payload.itemName) || "";
                args.pickMsg = rc.bodyHtml || "";
            } else if(args.action === "selector") {
                var rrn = r.payload && r.payload.nested;
                var rrnc = (rrn && rrn.copy) || {};
                args.rewardSelector = {
                    title: (rrn && rrn.title) || "",
                    introHtml: rrnc.bodyHtml || "",
                    displayMode: rrn && rrn.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: (rrn && Array.isArray(rrn.choices) ? rrn.choices : []).map(choiceV2ToLegacy)
                };
            } else if(args.action === "req") {
                args.reqItemId = (r.payload && r.payload.itemId) || "";
                args.reqKo = rc.bodyHtml || "";
                args.reqNext = actionV2ToPlayerArgs((r.payload && r.payload.rewardAction) || {});
            } else if(args.action === "pwd") {
                args.pwdEnigmeTxt = rc.bodyHtml || "";
                args.pwdValue = ((r.payload && r.payload.answer) || "").toLowerCase().trim();
                args.pwdRememberSuccess = !!(r.payload && r.payload.rememberSuccess);
                args.pwdNext = actionV2ToPlayerArgs((r.payload && r.payload.rewardAction) || {});
            }
        } else if(args.type === "pwd") {
            args.enigmeTxt = pc.bodyHtml || "";
            args.pwd = (p.answer || "").toLowerCase().trim();
            args.rememberSuccess = p.rememberSuccess === true;
            var rp = p.rewardAction || {};
            var rpc = (rp.payload && rp.payload.copy) || {};
            args.action = rp.type || "scene";
            if(args.action === "scene") {
                args.target = (rp.payload && rp.payload.target) || "";
                args.transTxt = rpc.bodyHtml || "";
                args.transBtn = rpc.buttonLabel || "Continue";
            } else if(args.action === "msg") args.okMsg = rpc.bodyHtml || "";
            else if(args.action === "pick") {
                args.pickId = (rp.payload && rp.payload.itemId) || "";
                args.pickName = (rp.payload && rp.payload.itemName) || "";
                args.pickMsg = rpc.bodyHtml || "";
            } else if(args.action === "selector") {
                var rpn = rp.payload && rp.payload.nested;
                var rpnc = (rpn && rpn.copy) || {};
                args.rewardSelector = {
                    title: (rpn && rpn.title) || "",
                    introHtml: rpnc.bodyHtml || "",
                    displayMode: rpn && rpn.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: (rpn && Array.isArray(rpn.choices) ? rpn.choices : []).map(choiceV2ToLegacy)
                };
            } else if(args.action === "req") {
                args.reqItemId = (rp.payload && rp.payload.itemId) || "";
                args.reqKo = rpc.bodyHtml || "";
                args.reqNext = actionV2ToPlayerArgs((rp.payload && rp.payload.rewardAction) || {});
            } else if(args.action === "pwd") {
                args.pwdEnigmeTxt = rpc.bodyHtml || "";
                args.pwdValue = ((rp.payload && rp.payload.answer) || "").toLowerCase().trim();
                args.pwdRememberSuccess = !!(rp.payload && rp.payload.rememberSuccess);
                args.pwdNext = actionV2ToPlayerArgs((rp.payload && rp.payload.rewardAction) || {});
            }
        } else if(args.type === "selector") {
            var n = p.nested || {};
            var ncopy = n.copy || {};
            args.title = n.title || "";
            args.introHtml = ncopy.bodyHtml || "";
            args.displayMode = n.displayMode === "dropdown" ? "dropdown" : "buttons";
            args.choices = (Array.isArray(n.choices) ? n.choices : []).map(choiceV2ToLegacy);
        }
        if(a.visibility && a.visibility.requiresItem) args.requiresItem = a.visibility.requiresItem;
        if(a.visibility && a.visibility.hiddenIfHasItem) args.hiddenIfHasItem = a.visibility.hiddenIfHasItem;
        if(a.visibility && a.visibility.clickWhenInvisible === false) args.clickWhenInvisible = false;
        if(a.sfx && a.sfx.url) args.sfxUrl = a.sfx.url;
        if(a.sfx && a.sfx.volume !== undefined) args.sfxVolume = a.sfx.volume;
        return args;
    }

    // 2. Pannellum scenes + per-scene ambient URLs
    (project.scenes || []).forEach((scene, index) => {
        const scId = scene.id || ("scene_" + (index + 1));
        let scImg = (scene.media && scene.media.panoramaUrl) ? scene.media.panoramaUrl : "";
        scImg = playerRelMediaPathIfLocal(scImg);
        if(index === 0) firstSceneId = scId;

        var amb = scene.media && scene.media.ambiance;
        var scAudioRaw =
            typeof amb === "string"
                ? String(amb).trim()
                : amb && amb.url != null
                  ? String(amb.url).trim()
                  : "";
        if (scAudioRaw) {
            let scAudioUrl = playerRelMediaPathIfLocal(scAudioRaw);
            var ambVol =
                amb && typeof amb === "object" && amb.volume !== undefined && !isNaN(Number(amb.volume))
                    ? Math.max(0, Math.min(1, Number(amb.volume)))
                    : 1;
            sceneAmbianceClips[scId] = { url: scAudioUrl, volume: ambVol };
        }
        
        let hotSpots = [];
        
        // Hotspots → Pannellum hotSpots + CSS classes
        (scene.hotspots || []).forEach(hs => {
            globalHsCount++; 
            const hsClass = "custom-hs-" + globalHsCount;
            
            // Player stylesheet chunk for this hotspot
            customStylesCSS += `.${hsClass} { ${(hs.customCss || "")} pointer-events: auto; }\n.${hsClass}:hover { transform: scale(1.1); }\n`;
            
            const type = (hs.action && hs.action.type) ? hs.action.type : "msg";
            
            // args → passed into createTooltipArgs / hotspotDispatcher
            let args = actionV2ToPlayerArgs(hs.action || { type: type, payload: {} });
            args.id = "hs_uid_" + globalHsCount;
            
            // Push hotspot config
            hotSpots.push({
                pitch: parseFloat(hs.pitch != null ? hs.pitch : 0),
                yaw: parseFloat(hs.yaw != null ? hs.yaw : 0),
                cssClass: hsClass,
                createTooltipFunc: "hotspotDispatcher",
                createTooltipArgs: args
            });
        });
        
        // scenesConfig[scId] for viewer init
        scenesConfig[scId] = { type: "equirectangular", panorama: scImg, hotSpots: hotSpots };
    });

    // 3. JSON scenes — replace string "hotspotDispatcher" with live function ref
    let jsonScenes = JSON.stringify(scenesConfig, null, 4).replace(/"createTooltipFunc": "hotspotDispatcher"/g, '"createTooltipFunc": hotspotDispatcher');

    const sceneAmbianceJson = JSON.stringify(sceneAmbianceClips);

    // 4. Assemble final HTML string
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <!-- Pannellum (CDN) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css">
    <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js"><\/script>
    <style>
        /* Player base layout */
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: black; font-family: Arial; } 
        #panorama { width: 100%; height: 100%; } 
        /* Hotspot styles from editor */
        ${customStylesCSS}
        /* Rich text (Quill): alignment classes + left base under centered popups */
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { text-align: justify !important; }
        .play-html-rich { text-align: left; }
        .ql-font-arial { font-family: Arial, Helvetica, sans-serif; }
        .ql-font-courier { font-family: "Courier New", Courier, monospace; }
        .ql-font-times { font-family: "Times New Roman", Times, serif; }
        .ql-font-impact { font-family: Impact, Haettenschweiler, "Arial Narrow Bold", fantasy; }
        .ql-font-comic { font-family: "Comic Sans MS", "Comic Sans", cursive, sans-serif; }
        .ql-size-small { font-size: 0.85em !important; }
        .ql-size-large { font-size: 1.5em !important; }
        .ql-size-huge { font-size: 2em !important; }
        
        /* HUD: inventory + settings (side by side); em-based buttons for emoji or image assets */
        #player-hud { position: absolute; ${invPosCSS} z-index: 9999; display: flex; flex-direction: column; align-items: ${alignItems}; }
        .player-hud-icons { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.45em; }
        .player-hud-btn {
            cursor: pointer; box-sizing: border-box; min-width: 2.6em; min-height: 2.6em; padding: 0.35em;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: clamp(1.15rem, 4.2vmin, 1.85rem); line-height: 1;
            background: rgba(0,0,0,0.5); border-radius: 50%; user-select: none;
            border: 2px solid rgba(255,255,255,0.3); transition: 0.2s; color: inherit;
        }
        .player-hud-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.06); }
        .player-hud-icon-img { max-width: 2.5em; max-height: 2.5em; width: auto; height: auto; object-fit: contain; display: block; vertical-align: middle; }
        #inv-panel { background: ${invBg}; color: ${invColor}; border: 2px solid white; padding: 15px; border-radius: 8px; margin-top: 10px; margin-bottom: 10px; display: none; min-width: 150px; }
        #inv-panel h3 { margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px; }
        #inv-list { margin: 0; padding: 0; list-style-type: none; line-height: 1.5; }
        #settings-modal { display: none; position: fixed; inset: 0; z-index: 10050; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box; }
        #settings-modal.is-open { display: flex; }
        .settings-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
        .settings-modal-panel {
            position: relative; z-index: 1; max-width: 420px; width: 100%; padding: 18px 20px; border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.45);
            font-family: ${popFont}; color: ${popColor}; background: ${popBg}; border: 1px solid rgba(255,255,255,0.2);
        }
        .settings-modal-panel h2 { margin: 0 0 14px 0; font-size: 1.25rem; }
        .settings-row { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
        .settings-row label { font-size: 0.92rem; opacity: 0.95; }
        .settings-row input[type=range] { width: 100%; max-width: 100%; }
        .settings-val { font-size: 0.8rem; opacity: 0.85; font-variant-numeric: tabular-nums; }
        .settings-close-row { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
        .settings-close-btn {
            cursor: pointer; padding: 8px 16px; border-radius: 6px; border: none; font-family: ${popFont};
            background: ${popBtnBg}; color: ${popBtnCol}; font-size: 0.95rem;
        }
        .settings-close-btn:hover { filter: brightness(1.08); }
        #player-timer {
            display: none; margin-top: 8px; padding: 6px 12px; border-radius: 8px; background: rgba(0,0,0,0.55); color: #fff;
            font-variant-numeric: tabular-nums; font-size: clamp(0.9rem, 3.5vmin, 1.25rem); border: 1px solid rgba(255,255,255,0.25);
        }
        #player-timer.is-visible { display: block; }
        #end-screen-modal, #victory-screen-modal { display: none; position: fixed; inset: 0; z-index: 11000; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box; }
        #end-screen-modal.is-open, #victory-screen-modal.is-open { display: flex; }
        .end-screen-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.78); }
        .end-screen-panel {
            position: relative; z-index: 1; max-width: 520px; width: 100%; padding: 22px 24px; border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.55); text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
        }
    </style>
</head>
<body>
    <!-- Audio: music, ambient (per scene), SFX slot -->
    <audio id="audio-music" loop></audio>
    <audio id="audio-ambiance" loop></audio>
    <audio id="audio-sfx"></audio>

    <!-- Start screen: user gesture unlocks autoplay policy -->
    <div id="start-screen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10000; color: white;">
        <h1 style="font-size: 3em; margin-bottom: 20px;">${title}</h1>
        <label style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:0.95em;opacity:0.95;">
            <input type="checkbox" id="player-save-enable-start" onchange="onPlayerSaveToggleChanged(this.checked)">
            Enable auto quicksave (1 slot)
        </label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            <button onclick="startNewGameFromTitle()" style="padding: 15px 30px; font-size: 1.1em; cursor: pointer; background: #3498db; color: white; border: none; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">New game</button>
            <button id="player-continue-btn" onclick="continueSavedGame()" disabled style="padding: 15px 30px; font-size: 1.1em; cursor: pointer; background: #334155; color: white; border: none; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); opacity: .7;">Continue</button>
            <button id="player-import-start-btn" onclick="promptImportPlayerSaveFile()" style="padding: 15px 30px; font-size: 1.1em; cursor: pointer; background: #0f766e; color: white; border: none; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Load .escapegame file</button>
        </div>
        <div id="player-save-start-status" style="margin-top:10px;font-size:0.9em;opacity:0.85;"></div>
    </div>

    <!-- Player HUD: optional inventory + settings -->
    <div id="player-hud">
        <div class="player-hud-icons">
            ${hasInv ? `<button type="button" id="inv-toggle" class="player-hud-btn" onclick="toggleInv()" aria-label="Inventory">${invIconHTML}</button>` : ""}
            <button type="button" id="settings-toggle" class="player-hud-btn" onclick="togglePlayerSettings()" title="Settings" aria-label="Settings">⚙</button>
        </div>
        <div id="player-timer" class="${timerEnabled ? "is-visible" : ""}" aria-live="polite">00:00</div>
        ${hasInv ? `<div id="inv-panel">
            <h3>Inventory</h3>
            <ul id="inv-list"><li style="color:gray; font-style:italic;">Empty</li></ul>
        </div>` : ""}
    </div>

    <div id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div class="settings-modal-backdrop" onclick="closePlayerSettings()"></div>
        <div class="settings-modal-panel">
            <h2 id="settings-modal-title">Settings</h2>
            <div class="settings-row">
                <label for="set-master">Master volume</label>
                <input type="range" id="set-master" min="0" max="1" step="0.05" value="1" oninput="onPlayerAudioSliderInput('master')">
                <span class="settings-val" id="set-master-val">1.00</span>
            </div>
            <div class="settings-row">
                <label for="set-music">Music</label>
                <input type="range" id="set-music" min="0" max="1" step="0.05" value="1" oninput="onPlayerAudioSliderInput('music')">
                <span class="settings-val" id="set-music-val">1.00</span>
            </div>
            <div class="settings-row">
                <label for="set-ambiance">Ambiance</label>
                <input type="range" id="set-ambiance" min="0" max="1" step="0.05" value="1" oninput="onPlayerAudioSliderInput('ambiance')">
                <span class="settings-val" id="set-ambiance-val">1.00</span>
            </div>
            <div class="settings-row">
                <label for="set-sfx">Sound effects</label>
                <input type="range" id="set-sfx" min="0" max="1" step="0.05" value="1" oninput="onPlayerAudioSliderInput('sfx')">
                <span class="settings-val" id="set-sfx-val">1.00</span>
            </div>
            <div class="settings-row">
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="player-save-enable-settings" onchange="onPlayerSaveToggleChanged(this.checked)">
                    Auto quicksave (1 slot)
                </label>
                <div class="settings-close-row" style="margin-top:8px;justify-content:flex-start;">
                    <button type="button" class="settings-close-btn" onclick="savePlayerProgressNow('manual',{force:true})">Quicksave</button>
                    <button type="button" class="settings-close-btn" onclick="loadPlayerProgressFromSettings()">Load</button>
                    <button type="button" class="settings-close-btn" onclick="exportPlayerSaveFile()">Export .escapegame</button>
                    <button type="button" class="settings-close-btn" onclick="promptImportPlayerSaveFile()">Import .escapegame</button>
                    <button type="button" class="settings-close-btn" onclick="clearPlayerProgressWithConfirm()">Clear</button>
                </div>
                <span class="settings-val" id="player-save-settings-status"></span>
            </div>
            <div class="settings-close-row">
                <button type="button" class="settings-close-btn" onclick="closePlayerSettings()">Close</button>
            </div>
        </div>
    </div>
    <input type="file" id="player-save-file-input" accept=".escapegame,application/json" style="display:none" onchange="onPlayerSaveFileInputChange(event)">

    <div id="end-screen-modal" role="dialog" aria-modal="true" aria-labelledby="end-screen-title">
        <div class="end-screen-backdrop"></div>
        <div class="end-screen-panel" style="font-family:${popFont};color:${popColor};background:${popBg};">
            <h2 id="end-screen-title" style="margin:0 0 12px 0;font-size:1.35rem;"></h2>
            <div id="end-screen-body" class="play-html-rich" style="text-align:left;margin-bottom:16px;"></div>
            <button type="button" id="end-screen-restart" class="settings-close-btn" onclick="location.reload()">Restart</button>
        </div>
    </div>

    <div id="victory-screen-modal" role="dialog" aria-modal="true" aria-labelledby="victory-screen-title">
        <div class="end-screen-backdrop"></div>
        <div class="end-screen-panel" style="font-family:${popFont};color:${popColor};background:${popBg};">
            <h2 id="victory-screen-title" style="margin:0 0 12px 0;font-size:1.35rem;"></h2>
            <div id="victory-screen-body" class="play-html-rich" style="text-align:left;margin-bottom:16px;"></div>
            <button type="button" id="victory-screen-restart" class="settings-close-btn" onclick="location.reload()">Restart</button>
        </div>
    </div>
    
    <!-- Pannellum mount node -->
    <div id="panorama"></div>
    <script type="application/json" id="escape360-timer-config">${playerTimerJson}</script>
    <script type="application/json" id="escape360-victory-config">${playerVictoryJson}</script>
    <script type="application/json" id="escape360-scene-timer-overrides">${sceneTimerOverridesJson}</script>
    <script type="application/json" id="escape360-player-save-config">${playerSaveCfgJson}</script>

<script>
    // Player state
    var inventaire = {}; 
    var unlockedHotspots = {};
    var viewer;

    var PLAYER_TIMER_CONFIG = { enabled: false, mode: "countdown", startSeconds: 1800, autoStart: true, pauseWhenPopupOpen: false, gameOverSceneId: "", gameOver: { title: "", bodyHtml: "", buttonLabel: "Restart" } };
    try {
        var _tcEl = document.getElementById("escape360-timer-config");
        if (_tcEl && _tcEl.textContent) {
            var _tcParsed = JSON.parse(_tcEl.textContent);
            if (_tcParsed && typeof _tcParsed === "object") PLAYER_TIMER_CONFIG = _tcParsed;
        }
    } catch (eTimerCfg) {}
    var PLAYER_VICTORY_CONFIG = { sceneId: "", title: "", bodyHtml: "", buttonLabel: "Restart" };
    try {
        var _vEl = document.getElementById("escape360-victory-config");
        if (_vEl && _vEl.textContent) {
            var _vParsed = JSON.parse(_vEl.textContent);
            if (_vParsed && typeof _vParsed === "object") PLAYER_VICTORY_CONFIG = _vParsed;
        }
    } catch (eVictoryCfg) {}
    var sceneTimerOverridesMap = {};
    try {
        var _stoEl = document.getElementById("escape360-scene-timer-overrides");
        if (_stoEl && _stoEl.textContent) {
            var _stoParsed = JSON.parse(_stoEl.textContent);
            if (_stoParsed && typeof _stoParsed === "object") sceneTimerOverridesMap = _stoParsed;
        }
    } catch (eSto) {}
    var PLAYER_SAVE_CONFIG = { mode: "manual" };
    try {
        var _pscEl = document.getElementById("escape360-player-save-config");
        if (_pscEl && _pscEl.textContent) {
            var _pscParsed = JSON.parse(_pscEl.textContent);
            if (_pscParsed && typeof _pscParsed === "object") PLAYER_SAVE_CONFIG = _pscParsed;
        }
    } catch (ePsc) {}
    var activeScenePressure = null;
    var pressRunStart = null;
    var pressPausedAccum = 0;
    var pressTotalMs = 0;
    var gameOverTriggered = false;
    var victoryTriggered = false;
    var timerDisplayMs = 0;
    var timerRunStart = null;
    var timerPausedAccum = 0;
    var timerBlockingDepth = 0;
    var timerInterval = null;
    var timerClockStarted = false;
    var PLAYER_SAVE_DB_NAME = "escape360-player-progress";
    var PLAYER_SAVE_DB_VERSION = 1;
    var PLAYER_SAVE_STORE = "saves";
    var PLAYER_SAVE_SLOT_ID = "latest";
    var PLAYER_SAVE_FILE_EXT = ".escapegame";
    var PLAYER_SAVE_KIND = "escape360-player-save";
    var PLAYER_SAVE_SCHEMA_VERSION = 1;
    var PLAYER_GAME_FINGERPRINT = "${playerGameFingerprint}";
    var playerSaveEnabled = false;
    var pendingLocalSaveEnvelope = null;
    var pendingRestoreEnvelope = null;
    var playerSaveDebounce = null;

    function cloneJson(x) {
        return JSON.parse(JSON.stringify(x));
    }
    function stampFileTime(d) {
        function p2(v) {
            return String(v).padStart(2, "0");
        }
        return (
            d.getFullYear() +
            "-" +
            p2(d.getMonth() + 1) +
            "-" +
            p2(d.getDate()) +
            "_" +
            p2(d.getHours()) +
            "-" +
            p2(d.getMinutes())
        );
    }
    function sanitizeFileStem(s) {
        return String(s || "escape_game")
            .replace(/[\\/:*?"<>|]+/g, "_")
            .trim()
            .slice(0, 80);
    }
    function readTextFile(file) {
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject(new Error("No file provided"));
                return;
            }
            if (typeof file.text === "function") {
                file.text().then(resolve, reject);
                return;
            }
            var fr = new FileReader();
            fr.onload = function () {
                resolve(String(fr.result || ""));
            };
            fr.onerror = function () {
                reject(fr.error || new Error("File read failed"));
            };
            fr.readAsText(file);
        });
    }
    function setPlayerSaveStatus(msg) {
        var s1 = document.getElementById("player-save-start-status");
        var s2 = document.getElementById("player-save-settings-status");
        if (s1) s1.textContent = msg || "";
        if (s2) s2.textContent = msg || "";
    }
    function syncPlayerSaveCheckboxes() {
        var cStart = document.getElementById("player-save-enable-start");
        var cSet = document.getElementById("player-save-enable-settings");
        if (cStart) {
            cStart.checked = !!playerSaveEnabled;
            cStart.disabled = true;
        }
        if (cSet) {
            cSet.checked = !!playerSaveEnabled;
            cSet.disabled = true;
        }
    }
    function updateContinueButtonState() {
        var btn = document.getElementById("player-continue-btn");
        if (!btn) return;
        var mode = String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase();
        if (mode === "none") {
            btn.disabled = true;
            btn.style.opacity = ".5";
            btn.style.cursor = "not-allowed";
            return;
        }
        var canContinue = !!(pendingLocalSaveEnvelope && pendingLocalSaveEnvelope.state);
        btn.disabled = !canContinue;
        btn.style.opacity = canContinue ? "1" : ".7";
        btn.style.cursor = canContinue ? "pointer" : "not-allowed";
    }
    function onPlayerSaveToggleChanged(checked) {
        var mode = String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase();
        playerSaveEnabled = mode === "auto";
        syncPlayerSaveCheckboxes();
        updateContinueButtonState();
        if (mode === "none") {
            setPlayerSaveStatus("Player quicksave is disabled by editor.");
            return;
        }
        if (!playerSaveEnabled) {
            setPlayerSaveStatus(
                pendingLocalSaveEnvelope ? "Auto quicksave OFF. Continue still available." : "Auto quicksave OFF."
            );
            return;
        }
        setPlayerSaveStatus("Auto quicksave ON (1 slot).");
        refreshLatestPlayerSaveMeta().catch(function () {});
    }
    function applyPlayerSaveModeUi() {
        var mode = String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase();
        if (mode !== "none" && mode !== "auto") mode = "manual";
        playerSaveEnabled = mode === "auto";
        syncPlayerSaveCheckboxes();
        var startImportBtn = document.getElementById("player-import-start-btn");
        if (startImportBtn) startImportBtn.style.display = mode === "none" ? "none" : "";
        var saveArea = document.getElementById("player-save-enable-settings");
        if (saveArea && saveArea.parentElement && saveArea.parentElement.parentElement) {
            saveArea.parentElement.parentElement.style.display = mode === "none" ? "none" : "";
        }
    }
    function getCurrentSceneIdSafe() {
        if (typeof viewer === "undefined" || !viewer || typeof viewer.getScene !== "function") return "";
        try {
            return String(viewer.getScene() || "").trim();
        } catch (e) {
            return "";
        }
    }
    function buildPlayerSaveState() {
        if (typeof tickPlayerTimer === "function") {
            try {
                tickPlayerTimer();
            } catch (eTick) {}
        }
        return {
            sceneId: getCurrentSceneIdSafe(),
            inventaire: cloneJson(inventaire || {}),
            unlockedHotspots: cloneJson(unlockedHotspots || {}),
            timer: {
                activeScenePressure: activeScenePressure
                    ? {
                          sceneId: String(activeScenePressure.sceneId || ""),
                          onExpire: String(activeScenePressure.onExpire || "gameOver"),
                          targetScene: String(activeScenePressure.targetScene || ""),
                          messageHtml: String(activeScenePressure.messageHtml || ""),
                          remainingMs: Math.max(0, Number(timerDisplayMs || 0))
                      }
                    : null,
                global: {
                    mode:
                        PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.mode === "countup"
                            ? "countup"
                            : "countdown",
                    clockStarted: !!timerClockStarted,
                    displayMs: Math.max(0, Number(timerDisplayMs || 0))
                }
            }
        };
    }
    function buildPlayerSaveEnvelope(label) {
        return {
            meta: {
                kind: PLAYER_SAVE_KIND,
                saveSchemaVersion: PLAYER_SAVE_SCHEMA_VERSION,
                gameFingerprint: PLAYER_GAME_FINGERPRINT,
                savedAt: new Date().toISOString(),
                slotId: PLAYER_SAVE_SLOT_ID,
                label: String(label || "").trim()
            },
            state: buildPlayerSaveState()
        };
    }
    function validatePlayerSaveEnvelope(env) {
        if (!env || typeof env !== "object") return { ok: false, reason: "invalid-object" };
        var m = env.meta || {};
        if (m.kind !== PLAYER_SAVE_KIND) return { ok: false, reason: "wrong-kind" };
        if (Number(m.saveSchemaVersion || 0) !== PLAYER_SAVE_SCHEMA_VERSION) {
            return { ok: false, reason: "unsupported-schema" };
        }
        if (String(m.gameFingerprint || "").trim() !== PLAYER_GAME_FINGERPRINT) {
            return { ok: false, reason: "wrong-game" };
        }
        return { ok: true };
    }
    function idbReqAsPromise(req) {
        return new Promise(function (resolve, reject) {
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error || new Error("IndexedDB request error"));
            };
        });
    }
    function idbTxDone(tx) {
        return new Promise(function (resolve, reject) {
            tx.oncomplete = function () {
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error || new Error("IndexedDB transaction error"));
            };
            tx.onabort = function () {
                reject(tx.error || new Error("IndexedDB transaction aborted"));
            };
        });
    }
    function openPlayerSaveDb() {
        return new Promise(function (resolve, reject) {
            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB unsupported"));
                return;
            }
            var req = window.indexedDB.open(PLAYER_SAVE_DB_NAME, PLAYER_SAVE_DB_VERSION);
            req.onupgradeneeded = function () {
                var db = req.result;
                var store = db.objectStoreNames.contains(PLAYER_SAVE_STORE)
                    ? req.transaction.objectStore(PLAYER_SAVE_STORE)
                    : db.createObjectStore(PLAYER_SAVE_STORE, { keyPath: "id" });
                if (!store.indexNames.contains("bySavedAt")) {
                    store.createIndex("bySavedAt", "savedAt", { unique: false });
                }
            };
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error || new Error("Failed to open save DB"));
            };
        });
    }
    async function readLatestPlayerSaveEnvelope() {
        var db = await openPlayerSaveDb();
        var tx = db.transaction([PLAYER_SAVE_STORE], "readonly");
        var store = tx.objectStore(PLAYER_SAVE_STORE);
        var rec = await idbReqAsPromise(store.get(PLAYER_SAVE_SLOT_ID));
        await idbTxDone(tx);
        if (!rec || !rec.envelope) return null;
        return rec.envelope;
    }
    async function writeLatestPlayerSaveEnvelope(envelope) {
        var rec = {
            id: PLAYER_SAVE_SLOT_ID,
            savedAt:
                envelope && envelope.meta && envelope.meta.savedAt
                    ? String(envelope.meta.savedAt)
                    : new Date().toISOString(),
            gameFingerprint:
                envelope && envelope.meta && envelope.meta.gameFingerprint
                    ? String(envelope.meta.gameFingerprint)
                    : PLAYER_GAME_FINGERPRINT,
            envelope: envelope
        };
        var db = await openPlayerSaveDb();
        var tx = db.transaction([PLAYER_SAVE_STORE], "readwrite");
        tx.objectStore(PLAYER_SAVE_STORE).put(rec);
        await idbTxDone(tx);
    }
    async function refreshLatestPlayerSaveMeta() {
        try {
            var env = await readLatestPlayerSaveEnvelope();
            if (env && validatePlayerSaveEnvelope(env).ok) {
                pendingLocalSaveEnvelope = env;
                setPlayerSaveStatus(
                    (playerSaveEnabled ? "Quicksave ready" : "Quicksave ready (auto OFF)") +
                        " (" +
                        String(env.meta.savedAt || "") +
                        ")."
                );
            } else {
                pendingLocalSaveEnvelope = null;
                setPlayerSaveStatus(playerSaveEnabled ? "No compatible quicksave." : "Auto quicksave OFF.");
            }
        } catch (eRead) {
            pendingLocalSaveEnvelope = null;
            setPlayerSaveStatus("Quicksave unavailable.");
        }
        updateContinueButtonState();
    }
    async function savePlayerProgressNow(reason, opts) {
        opts = opts || {};
        var mode = String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase();
        if (mode === "none") {
            return { skipped: true, reason: "mode-none" };
        }
        var force = !!opts.force || reason === "manual" || reason === "load";
        if (!playerSaveEnabled && !force) {
            setPlayerSaveStatus("Auto quicksave OFF.");
            return { skipped: true, reason: "disabled" };
        }
        if (typeof viewer === "undefined" || !viewer) {
            return { skipped: true, reason: "viewer-not-ready" };
        }
        var envelope = buildPlayerSaveEnvelope(reason || "auto");
        var rec = {
            id: PLAYER_SAVE_SLOT_ID,
            savedAt: envelope.meta.savedAt,
            gameFingerprint: envelope.meta.gameFingerprint,
            envelope: envelope
        };
        var db = await openPlayerSaveDb();
        var tx = db.transaction([PLAYER_SAVE_STORE], "readwrite");
        tx.objectStore(PLAYER_SAVE_STORE).put(rec);
        await idbTxDone(tx);
        pendingLocalSaveEnvelope = envelope;
        setPlayerSaveStatus("Quicksaved at " + envelope.meta.savedAt + ".");
        updateContinueButtonState();
        return { ok: true, envelope: envelope };
    }
    function queuePlayerProgressSave(reason) {
        if (!playerSaveEnabled) return;
        if (playerSaveDebounce) clearTimeout(playerSaveDebounce);
        playerSaveDebounce = setTimeout(function () {
            savePlayerProgressNow(reason || "auto", { force: false }).catch(function (eSave) {
                console.error("player.save.error", eSave);
            });
        }, 450);
    }
    async function clearPlayerProgressNow() {
        var db = await openPlayerSaveDb();
        var tx = db.transaction([PLAYER_SAVE_STORE], "readwrite");
        tx.objectStore(PLAYER_SAVE_STORE).delete(PLAYER_SAVE_SLOT_ID);
        await idbTxDone(tx);
        pendingLocalSaveEnvelope = null;
        setPlayerSaveStatus("Quicksave cleared.");
        updateContinueButtonState();
    }
    async function clearPlayerProgressWithConfirm() {
        if (!confirm("Clear progression quicksave?")) return;
        try {
            await clearPlayerProgressNow();
        } catch (eClear) {
            console.error("player.save.error", eClear);
            setPlayerSaveStatus("Unable to clear quicksave.");
        }
    }
    function applyRestoredMapsFromEnvelope(env) {
        if (!env || !env.state) return;
        var st = env.state || {};
        inventaire = st.inventaire && typeof st.inventaire === "object" ? cloneJson(st.inventaire) : {};
        unlockedHotspots =
            st.unlockedHotspots && typeof st.unlockedHotspots === "object"
                ? cloneJson(st.unlockedHotspots)
                : {};
        majInventaireUI();
        refreshAllHotspotVisibility();
    }
    function applyRestoredTimerFromEnvelope(env) {
        if (!env || !env.state || !env.state.timer) return;
        var t = env.state.timer;
        if (t.activeScenePressure && activeScenePressure) {
            var rem = Math.max(0, Number(t.activeScenePressure.remainingMs || timerDisplayMs || 0));
            pressTotalMs = rem;
            pressPausedAccum = 0;
            pressRunStart = isTimerPausedNow() ? null : Date.now();
            timerDisplayMs = rem;
            updateTimerHudLabel();
            return;
        }
        if (!t.global || !PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled) return;
        var disp = Math.max(0, Number(t.global.displayMs || 0));
        timerClockStarted = !!t.global.clockStarted;
        if (PLAYER_TIMER_CONFIG.mode === "countup") {
            timerPausedAccum = disp;
            timerDisplayMs = disp;
            timerRunStart = timerClockStarted && !isTimerPausedNow() ? Date.now() : null;
        } else {
            var total = Math.max(0, Number(PLAYER_TIMER_CONFIG.startSeconds || 0) * 1000);
            var rem2 = Math.max(0, Math.min(total, disp));
            timerPausedAccum = total - rem2;
            timerDisplayMs = rem2;
            timerRunStart = timerClockStarted && !isTimerPausedNow() ? Date.now() : null;
        }
        updateTimerHudLabel();
    }
    async function continueSavedGame() {
        if (String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase() === "none") {
            alert("Player save is disabled for this game.");
            return;
        }
        try {
            var env = await readLatestPlayerSaveEnvelope();
            var check = validatePlayerSaveEnvelope(env);
            if (!check.ok) {
                pendingLocalSaveEnvelope = null;
                updateContinueButtonState();
                alert("No compatible quicksave for this game.");
                return;
            }
            pendingLocalSaveEnvelope = env;
            pendingRestoreEnvelope = env;
            startGame(true);
        } catch (eLoad) {
            console.error("player.save.error", eLoad);
            alert("Unable to load quicksave.");
        }
    }
    async function startNewGameFromTitle() {
        var hasLocal = false;
        try {
            var env = await readLatestPlayerSaveEnvelope();
            hasLocal = !!(env && validatePlayerSaveEnvelope(env).ok);
        } catch (eRead) {}

        var purge = false;
        if (hasLocal) {
            purge = confirm(
                "A local quicksave exists.\\n\\nOK = delete this quicksave before starting a new game.\\nCancel = keep the quicksave."
            );
        }
        if (!confirm("Start a new game now?")) return;

        if (purge) {
            try {
                await clearPlayerProgressNow();
            } catch (eClear) {
                console.error("player.save.error", eClear);
                alert("Unable to clear quicksave before starting.");
            }
        }
        pendingRestoreEnvelope = null;
        startGame(false);
    }
    async function loadPlayerProgressFromSettings() {
        if (String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase() === "none") {
            alert("Player save is disabled for this game.");
            return;
        }
        if (!viewer) {
            await continueSavedGame();
            return;
        }
        try {
            var env = await readLatestPlayerSaveEnvelope();
            var check = validatePlayerSaveEnvelope(env);
            if (!check.ok) {
                alert("No compatible quicksave.");
                return;
            }
            pendingLocalSaveEnvelope = env;
            pendingRestoreEnvelope = env;
            applyRestoredMapsFromEnvelope(env);
            var target = String((env.state && env.state.sceneId) || "").trim();
            if (target && typeof viewer.loadScene === "function") {
                try {
                    viewer.loadScene(target);
                } catch (eLs) {}
            }
            applyRestoredTimerFromEnvelope(env);
            closePlayerSettings();
            setPlayerSaveStatus("Quicksave progress restored.");
        } catch (eLoad2) {
            console.error("player.save.error", eLoad2);
            alert("Local load failed.");
        }
    }
    async function exportPlayerSaveFile() {
        if (String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase() === "none") {
            alert("Player save is disabled for this game.");
            return;
        }
        try {
            var res = await savePlayerProgressNow("manual", { force: true });
            if (!res || !res.ok || !res.envelope) {
                alert("Unable to build save file.");
                return;
            }
            var text = JSON.stringify(res.envelope, null, 2);
            var blob = new Blob([text], { type: "application/json;charset=utf-8" });
            var a = document.createElement("a");
            var base = sanitizeFileStem("${title}") || "escape_game";
            a.href = URL.createObjectURL(blob);
            a.download = base + "_player-save_" + stampFileTime(new Date()) + PLAYER_SAVE_FILE_EXT;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setPlayerSaveStatus("Save file exported.");
        } catch (eExport) {
            console.error("player.save.error", eExport);
            alert("Save export failed.");
        }
    }
    function promptImportPlayerSaveFile() {
        if (String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase() === "none") {
            alert("Player save is disabled for this game.");
            return;
        }
        var inp = document.getElementById("player-save-file-input");
        if (!inp) return;
        inp.value = "";
        inp.click();
    }
    async function onPlayerSaveFileInputChange(ev) {
        var file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
        if (!file) return;
        try {
            var text = await readTextFile(file);
            var raw = JSON.parse(String(text || ""));
            var check = validatePlayerSaveEnvelope(raw);
            if (!check.ok) {
                alert("Invalid .escapegame file or incompatible save for this game.");
                return;
            }
            pendingLocalSaveEnvelope = raw;
            await writeLatestPlayerSaveEnvelope(raw);
            updateContinueButtonState();
            if (typeof viewer === "undefined" || !viewer) {
                pendingRestoreEnvelope = raw;
                setPlayerSaveStatus("File loaded. Resuming...");
                startGame(true);
                return;
            }
            pendingRestoreEnvelope = raw;
            applyRestoredMapsFromEnvelope(raw);
            var target = String((raw.state && raw.state.sceneId) || "").trim();
            if (target && typeof viewer.loadScene === "function") {
                try {
                    viewer.loadScene(target);
                } catch (eLs) {}
            }
            applyRestoredTimerFromEnvelope(raw);
            pendingRestoreEnvelope = null;
            setPlayerSaveStatus("Loaded .escapegame file.");
        } catch (eImport) {
            console.error("player.save.error", eImport);
            alert("Unable to read this save file.");
        }
    }
    function installPlayerSaveLifecycleHooks() {
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) return;
            savePlayerProgressNow("hidden").catch(function () {});
        });
        window.addEventListener("beforeunload", function () {
            savePlayerProgressNow("beforeunload").catch(function () {});
        });
    }

    function hasSceneTimerOverrides() {
        for (var k in sceneTimerOverridesMap) {
            if (sceneTimerOverridesMap[k] && (sceneTimerOverridesMap[k].seconds || 0) > 0) return true;
        }
        return false;
    }
    function ensurePlayerTimerTick() {
        if (timerInterval) return;
        timerInterval = setInterval(tickPlayerTimer, 250);
    }
    function clearScenePressureState() {
        activeScenePressure = null;
        pressRunStart = null;
        pressPausedAccum = 0;
        pressTotalMs = 0;
    }
    function pressTimerOnEnterPause() {
        if (!activeScenePressure) return;
        if (pressRunStart != null) {
            pressPausedAccum += Date.now() - pressRunStart;
            pressRunStart = null;
        }
    }
    function pressTimerOnLeavePauseIfNeeded() {
        if (!activeScenePressure || gameOverTriggered || victoryTriggered) return;
        if (isTimerPausedNow()) return;
        if (pressRunStart == null) pressRunStart = Date.now();
    }
    function onSceneChangedForTimer(newSid) {
        if (gameOverTriggered || victoryTriggered) return;
        if (typeof viewer === "undefined" || !viewer) return;
        var sid = newSid != null && newSid !== "" ? String(newSid) : "";
        if (!sid) {
            try { sid = String(viewer.getScene() || ""); } catch (e0) {}
        }
        sid = String(sid || "").trim();
        if (activeScenePressure && activeScenePressure.sceneId === sid) return;
        if (activeScenePressure && activeScenePressure.sceneId !== sid) {
            clearScenePressureState();
            timerOnLeavePauseIfNeeded();
        }
        var ov = sceneTimerOverridesMap[sid];
        if (!ov || (ov.seconds || 0) <= 0) {
            tickPlayerTimer();
            return;
        }
        activeScenePressure = {
            sceneId: sid,
            onExpire: ov.onExpire || "gameOver",
            targetScene: String(ov.targetScene || "").trim(),
            messageHtml: String(ov.messageHtml || "")
        };
        pressTotalMs = Math.max(0, (ov.seconds || 0) * 1000);
        pressPausedAccum = 0;
        pressRunStart = isTimerPausedNow() ? null : Date.now();
        if (PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.enabled && timerClockStarted) timerOnEnterPause();
        var tel = document.getElementById("player-timer");
        if (tel) tel.classList.add("is-visible");
        ensurePlayerTimerTick();
        tickPlayerTimer();
    }
    function handleSceneTimerExpired() {
        if (!activeScenePressure) return;
        var exp = activeScenePressure.onExpire || "gameOver";
        var tgt = activeScenePressure.targetScene;
        var msg = activeScenePressure.messageHtml || "";
        clearScenePressureState();
        timerOnLeavePauseIfNeeded();
        if (exp === "gotoScene" && tgt && typeof viewer !== "undefined" && viewer && typeof viewer.loadScene === "function") {
            try { viewer.loadScene(tgt); } catch (eLs) {}
            return;
        }
        if (exp === "showMessage") {
            afficherPopup("", msg || "<p></p>");
            return;
        }
        if (tryNavigateToGameOverSceneFromTimer()) return;
        triggerGameOver();
    }

    function tryNavigateToGameOverSceneFromTimer() {
        var gid = PLAYER_TIMER_CONFIG && String(PLAYER_TIMER_CONFIG.gameOverSceneId || "").trim();
        if (!gid) return false;
        if (typeof viewer === "undefined" || !viewer || typeof viewer.getScene !== "function" || typeof viewer.loadScene !== "function") return false;
        var cur = "";
        try {
            cur = String(viewer.getScene() || "").trim();
        } catch (eCur) {}
        if (cur === gid) return false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerRunStart = null;
        try {
            viewer.loadScene(gid);
        } catch (eNav) {}
        return true;
    }

    function checkGameOverForScene(sceneId) {
        if (victoryTriggered || gameOverTriggered) return;
        var gid = PLAYER_TIMER_CONFIG && String(PLAYER_TIMER_CONFIG.gameOverSceneId || "").trim();
        if (!gid) return;
        var sid = sceneId != null && sceneId !== "" ? String(sceneId) : "";
        if (!sid && typeof viewer !== "undefined" && viewer && typeof viewer.getScene === "function") {
            try {
                sid = String(viewer.getScene() || "");
            } catch (eSid) {}
        }
        if (String(sid).trim() === gid) triggerGameOver();
    }

    function isTimerBlockingUiOpen() {
        var sm = document.getElementById("settings-modal");
        if (sm && sm.classList.contains("is-open")) return true;
        return timerBlockingDepth > 0;
    }
    function isTimerPausedNow() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.pauseWhenPopupOpen || !isTimerBlockingUiOpen()) return false;
        return !!((PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.enabled) || activeScenePressure);
    }
    function timerNotifyBlockingOpen() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.pauseWhenPopupOpen) return;
        if (!PLAYER_TIMER_CONFIG.enabled && !activeScenePressure) return;
        var wasPaused = isTimerPausedNow();
        timerBlockingDepth++;
        if (!wasPaused && isTimerPausedNow()) {
            timerOnEnterPause();
            pressTimerOnEnterPause();
        }
    }
    function timerNotifyBlockingClose() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.pauseWhenPopupOpen) return;
        if (!PLAYER_TIMER_CONFIG.enabled && !activeScenePressure) return;
        if (timerBlockingDepth > 0) timerBlockingDepth--;
        timerOnLeavePauseIfNeeded();
        pressTimerOnLeavePauseIfNeeded();
    }
    function timerOnEnterPause() {
        if (timerRunStart != null) {
            timerPausedAccum += Date.now() - timerRunStart;
            timerRunStart = null;
        }
    }
    function timerOnLeavePauseIfNeeded() {
        if (gameOverTriggered || victoryTriggered) return;
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled) return;
        if (isTimerPausedNow()) return;
        if (timerRunStart == null && (PLAYER_TIMER_CONFIG.autoStart || timerClockStarted)) timerRunStart = Date.now();
    }
    function maybeStartDeferredTimer() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled || gameOverTriggered || victoryTriggered) return;
        if (PLAYER_TIMER_CONFIG.autoStart || timerClockStarted) return;
        timerClockStarted = true;
        if (!isTimerPausedNow()) timerRunStart = Date.now();
        tickPlayerTimer();
    }
    function formatTimerMs(ms) {
        var s = Math.floor(Math.max(0, ms) / 1000);
        var m = Math.floor(s / 60);
        s = s % 60;
        return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }
    function updateTimerHudLabel() {
        var el = document.getElementById("player-timer");
        if (!el) return;
        el.textContent = formatTimerMs(timerDisplayMs);
    }
    function tickPlayerTimer() {
        if (gameOverTriggered || victoryTriggered) return;
        if (activeScenePressure) {
            if (isTimerPausedNow()) {
                updateTimerHudLabel();
                return;
            }
            var nowP = Date.now();
            var elapsedP = pressPausedAccum + (pressRunStart != null ? nowP - pressRunStart : 0);
            timerDisplayMs = Math.max(0, pressTotalMs - elapsedP);
            updateTimerHudLabel();
            if (timerDisplayMs <= 0) handleSceneTimerExpired();
            return;
        }
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled) return;
        if (!timerClockStarted) {
            updateTimerHudLabel();
            return;
        }
        if (isTimerPausedNow()) {
            updateTimerHudLabel();
            return;
        }
        var now = Date.now();
        var elapsed = timerPausedAccum + (timerRunStart != null ? now - timerRunStart : 0);
        if (PLAYER_TIMER_CONFIG.mode === "countup") {
            timerDisplayMs = elapsed;
        } else {
            var total = Math.max(0, (PLAYER_TIMER_CONFIG.startSeconds || 0) * 1000);
            timerDisplayMs = Math.max(0, total - elapsed);
            if (timerDisplayMs <= 0) {
                if (tryNavigateToGameOverSceneFromTimer()) return;
                triggerGameOver();
                return;
            }
        }
        updateTimerHudLabel();
    }
    function triggerGameOver() {
        if (gameOverTriggered || victoryTriggered) return;
        clearScenePressureState();
        gameOverTriggered = true;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerRunStart = null;
        if (PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.mode === "countdown") timerDisplayMs = 0;
        updateTimerHudLabel();
        var go = (PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.gameOver) || {};
        var tEl = document.getElementById("end-screen-title");
        var bEl = document.getElementById("end-screen-body");
        var btn = document.getElementById("end-screen-restart");
        if (tEl) tEl.textContent = go.title || "";
        if (bEl) bEl.innerHTML = go.bodyHtml || "";
        if (btn) btn.textContent = go.buttonLabel || "Restart";
        var mod = document.getElementById("end-screen-modal");
        if (mod) mod.classList.add("is-open");
        try {
            if (typeof viewer !== "undefined" && viewer && typeof viewer.destroy === "function") viewer.destroy();
        } catch (eGo) {}
        var hud = document.getElementById("player-hud");
        if (hud) hud.style.display = "none";
    }
    function triggerVictory() {
        if (victoryTriggered || gameOverTriggered) return;
        if (!PLAYER_VICTORY_CONFIG || !String(PLAYER_VICTORY_CONFIG.sceneId || "").trim()) return;
        clearScenePressureState();
        victoryTriggered = true;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerRunStart = null;
        var vc = PLAYER_VICTORY_CONFIG || {};
        var tEl = document.getElementById("victory-screen-title");
        var bEl = document.getElementById("victory-screen-body");
        var btn = document.getElementById("victory-screen-restart");
        if (tEl) tEl.textContent = vc.title || "";
        if (bEl) bEl.innerHTML = vc.bodyHtml || "";
        if (btn) btn.textContent = vc.buttonLabel || "Restart";
        var mod = document.getElementById("victory-screen-modal");
        if (mod) mod.classList.add("is-open");
        try {
            if (typeof viewer !== "undefined" && viewer && typeof viewer.destroy === "function") viewer.destroy();
        } catch (eVic) {}
        var hud = document.getElementById("player-hud");
        if (hud) hud.style.display = "none";
    }
    function checkVictoryForScene(sceneId) {
        if (victoryTriggered || gameOverTriggered) return;
        if (!PLAYER_VICTORY_CONFIG || !String(PLAYER_VICTORY_CONFIG.sceneId || "").trim()) return;
        var sid = sceneId != null && sceneId !== "" ? String(sceneId) : "";
        if (!sid && typeof viewer !== "undefined" && viewer && typeof viewer.getScene === "function") {
            try { sid = String(viewer.getScene() || ""); } catch (eSid) {}
        }
        if (sid === String(PLAYER_VICTORY_CONFIG.sceneId).trim()) triggerVictory();
    }
    function initPlayerTimerAfterStart() {
        if (victoryTriggered || gameOverTriggered) return;
        var globOn = PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.enabled;
        if (globOn) {
            var el = document.getElementById("player-timer");
            if (el) el.classList.add("is-visible");
            gameOverTriggered = false;
            timerPausedAccum = 0;
            timerBlockingDepth = 0;
            timerRunStart = null;
            timerClockStarted = !!PLAYER_TIMER_CONFIG.autoStart;
            if (PLAYER_TIMER_CONFIG.mode === "countup") {
                timerDisplayMs = 0;
            } else {
                timerDisplayMs = Math.max(0, (PLAYER_TIMER_CONFIG.startSeconds || 0) * 1000);
            }
            updateTimerHudLabel();
            if (!isTimerPausedNow() && timerClockStarted) timerRunStart = Date.now();
        }
        if (globOn || hasSceneTimerOverrides()) {
            ensurePlayerTimerTick();
            tickPlayerTimer();
        }
    }

    // --- Audio channels ---
    var sceneAmbianceClips = ${sceneAmbianceJson};

    var audioSys = {
        masterVol: 1.0, musicVol: 1.0, ambianceVol: 1.0, sfxVol: 1.0,
        _ambianceLogicalUrl: '',
        _lastMusicClip: 1,
        _lastAmbClip: 1,

        playMusic: function(url, clipVol) {
            var p = document.getElementById('audio-music');
            if(!url || !String(url).trim()) { p.pause(); return; }
            url = String(url).trim();
            var m = 1;
            if(clipVol != null && clipVol !== '' && !isNaN(Number(clipVol))) m = Math.max(0, Math.min(1, Number(clipVol)));
            this._lastMusicClip = m;
            p.volume = this.musicVol * this.masterVol * m;
            if(p.src !== url) { p.src = url; }
            p.play().catch(function(e){console.log(e)});
        },
        playAmbiance: function(url, clipVol) {
            var p = document.getElementById('audio-ambiance');
            if(!url || !String(url).trim()) {
                p.pause();
                this._ambianceLogicalUrl = '';
                p.removeAttribute('src');
                try { p.load(); } catch (e) {}
                return;
            }
            url = String(url).trim();
            var m = 1;
            if(clipVol != null && clipVol !== '' && !isNaN(Number(clipVol))) m = Math.max(0, Math.min(1, Number(clipVol)));
            this._lastAmbClip = m;
            p.volume = this.ambianceVol * this.masterVol * m;
            if (this._ambianceLogicalUrl === url) {
                if (p.paused) p.play().catch(function(e){console.log(e)});
                return;
            }
            this._ambianceLogicalUrl = url;
            p.src = url;
            p.play().catch(function(e){console.log(e)});
        },
        playSFX: function(url, relVol) {
            if(!url) return;
            var p = document.getElementById('audio-sfx');
            var m = 1;
            if(relVol != null && relVol !== '' && !isNaN(Number(relVol))) m = Math.max(0, Math.min(1, Number(relVol)));
            p.src = url; p.volume = this.sfxVol * this.masterVol * m; p.play().catch(function(e){console.log(e)});
        },
        stopSFX: function() {
            var p = document.getElementById('audio-sfx');
            if(!p) return;
            p.pause();
            p.removeAttribute('src');
            try { p.load(); } catch(e) {}
        }
    };

    var PLAYER_AUDIO_STORAGE_KEY = "escape360_player_audio_v1";

    function syncPlayerAudioSlidersToUi() {
        var m = document.getElementById("set-master");
        var mu = document.getElementById("set-music");
        var am = document.getElementById("set-ambiance");
        var sx = document.getElementById("set-sfx");
        if (m) { m.value = String(audioSys.masterVol); var el = document.getElementById("set-master-val"); if(el) el.textContent = Number(audioSys.masterVol).toFixed(2); }
        if (mu) { mu.value = String(audioSys.musicVol); var e2 = document.getElementById("set-music-val"); if(e2) e2.textContent = Number(audioSys.musicVol).toFixed(2); }
        if (am) { am.value = String(audioSys.ambianceVol); var e3 = document.getElementById("set-ambiance-val"); if(e3) e3.textContent = Number(audioSys.ambianceVol).toFixed(2); }
        if (sx) { sx.value = String(audioSys.sfxVol); var e4 = document.getElementById("set-sfx-val"); if(e4) e4.textContent = Number(audioSys.sfxVol).toFixed(2); }
    }

    function applyLiveAudioVolumes() {
        var m = document.getElementById("audio-music");
        if (m && m.src) {
            var clip = audioSys._lastMusicClip != null ? audioSys._lastMusicClip : 1;
            m.volume = Math.max(0, Math.min(1, audioSys.musicVol * audioSys.masterVol * clip));
        }
        var a = document.getElementById("audio-ambiance");
        if (a && a.src && audioSys._ambianceLogicalUrl) {
            var c = audioSys._lastAmbClip != null ? audioSys._lastAmbClip : 1;
            a.volume = Math.max(0, Math.min(1, audioSys.ambianceVol * audioSys.masterVol * c));
        }
    }

    function loadPlayerAudioPrefsFromStorage() {
        try {
            var raw = localStorage.getItem(PLAYER_AUDIO_STORAGE_KEY);
            if (!raw) return;
            var o = JSON.parse(raw);
            if (!o || typeof o !== "object") return;
            if (o.master != null && !isNaN(Number(o.master))) audioSys.masterVol = Math.max(0, Math.min(1, Number(o.master)));
            if (o.music != null && !isNaN(Number(o.music))) audioSys.musicVol = Math.max(0, Math.min(1, Number(o.music)));
            if (o.ambiance != null && !isNaN(Number(o.ambiance))) audioSys.ambianceVol = Math.max(0, Math.min(1, Number(o.ambiance)));
            if (o.sfx != null && !isNaN(Number(o.sfx))) audioSys.sfxVol = Math.max(0, Math.min(1, Number(o.sfx)));
        } catch (e) {}
    }

    function savePlayerAudioPrefsToStorage() {
        try {
            localStorage.setItem(PLAYER_AUDIO_STORAGE_KEY, JSON.stringify({
                master: audioSys.masterVol, music: audioSys.musicVol,
                ambiance: audioSys.ambianceVol, sfx: audioSys.sfxVol
            }));
        } catch (e) {}
    }

    function onPlayerAudioSliderInput(kind) {
        var v, el, idVal;
        if (kind === "master") { el = document.getElementById("set-master"); idVal = "set-master-val"; }
        else if (kind === "music") { el = document.getElementById("set-music"); idVal = "set-music-val"; }
        else if (kind === "ambiance") { el = document.getElementById("set-ambiance"); idVal = "set-ambiance-val"; }
        else { el = document.getElementById("set-sfx"); idVal = "set-sfx-val"; }
        if (!el) return;
        v = parseFloat(el.value);
        if (isNaN(v)) v = 1;
        v = Math.max(0, Math.min(1, v));
        var disp = document.getElementById(idVal);
        if (disp) disp.textContent = v.toFixed(2);
        if (kind === "master") audioSys.masterVol = v;
        else if (kind === "music") audioSys.musicVol = v;
        else if (kind === "ambiance") audioSys.ambianceVol = v;
        else audioSys.sfxVol = v;
        applyLiveAudioVolumes();
        savePlayerAudioPrefsToStorage();
    }

    function togglePlayerSettings() {
        var mod = document.getElementById("settings-modal");
        if (!mod) return;
        if (mod.classList.contains("is-open")) { closePlayerSettings(); return; }
        syncPlayerAudioSlidersToUi();
        mod.classList.add("is-open");
        if (PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.pauseWhenPopupOpen && (PLAYER_TIMER_CONFIG.enabled || activeScenePressure)) {
            timerOnEnterPause();
            pressTimerOnEnterPause();
        }
    }

    function closePlayerSettings() {
        var mod = document.getElementById("settings-modal");
        if (!mod) return;
        var wasOpen = mod.classList.contains("is-open");
        mod.classList.remove("is-open");
        if (wasOpen && PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.pauseWhenPopupOpen && (PLAYER_TIMER_CONFIG.enabled || activeScenePressure)) {
            timerOnLeavePauseIfNeeded();
            pressTimerOnLeavePauseIfNeeded();
        }
    }

    function applySceneAmbiance(sceneId) {
        var clip = sceneAmbianceClips[sceneId];
        if (!clip || !clip.url || String(clip.url).trim() === '') {
            audioSys.playAmbiance('');
            return;
        }
        audioSys.playAmbiance(clip.url, clip.volume);
    }

    var PLAYER_SCENES_CONFIG = ${jsonScenes};

    // --- Start (after splash click) ---
    function startGame(fromContinue) {
        gameOverTriggered = false;
        victoryTriggered = false;
        if (!fromContinue) pendingRestoreEnvelope = null;
        document.getElementById('start-screen').style.display = 'none';
        loadPlayerAudioPrefsFromStorage();
        syncPlayerAudioSlidersToUi();
        if (pendingRestoreEnvelope && pendingRestoreEnvelope.state) {
            applyRestoredMapsFromEnvelope(pendingRestoreEnvelope);
        }
        var initialSceneId = "${firstSceneId}";
        var restoredSceneId =
            pendingRestoreEnvelope &&
            pendingRestoreEnvelope.state &&
            String(pendingRestoreEnvelope.state.sceneId || "").trim();
        if (restoredSceneId && PLAYER_SCENES_CONFIG && PLAYER_SCENES_CONFIG[restoredSceneId]) {
            initialSceneId = restoredSceneId;
        }

        // Pannellum viewer
        viewer = pannellum.viewer('panorama', {
            "default": { "firstScene": initialSceneId, "sceneFadeDuration": 1500, "autoLoad": true, "showFullscreenCtrl": false },
            "scenes": PLAYER_SCENES_CONFIG
        });

        viewer.on('scenechange', function(sceneId) {
            var sid = (sceneId != null && sceneId !== '') ? sceneId : viewer.getScene();
            applySceneAmbiance(sid);
            checkVictoryForScene(sid);
            if (!victoryTriggered && !gameOverTriggered) checkGameOverForScene(sid);
            if (!victoryTriggered && !gameOverTriggered) onSceneChangedForTimer(sid);
            queuePlayerProgressSave("scenechange");
        });
        applySceneAmbiance(initialSceneId);
        checkVictoryForScene(initialSceneId);
        if (!victoryTriggered && !gameOverTriggered) checkGameOverForScene(initialSceneId);

        // Optional looped background music
        if (${useGlobalAudio} && "${globalMusicUrl}" !== "") {
            audioSys.playMusic("${globalMusicUrl}", ${globalMusicVol});
        }
        if (!victoryTriggered) initPlayerTimerAfterStart();
        if (!victoryTriggered && !gameOverTriggered) onSceneChangedForTimer(initialSceneId);
        if (pendingRestoreEnvelope) {
            applyRestoredTimerFromEnvelope(pendingRestoreEnvelope);
            pendingRestoreEnvelope = null;
        }
        queuePlayerProgressSave("start");
    }
    
    function toggleInv() { 
        var p = document.getElementById('inv-panel'); 
        if (!p) return;
        p.style.display = (p.style.display === 'block') ? 'none' : 'block'; 
    }
    function openInventoryPanelIfVisible() {
        var c = document.getElementById('player-hud');
        if(!c || c.style.display === 'none') return;
        var p = document.getElementById('inv-panel');
        if(p) p.style.display = 'block';
    }
    
    // Leaf action (msg / scene / pick) — shared engine for classic hotspots and future selector choices (see docs/SELECTOR_SPEC.md)
    // fromSelector: if true, do not hide hotspot after pick (same div must reopen the selector)
    function executeAction(payload, hsDiv, fromSelector) {
        if (gameOverTriggered || victoryTriggered) return;
        maybeStartDeferredTimer();
        if(payload.sfxUrl != null && String(payload.sfxUrl).trim() !== '') {
            audioSys.playSFX(String(payload.sfxUrl).trim(), payload.sfxVolume);
        }
        if(payload.type === 'scene') {
            if(payload.transTxt) {
                afficherPopup("", payload.transTxt, payload.transBtn || "Continue", function(){ viewer.loadScene(payload.target); });
            } else {
                viewer.loadScene(payload.target);
            }
        } else if(payload.type === 'msg') {
            afficherPopup("", payload.txt);
        } else if(payload.type === 'pick') {
            inventaire[payload.itemId] = { name: payload.itemName };
            majInventaireUI();
            openInventoryPanelIfVisible();
            afficherPopup("", payload.txt);
            refreshAllHotspotVisibility();
            queuePlayerProgressSave("pick");
        }
    }

    function choiceRewardToArgs(choice) {
        var act = choice.f_req_action != null && choice.f_req_action !== "" ? choice.f_req_action : (choice.f_pwd_action != null && choice.f_pwd_action !== "" ? choice.f_pwd_action : "scene");
        if((act === "req" || act === "pwd") && choice.f_reward_chain_json) {
            var parsed = parseRewardChainNode(choice.f_reward_chain_json);
            if(parsed) return parsed;
        }
        if(act === "selector" && choice.rewardNested) {
            var rn = choice.rewardNested;
            return {
                action: "selector",
                rewardSelector: {
                    title: rn.title || "",
                    introHtml: rn.introHtml || "",
                    displayMode: rn.displayMode === "dropdown" ? "dropdown" : "buttons",
                    choices: Array.isArray(rn.choices) ? rn.choices : []
                }
            };
        }
        var out = { action: act };
        if(act === "scene") {
            out.target = choice.target || "";
            out.transTxt = choice.transTxt || "";
            out.transBtn = choice.transBtn || "Continue";
        } else if(act === "msg") out.okMsg = choice.f_ok_msg || "";
        else if(act === "pick") {
            out.pickId = choice.f_pick_id || "";
            out.pickName = choice.f_pick_name || "";
            out.pickMsg = choice.f_pick_msg || "";
        } else if(act === "req") {
            out.reqItemId = choice.f_req_item_id || choice.itemId || "";
            out.reqKo = choice.f_req_ko || choice.ko || "";
        } else if(act === "pwd") {
            out.pwdEnigmeTxt = choice.f_pwd_enigme_txt || choice.enigmeTxt || choice.f_enigme_txt || "";
            out.pwdValue = ((choice.f_pwd_value || choice.pwd || choice.f_pwd || "") + "").toLowerCase().trim();
            out.pwdRememberSuccess =
                choice.f_pwd_remember === true || String(choice.f_pwd_remember || "").toLowerCase() === "yes";
        }
        return out;
    }

    function parseRewardChainNode(raw) {
        try {
            var node = typeof raw === "string" ? JSON.parse(raw) : raw;
            if(!node || typeof node !== "object") return null;
            return rewardNodeToArgs(node, 0);
        } catch (e) {
            return null;
        }
    }

    function rewardNodeToArgs(node, depth) {
        if(!node || typeof node !== "object") return { action: "scene", target: "", transTxt: "", transBtn: "Continue" };
        if(depth > 20) return { action: "msg", okMsg: "" };
        var act = String(node.actionType || node.type || "scene").toLowerCase();
        var out = { action: act };
        if(act === "scene") {
            out.target = node.target || node.f_target || "";
            out.transTxt = node.transTxt || node.f_trans_txt || "";
            out.transBtn = node.transBtn || node.f_trans_btn || "Continue";
            return out;
        }
        if(act === "msg") {
            out.okMsg = node.txt || node.f_ok_msg || "";
            return out;
        }
        if(act === "pick") {
            out.pickId = node.itemId || node.f_pick_id || "";
            out.pickName = node.itemName || node.f_pick_name || "";
            out.pickMsg = node.txt || node.f_pick_msg || "";
            return out;
        }
        if(act === "selector") {
            var rn = node.rewardNested || node.nested || {};
            out.rewardSelector = {
                title: rn.title || "",
                introHtml: rn.introHtml || (rn.copy && rn.copy.bodyHtml) || "",
                displayMode: rn.displayMode === "dropdown" ? "dropdown" : "buttons",
                choices: Array.isArray(rn.choices) ? rn.choices : []
            };
            return out;
        }
        if(act === "req") {
            out.reqItemId = node.itemId || node.f_req_item_id || "";
            out.reqKo = node.ko || node.f_req_ko || "";
            var rawReq = node.f_reward_chain_json || node.rewardChainJson || "";
            if(typeof rawReq === "string" && rawReq.trim()) {
                var parsedReq = parseRewardChainNode(rawReq);
                if(parsedReq) out.reqNext = parsedReq;
            }
            if(!out.reqNext && node.next && typeof node.next === "object") {
                out.reqNext = rewardNodeToArgs(node.next, depth + 1);
            }
            return out;
        }
        if(act === "pwd") {
            out.pwdEnigmeTxt = node.enigmeTxt || node.f_pwd_enigme_txt || node.f_enigme_txt || "";
            out.pwdValue = ((node.pwd || node.f_pwd_value || node.f_pwd || "") + "").toLowerCase().trim();
            out.pwdRememberSuccess =
                node.f_pwd_remember === true || String(node.f_pwd_remember || "").toLowerCase() === "yes";
            var rawPwd = node.f_reward_chain_json || node.rewardChainJson || "";
            if(typeof rawPwd === "string" && rawPwd.trim()) {
                var parsedPwd = parseRewardChainNode(rawPwd);
                if(parsedPwd) out.pwdNext = parsedPwd;
            }
            if(!out.pwdNext && node.next && typeof node.next === "object") {
                out.pwdNext = rewardNodeToArgs(node.next, depth + 1);
            }
            return out;
        }
        return { action: "scene", target: "", transTxt: "", transBtn: "Continue" };
    }

    // Reward after passcode or required item (internal scene / msg / pick / selector)
    function executeReward(args, hsDiv) {
        // actionV2ToPlayerArgs sets type "pwd" plus action = reward type; prefer type so the passcode step is not skipped.
        var act =
            args && args.type === "pwd"
                ? "pwd"
                : args && args.action
                  ? args.action
                  : args && args.type
                    ? args.type
                    : "";
        if(act === "selector" && args.rewardSelector) {
            openSelector(args.rewardSelector, hsDiv);
            return;
        }
        if(act === "scene") {
            executeAction({ type: "scene", target: args.target, transTxt: args.transTxt, transBtn: args.transBtn }, hsDiv);
        } else if(act === "msg") {
            executeAction({ type: "msg", txt: args.okMsg != null ? args.okMsg : (args.txt || "") }, hsDiv);
        } else if(act === "pick") {
            executeAction({
                type: "pick",
                itemId: args.pickId != null ? args.pickId : (args.itemId || ""),
                itemName: args.pickName != null ? args.pickName : (args.itemName || ""),
                txt: args.pickMsg != null ? args.pickMsg : (args.txt || "")
            }, hsDiv);
        } else if(act === "req") {
            var rid = args.reqItemId != null ? String(args.reqItemId).trim() : "";
            if(!rid || !inventaire[rid]) {
                afficherPopup("", args.reqKo || "");
                return;
            }
            if(args.reqNext) executeReward(args.reqNext, hsDiv);
        } else if(act === "pwd") {
            var pwdBackdrop2 = document.createElement("div");
            pwdBackdrop2.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
            pwdBackdrop2.onclick = function (e) {
                if(e.target === pwdBackdrop2) {
                    audioSys.stopSFX();
                    timerNotifyBlockingClose();
                    document.body.removeChild(pwdBackdrop2);
                }
            };
            var msg2 = document.createElement("div");
            msg2.style.cssText = "background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;";
            msg2.onclick = function (e) { e.stopPropagation(); };
            msg2.innerHTML = "<div class='play-html-rich'>" + (args.pwdEnigmeTxt || "") + "</div><br><br>";
            var inp2 = document.createElement("input");
            inp2.type = "text";
            inp2.style.cssText = "margin-top:15px;padding:10px;width:80%;font-size:16px;text-align:center;font-family:inherit;";
            msg2.appendChild(inp2);
            msg2.appendChild(document.createElement("br"));
            var err2 = document.createElement("div");
            err2.style.color = "red";
            err2.style.marginTop = "10px";
            msg2.appendChild(err2);
            var btn2 = document.createElement("button");
            btn2.innerHTML = "[ VALIDATE ]";
            btn2.style.cssText = "margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;";
            btn2.onclick = function () {
                if(inp2.value.toLowerCase().trim() === (args.pwdValue || "")) {
                    timerNotifyBlockingClose();
                    document.body.removeChild(pwdBackdrop2);
                    if(args.pwdNext) executeReward(args.pwdNext, hsDiv);
                } else {
                    err2.innerHTML = "INCORRECT ANSWER";
                    inp2.value = "";
                    inp2.focus();
                }
            };
            msg2.appendChild(btn2);
            var cls2 = document.createElement("button");
            cls2.innerHTML = "X";
            cls2.setAttribute("aria-label", "Close");
            cls2.style.cssText = "position:absolute;top:8px;right:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;";
            cls2.onclick = function () {
                audioSys.stopSFX();
                timerNotifyBlockingClose();
                document.body.removeChild(pwdBackdrop2);
            };
            msg2.appendChild(cls2);
            pwdBackdrop2.appendChild(msg2);
            document.body.appendChild(pwdBackdrop2);
            timerNotifyBlockingOpen();
            setTimeout(function () { inp2.focus(); }, 100);
        }
    }

    var selectorHistory = [];
    var selectorHsDiv = null;

    function normalizeSelectorLevel(obj, fallbackDisplayMode) {
        if(!obj) obj = {};
        var dm = obj.displayMode === 'dropdown' ? 'dropdown' : (fallbackDisplayMode === 'dropdown' ? 'dropdown' : 'buttons');
        return { title: obj.title || '', introHtml: obj.introHtml || '', choices: Array.isArray(obj.choices) ? obj.choices : [], displayMode: dm };
    }
    function isChoiceVisible(choice) {
        if(!choice) return false;
        if(choice.requiresItem != null && String(choice.requiresItem).trim() !== '') {
            if(!inventaire[String(choice.requiresItem).trim()]) return false;
        }
        if(choice.hiddenIfHasItem != null && String(choice.hiddenIfHasItem).trim() !== '') {
            if(inventaire[String(choice.hiddenIfHasItem).trim()]) return false;
        }
        return true;
    }
    function isActionVisible(args) {
        if(!args) return false;
        if(args.requiresItem != null && String(args.requiresItem).trim() !== '') {
            if(!inventaire[String(args.requiresItem).trim()]) return false;
        }
        if(args.hiddenIfHasItem != null && String(args.hiddenIfHasItem).trim() !== '') {
            if(inventaire[String(args.hiddenIfHasItem).trim()]) return false;
        }
        return true;
    }
    var hotspotRegistry = [];
    /*
     * Hotspot visibility / clicks:
     * (1) opacity:0 + pointer-events:none — hidden and not clickable (clickWhenInvisible === false or pick already taken).
     * (2) opacity:0 + pointer-events:auto — ghost hit zone (clickWhenInvisible !== false; never for type selector).
     * (3) Visible — visibility rules satisfied and pick not consumed.
     */
    /** Hide when visibility filters fail (same as isActionVisible) or pick already collected. */
    function shouldHideHotspotVisually(args) {
        if(!args) return false;
        if(args.type === 'pick' && args.itemId != null && String(args.itemId).trim() !== '' && inventaire[String(args.itemId).trim()]) {
            return true;
        }
        return !isActionVisible(args);
    }
    function ghostPointerWhenHidden(args) {
        if(!args || args.type === 'selector') return false;
        if(args.clickWhenInvisible === false) return false;
        if(args.type === 'pick' && args.itemId != null && String(args.itemId).trim() !== '' && inventaire[String(args.itemId).trim()]) {
            return false;
        }
        return true;
    }
    function applyHotspotVisibility(hsDiv, args) {
        if(!hsDiv || !args) return;
        if(shouldHideHotspotVisually(args)) {
            hsDiv.style.opacity = '0';
            hsDiv.style.pointerEvents = ghostPointerWhenHidden(args) ? 'auto' : 'none';
            hsDiv.style.visibility = '';
            hsDiv.style.display = '';
            return;
        }
        hsDiv.style.opacity = '';
        hsDiv.style.pointerEvents = '';
        hsDiv.style.visibility = '';
        hsDiv.style.display = '';
    }
    function refreshAllHotspotVisibility() {
        hotspotRegistry = hotspotRegistry.filter(function(el) { return el && el.isConnected && el._hsArgs; });
        for(var i = 0; i < hotspotRegistry.length; i++) {
            applyHotspotVisibility(hotspotRegistry[i], hotspotRegistry[i]._hsArgs);
        }
        try {
            if(typeof viewer !== 'undefined' && viewer && typeof viewer.resize === 'function') viewer.resize();
        } catch (e) {}
    }
    function choiceToPayload(choice) {
        if(!choice || !choice.actionType) return null;
        var at = choice.actionType;
        var sfx = {};
        if(choice.sfxUrl != null && String(choice.sfxUrl).trim() !== '') {
            sfx.sfxUrl = String(choice.sfxUrl).trim();
            if(choice.sfxVolume !== undefined && choice.sfxVolume !== null && choice.sfxVolume !== '') sfx.sfxVolume = choice.sfxVolume;
        }
        if(at === 'msg') return Object.assign({ type: 'msg', txt: choice.txt || '' }, sfx);
        if(at === 'scene') return Object.assign({ type: 'scene', target: choice.target || '', transTxt: choice.transTxt || '', transBtn: choice.transBtn }, sfx);
        if(at === 'pick') return Object.assign({ type: 'pick', itemId: choice.itemId, itemName: choice.itemName, txt: choice.txt || '' }, sfx);
        return null;
    }
    function closeSelectorOverlay(stopSfx) {
        if (stopSfx !== false) audioSys.stopSFX();
        var o = document.getElementById('selector-overlay');
        if(o) o.remove();
        selectorHistory = [];
        selectorHsDiv = null;
        timerNotifyBlockingClose();
    }
    function selectorBack() {
        if(selectorHistory.length <= 1) {
            closeSelectorOverlay();
            return;
        }
        selectorHistory.pop();
        renderSelectorPanel();
    }
    function runSelectorChoice(choice) {
        if(!choice) return;
        if(choice.actionType === "req") {
            if(choice.sfxUrl != null && String(choice.sfxUrl).trim() !== "") {
                audioSys.playSFX(String(choice.sfxUrl).trim(), choice.sfxVolume);
            }
            var rid = choice.itemId != null ? String(choice.itemId).trim() : "";
            if(!rid || !inventaire[rid]) {
                afficherPopup("", choice.ko || "");
                return;
            }
            var hReq = selectorHsDiv;
            closeSelectorOverlay(false);
            executeReward(choiceRewardToArgs(choice), hReq);
            return;
        }
        if(choice.actionType === "pwd") {
            if(choice.sfxUrl != null && String(choice.sfxUrl).trim() !== "") {
                audioSys.playSFX(String(choice.sfxUrl).trim(), choice.sfxVolume);
            }
            var pwdKey = "selpwd_" + String(choice.id || "choice");
            var shouldRememberSelectorPwd =
                choice.f_pwd_remember === true || String(choice.f_pwd_remember || "").toLowerCase() === "yes";
            if(shouldRememberSelectorPwd && unlockedHotspots[pwdKey]) {
                var hPwd = selectorHsDiv;
                closeSelectorOverlay(false);
                executeReward(choiceRewardToArgs(choice), hPwd);
                return;
            }
            var pwdBackdrop = document.createElement("div");
            pwdBackdrop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
            pwdBackdrop.onclick = function (e) {
                if(e.target === pwdBackdrop) {
                    audioSys.stopSFX();
                    timerNotifyBlockingClose();
                    document.body.removeChild(pwdBackdrop);
                }
            };
            var msg = document.createElement("div");
            msg.style.cssText = "background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;";
            msg.onclick = function (e) {
                e.stopPropagation();
            };
            msg.innerHTML = "<div class='play-html-rich'>" + (choice.enigmeTxt || "") + "</div><br><br>";
            var inp = document.createElement("input");
            inp.type = "text";
            inp.style.cssText = "margin-top:15px;padding:10px;width:80%;font-size:16px;text-align:center;font-family:inherit;";
            msg.appendChild(inp);
            msg.appendChild(document.createElement("br"));
            var err = document.createElement("div");
            err.style.color = "red";
            err.style.marginTop = "10px";
            msg.appendChild(err);
            var btn = document.createElement("button");
            btn.innerHTML = "[ OK ]";
            btn.style.cssText = "margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;";
            btn.onclick = function () {
                if(inp.value.toLowerCase().trim() === (choice.pwd || "")) {
                    timerNotifyBlockingClose();
                    document.body.removeChild(pwdBackdrop);
                    if(shouldRememberSelectorPwd) unlockedHotspots[pwdKey] = true;
                    var hPwd2 = selectorHsDiv;
                    closeSelectorOverlay(false);
                    executeReward(choiceRewardToArgs(choice), hPwd2);
                    if(shouldRememberSelectorPwd) queuePlayerProgressSave("unlock");
                } else {
                    err.innerHTML = "INCORRECT ANSWER";
                    inp.value = "";
                    inp.focus();
                }
            };
            msg.appendChild(btn);
            var cls = document.createElement("button");
            cls.innerHTML = "X";
            cls.setAttribute("aria-label", "Close");
            cls.style.cssText = "position:absolute;top:8px;right:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;";
            cls.onclick = function () {
                audioSys.stopSFX();
                timerNotifyBlockingClose();
                document.body.removeChild(pwdBackdrop);
            };
            msg.appendChild(cls);
            pwdBackdrop.appendChild(msg);
            document.body.appendChild(pwdBackdrop);
            timerNotifyBlockingOpen();
            setTimeout(function () {
                inp.focus();
            }, 100);
            return;
        }
        if(choice.actionType === 'selector') {
            if(choice.sfxUrl != null && String(choice.sfxUrl).trim() !== '') {
                audioSys.playSFX(String(choice.sfxUrl).trim(), choice.sfxVolume);
            }
            if(choice.nested) {
                selectorHistory.push(normalizeSelectorLevel(choice.nested, selectorHistory[selectorHistory.length - 1].displayMode));
                renderSelectorPanel();
            }
            return;
        }
        var payload = choiceToPayload(choice);
        if(payload && payload.type === 'msg') {
            if(choice.sfxUrl != null && String(choice.sfxUrl).trim() !== '') {
                audioSys.playSFX(String(choice.sfxUrl).trim(), choice.sfxVolume);
            }
            selectorHistory.push({ _inlineMessage: true, bodyHtml: payload.txt || '' });
            renderSelectorPanel();
            return;
        }
        var hsForAction = selectorHsDiv;
        closeSelectorOverlay(false);
        if(payload) executeAction(payload, hsForAction, true);
    }
    function renderSelectorPanel() {
        var inner = document.getElementById('selector-panel-inner');
        if(!inner || selectorHistory.length === 0) return;
        var level = selectorHistory[selectorHistory.length - 1];
        inner.innerHTML = '';
        if(level._inlineMessage) {
            var topBarMsg = document.createElement('div');
            topBarMsg.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;min-height:28px;';
            var backMsg = document.createElement('button');
            backMsg.type = 'button';
            backMsg.textContent = '← Back to menu';
            backMsg.style.cssText = 'cursor:pointer;padding:6px 10px;border:none;border-radius:4px;background:rgba(255,255,255,0.15);color:inherit;font:inherit;';
            backMsg.onclick = function() {
                audioSys.stopSFX();
                selectorHistory.pop();
                renderSelectorPanel();
            };
            var midMsg = document.createElement('span');
            midMsg.style.flex = '1';
            var btnXMsg = document.createElement('button');
            btnXMsg.innerHTML = '✕';
            btnXMsg.setAttribute('aria-label','Close');
            btnXMsg.style.cssText = 'background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;';
            btnXMsg.onclick = function(){ closeSelectorOverlay(); };
            topBarMsg.appendChild(backMsg);
            topBarMsg.appendChild(midMsg);
            topBarMsg.appendChild(btnXMsg);
            inner.appendChild(topBarMsg);
            var hMsg = document.createElement('h2');
            hMsg.style.cssText = 'margin:0 0 12px 0;font-size:1.25em;';
            hMsg.textContent = 'Message';
            inner.appendChild(hMsg);
            var scroll = document.createElement('div');
            scroll.className = 'play-html-rich';
            scroll.style.cssText = 'max-height:min(55vh, 420px); overflow:auto; padding:8px; font-size:0.95em; line-height:1.45;';
            scroll.innerHTML = level.bodyHtml || '';
            inner.appendChild(scroll);
            return;
        }
        var topBar = document.createElement('div');
        topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;min-height:28px;';
        var backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.textContent = '← Back';
        backBtn.style.cssText = 'cursor:pointer;padding:6px 10px;border:none;border-radius:4px;background:rgba(255,255,255,0.15);color:inherit;font:inherit;' + (selectorHistory.length > 1 ? '' : 'visibility:hidden;');
        backBtn.onclick = function(){ selectorBack(); };
        var mid = document.createElement('span');
        mid.style.flex = '1';
        var btnX = document.createElement('button');
        btnX.innerHTML = '✕';
        btnX.setAttribute('aria-label','Close');
        btnX.style.cssText = 'background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;';
        btnX.onclick = function(){ closeSelectorOverlay(); };
        topBar.appendChild(backBtn);
        topBar.appendChild(mid);
        topBar.appendChild(btnX);
        inner.appendChild(topBar);
        var h = document.createElement('h2');
        h.style.cssText = 'margin:0 0 12px 0;font-size:1.25em;';
        h.textContent = level.title || 'Choose';
        inner.appendChild(h);
        if(level.introHtml) {
            var intro = document.createElement('div');
            intro.className = 'play-html-rich';
            intro.style.cssText = 'margin-bottom:16px;font-size:0.95em;';
            intro.innerHTML = level.introHtml;
            inner.appendChild(intro);
        }
        var visibleChoices = (level.choices || []).filter(isChoiceVisible);
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
        if(visibleChoices.length === 0) {
            var empty = document.createElement('p');
            empty.style.cssText = 'margin:0;font-style:italic;opacity:0.85;';
            empty.textContent = 'No choices are available right now.';
            wrap.appendChild(empty);
        } else if(level.displayMode === 'dropdown') {
            var sel = document.createElement('select');
            sel.style.cssText = 'width:100%;padding:12px;font-size:16px;font-family:inherit;border-radius:6px;border:1px solid #888;box-sizing:border-box;background:#ffffff;color:#111;';
            visibleChoices.forEach(function(ch, i) {
                var opt = document.createElement('option');
                opt.value = String(i);
                opt.textContent = ch.label || ('Choice ' + (i+1));
                sel.appendChild(opt);
            });
            var goBtn = document.createElement('button');
            goBtn.type = 'button';
            goBtn.textContent = 'OK';
            goBtn.style.cssText = 'cursor:pointer;padding:12px 16px;border:none;border-radius:6px;font-size:16px;font-weight:bold;background:${popBtnBg};color:${popBtnCol};font-family:inherit;width:100%;';
            goBtn.onclick = function() {
                var idx = parseInt(sel.value, 10);
                if(!isNaN(idx)) runSelectorChoice(visibleChoices[idx]);
            };
            wrap.appendChild(sel);
            wrap.appendChild(goBtn);
        } else {
            visibleChoices.forEach(function(choice, idx) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = choice.label || ('Choice ' + (idx+1));
                b.style.cssText = 'cursor:pointer;padding:12px 16px;border:none;border-radius:6px;font-size:16px;font-weight:bold;background:${popBtnBg};color:${popBtnCol};font-family:inherit;width:100%;';
                b.onclick = function() { runSelectorChoice(choice); };
                wrap.appendChild(b);
            });
        }
        inner.appendChild(wrap);
    }
    function openSelector(args, hsDiv) {
        closeSelectorOverlay();
        selectorHistory = [normalizeSelectorLevel(args)];
        selectorHsDiv = hsDiv;
        var overlay = document.createElement('div');
        overlay.id = 'selector-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        overlay.onclick = function(e) { if(e.target === overlay) closeSelectorOverlay(); };
        var panel = document.createElement('div');
        panel.style.cssText = 'background:${popBg};color:${popColor};font-family:${popFont};max-width:420px;width:100%;max-height:85vh;overflow:auto;padding:24px;border-radius:8px;border:2px solid #888;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        panel.onclick = function(e){ e.stopPropagation(); };
        var inner = document.createElement('div');
        inner.id = 'selector-panel-inner';
        panel.appendChild(inner);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        renderSelectorPanel();
        timerNotifyBlockingOpen();
    }

    function hotspotDispatcher(hsDiv, args) {
        hsDiv._hsArgs = args;
        hotspotRegistry.push(hsDiv);
        applyHotspotVisibility(hsDiv, args);
        hsDiv.onclick = function() {
            if (gameOverTriggered || victoryTriggered) return;
            var visOk = isActionVisible(args);
            if(!visOk) {
                if(!ghostPointerWhenHidden(args) || !shouldHideHotspotVisually(args)) return;
            }
            maybeStartDeferredTimer();
            if(args.type === 'selector') { openSelector(args, hsDiv); }
            else if(args.type === 'msg') { executeAction({ type: 'msg', txt: args.txt, sfxUrl: args.sfxUrl, sfxVolume: args.sfxVolume }, hsDiv); }
            else if(args.type === 'scene') { executeAction({ type: 'scene', target: args.target, transTxt: args.transTxt, transBtn: args.transBtn, sfxUrl: args.sfxUrl, sfxVolume: args.sfxVolume }, hsDiv); }
            else if(args.type === 'pick') { executeAction({ type: 'pick', itemId: args.itemId, itemName: args.itemName, txt: args.txt, sfxUrl: args.sfxUrl, sfxVolume: args.sfxVolume }, hsDiv); }
            else if(args.type === 'req') {
                if(args.sfxUrl != null && String(args.sfxUrl).trim() !== '') {
                    audioSys.playSFX(String(args.sfxUrl).trim(), args.sfxVolume);
                }
                if(inventaire[args.itemId]) {
                    hsDiv.style.background = "rgba(0,255,0,0.5)";
                    executeReward(args, hsDiv);
                } else {
                    afficherPopup("", args.ko);
                }
            }
            else if(args.type === 'pwd') {
                if(args.sfxUrl != null && String(args.sfxUrl).trim() !== '') {
                    audioSys.playSFX(String(args.sfxUrl).trim(), args.sfxVolume);
                }
                var rememberPwd = args.rememberSuccess === true;
                if(rememberPwd && args.id && unlockedHotspots[args.id]) { executeReward(args, hsDiv); return; }
                
                var pwdBackdrop = document.createElement('div');
                pwdBackdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
                pwdBackdrop.onclick = function(e) { if(e.target === pwdBackdrop) { audioSys.stopSFX(); timerNotifyBlockingClose(); document.body.removeChild(pwdBackdrop); } };
                var msg = document.createElement('div');
                msg.style.cssText = 'background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;';
                msg.onclick = function(e){ e.stopPropagation(); };
                msg.innerHTML = "<div class='play-html-rich'>" + args.enigmeTxt + "</div><br><br>";
                
                var inp = document.createElement('input'); 
                inp.type = "text"; 
                inp.style.cssText = 'margin-top:15px;padding:10px;width:80%;font-size:16px;text-align:center;font-family:inherit;';
                msg.appendChild(inp); msg.appendChild(document.createElement('br'));
                
                var err = document.createElement('div'); 
                err.style.color = "red"; err.style.marginTop = "10px"; 
                msg.appendChild(err);
                
                var btn = document.createElement('button'); 
                btn.innerHTML = "[ SUBMIT ]"; 
                btn.style.cssText = 'margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;';
                btn.onclick = function() {
                    if(inp.value.toLowerCase().trim() === args.pwd) { 
                        timerNotifyBlockingClose();
                        document.body.removeChild(pwdBackdrop); 
                        if(rememberPwd && args.id) unlockedHotspots[args.id] = true;
                        executeReward(args, hsDiv); 
                        if(rememberPwd) queuePlayerProgressSave("unlock");
                    } else { 
                        err.innerHTML = "WRONG ANSWER"; 
                        inp.value = ""; 
                        inp.focus(); 
                    }
                };
                msg.appendChild(btn); 
                
                var cls = document.createElement('button'); 
                cls.innerHTML = "X"; 
                cls.setAttribute('aria-label','Close');
                cls.style.cssText = 'position:absolute;top:8px;right:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;';
                cls.onclick = function() { audioSys.stopSFX(); timerNotifyBlockingClose(); document.body.removeChild(pwdBackdrop); }; 
                
                msg.appendChild(cls); 
                pwdBackdrop.appendChild(msg);
                document.body.appendChild(pwdBackdrop);
                timerNotifyBlockingOpen();
                setTimeout(function(){ inp.focus(); }, 100);
            }
        };
    }
    
    // Rebuild #inv-list from inventaire map
    function majInventaireUI() {
        var ul = document.getElementById('inv-list'); 
        ul.innerHTML = ""; 
        var visible = 0;
        for(var k in inventaire) {
            var nm = inventaire[k] && inventaire[k].name != null ? String(inventaire[k].name) : "";
            if (nm.trim() === "") continue;
            ul.innerHTML += "<li style='margin-bottom:5px;'>• " + nm + "</li>";
            visible++;
        }
        if (visible === 0) ul.innerHTML = '<li style="color:gray; font-style:italic;">Empty</li>';
    }
    
    // Same modal chrome as selector (dim overlay + rounded panel)
    function afficherPopup(titre, texte, btnTxt = 'Close', onConfirm = null) {
        var backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        function closePopup() {
            audioSys.stopSFX();
            timerNotifyBlockingClose();
            if (backdrop.parentNode) document.body.removeChild(backdrop);
        }
        backdrop.onclick = function(e) { if(e.target === backdrop) closePopup(); };
        var msg = document.createElement('div');
        msg.style.cssText = 'background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;max-height:85vh;overflow:auto;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;';
        msg.onclick = function(e){ e.stopPropagation(); };
        msg.innerHTML = (titre!=="" ? "<h3 style='margin-top:0;color:inherit;opacity:0.8;'>" + titre + "</h3>" : "") + "<div class='play-html-rich'>" + texte + "</div><br>";
        var btnX = document.createElement('button');
        btnX.type = 'button';
        btnX.innerHTML = '✕';
        btnX.setAttribute('aria-label','Close');
        btnX.style.cssText = 'position:absolute;top:8px;right:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;';
        btnX.onclick = function() { closePopup(); };
        msg.insertBefore(btnX, msg.firstChild);
        
        var btn = document.createElement('button'); 
        btn.innerHTML = btnTxt; 
        btn.style.cssText = 'margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;';
        btn.onclick = function() { 
            closePopup();
            if(onConfirm) onConfirm(); 
        }; 
        
        msg.appendChild(btn); 
        backdrop.appendChild(msg);
        document.body.appendChild(backdrop);
        timerNotifyBlockingOpen();
    }

    applyPlayerSaveModeUi();
    updateContinueButtonState();
    if (String((PLAYER_SAVE_CONFIG && PLAYER_SAVE_CONFIG.mode) || "manual").toLowerCase() === "none") {
        setPlayerSaveStatus("Player quicksave is disabled by editor.");
    } else {
        refreshLatestPlayerSaveMeta().catch(function () {});
    }
    installPlayerSaveLifecycleHooks();
<\/script>
</body>
</html>`;

    return htmlTemplate;
}

function generateGame() {
    var project = typeof getCurrentProjectData === "function" ? getCurrentProjectData() : {};
    var embedList =
        typeof window.collectPortableBundleEmbeds === "function"
            ? window.collectPortableBundleEmbeds(project)
            : [];
    if (embedList.length > 0) {
        var proceed = window.confirm(
            "This project references local media (.escapegame bundle or imported files): blob:… URLs in index.html only work in this browser session and are not shareable.\n\n" +
                "For a playable build elsewhere, use the Web ZIP export (media/ folder) or public https://… URLs for all media.\n\n" +
                "Download index.html anyway? (Most useful when you only changed copy/hotspots and will drop the file back into an already extracted pack.)"
        );
        if (!proceed) return;
    }
    const htmlTemplate = buildPlayerHtmlTemplate();
    const blob = new Blob([htmlTemplate], { type: "text/html;charset=utf-8" });
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "index.html";
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
}

/** ZIP for HTTP hosting: raw files in media/ (images + audio), no media-images.js — works when ./media/ is not CORS-blocked. */
async function exportGameWebZip() {
    if (typeof JSZip === "undefined" || typeof saveAs === "undefined") {
        alert("JSZip or FileSaver.js failed to load. Check your network (CDN) and reload the page.");
        return;
    }
    try {
        const htmlRaw = buildPlayerHtmlTemplate();
        let html = patchPlayerHtmlForOffline(htmlRaw);
        const project = typeof getCurrentProjectData === "function" ? getCurrentProjectData() : {};
        var embedList =
            typeof window.collectPortableBundleEmbeds === "function"
                ? window.collectPortableBundleEmbeds(project)
                : [];
        var mediaFilesToAdd = [];
        if (embedList.length > 0) {
            var usedMedia = {};
            for (var ei = 0; ei < embedList.length; ei++) {
                var item = embedList[ei];
                var mediaBase = uniqueOfflineMediaName(
                    sanitizeOfflineMediaBaseName(item.nameHint, "media.bin"),
                    usedMedia
                );
                html = html.split(item.url).join("./media/" + mediaBase);
                mediaFilesToAdd.push({ name: mediaBase, blob: item.blob });
            }
        }
        if (/blob:/.test(html)) {
            alert(
                "ZIP export: blob:… URLs are still present in index.html (local media missing from this session or not handled by the exporter). " +
                    "The media/ folder does not include those files — the build will be incomplete. Reload media in the editor, prefer the .escapegame bundle, then export again."
            );
        }
        const [cssText, jsText] = await Promise.all([
            fetch(OFFLINE_PANNELLUM_CDN_CSS).then(function (r) {
                if (!r.ok) throw new Error("pannellum.css (" + r.status + ")");
                return r.text();
            }),
            fetch(OFFLINE_PANNELLUM_CDN_JS).then(function (r) {
                if (!r.ok) throw new Error("pannellum.js (" + r.status + ")");
                return r.text();
            }),
        ]);
        const zip = new JSZip();
        zip.file("index.html", html);
        zip.file("start_local_server.bat", WEB_ZIP_BAT_WINDOWS_EN);
        zip.file("README-play-locally.txt", WEB_ZIP_README_EN);
        if (mediaFilesToAdd.length > 0) {
            var mediaFolder = zip.folder("media");
            mediaFilesToAdd.forEach(function (m) {
                mediaFolder.file(m.name, m.blob);
            });
        }
        const lib = zip.folder("lib");
        lib.file("pannellum.css", cssText);
        lib.file("pannellum.js", jsText);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadBase = String(project.title || "EscapeGame")
            .replace(/[\\/:*?"<>|]+/g, "_")
            .trim()
            .slice(0, 80);
        saveAs(zipBlob, (downloadBase || "EscapeGame") + "_Web.zip");
    } catch (e) {
        console.error(e);
        alert(
            "ZIP export (web hosting) failed: " +
                (e && e.message ? e.message : String(e)) +
                "\n\nA network connection is needed once to download Pannellum; retry or check blockers."
        );
    }
}

// Preview on load only (scenes come from JSON, draft, or C6.2 nodal projection — no forced empty scene).
window.addEventListener("load", function () {
    if (typeof updatePreview === "function") {
        updatePreview();
    }
});

