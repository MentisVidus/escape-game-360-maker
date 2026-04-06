// --- VARIABLES GLOBALES ---
// Compteurs pour donner un ID unique à chaque scène et hotspot ajouté
let sceneIdCounter = 0; 
let hsIdCounter = 0;

// Variables pour l'outil de pointage 360 (Picker)
let currentPickerHsId = null; 
let pickerViewer = null; 
let tempPitch = 0; 
let tempYaw = 0;

// Variable pour le lecteur de prévisualisation (Preview)
let scenePreviewViewer = null;

function updateScenePreview() { /* hook réservé (ex: validation URL) ; champ .sc-img l'appelle au oninput */ }

// --- FONCTIONS D'ERGONOMIE VISUELLE (Plier, Monter, Descendre) ---
// Masque ou affiche le contenu d'une scène ou d'un hotspot
function toggleCollapse(bodyId, btn) {
    const body = document.getElementById(bodyId);
    if(body.style.display === 'none') { 
        body.style.display = ''; 
        btn.innerHTML = '▼'; 
    } else { 
        body.style.display = 'none'; 
        btn.innerHTML = '▶'; 
    }
}
// Remonte un élément HTML juste au-dessus de son voisin précédent
function moveUp(elemId) { 
    const el = document.getElementById(elemId); 
    if(el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling); 
}
// Descend un élément HTML juste en dessous de son voisin suivant
function moveDown(elemId) { 
    const el = document.getElementById(elemId); 
    if(el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el); 
}

// --- FONCTION : AJOUTER UNE SCÈNE ---
// Crée le code HTML d'une nouvelle scène et l'injecte dans la page
function addScene(scIdVal = null, scImgVal = null, scTitleVal = "") {
    sceneIdCounter++; 
    const sId = sceneIdCounter;
    
    // Valeurs par défaut si elles ne sont pas fournies (ex: lors d'un chargement)
    if(!scIdVal) scIdVal = "scene_" + sId; 
    if(!scImgVal) scImgVal = "salle.jpg";
    
    const sceneHTML = `
    <div class="scene-block" id="scene_${sId}">
        <div class="scene-header">
            <div style="display:flex; align-items:center;">
                <button class="btn-icon" onclick="toggleCollapse('scene_body_${sId}', this)">▼</button>
                <h3 style="margin:0;">🎬 Scène ${sId}</h3>
                <input type="text" class="title-input sc-title" placeholder="Titre/Note (ex: Cuisine)" value="${scTitleVal}">
            </div>
            <div>
                <button class="btn-icon" onclick="moveUp('scene_${sId}')" title="Monter">⬆️</button>
                <button class="btn-icon" onclick="moveDown('scene_${sId}')" title="Descendre">⬇️</button>
                <button class="btn-icon" onclick="duplicateScene(${sId})" title="Dupliquer la scène entière">📑</button>
                <button class="btn-preview-scene" onclick="previewScene(${sId})">👁️ Tester</button>
                <button class="btn-del" onclick="document.getElementById('scene_${sId}').remove()">X</button>
            </div>
        </div>
        <div id="scene_body_${sId}">
            <div class="row">
                <div class="col"><label>ID court système (ex: cuisine) :</label><input type="text" class="sc-id" value="${scIdVal}"></div>
                <div class="col"><label>Image 360 (ex: salle.jpg ou http...) :</label><input type="text" class="sc-img" value="${scImgVal}" oninput="updateScenePreview(this)"></div>
                <div class="col" style="flex: 1; min-width: 200px;"><label>🎵 Audio d'ambiance (URL mp3) :</label><input type="text" class="sc-audio" placeholder="Optionnel"></div>
            </div>
            <h4>Points d'interaction</h4>
            <div id="hs-container-${sId}"></div>
            <button class="btn-add-hs" onclick="addHotspot(${sId})">+ Ajouter un point d'interaction</button>
        </div>
    </div>`;
    
    document.getElementById('scenes-container').insertAdjacentHTML('beforeend', sceneHTML); 
    return sId;
}

