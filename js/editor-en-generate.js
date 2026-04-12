// --- Player HTML (index.html) or ZIP exports: `exportGameWebZip` (hosting ZIP) / `exportGameStandaloneHtml` (single self-contained HTML) ---
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

function isOfflineZipImageBlob(blob, nameHint) {
    var t = blob && blob.type ? String(blob.type) : "";
    if (t.indexOf("image/") === 0) return true;
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(String(nameHint || ""));
}

function readBlobAsDataURL(blob) {
    return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () {
            resolve(r.result);
        };
        r.onerror = function () {
            reject(r.error || new Error("FileReader"));
        };
        r.readAsDataURL(blob);
    });
}

function escapeScriptBodyForHtmlScriptTag(jsText) {
    return String(jsText || "").replace(/<\/script>/gi, "<\\/script>");
}

function inlinePannellumCdnIntoPlayerHtml(html, cssText, jsText) {
    var css = String(cssText || "");
    var js = escapeScriptBodyForHtmlScriptTag(jsText);
    html = html.replace(
        /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/pannellum@2\.5\.7\/build\/pannellum\.css"\s*>/i,
        "<style>\n" + css + "\n</style>"
    );
    html = html.replace(
        /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/pannellum@2\.5\.7\/build\/pannellum\.js">\s*<\/script>/i,
        "<script>\n" + js + "\n</script>"
    );
    return html;
}

function expandBundleMediaPathsToDataUrls(html, mediaMap) {
    if (!mediaMap) return html;
    var keys = Object.keys(mediaMap).sort(function (a, b) {
        return b.length - a.length;
    });
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = mediaMap[k];
        if (v == null) continue;
        html = html.split("./media/" + k).join(v);
    }
    return html;
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

function injectOfflineZipImageDataUrlsInHtml(html, fileName, dataUrl) {
    if (!fileName || dataUrl == null) return html;
    var d = String(dataUrl);
    var escSingle = d.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    var escAttr = d.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    var escDouble = d.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    html = html.split("url('./media/" + fileName + "')").join("url('" + escSingle + "')");
    html = html.split('url("./media/' + fileName + '")').join('url("' + escDouble + '")');
    html = html.split('src="./media/' + fileName + '"').join('src="' + escAttr + '"');
    html = html.split("src='./media/" + fileName + "'").join('src="' + escAttr + '"');
    return html;
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.bundleMediaExport] — Bundle media (./media/… paths): GAME_MEDIA_ASSETS placeholder + panorama resolution (standalone HTML export).
 * @returns {string} Full player HTML (Pannellum via CDN links).
 */
