// --- Build standalone player HTML (index.html) ---
// Reads the form and emits one self-contained file (Pannellum + game logic).
function generateGame() {
    // 1. Globals from form
    const title = document.getElementById('gameTitle').value; 
    const hasInv = document.getElementById('useInventory').checked;
    const invPos = document.getElementById('inv-pos').value; 
    const invIconVal = document.getElementById('inv-icon').value;
	const useGlobalAudio = document.getElementById('useGlobalAudio').checked;
	const globalAudioUrl = document.getElementById('globalAudioUrl').value;

    
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
    const invBgc = document.getElementById('inv-bgc').value;
    const invBga = document.getElementById('inv-bga').value;
    const invBg = hexToRgba(invBgc, invBga);
    const invColor = document.getElementById('inv-color').value;

    // Dialog theme (or built-in defaults)
    const useCustomPopup = document.getElementById('useCustomPopup').checked;
    const popFont = useCustomPopup ? document.getElementById('pop-font').value : "Arial, sans-serif";
    const popColor = useCustomPopup ? document.getElementById('pop-color').value : "#ffffff";
    const popBgc = useCustomPopup ? document.getElementById('pop-bgc').value : "#000000";
    const popBga = useCustomPopup ? document.getElementById('pop-bga').value : "0.95";
    const popBg = hexToRgba(popBgc, popBga);
    const popBtnBg = useCustomPopup ? document.getElementById('pop-btn-bg').value : "#27ae60";
    const popBtnCol = useCustomPopup ? document.getElementById('pop-btn-col').value : "#ffffff";

    let scenesConfig = {};
    let firstSceneId = "";
    let customStylesCSS = "";
    let globalHsCount = 0;
	let sceneAudios = {};
    
    // 2. Pannellum scenes + per-scene ambient URLs
    document.querySelectorAll('.scene-block').forEach((sceneDiv, index) => {
        const scId = sceneDiv.querySelector('.sc-id').value; 
        let scImg = sceneDiv.querySelector('.sc-img').value;
        if (!scImg.startsWith('http')) scImg = "./" + scImg; // Relative image path
        if(index === 0) firstSceneId = scId; // First listed scene = start scene

        let scAudioRaw = sceneDiv.querySelector('.sc-audio') ? sceneDiv.querySelector('.sc-audio').value.trim() : "";
        if (scAudioRaw) {
            let scAudioUrl = scAudioRaw;
            if (!scAudioUrl.startsWith('http')) scAudioUrl = "./" + scAudioUrl;
            sceneAudios[scId] = scAudioUrl;
        }
        
        let hotSpots = [];
        
        // Hotspots → Pannellum hotSpots + CSS classes
        sceneDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
            globalHsCount++; 
            const hsClass = "custom-hs-" + globalHsCount;
            
            // Player stylesheet chunk for this hotspot
            customStylesCSS += `.${hsClass} { ${hsDiv.querySelector('.hs-custom-css').value} pointer-events: auto; }\n.${hsClass}:hover { transform: scale(1.1); }\n`;
            
            const type = hsDiv.querySelector('.hs-type').value; 
            
            // args → passed into createTooltipArgs / hotspotDispatcher
            let args = { type: type, id: "hs_uid_" + globalHsCount };
            
            // Fill args by hotspot type
            if(type === 'msg') {
                args.txt = hsDiv.querySelector('.f-txt').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>');
            }
            if(type === 'scene') { 
                args.target = hsDiv.querySelector('.f-target').value; 
                args.transTxt = hsDiv.querySelector('.f-trans-txt').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                args.transBtn = hsDiv.querySelector('.f-trans-btn').value.replace(/"/g, '&quot;'); 
            }
            if(type === 'pick') { 
                args.itemId = hsDiv.querySelector('.f-item-id').value; 
                args.itemName = hsDiv.querySelector('.f-item-name').value; 
                args.txt = hsDiv.querySelector('.f-pick-msg').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
            }
            if(type === 'req') { 
                args.itemId = hsDiv.querySelector('.f-item-id').value; 
                args.ko = hsDiv.querySelector('.f-ko').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                args.action = hsDiv.querySelector('.f-req-action').value;
                if(args.action === 'scene') { 
                    args.target = hsDiv.querySelector('.f-target').value; 
                    args.transTxt = hsDiv.querySelector('.f-trans-txt').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                    args.transBtn = hsDiv.querySelector('.f-trans-btn').value.replace(/"/g, '&quot;'); 
                }
                else if(args.action === 'msg') { args.okMsg = hsDiv.querySelector('.f-ok-msg').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); }
                else if(args.action === 'pick') { 
                    args.pickId = hsDiv.querySelector('.f-pick-id').value; 
                    args.pickName = hsDiv.querySelector('.f-pick-name').value; 
                    args.pickMsg = hsDiv.querySelector('.f-pick-msg').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                }
            }
            if(type === 'pwd') {
                args.enigmeTxt = hsDiv.querySelector('.f-enigme-txt').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                args.pwd = hsDiv.querySelector('.f-pwd').value.toLowerCase().trim(); 
                args.action = hsDiv.querySelector('.f-pwd-action').value;
                if(args.action === 'scene') { 
                    args.target = hsDiv.querySelector('.f-target').value; 
                    args.transTxt = hsDiv.querySelector('.f-trans-txt').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                    args.transBtn = hsDiv.querySelector('.f-trans-btn').value.replace(/"/g, '&quot;'); 
                }
                else if(args.action === 'msg') { args.okMsg = hsDiv.querySelector('.f-ok-msg').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); }
                else if(args.action === 'pick') { 
                    args.pickId = hsDiv.querySelector('.f-pick-id').value; 
                    args.pickName = hsDiv.querySelector('.f-pick-name').value; 
                    args.pickMsg = hsDiv.querySelector('.f-pick-msg').value.replace(/"/g, '&quot;').replace(/\n/g, '<br>'); 
                }
            }
            
            // Push hotspot config
            hotSpots.push({ pitch: parseFloat(hsDiv.querySelector('.hs-pitch').value), yaw: parseFloat(hsDiv.querySelector('.hs-yaw').value), cssClass: hsClass, createTooltipFunc: "hotspotDispatcher", createTooltipArgs: args });
        });
        
        // scenesConfig[scId] for viewer init
        scenesConfig[scId] = { type: "equirectangular", panorama: scImg, hotSpots: hotSpots };
    });

    // 3. JSON scenes — replace string "hotspotDispatcher" with live function ref
    let jsonScenes = JSON.stringify(scenesConfig, null, 4).replace(/"createTooltipFunc": "hotspotDispatcher"/g, '"createTooltipFunc": hotspotDispatcher');

    const sceneAmbianceJson = JSON.stringify(sceneAudios);

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
        
        /* Inventory UI */
        #inv-container { position: absolute; ${invPosCSS} z-index: 9999; display: ${hasInv ? 'flex' : 'none'}; flex-direction: column; align-items: ${alignItems}; }
        #inv-toggle { cursor: pointer; font-size: 30px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 50%; text-align: center; line-height: 1; user-select: none; border: 2px solid rgba(255,255,255,0.3); transition: 0.2s; }
        #inv-toggle:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
        #inv-panel { background: ${invBg}; color: ${invColor}; border: 2px solid white; padding: 15px; border-radius: 8px; margin-top: 10px; margin-bottom: 10px; display: none; min-width: 150px; }
        #inv-panel h3 { margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px; } 
        #inv-list { margin: 0; padding: 0; list-style-type: none; line-height: 1.5; }
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
    // Player state
    var inventaire = {}; 
    var unlockedHotspots = {};
    var viewer;

    // --- Audio channels ---
    var sceneAmbianceUrls = ${sceneAmbianceJson};

    var audioSys = {
        masterVol: 1.0, musicVol: 0.5, ambianceVol: 0.8, sfxVol: 1.0,
        _ambianceLogicalUrl: '',
        
        playMusic: function(url) {
            var p = document.getElementById('audio-music');
            if(!url) { p.pause(); return; }
            if(p.src !== url) { p.src = url; p.volume = this.musicVol * this.masterVol; p.play().catch(function(e){console.log(e)}); }
        },
        playAmbiance: function(url) {
            var p = document.getElementById('audio-ambiance');
            if(!url || !String(url).trim()) {
                p.pause();
                this._ambianceLogicalUrl = '';
                p.removeAttribute('src');
                try { p.load(); } catch (e) {}
                return;
            }
            url = String(url).trim();
            p.volume = this.ambianceVol * this.masterVol;
            if (this._ambianceLogicalUrl === url) {
                if (p.paused) p.play().catch(function(e){console.log(e)});
                return;
            }
            this._ambianceLogicalUrl = url;
            p.src = url;
            p.play().catch(function(e){console.log(e)});
        },
        playSFX: function(url) {
            if(!url) return;
            var p = document.getElementById('audio-sfx');
            p.src = url; p.volume = this.sfxVol * this.masterVol; p.play().catch(function(e){console.log(e)});
        }
    };

    function applySceneAmbiance(sceneId) {
        var url = sceneAmbianceUrls[sceneId];
        if (!url || String(url).trim() === '') {
            audioSys.playAmbiance('');
            return;
        }
        audioSys.playAmbiance(url);
    }

    // --- Start (after splash click) ---
    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        
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
        if (${useGlobalAudio} && "${globalAudioUrl}" !== "") {
            audioSys.playMusic("${globalAudioUrl}");
        }
    }
    
    function toggleInv() { 
        var p = document.getElementById('inv-panel'); 
        p.style.display = (p.style.display === 'block') ? 'none' : 'block'; 
    }
    
    // Leaf action (msg / scene / pick) — shared engine for classic hotspots and future selector choices (see docs/SELECTOR_SPEC.md)
    function executeAction(payload, hsDiv) {
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
            hsDiv.style.display = 'none';
            majInventaireUI();
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

    function hotspotDispatcher(hsDiv, args) {
        hsDiv.onclick = function() {
            if(args.type === 'msg') { executeAction({ type: 'msg', txt: args.txt }, hsDiv); }
            else if(args.type === 'scene') { executeAction({ type: 'scene', target: args.target, transTxt: args.transTxt, transBtn: args.transBtn }, hsDiv); }
            else if(args.type === 'pick') { executeAction({ type: 'pick', itemId: args.itemId, itemName: args.itemName, txt: args.txt }, hsDiv); }
            else if(args.type === 'req') {
                if(inventaire[args.itemId]) {
                    hsDiv.style.background = "rgba(0,255,0,0.5)";
                    executeReward(args, hsDiv);
                } else {
                    afficherPopup("", args.ko);
                }
            }
            else if(args.type === 'pwd') {
                if(unlockedHotspots[args.id]) { executeReward(args, hsDiv); return; }
                
                // Inline passcode modal
                var msg = document.createElement('div'); 
                msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:${popBg};color:${popColor};font-family:${popFont};padding:30px;border:2px solid #888;z-index:100;text-align:center;max-width:80%;';
                msg.innerHTML = args.enigmeTxt + "<br><br>";
                
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
                        document.body.removeChild(msg); 
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
                cls.style.cssText = 'position:absolute;top:5px;right:5px;background:transparent;color:red;border:none;cursor:pointer;font-size:16px;';
                cls.onclick = function() { document.body.removeChild(msg); }; 
                
                msg.appendChild(cls); 
                document.body.appendChild(msg); 
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
    
    // Modal dialog using editor theme colors
    function afficherPopup(titre, texte, btnTxt = 'Close', onConfirm = null) {
        var msg = document.createElement('div'); 
        msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:${popBg};color:${popColor};font-family:${popFont};padding:30px;border:2px solid #888;z-index:100;text-align:center;max-width:80%;';
        msg.innerHTML = (titre!=="" ? "<h3 style='margin-top:0;color:inherit;opacity:0.8;'>" + titre + "</h3>" : "") + texte + "<br>";
        
        var btn = document.createElement('button'); 
        btn.innerHTML = btnTxt; 
        btn.style.cssText = 'margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;';
        btn.onclick = function() { 
            document.body.removeChild(msg); 
            if(onConfirm) onConfirm(); 
        }; 
        
        msg.appendChild(btn); 
        document.body.appendChild(msg);
    }
<\/script>
</body>
</html>`;

    // 5. Download index.html
    const blob = new Blob([htmlTemplate], { type: "text/html;charset=utf-8" }); 
    const lien = document.createElement("a"); 
    lien.href = URL.createObjectURL(blob); 
    lien.download = "index.html"; 
    document.body.appendChild(lien); 
    lien.click(); 
    document.body.removeChild(lien);
}

// Boot: one empty scene + preview refresh
window.onload = function() { 
    addScene();
	updatePreview();
};