// --- FONCTION : AJOUTER UN HOTSPOT ---
// Ajoute un point d'interaction à une scène spécifique
function addHotspot(sceneId, hsData = null) {
    hsIdCounter++; 
    const hId = hsIdCounter;
    
    // Définition des valeurs par défaut du Hotspot
    let pitch = 0, yaw = 0, type = 'msg', hsTitleVal = "";
    let customCss = "width: 120px; height: 250px; background: rgba(255,0,0,0.2); border-radius: 0px; cursor: pointer; display: flex; align-items: center; justify-content: center;";
    
    // Valeurs par défaut pour l'interface No-Code (UI)
    let uiW = 120, uiH = 250, uiShape = "0px", uiBgc = "#ff0000", uiBga = "0.2", uiImg = "";
    let uiBrdStyle = "none", uiBrdW = 2, uiBrdC = "#ffffff";

    // Si des données sont fournies (ex: chargement JSON ou duplication), on écrase les valeurs par défaut
    if(hsData) { 
        pitch = hsData.pitch; yaw = hsData.yaw; customCss = hsData.customCss; type = hsData.type; 
        if(hsData.hsTitle) hsTitleVal = hsData.hsTitle;
        if(hsData.ui_w !== undefined) { 
            uiW = hsData.ui_w; uiH = hsData.ui_h; uiShape = hsData.ui_shape; uiBgc = hsData.ui_bgc; uiBga = hsData.ui_bga; uiImg = hsData.ui_img; 
            uiBrdStyle = hsData.ui_brd_style || "none"; uiBrdW = hsData.ui_brd_w || 2; uiBrdC = hsData.ui_brd_c || "#ffffff";
        }
    }

    // Création du bloc HTML du hotspot
    const hsHTML = `
    <div class="hotspot-block" id="hs_${hId}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; background:#e8f8f5; padding:8px; border-radius:5px;">
            <div style="display:flex; align-items:center;">
                <button class="btn-icon" onclick="toggleCollapse('hs_body_${hId}', this)">▼</button>
                <b>Hotspot ${hId}</b>
                <input type="text" class="title-input hs-title" placeholder="Note (ex: Porte Bleue)" value="${hsTitleVal}">
            </div>
            <div>
                <button class="btn-icon" onclick="moveUp('hs_${hId}')" title="Monter">⬆️</button>
                <button class="btn-icon" onclick="moveDown('hs_${hId}')" title="Descendre">⬇️</button>
                <button class="btn-icon" onclick="duplicateHotspot(${sceneId}, ${hId})" title="Dupliquer le hotspot">📑</button>
                <button class="btn-del" onclick="document.getElementById('hs_${hId}').remove()">X</button>
            </div>
        </div>
        
        <div id="hs_body_${hId}">
            <button class="btn-target" onclick="openPicker(${sceneId}, ${hId})">📍 Placer visuellement (Pitch / Yaw)</button>
            
            <div class="row">
                <div class="col"><label>Pitch :</label><input type="number" step="0.1" class="hs-pitch" value="${pitch}"></div>
                <div class="col"><label>Yaw :</label><input type="number" step="0.1" class="hs-yaw" value="${yaw}"></div>
            </div>
            
            <!-- Éditeur No-Code Visuel -->
            <div class="visual-css-editor" id="nocode_ui_${hId}">
                <b style="color:#2980b9;">🎨 Éditeur de style visuel :</b>
                <div class="row">
                    <div class="col"><label>Largeur:</label><input type="number" class="ui-w" value="${uiW}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Hauteur:</label><input type="number" class="ui-h" value="${uiH}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Forme:</label><select class="ui-shape" onchange="buildCss(${hId})"><option value="0px" ${uiShape==='0px'?'selected':''}>Carré/Rect</option><option value="50%" ${uiShape==='50%'?'selected':''}>Rond</option></select></div>
                </div>
                <div class="row">
                    <div class="col"><label>Couleur fond:</label><input type="color" class="ui-bgc" value="${uiBgc}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Transparence (0 à 1):</label><input type="range" class="ui-bga" min="0" max="1" step="0.1" value="${uiBga}" oninput="buildCss(${hId})"></div>
                </div>
                <div class="row">
                    <div class="col"><label>Style Bordure:</label><select class="ui-brd-style" onchange="buildCss(${hId})"><option value="none" ${uiBrdStyle==='none'?'selected':''}>Aucune</option><option value="solid" ${uiBrdStyle==='solid'?'selected':''}>Continue</option><option value="dashed" ${uiBrdStyle==='dashed'?'selected':''}>Pointillés</option></select></div>
                    <div class="col"><label>Épaisseur Bordure:</label><input type="number" class="ui-brd-w" value="${uiBrdW}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Couleur Bordure:</label><input type="color" class="ui-brd-c" value="${uiBrdC}" oninput="buildCss(${hId})"></div>
                </div>
                <div class="row">
                    <div class="col"><label>Image URL (optionnel):</label><input type="text" class="ui-img" value="${uiImg}" placeholder="ex: icone.png" oninput="buildCss(${hId})"></div>
                </div>
            </div>

            <!-- Éditeur de code CSS libre -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:15px;">
                <label>Code CSS généré :</label>
                <button class="btn-icon" style="background:#7f8c8d; margin-bottom:5px;" onclick="toggleExpertMode(${hId})">🧑‍💻 Mode Expert (CSS Libre)</button>
            </div>
            <textarea class="css-editor hs-custom-css" id="css_text_${hId}" rows="2" readonly>${customCss}</textarea>
            
            <!-- Type d'action du Hotspot -->
            <label style="margin-top:10px;">Action au clic :</label>
            <select class="hs-type" onchange="updateHsFields(${hId})">
                <option value="msg">Afficher message</option>
                <option value="pick">Ramasser objet</option>
                <option value="req">Objet requis</option>
                <option value="pwd">Énigme / Code</option>
                <option value="scene">Aller à une scène</option>
            </select>
            <!-- Conteneur qui affichera les champs spécifiques au type choisi -->
            <div class="dynamic-fields" id="fields_${hId}"></div>
        </div>
    </div>`;
    
    // Injection du Hotspot dans la bonne scène
    document.getElementById(`hs-container-${sceneId}`).insertAdjacentHTML('beforeend', hsHTML);
    
    const hsDiv = document.getElementById(`hs_${hId}`);
    hsDiv.querySelector('.hs-type').value = type;
    
    // Met à jour les champs dynamiques en fonction du type de hotspot
    updateHsFields(hId); 

    // Remplissage des champs dynamiques avec les données sauvegardées (si on charge un projet)
    if(hsData) {
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko'];
        fields.forEach(f => {
            let el = hsDiv.querySelector('.' + f);
            if(el && hsData[f.replace(/-/g, '_')] !== undefined) {
                el.value = hsData[f.replace(/-/g, '_')];
                if(f === 'f-pwd-action' || f === 'f-req-action') el.dispatchEvent(new Event('change')); // Force l'affichage des sous-champs
            }
        });
        // Restaure l'état du mode expert
        if(hsData.expertMode) toggleExpertMode(hId, true); 
    }
}

