// --- LA GRANDE FONCTION : GÉNÉRATION DU JEU (Création de index.html) ---
// Cette fonction lit tout le formulaire et fabrique le code du jeu final
function generateGame() {
    // 1. Récupération des paramètres globaux
    const title = document.getElementById('gameTitle').value; 
    const hasInv = document.getElementById('useInventory').checked;
    const invPos = document.getElementById('inv-pos').value; 
    const invIconVal = document.getElementById('inv-icon').value;
	const useGlobalAudio = document.getElementById('useGlobalAudio').checked;
	const globalAudioUrl = document.getElementById('globalAudioUrl').value;

    
    // Détermination de la position CSS de l'inventaire
    let invPosCSS = "top: 15px; right: 15px;"; let alignItems = "flex-end";
    if(invPos === 'top-left') { invPosCSS = "top: 15px; left: 15px;"; alignItems = "flex-start"; } 
    if(invPos === 'bottom-right') { invPosCSS = "bottom: 15px; right: 15px;"; alignItems = "flex-end"; } 
    if(invPos === 'bottom-left') { invPosCSS = "bottom: 15px; left: 15px;"; alignItems = "flex-start"; }
    
    // Gestion de l'icône d'inventaire (Image ou Émoji)
    let invIconHTML = invIconVal; 
    if(invIconVal.startsWith('http') || invIconVal.endsWith('.png') || invIconVal.endsWith('.jpg')) {
        invIconHTML = `<img src="${invIconVal}" style="width:30px; height:30px; display:block;">`;
    }
	
    // Extraction des couleurs inventaire (conversion RGBa)
    const invBgc = document.getElementById('inv-bgc').value;
    const invBga = document.getElementById('inv-bga').value;
    const invBg = hexToRgba(invBgc, invBga);
    const invColor = document.getElementById('inv-color').value;

    // Paramètres Popup personnalisés ou par défaut
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
    
    // 2. Parcourt des scènes pour construire le code compréhensible par Pannellum
    document.querySelectorAll('.scene-block').forEach((sceneDiv, index) => {
        const scId = sceneDiv.querySelector('.sc-id').value; 
        let scImg = sceneDiv.querySelector('.sc-img').value;
        if (!scImg.startsWith('http')) scImg = "./" + scImg; // Ajoute "./" si l'image est locale
        if(index === 0) firstSceneId = scId; // La première scène devient la scène de départ

        let scAudioRaw = sceneDiv.querySelector('.sc-audio') ? sceneDiv.querySelector('.sc-audio').value.trim() : "";
        if (scAudioRaw) {
            let scAudioUrl = scAudioRaw;
            if (!scAudioUrl.startsWith('http')) scAudioUrl = "./" + scAudioUrl;
            sceneAudios[scId] = scAudioUrl;
        }
        
        let hotSpots = [];
        
        // Parcourt des hotspots de la scène
        sceneDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
            globalHsCount++; 
            const hsClass = "custom-hs-" + globalHsCount;
            
            // Compilation du CSS du hotspot pour l'injecter dans le jeu
            customStylesCSS += `.${hsClass} { ${hsDiv.querySelector('.hs-custom-css').value} pointer-events: auto; }\n.${hsClass}:hover { transform: scale(1.1); }\n`;
            
            const type = hsDiv.querySelector('.hs-type').value; 
            
            // L'objet `args` contient toutes les données que Pannellum va utiliser lors d'un clic
            let args = { type: type, id: "hs_uid_" + globalHsCount };
            
            // Extraction des données en fonction du type d'action choisi
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
            if(type === 'selector') {
                args.title = hsDiv.querySelector('.f-sel-title').value;
                args.introHtml = hsDiv.querySelector('.f-sel-intro').value;
                var selDm = hsDiv.querySelector('.f-sel-display');
                args.displayMode = (selDm && selDm.value === 'dropdown') ? 'dropdown' : 'buttons';
                try {
                    var selChoices = JSON.parse(hsDiv.querySelector('.f-sel-choices').value.trim());
                    if(!Array.isArray(selChoices)) throw new Error('choices doit être un tableau JSON');
                    args.choices = selChoices;
                } catch(e) {
                    alert('Selector : JSON des choix invalide.\\n' + e.message);
                    return;
                }
            }
            
            // Ajout du hotspot à la liste de la scène
            hotSpots.push({ pitch: parseFloat(hsDiv.querySelector('.hs-pitch').value), yaw: parseFloat(hsDiv.querySelector('.hs-yaw').value), cssClass: hsClass, createTooltipFunc: "hotspotDispatcher", createTooltipArgs: args });
        });
        
        // Ajout de la scène à la configuration globale de Pannellum
        scenesConfig[scId] = { type: "equirectangular", panorama: scImg, hotSpots: hotSpots };
    });

    // 3. Transformation de la configuration en texte JSON (et nettoyage des guillemets pour la fonction JS)
    let jsonScenes = JSON.stringify(scenesConfig, null, 4).replace(/"createTooltipFunc": "hotspotDispatcher"/g, '"createTooltipFunc": hotspotDispatcher');

    const sceneAmbianceJson = JSON.stringify(sceneAudios);

    // 4. CONSTRUCTION DU FICHIER HTML FINAL (Le Modèle)
    const htmlTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <!-- Moteur Pannellum -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css">
    <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js"><\/script>
    <style>
        /* Styles de base du jeu */
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: black; font-family: Arial; } 
        #panorama { width: 100%; height: 100%; } 
        /* Injection du CSS généré pour les hotspots */
        ${customStylesCSS}
        
        /* Styles de l'inventaire */
        #inv-container { position: absolute; ${invPosCSS} z-index: 9999; display: ${hasInv ? 'flex' : 'none'}; flex-direction: column; align-items: ${alignItems}; }
        #inv-toggle { cursor: pointer; font-size: 30px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 50%; text-align: center; line-height: 1; user-select: none; border: 2px solid rgba(255,255,255,0.3); transition: 0.2s; }
        #inv-toggle:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
        #inv-panel { background: ${invBg}; color: ${invColor}; border: 2px solid white; padding: 15px; border-radius: 8px; margin-top: 10px; margin-bottom: 10px; display: none; min-width: 150px; }
        #inv-panel h3 { margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px; } 
        #inv-list { margin: 0; padding: 0; list-style-type: none; line-height: 1.5; }
    </style>