function buildPlayerHtmlTemplate(opts) {
    opts = opts || {};
    var bundleMediaExport = !!opts.bundleMediaExport;
    var bundleMediaHeadScript = bundleMediaExport
        ? '    <script>/*__GAME_MEDIA_ASSETS_PLACEHOLDER__*/<\\/script>\n'
        : "";
    var bundleMediaPlayerRelFn = bundleMediaExport
        ? `
    function playerRelMediaPathIfLocal(url) {
        var s = String(url || "").trim();
        if (!s) return s;
        if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:") || s.startsWith("data:")) return s;
        var mediaP = "./media/";
        if (s.startsWith(mediaP)) {
            var fn = s.slice(mediaP.length);
            var M = typeof window !== "undefined" ? window.GAME_MEDIA_ASSETS : undefined;
            if (M != null && typeof M === "object" && Object.prototype.hasOwnProperty.call(M, fn)) return M[fn];
            return s;
        }
        if (s.startsWith("./")) return s;
        return "./" + s;
    }
`
        : "";
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
    
    // Inventory toggle: emoji/text or <img> if URL / extension
    let invIconHTML = invIconVal; 
    if(invIconVal.startsWith('http') || invIconVal.endsWith('.png') || invIconVal.endsWith('.jpg')) {
        invIconHTML = `<img src="${invIconVal}" style="width:30px; height:30px; display:block;">`;
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
        
        /* Inventory UI */
        #inv-container { position: absolute; ${invPosCSS} z-index: 9999; display: ${hasInv ? 'flex' : 'none'}; flex-direction: column; align-items: ${alignItems}; }
        #inv-toggle { cursor: pointer; font-size: 30px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 50%; text-align: center; line-height: 1; user-select: none; border: 2px solid rgba(255,255,255,0.3); transition: 0.2s; }
        #inv-toggle:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
        #inv-panel { background: ${invBg}; color: ${invColor}; border: 2px solid white; padding: 15px; border-radius: 8px; margin-top: 10px; margin-bottom: 10px; display: none; min-width: 150px; }
        #inv-panel h3 { margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px; } 
        #inv-list { margin: 0; padding: 0; list-style-type: none; line-height: 1.5; }
    </style>
${bundleMediaHeadScript}</head>
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

    <!-- Player chrome -->
    <div id="inv-container">
        <div id="inv-toggle" onclick="toggleInv()">${invIconHTML}</div>
        <div id="inv-panel">
            <h3>Inventory</h3>
            <ul id="inv-list"><li style="color:gray; font-style:italic;">Empty</li></ul>
        </div>
    </div>
    
    <!-- Pannellum mount node -->
    <div id="panorama"></div>

<script>
${bundleMediaPlayerRelFn}
    // Player state
    var inventaire = {}; 
    var unlockedHotspots = {};
    var viewer;

    // --- Audio channels ---
    var sceneAmbianceClips = ${sceneAmbianceJson};

    var audioSys = {
        masterVol: 1.0, musicVol: 0.5, ambianceVol: 0.8, sfxVol: 1.0,
        _ambianceLogicalUrl: '',
        
        playMusic: function(url, clipVol) {
            var p = document.getElementById('audio-music');
            if(!url || !String(url).trim()) { p.pause(); return; }
            url = String(url).trim();
            var m = 1;
            if(clipVol != null && clipVol !== '' && !isNaN(Number(clipVol))) m = Math.max(0, Math.min(1, Number(clipVol)));
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
        
        // Pannellum viewer
        ${
            bundleMediaExport
                ? `var __scenesForViewer = ${jsonScenes};
        for (var __k in __scenesForViewer) {
            if (__scenesForViewer[__k] && __scenesForViewer[__k].panorama != null) {
                __scenesForViewer[__k].panorama = playerRelMediaPathIfLocal(__scenesForViewer[__k].panorama);
            }
        }
        viewer = pannellum.viewer('panorama', { 
            "default": { "firstScene": "${firstSceneId}", "sceneFadeDuration": 1500, "autoLoad": true, "showFullscreenCtrl": false }, 
            "scenes": __scenesForViewer 
        });`
                : `viewer = pannellum.viewer('panorama', { 
            "default": { "firstScene": "${firstSceneId}", "sceneFadeDuration": 1500, "autoLoad": true, "showFullscreenCtrl": false }, 
            "scenes": ${jsonScenes} 
        });`
        }

        viewer.on('scenechange', function(sceneId) {
            var sid = (sceneId != null && sceneId !== '') ? sceneId : viewer.getScene();
            applySceneAmbiance(sid);
        });
        applySceneAmbiance("${firstSceneId}");

        // Optional looped background music
        if (${useGlobalAudio} && "${globalMusicUrl}" !== "") {
            audioSys.playMusic("${globalMusicUrl}", ${globalMusicVol});
        }
    }
    
    function toggleInv() { 
        var p = document.getElementById('inv-panel'); 
        p.style.display = (p.style.display === 'block') ? 'none' : 'block'; 
    }
    function openInventoryPanelIfVisible() {
        var c = document.getElementById('inv-container');
        if(!c || c.style.display === 'none') return;
        var p = document.getElementById('inv-panel');
        if(p) p.style.display = 'block';
    }
    
    // Leaf action (msg / scene / pick) — shared engine for classic hotspots and future selector choices (see docs/SELECTOR_SPEC.md)
    // fromSelector: if true, do not hide hotspot after pick (same div must reopen the selector)
    function executeAction(payload, hsDiv, fromSelector) {
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
            if(hsDiv && !fromSelector) hsDiv.style.display = 'none';
            majInventaireUI();
            openInventoryPanelIfVisible();
            afficherPopup("", payload.txt);
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
    function choiceToPayload(choice) {
        if(!choice || !choice.actionType) return null;
        var at = choice.actionType;
        if(at === 'msg') return { type: 'msg', txt: choice.txt || '' };
        if(at === 'scene') return { type: 'scene', target: choice.target || '', transTxt: choice.transTxt || '', transBtn: choice.transBtn };
        if(at === 'pick') return { type: 'pick', itemId: choice.itemId, itemName: choice.itemName, txt: choice.txt || '' };
        return null;
    }
    function closeSelectorOverlay() {
        audioSys.stopSFX();
        var o = document.getElementById('selector-overlay');
        if(o) o.remove();
        selectorHistory = [];
        selectorHsDiv = null;
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
        if(choice.sfxUrl != null && String(choice.sfxUrl).trim() !== '') {
            audioSys.playSFX(String(choice.sfxUrl).trim(), choice.sfxVolume);
        }
        if(choice.actionType === 'selector') {
            if(choice.nested) {
                selectorHistory.push(normalizeSelectorLevel(choice.nested, selectorHistory[selectorHistory.length - 1].displayMode));
                renderSelectorPanel();
            }
            return;
        }
        var payload = choiceToPayload(choice);
        if(payload && payload.type === 'msg') {
            selectorHistory.push({ _inlineMessage: true, bodyHtml: payload.txt || '' });
            renderSelectorPanel();
            return;
        }
        var hsForAction = selectorHsDiv;
        closeSelectorOverlay();
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
    }

    function hotspotDispatcher(hsDiv, args) {
        hsDiv.onclick = function() {
            if(!isActionVisible(args)) return;
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
                pwdBackdrop.onclick = function(e) { if(e.target === pwdBackdrop) document.body.removeChild(pwdBackdrop); };
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
                cls.onclick = function() { document.body.removeChild(pwdBackdrop); }; 
                
                msg.appendChild(cls); 
                pwdBackdrop.appendChild(msg);
                document.body.appendChild(pwdBackdrop); 
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
        backdrop.onclick = function(e) { if(e.target === backdrop) document.body.removeChild(backdrop); };
        var msg = document.createElement('div');
        msg.style.cssText = 'background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;max-height:85vh;overflow:auto;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;';
        msg.onclick = function(e){ e.stopPropagation(); };
        msg.innerHTML = (titre!=="" ? "<h3 style='margin-top:0;color:inherit;opacity:0.8;'>" + titre + "</h3>" : "") + "<div class='play-html-rich'>" + texte + "</div><br>";
        
        var btn = document.createElement('button'); 
        btn.innerHTML = btnTxt; 
        btn.style.cssText = 'margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;';
        btn.onclick = function() { 
            document.body.removeChild(backdrop); 
            if(onConfirm) onConfirm(); 
        }; 
        
        msg.appendChild(btn); 
        backdrop.appendChild(msg);
        document.body.appendChild(backdrop);
    }
<\/script>
</body>
</html>`;

    return htmlTemplate;
}

function generateGame() {
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

/** Single HTML file: Pannellum + bundle media as Base64 inline (double-click, offline, no CORS). Needs network once to fetch Pannellum from CDN. */
async function exportGameStandaloneHtml() {
    if (typeof saveAs === "undefined") {
        alert("FileSaver.js failed to load. Check your network (CDN) and reload the page.");
        return;
    }
    try {
        var htmlRaw = buildPlayerHtmlTemplate({ bundleMediaExport: true });
        var html = String(htmlRaw);
        const project = typeof getCurrentProjectData === "function" ? getCurrentProjectData() : {};
        var embedList =
            typeof window.collectPortableBundleEmbeds === "function"
                ? window.collectPortableBundleEmbeds(project)
                : [];
        var mediaMap = {};
        if (embedList.length > 0) {
            var usedMedia = {};
            for (var ei = 0; ei < embedList.length; ei++) {
                var item = embedList[ei];
                var mediaBase = uniqueOfflineMediaName(
                    sanitizeOfflineMediaBaseName(item.nameHint, "media.bin"),
                    usedMedia
                );
                html = html.split(item.url).join("./media/" + mediaBase);
                mediaMap[mediaBase] = await readBlobAsDataURL(item.blob);
                if (isOfflineZipImageBlob(item.blob, item.nameHint)) {
                    html = injectOfflineZipImageDataUrlsInHtml(html, mediaBase, mediaMap[mediaBase]);
                }
            }
        }
        html = expandBundleMediaPathsToDataUrls(html, mediaMap);
        html = html.replace(
            /\/\*__GAME_MEDIA_ASSETS_PLACEHOLDER__\*\//,
            "window.GAME_MEDIA_ASSETS = " + JSON.stringify(mediaMap) + ";"
        );
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
        html = inlinePannellumCdnIntoPlayerHtml(html, cssText, jsText);
        var outBlob = new Blob([html], { type: "text/html;charset=utf-8" });
        const downloadBase = String(project.title || "Game")
            .replace(/[\\/:*?"<>|]+/g, "_")
            .trim()
            .slice(0, 80);
        saveAs(outBlob, (downloadBase || "Game") + "_Standalone.html");
    } catch (e) {
        console.error(e);
        alert(
            "Standalone HTML export failed: " +
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