// --- FONCTIONS DE DUPLICATION ---
// Extrait toutes les données d'un hotspot existant pour pouvoir le copier
function extractHotspotData(hId) {
    const hsDiv = document.getElementById(`hs_${hId}`);
    let hs = { 
        hsTitle: hsDiv.querySelector('.hs-title').value, 
        pitch: hsDiv.querySelector('.hs-pitch').value, 
        yaw: hsDiv.querySelector('.hs-yaw').value, 
        customCss: hsDiv.querySelector('.hs-custom-css').value, 
        type: hsDiv.querySelector('.hs-type').value 
    };
    
    let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'ui-w', 'ui-h', 'ui-shape', 'ui-bgc', 'ui-bga', 'ui-brd-style', 'ui-brd-w', 'ui-brd-c', 'ui-img'];
    fields.forEach(f => { 
        let el = hsDiv.querySelector('.' + f); 
        if(el) hs[f.replace(/-/g, '_')] = el.value; 
    });
    
    // Mémorise si le joueur avait activé le mode expert pour ce hotspot
    if(!hsDiv.querySelector('.hs-custom-css').hasAttribute("readonly")) hs.expertMode = true;
    return hs;
}

// Demande à l'utilisateur où copier le hotspot, puis le duplique
function duplicateHotspot(currentSId, hId) {
    let sceneList = ""; 
    let mapIds = [];
    
    // Prépare la liste des scènes pour la boîte de dialogue
    document.querySelectorAll('.scene-block').forEach((sDiv, idx) => {
        let sid = sDiv.id.split('_')[1];
        let title = sDiv.querySelector('.sc-title').value || sDiv.querySelector('.sc-id').value || "Scène " + sid;
        sceneList += `${idx + 1} : ${title}\n`;
        mapIds.push(sid);
    });
    
    let dest = prompt(`Dans quelle scène copier ce hotspot ?\n(Laissez vide pour copier dans la scène actuelle)\n\nChoix possibles :\n${sceneList}`, "");
    let targetSId = currentSId;
    
    if(dest !== null && dest.trim() !== "") {
        let idx = parseInt(dest) - 1;
        if(idx >= 0 && idx < mapIds.length) targetSId = mapIds[idx];
        else alert("Numéro invalide. Copié dans la scène actuelle.");
    } else if (dest === null) return; // Si l'utilisateur clique sur Annuler
    
    // Crée le nouveau hotspot
    addHotspot(targetSId, extractHotspotData(hId));
}