</head>
<body>
    <!-- AUDIO MANAGER (3 canaux cachés) -->
    <audio id="audio-music" loop></audio>
    <audio id="audio-ambiance" loop></audio>
    <audio id="audio-sfx"></audio>

    <!-- Écran d'accueil pour débloquer l'audio -->
    <div id="start-screen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10000; color: white;">
        <h1 style="font-size: 3em; margin-bottom: 30px;">${title}</h1>
        <button onclick="startGame()" style="padding: 15px 30px; font-size: 1.2em; cursor: pointer; background: #3498db; color: white; border: none; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Commencer l'aventure</button>
    </div>

    <!-- Interface Joueur -->
    <div id="inv-container">
        <div id="inv-toggle" onclick="toggleInv()">${invIconHTML}</div>
        <div id="inv-panel">
            <h3>Inventaire</h3>
            <ul id="inv-list"><li style="color:gray; font-style:italic;">Vide</li></ul>
        </div>
    </div>
    
    <!-- Conteneur du lecteur 360 -->
    <div id="panorama"></div>

<script>
    // Variables du joueur
    var inventaire = {}; 
    var unlockedHotspots = {};
    var viewer;

    // --- MOTEUR AUDIO ---
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
        var url = sceneAmbianceUrls[sceneId];
        if (!url || String(url).trim() === '') {
            audioSys.playAmbiance('');
            return;
        }
        audioSys.playAmbiance(url);
    }

    // --- LANCEMENT DU JEU ---
    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        
        // Initialisation de Pannellum
        viewer = pannellum.viewer('panorama', { 
            "default": { "firstScene": "${firstSceneId}", "sceneFadeDuration": 1500, "autoLoad": true, "showFullscreenCtrl": false }, 
            "scenes": ${jsonScenes} 
        });

        viewer.on('scenechange', function(sceneId) {
            var sid = (sceneId != null && sceneId !== '') ? sceneId : viewer.getScene();
            applySceneAmbiance(sid);
        });
        applySceneAmbiance("${firstSceneId}");

        // Lancement de la musique globale si activée
        if (${useGlobalAudio} && "${globalAudioUrl}" !== "") {
            audioSys.playMusic("${globalAudioUrl}");
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
    
    // Action « feuille » (msg / changement de scène / ramassage) — même moteur pour hotspots classiques et futurs choix selector (voir docs/SELECTOR_SPEC.md)
    // fromSelector : si vrai, on ne masque pas le hotspot après pick (le même div sert encore à rouvrir le menu selector)
    function executeAction(payload, hsDiv, fromSelector) {
        if(payload.type === 'scene') {
            if(payload.transTxt) {
                afficherPopup("", payload.transTxt, payload.transBtn || "Continuer", function(){ viewer.loadScene(payload.target); });
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

    // Récompense après énigme mot de passe ou objet requis (branches internes scene / msg / pick)
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
            backMsg.textContent = '← Retour au menu';
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
            btnXMsg.setAttribute('aria-label','Fermer');
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
            scroll.style.cssText = 'max-height:min(55vh, 420px); overflow:auto; text-align:left; padding:8px; font-size:0.95em; line-height:1.45;';
            scroll.innerHTML = level.bodyHtml || '';
            inner.appendChild(scroll);
            return;
        }
        var topBar = document.createElement('div');
        topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;min-height:28px;';
        var backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.textContent = '← Retour';
        backBtn.style.cssText = 'cursor:pointer;padding:6px 10px;border:none;border-radius:4px;background:rgba(255,255,255,0.15);color:inherit;font:inherit;' + (selectorHistory.length > 1 ? '' : 'visibility:hidden;');
        backBtn.onclick = function(){ selectorBack(); };
        var mid = document.createElement('span');
        mid.style.flex = '1';
        var btnX = document.createElement('button');
        btnX.innerHTML = '✕';
        btnX.setAttribute('aria-label','Fermer');
        btnX.style.cssText = 'background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;';
        btnX.onclick = function(){ closeSelectorOverlay(); };
        topBar.appendChild(backBtn);
        topBar.appendChild(mid);
        topBar.appendChild(btnX);
        inner.appendChild(topBar);
        var h = document.createElement('h2');
        h.style.cssText = 'margin:0 0 12px 0;font-size:1.25em;';
        h.textContent = level.title || 'Choix';
        inner.appendChild(h);
        if(level.introHtml) {
            var intro = document.createElement('div');
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
            empty.textContent = 'Aucun choix disponible pour le moment.';
            wrap.appendChild(empty);
        } else if(level.displayMode === 'dropdown') {
            var sel = document.createElement('select');
            sel.style.cssText = 'width:100%;padding:12px;font-size:16px;font-family:inherit;border-radius:6px;border:1px solid #888;box-sizing:border-box;background:#ffffff;color:#111;';
            visibleChoices.forEach(function(ch, i) {
                var opt = document.createElement('option');
                opt.value = String(i);
                opt.textContent = ch.label || ('Choix ' + (i+1));
                sel.appendChild(opt);
            });
            var goBtn = document.createElement('button');
            goBtn.type = 'button';
            goBtn.textContent = 'Valider';
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
                b.textContent = choice.label || ('Choix ' + (idx+1));
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
            if(args.type === 'selector') { openSelector(args, hsDiv); }
            else if(args.type === 'msg') { executeAction({ type: 'msg', txt: args.txt }, hsDiv); }
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
                
                var pwdBackdrop = document.createElement('div');
                pwdBackdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
                pwdBackdrop.onclick = function(e) { if(e.target === pwdBackdrop) document.body.removeChild(pwdBackdrop); };
                var msg = document.createElement('div');
                msg.style.cssText = 'background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;';
                msg.onclick = function(e){ e.stopPropagation(); };
                msg.innerHTML = args.enigmeTxt + "<br><br>";
                
                var inp = document.createElement('input'); 
                inp.type = "text"; 
                inp.style.cssText = 'margin-top:15px;padding:10px;width:80%;font-size:16px;text-align:center;font-family:inherit;';
                msg.appendChild(inp); msg.appendChild(document.createElement('br'));
                
                var err = document.createElement('div'); 
                err.style.color = "red"; err.style.marginTop = "10px"; 
                msg.appendChild(err);
                
                var btn = document.createElement('button'); 
                btn.innerHTML = "[ VALIDER ]"; 
                btn.style.cssText = 'margin-top:15px;cursor:pointer;padding:10px 20px;background:${popBtnBg};color:${popBtnCol};font-family:inherit;border:none;border-radius:5px;font-size:16px;';
                btn.onclick = function() {
                    if(inp.value.toLowerCase().trim() === args.pwd) { 
                        document.body.removeChild(pwdBackdrop); 
                        unlockedHotspots[args.id] = true; 
                        executeReward(args, hsDiv); 
                    } else { 
                        err.innerHTML = "RÉPONSE INCORRECTE"; 
                        inp.value = ""; 
                        inp.focus(); 
                    }
                };
                msg.appendChild(btn); 
                
                var cls = document.createElement('button'); 
                cls.innerHTML = "X"; 
                cls.setAttribute('aria-label','Fermer');
                cls.style.cssText = 'position:absolute;top:8px;right:8px;background:transparent;border:none;color:inherit;cursor:pointer;font-size:20px;line-height:1;';
                cls.onclick = function() { document.body.removeChild(pwdBackdrop); }; 
                
                msg.appendChild(cls); 
                pwdBackdrop.appendChild(msg);
                document.body.appendChild(pwdBackdrop); 
                setTimeout(function(){ inp.focus(); }, 100);
            }
        };
    }
    
    // Met à jour la liste des objets dans le menu HTML
    function majInventaireUI() {
        var ul = document.getElementById('inv-list'); 
        ul.innerHTML = ""; 
        var c = 0;
        for(var k in inventaire) { 
            ul.innerHTML += "<li style='margin-bottom:5px;'>• " + inventaire[k].name + "</li>"; 
            c++; 
        }
        if(c === 0) ul.innerHTML = '<li style="color:gray; font-style:italic;">Vide</li>';
    }
    
    // Boîte de dialogue — même « chrome » visuel que le selector (overlay + panneau arrondi)
    function afficherPopup(titre, texte, btnTxt = 'Fermer', onConfirm = null) {
        var backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        backdrop.onclick = function(e) { if(e.target === backdrop) document.body.removeChild(backdrop); };
        var msg = document.createElement('div');
        msg.style.cssText = 'background:${popBg};color:${popColor};font-family:${popFont};padding:24px;border-radius:8px;border:2px solid #888;max-width:420px;width:100%;max-height:85vh;overflow:auto;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;';
        msg.onclick = function(e){ e.stopPropagation(); };
        msg.innerHTML = (titre!=="" ? "<h3 style='margin-top:0;color:inherit;opacity:0.8;'>" + titre + "</h3>" : "") + texte + "<br>";
        
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

    // 5. Téléchargement du fichier généré
    const blob = new Blob([htmlTemplate], { type: "text/html;charset=utf-8" }); 
    const lien = document.createElement("a"); 
    lien.href = URL.createObjectURL(blob); 
    lien.download = "index.html"; 
    document.body.appendChild(lien); 
    lien.click(); 
    document.body.removeChild(lien);
}

// Au lancement de l'éditeur, on crée directement une première scène vide
window.onload = function() { 
    addScene();
	updatePreview();
};

