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
        gameOver: {
            title: String(endGo.title || "").trim(),
            bodyHtml: String(endGo.bodyHtml || ""),
            buttonLabel: String(endGo.buttonLabel || "Restart").trim() || "Restart"
        }
    };
    const playerTimerJson = JSON.stringify(playerTimerPayload).replace(/</g, "\\u003c");

    let scenesConfig = {};
    let firstSceneId = "";
    let customStylesCSS = "";
    let globalHsCount = 0;
	let sceneAmbianceClips = {};
    
    function choiceV2ToLegacy(choice) {
        if(!choice || !choice.action) return { label: "Option", actionType: "msg", txt: "" };
        var a = choice.action;
        var p = a.payload || {};
        var c = p.copy || {};
        var out = { label: choice.label || "Option", actionType: a.type || "msg" };
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
            }
        } else if(args.type === "pwd") {
            args.enigmeTxt = pc.bodyHtml || "";
            args.pwd = (p.answer || "").toLowerCase().trim();
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
        #end-screen-modal { display: none; position: fixed; inset: 0; z-index: 11000; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box; }
        #end-screen-modal.is-open { display: flex; }
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
        <h1 style="font-size: 3em; margin-bottom: 30px;">${title}</h1>
        <button onclick="startGame()" style="padding: 15px 30px; font-size: 1.2em; cursor: pointer; background: #3498db; color: white; border: none; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Start adventure</button>
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
            <div class="settings-close-row">
                <button type="button" class="settings-close-btn" onclick="closePlayerSettings()">Close</button>
            </div>
        </div>
    </div>

    <div id="end-screen-modal" role="dialog" aria-modal="true" aria-labelledby="end-screen-title">
        <div class="end-screen-backdrop"></div>
        <div class="end-screen-panel" style="font-family:${popFont};color:${popColor};background:${popBg};">
            <h2 id="end-screen-title" style="margin:0 0 12px 0;font-size:1.35rem;"></h2>
            <div id="end-screen-body" class="play-html-rich" style="text-align:left;margin-bottom:16px;"></div>
            <button type="button" id="end-screen-restart" class="settings-close-btn" onclick="location.reload()">Restart</button>
        </div>
    </div>
    
    <!-- Pannellum mount node -->
    <div id="panorama"></div>
    <script type="application/json" id="escape360-timer-config">${playerTimerJson}</script>

<script>
    // Player state
    var inventaire = {}; 
    var unlockedHotspots = {};
    var viewer;

    var PLAYER_TIMER_CONFIG = { enabled: false, mode: "countdown", startSeconds: 1800, autoStart: true, pauseWhenPopupOpen: false, gameOver: { title: "", bodyHtml: "", buttonLabel: "Restart" } };
    try {
        var _tcEl = document.getElementById("escape360-timer-config");
        if (_tcEl && _tcEl.textContent) {
            var _tcParsed = JSON.parse(_tcEl.textContent);
            if (_tcParsed && typeof _tcParsed === "object") PLAYER_TIMER_CONFIG = _tcParsed;
        }
    } catch (eTimerCfg) {}
    var gameOverTriggered = false;
    var timerDisplayMs = 0;
    var timerRunStart = null;
    var timerPausedAccum = 0;
    var timerBlockingDepth = 0;
    var timerInterval = null;

    function isTimerBlockingUiOpen() {
        var sm = document.getElementById("settings-modal");
        if (sm && sm.classList.contains("is-open")) return true;
        return timerBlockingDepth > 0;
    }
    function isTimerPausedNow() {
        return !!(PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.enabled && PLAYER_TIMER_CONFIG.pauseWhenPopupOpen && isTimerBlockingUiOpen());
    }
    function timerNotifyBlockingOpen() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled || !PLAYER_TIMER_CONFIG.pauseWhenPopupOpen) return;
        var wasPaused = isTimerPausedNow();
        timerBlockingDepth++;
        if (!wasPaused && isTimerPausedNow()) timerOnEnterPause();
    }
    function timerNotifyBlockingClose() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled || !PLAYER_TIMER_CONFIG.pauseWhenPopupOpen) return;
        if (timerBlockingDepth > 0) timerBlockingDepth--;
        timerOnLeavePauseIfNeeded();
    }
    function timerOnEnterPause() {
        if (timerRunStart != null) {
            timerPausedAccum += Date.now() - timerRunStart;
            timerRunStart = null;
        }
    }
    function timerOnLeavePauseIfNeeded() {
        if (gameOverTriggered) return;
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled) return;
        if (isTimerPausedNow()) return;
        if (timerRunStart == null && PLAYER_TIMER_CONFIG.autoStart) timerRunStart = Date.now();
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
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled || gameOverTriggered) return;
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
                triggerGameOver();
                return;
            }
        }
        updateTimerHudLabel();
    }
    function triggerGameOver() {
        if (gameOverTriggered) return;
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
    function initPlayerTimerAfterStart() {
        if (!PLAYER_TIMER_CONFIG || !PLAYER_TIMER_CONFIG.enabled) return;
        var el = document.getElementById("player-timer");
        if (el) el.classList.add("is-visible");
        gameOverTriggered = false;
        timerPausedAccum = 0;
        timerBlockingDepth = 0;
        timerRunStart = null;
        if (PLAYER_TIMER_CONFIG.mode === "countup") {
            timerDisplayMs = 0;
        } else {
            timerDisplayMs = Math.max(0, (PLAYER_TIMER_CONFIG.startSeconds || 0) * 1000);
        }
        updateTimerHudLabel();
        if (!PLAYER_TIMER_CONFIG.autoStart) return;
        if (!isTimerPausedNow()) timerRunStart = Date.now();
        timerInterval = setInterval(tickPlayerTimer, 250);
        tickPlayerTimer();
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
        if (PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.enabled && PLAYER_TIMER_CONFIG.pauseWhenPopupOpen) timerOnEnterPause();
    }

    function closePlayerSettings() {
        var mod = document.getElementById("settings-modal");
        if (!mod) return;
        var wasOpen = mod.classList.contains("is-open");
        mod.classList.remove("is-open");
        if (wasOpen && PLAYER_TIMER_CONFIG && PLAYER_TIMER_CONFIG.enabled && PLAYER_TIMER_CONFIG.pauseWhenPopupOpen) timerOnLeavePauseIfNeeded();
    }

    function applySceneAmbiance(sceneId) {
        var clip = sceneAmbianceClips[sceneId];
        if (!clip || !clip.url || String(clip.url).trim() === '') {
            audioSys.playAmbiance('');
            return;
        }
        audioSys.playAmbiance(clip.url, clip.volume);
    }

    // --- Start (after splash click) ---
    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        loadPlayerAudioPrefsFromStorage();
        syncPlayerAudioSlidersToUi();
        
        // Pannellum viewer
        viewer = pannellum.viewer('panorama', { 
            "default": { "firstScene": "${firstSceneId}", "sceneFadeDuration": 1500, "autoLoad": true, "showFullscreenCtrl": false }, 
            "scenes": ${jsonScenes} 
        });

        viewer.on('scenechange', function(sceneId) {
            var sid = (sceneId != null && sceneId !== '') ? sceneId : viewer.getScene();
            applySceneAmbiance(sid);
        });
        applySceneAmbiance("${firstSceneId}");

        // Optional looped background music
        if (${useGlobalAudio} && "${globalMusicUrl}" !== "") {
            audioSys.playMusic("${globalMusicUrl}", ${globalMusicVol});
        }
        initPlayerTimerAfterStart();
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
        if (gameOverTriggered) return;
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
        }
    }

    // Reward after passcode or required item (internal scene / msg / pick branches)
    function executeReward(args, hsDiv) {
        if(args.action === 'scene') {
            executeAction({ type: 'scene', target: args.target, transTxt: args.transTxt, transBtn: args.transBtn }, hsDiv);
        } else if(args.action === 'msg') {
            executeAction({ type: 'msg', txt: args.okMsg }, hsDiv);
        } else if(args.action === 'pick') {
            executeAction({ type: 'pick', itemId: args.pickId, itemName: args.pickName, txt: args.pickMsg }, hsDiv);
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
            if (gameOverTriggered) return;
            var visOk = isActionVisible(args);
            if(!visOk) {
                if(!ghostPointerWhenHidden(args) || !shouldHideHotspotVisually(args)) return;
            }
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
                if(unlockedHotspots[args.id]) { executeReward(args, hsDiv); return; }
                
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
                        unlockedHotspots[args.id] = true; 
                        executeReward(args, hsDiv); 
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
        var c = 0;
        for(var k in inventaire) { 
            ul.innerHTML += "<li style='margin-bottom:5px;'>• " + inventaire[k].name + "</li>"; 
            c++; 
        }
        if(c === 0) ul.innerHTML = '<li style="color:gray; font-style:italic;">Empty</li>';
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

// Boot: one empty scene + preview refresh
window.onload = function() { 
    addScene();
	updatePreview();
};