// Duplique une scène entière, en copiant tous ses hotspots
function duplicateScene(sId) {
    const sDiv = document.getElementById(`scene_${sId}`);
    
    // Crée la nouvelle scène
    const newSId = addScene(
        sDiv.querySelector('.sc-id').value + "_copie", 
        sDiv.querySelector('.sc-img').value, 
        sDiv.querySelector('.sc-title').value + " (Copie)"
    );
    
    const newScDiv = document.getElementById('scene_' + newSId);
    if (newScDiv && newScDiv.querySelector('.sc-audio') && sDiv.querySelector('.sc-audio')) {
        newScDiv.querySelector('.sc-audio').value = sDiv.querySelector('.sc-audio').value;
    }

    // Copie chaque hotspot de l'ancienne scène dans la nouvelle
    sDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
        addHotspot(newSId, extractHotspotData(hsDiv.id.split('_')[1]));
    });
}

// --- FONCTIONS DE GÉNÉRATION CSS (No-Code et Expert) ---
// Convertit un code couleur Hexadécimal (ex:#ff0000) en code RGBA lisible en CSS avec transparence
function hexToRgba(hex, alpha) { 
    let r = parseInt(hex.slice(1, 3), 16), 
        g = parseInt(hex.slice(3, 5), 16), 
        b = parseInt(hex.slice(5, 7), 16); 
    return `rgba(${r}, ${g}, ${b}, ${alpha})`; 
}

// Récupère les valeurs des jauges de l'éditeur No-Code et fabrique la phrase de CSS
function buildCss(hId) {
    const hsDiv = document.querySelector(`#hs_${hId}`);
    
    let w = hsDiv.querySelector('.ui-w').value;
    let h = hsDiv.querySelector('.ui-h').value;
    let shape = hsDiv.querySelector('.ui-shape').value;
    let bgc = hsDiv.querySelector('.ui-bgc').value;
    let bga = hsDiv.querySelector('.ui-bga').value;
    let brdStyle = hsDiv.querySelector('.ui-brd-style').value;
    let brdW = hsDiv.querySelector('.ui-brd-w').value;
    let brdC = hsDiv.querySelector('.ui-brd-c').value;
    let img = hsDiv.querySelector('.ui-img').value;
    
    // Construction du texte CSS
    let css = `width: ${w}px; height: ${h}px; background: ${hexToRgba(bgc, bga)}; border-radius: ${shape}; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
    if (brdStyle !== 'none') css += ` border: ${brdW}px ${brdStyle} ${brdC};`;
    if (img !== "") css += ` background-image: url('${img}'); background-size: contain; background-repeat: no-repeat; background-position: center;`;
    
    // Injecte le texte dans la case de "Code CSS"
    hsDiv.querySelector('.hs-custom-css').value = css;
}

// Gère le passage entre le mode d'édition No-Code et le Mode Expert
function toggleExpertMode(hId, forceExpert = false) {
    const textArea = document.getElementById(`css_text_${hId}`); 
    const noCodeUi = document.getElementById(`nocode_ui_${hId}`); 
    const btn = document.querySelector(`#hs_${hId} button[onclick="toggleExpertMode(${hId})"]`);
    
    if (textArea.hasAttribute("readonly") || forceExpert) {
        // Activation du mode Expert
        if(forceExpert || confirm("Attention : Passer en mode Expert désactive les boutons visuels. Continuer ?")) {
            textArea.removeAttribute("readonly"); 
            textArea.style.border = "2px solid #e74c3c";
            noCodeUi.style.opacity = "0.3"; 
            noCodeUi.style.pointerEvents = "none"; // Bloque les clics sur les jauges
            btn.innerHTML = "🔙 Revenir au mode Visuel (Écrase le CSS)"; 
            btn.style.background = "#e74c3c";
        }
    } else {
        // Retour au mode Visuel
        textArea.setAttribute("readonly", "readonly"); 
        textArea.style.border = "1px solid #ccc";
        noCodeUi.style.opacity = "1"; 
        noCodeUi.style.pointerEvents = "auto";
        btn.innerHTML = "🧑‍💻 Mode Expert (CSS Libre)"; 
        btn.style.background = "#7f8c8d"; 
        buildCss(hId); // Force la regénération du CSS via les jauges pour écraser le code manuel
    }
}

// --- FONCTIONS DES OUTILS 360 (Picker et Preview) ---
// Ouvre la fenêtre pour viser un point précis (Pitch/Yaw)
function openPicker(sceneLocalId, hId) { 
    const scImg = document.querySelector(`#scene_${sceneLocalId} .sc-img`).value; 
    if(!scImg) return; 
    currentPickerHsId = hId; 
    document.getElementById('picker-modal').style.display = 'flex'; 
    let imgUrl = scImg; 
    // Ajuste le chemin si l'image est locale
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) imgUrl = "./" + imgUrl; 
    
    if(pickerViewer) pickerViewer.destroy(); 
    pickerViewer = pannellum.viewer('picker-panorama', { "type": "equirectangular", "panorama": imgUrl, "autoLoad": true, "showControls": false }); 
    
    // Met à jour les coordonnées en direct pendant qu'on bouge la souris
    pickerViewer.on('load', function() { 
        setInterval(function() { 
            if(pickerViewer && document.getElementById('picker-modal').style.display === 'flex') { 
                tempPitch = pickerViewer.getPitch(); 
                tempYaw = pickerViewer.getYaw(); 
                document.getElementById('live-pitch').innerText = tempPitch.toFixed(1); 
                document.getElementById('live-yaw').innerText = tempYaw.toFixed(1); 
            } 
        }, 100); 
    }); 
}

// Valide la visée et écrit les coordonnées dans l'éditeur
function validerCoordonnees() { 
    document.querySelector(`#hs_${currentPickerHsId} .hs-pitch`).value = tempPitch.toFixed(1); 
    document.querySelector(`#hs_${currentPickerHsId} .hs-yaw`).value = tempYaw.toFixed(1); 
    closePicker(); 
}
// Ferme l'outil de visée
function closePicker() { 
    document.getElementById('picker-modal').style.display = 'none'; 
    if(pickerViewer) { pickerViewer.destroy(); pickerViewer = null; } 
    currentPickerHsId = null; 
}

// Ouvre l'aperçu d'une scène complète avec tous ses hotspots
function previewScene(sceneLocalId) { 
    const scImg = document.querySelector(`#scene_${sceneLocalId} .sc-img`).value; 
    if(!scImg) { alert("Image manquante !"); return; } 
    document.getElementById('scene-preview-modal').style.display = 'flex'; 
    
    let imgUrl = scImg; 
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) imgUrl = "./" + imgUrl; 
    
    let previewCSS = ""; 
    let hsArray = []; 
    
    // Récupère chaque hotspot de la scène pour le recréer temporairement
    document.querySelectorAll(`#scene_${sceneLocalId} .hotspot-block`).forEach((hsDiv, index) => { 
        const pitch = parseFloat(hsDiv.querySelector('.hs-pitch').value); 
        const yaw = parseFloat(hsDiv.querySelector('.hs-yaw').value); 
        const rawCss = hsDiv.querySelector('.hs-custom-css').value; 
        const hsIdText = hsDiv.querySelector('.hs-title').value || ("HS " + (index + 1)); 
        const hsClass = `prev-hs-${sceneLocalId}-${index}`; 
        
        // Ajoute un cadre pointillé rouge pour forcer la visibilité des zones invisibles
        previewCSS += `.${hsClass} { ${rawCss} outline: 3px dashed red !important; outline-offset: 2px; pointer-events: auto; display: flex; align-items: center; justify-content: center; }\n`;
        // Ajoute l'étiquette avec le nom du hotspot
        previewCSS += `.${hsClass}::after { content: '${hsIdText}'; background: black; color: white; padding: 2px 5px; font-size: 12px; font-weight: bold; border-radius: 3px; }\n`; 
        
        hsArray.push({ pitch: pitch, yaw: yaw, cssClass: hsClass }); 
    }); 
    
    document.getElementById('live-preview-styles').innerHTML = previewCSS; 
    
    if(scenePreviewViewer) scenePreviewViewer.destroy(); 
    scenePreviewViewer = pannellum.viewer('scene-preview-panorama', { "type": "equirectangular", "panorama": imgUrl, "autoLoad": true, "hotSpots": hsArray }); 
}
// Ferme l'aperçu
function closeScenePreview() { 
    document.getElementById('scene-preview-modal').style.display = 'none'; 
    if(scenePreviewViewer) { scenePreviewViewer.destroy(); scenePreviewViewer = null; } 
}

// --- FONCTION : AFFICHER LES BONS CHAMPS SELON LE TYPE DE HOTSPOT ---
function updateHsFields(hId) {
    const type = document.querySelector(`#hs_${hId} .hs-type`).value; 
    const container = document.getElementById(`fields_${hId}`);
    
    // Selon le type sélectionné, on injecte un HTML différent pour le formulaire
    if(type === 'msg') {
        container.innerHTML = `<label>Texte (HTML) :</label><textarea class="f-txt" rows="3">Bravo.</textarea>`;
    }
    else if(type === 'pick') {
        container.innerHTML = `<div class="row"><div class="col"><label>ID objet :</label><input type="text" class="f-item-id" value="cle"></div><div class="col"><label>Nom :</label><input type="text" class="f-item-name" value="La clé dorée"></div></div><label>Texte narratif :</label><textarea class="f-pick-msg" rows="2">Vous trouvez <b>une clé</b>.</textarea>`;
    }
    else if(type === 'req') {
        container.innerHTML = `
        <label>ID objet requis :</label><input type="text" class="f-item-id" value="cle">
        <label style="color:red;">Si ABSENT (Erreur) :</label><textarea class="f-ko" rows="2">Verrouillé.</textarea>
        <label style="margin-top:10px; color:#27ae60;"><b>Si PRÉSENT (Récompense) :</b></label>
        <select class="f-req-action" onchange="document.getElementById('req_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Changer de scène</option><option value="msg">Afficher un message</option><option value="pick">Donner NOUVEL objet</option>
        </select>
        <div id="req_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#req_res_${hId} .s-scene, #req_res_${hId} .s-msg, #req_res_${hId} .s-pick { display: none; } #req_res_${hId}.res-scene .s-scene { display: block; } #req_res_${hId}.res-msg .s-msg { display: block; } #req_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Aller vers la scène (ID) :</label><input type="text" class="f-target" value="scene_2"><label>Texte transition :</label><textarea class="f-trans-txt" rows="2"></textarea><label>Bouton :</label><input type="text" class="f-trans-btn" value="Entrer"></div>
            <div class="s-msg"><label>Message :</label><textarea class="f-ok-msg" rows="2">Ouvert !</textarea></div>
            <div class="s-pick"><div class="row"><div class="col"><label>Nouvel ID objet :</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Nouveau Nom :</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Texte trouvaille :</label><textarea class="f-pick-msg" rows="2">Trouvé !</textarea></div>
        </div>`;
    }
    else if(type === 'scene') {
        container.innerHTML = `<label>Aller vers la scène (ID) :</label><input type="text" class="f-target" value="scene_2"><label style="color:#2980b9;">Texte Transition :</label><textarea class="f-trans-txt" rows="2"></textarea><label>Bouton :</label><input type="text" class="f-trans-btn" value="Continuer">`;
    }
    else if(type === 'pwd') {
        container.innerHTML = `
        <label>Énigme / Question (HTML) :</label><textarea class="f-enigme-txt" rows="2">Code :</textarea>
        <label>Réponse attendue :</label><input type="text" class="f-pwd" value="1234">
        <label style="margin-top:10px;"><b>Récompense quand résolu :</b></label>
        <select class="f-pwd-action" onchange="document.getElementById('pwd_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Changer de scène</option><option value="msg">Afficher un message</option><option value="pick">Donner un objet</option>
        </select>
        <div id="pwd_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#pwd_res_${hId} .s-scene, #pwd_res_${hId} .s-msg, #pwd_res_${hId} .s-pick { display: none; } #pwd_res_${hId}.res-scene .s-scene { display: block; } #pwd_res_${hId}.res-msg .s-msg { display: block; } #pwd_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Aller vers la scène (ID) :</label><input type="text" class="f-target" value="scene_2"><label>Texte transition :</label><textarea class="f-trans-txt" rows="2"></textarea><label>Bouton :</label><input type="text" class="f-trans-btn" value="Entrer"></div>
            <div class="s-msg"><label>Message :</label><textarea class="f-ok-msg" rows="2">Déverrouillé !</textarea></div>
            <div class="s-pick"><div class="row"><div class="col"><label>ID objet :</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Nom :</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Texte trouvaille :</label><textarea class="f-pick-msg" rows="2">Trouvé.</textarea></div>
        </div>`;
    }
}

// --- FONCTIONS DE SAUVEGARDE ET CHARGEMENT DU FICHIER .JSON ---
function saveProject() {
    // Crée un objet regroupant tous les paramètres
    let project = { 
        title: document.getElementById('gameTitle').value, 
        useInv: document.getElementById('useInventory').checked, 
        invPos: document.getElementById('inv-pos').value, 
        invIcon: document.getElementById('inv-icon').value, 
        invBgc: document.getElementById('inv-bgc').value, 
        invBga: document.getElementById('inv-bga').value, 
        invColor: document.getElementById('inv-color').value, 
        useCustomPopup: document.getElementById('useCustomPopup').checked,
        useGlobalAudio: document.getElementById('useGlobalAudio').checked,
        globalAudioUrl: document.getElementById('globalAudioUrl').value,
        popFont: document.getElementById('pop-font').value,
        popColor: document.getElementById('pop-color').value,
        popBgc: document.getElementById('pop-bgc').value,
        popBga: document.getElementById('pop-bga').value,
        popBtnBg: document.getElementById('pop-btn-bg').value,
        popBtnCol: document.getElementById('pop-btn-col').value,
        scenes: [] 
    };
    
    // Parcourt toutes les scènes créées
    document.querySelectorAll('.scene-block').forEach(sceneDiv => {
        let scene = { 
			scId: sceneDiv.querySelector('.sc-id').value,
			scImg: sceneDiv.querySelector('.sc-img').value,
			scTitle: sceneDiv.querySelector('.sc-title').value,
			scAudio: sceneDiv.querySelector('.sc-audio') ? sceneDiv.querySelector('.sc-audio').value : "",
			hotspots: [] 
        };
        // Parcourt et extrait les données de tous les hotspots de la scène
        sceneDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => { 
            scene.hotspots.push(extractHotspotData(hsDiv.id.split('_')[1])); 
        });
        project.scenes.push(scene);
    });
    
    // Lance le téléchargement du fichier JSON
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const lien = document.createElement("a"); 
    lien.href = URL.createObjectURL(blob); 
    lien.download = "projet.json";
    document.body.appendChild(lien); 
    lien.click(); 
    document.body.removeChild(lien);
}

function loadProject(event) {
    const file = event.target.files[0]; 
    if (!file) return; 
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const project = JSON.parse(e.target.result);
            
            // Nettoie l'interface actuelle
            document.getElementById('scenes-container').innerHTML = ''; 
            sceneIdCounter = 0; 
            hsIdCounter = 0;
            
            // Restaure le titre
            document.getElementById('gameTitle').value = project.title || "Mon Super Jeu";
            
            // --- RESTAURE L'INVENTAIRE ---
            const useInv = project.useInv !== false;
            document.getElementById('useInventory').checked = useInv;
            // On affiche ou on cache le bloc d'inventaire selon s'il est coché ou non
            document.getElementById('inv-settings-container').style.display = useInv ? 'flex' : 'none';
            
            if(useInv) { 
                document.getElementById('inv-pos').value = project.invPos || "top-right"; 
                document.getElementById('inv-icon').value = project.invIcon || "🎒"; 
                document.getElementById('inv-bgc').value = project.invBgc || "#000000"; 
                document.getElementById('inv-bga').value = project.invBga !== undefined ? project.invBga : "0.8"; 
                document.getElementById('inv-color').value = project.invColor || "#ffffff"; 
            }
            
            // --- RESTAURE LES POPUPS ---
            const usePopup = project.useCustomPopup || false;
            document.getElementById('useCustomPopup').checked = usePopup;
			document.getElementById('popup-settings-container').style.display = usePopup ? 'flex' : 'none';
            
            if(usePopup) {
                document.getElementById('pop-font').value = project.popFont || "Arial, sans-serif";
                document.getElementById('pop-color').value = project.popColor || "#ffffff";
                document.getElementById('pop-bgc').value = project.popBgc || "#000000";
                document.getElementById('pop-bga').value = project.popBga !== undefined ? project.popBga : "0.9";
                document.getElementById('pop-btn-bg').value = project.popBtnBg || "#27ae60";
                document.getElementById('pop-btn-col').value = project.popBtnCol || "#ffffff";
            }

            // Restauration de l'audio global (Nouveau)
            const useAudio = project.useGlobalAudio || false;
            document.getElementById('useGlobalAudio').checked = useAudio;
            document.getElementById('audio-settings-container').style.display = useAudio ? 'flex' : 'none';
            document.getElementById('globalAudioUrl').value = project.globalAudioUrl || "";
            // Restaure les scènes et les hotspots
            project.scenes.forEach(scene => { 
                const sId = addScene(scene.scId, scene.scImg, scene.scTitle);
				
                // NOUVEAU : Restaure l'audio de la scène fraîchement créée
                var scDiv = document.getElementById('scene_' + sId);
                if (scDiv && scDiv.querySelector('.sc-audio')) {
                    scDiv.querySelector('.sc-audio').value = scene.scAudio || "";
                }
				
                scene.hotspots.forEach(hs => { addHotspot(sId, hs); }); 
            });
            
            // === MISE À JOUR DE L'APERÇU VISUEL ===
            updatePreview();
            
        } catch (err) { alert("Fichier invalide !"); }
    };
    reader.readAsText(file); 
    event.target.value = ''; // Réinitialise l'input de fichier
}

// --- FONCTIONS DE MISE A JOUR D APERCU ---
function updatePreview() {
    // 1. Mise à jour de l'aperçu Inventaire
    if(document.getElementById('useInventory').checked) {
        document.getElementById('preview-inv-container').style.display = 'inline-block';
		document.getElementById('preview-inv-disabled').style.display = 'none';
        
        const invBgc = document.getElementById('inv-bgc').value;
        const invBga = document.getElementById('inv-bga').value;
        const invColor = document.getElementById('inv-color').value;
        const invIcon = document.getElementById('inv-icon').value;
        
        // Fonction utilitaire locale pour convertir Hex en Rgba
        const hex = invBgc.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        document.getElementById('preview-inv-container').style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${invBga})`;
        document.getElementById('preview-inv-container').style.color = invColor;
        document.getElementById('preview-inv-icon').innerText = invIcon;
    } else {
        document.getElementById('preview-inv-container').style.display = 'none';
		document.getElementById('preview-inv-disabled').style.display = 'block';
    }

    // 2. Mise à jour de l'aperçu Popup
    if(document.getElementById('useCustomPopup').checked) {
        const popFont = document.getElementById('pop-font').value;
        const popColor = document.getElementById('pop-color').value;
        const popBgc = document.getElementById('pop-bgc').value;
        const popBga = document.getElementById('pop-bga').value;
        const popBtnBg = document.getElementById('pop-btn-bg').value;
        const popBtnCol = document.getElementById('pop-btn-col').value;

        const hexPop = popBgc.replace('#', '');
        const rp = parseInt(hexPop.substring(0, 2), 16);
        const gp = parseInt(hexPop.substring(2, 4), 16);
        const bp = parseInt(hexPop.substring(4, 6), 16);

        const popContainer = document.getElementById('preview-pop-container');
        popContainer.style.backgroundColor = `rgba(${rp}, ${gp}, ${bp}, ${popBga})`;
        popContainer.style.color = popColor;
        popContainer.style.fontFamily = popFont;

        const popBtn = document.getElementById('preview-pop-btn');
        popBtn.style.backgroundColor = popBtnBg;
        popBtn.style.color = popBtnCol;
        popBtn.style.fontFamily = popFont; // Le bouton hérite de la police
    } else {
        // Style par défaut si personnalisé n'est pas coché
        const popContainer = document.getElementById('preview-pop-container');
        popContainer.style.backgroundColor = 'rgba(0,0,0,0.9)';
        popContainer.style.color = 'white';
        popContainer.style.fontFamily = 'sans-serif';

        const popBtn = document.getElementById('preview-pop-btn');
        popBtn.style.backgroundColor = '#27ae60';
        popBtn.style.color = 'white';
        popBtn.style.fontFamily = 'sans-serif';
    }
}
