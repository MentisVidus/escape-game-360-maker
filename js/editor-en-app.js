// --- Global state ---
// Counters: unique numeric ids for scenes and hotspots
let sceneIdCounter = 0; 
let hsIdCounter = 0;

// 360° picker modal (pitch/yaw)
let currentPickerHsId = null; 
let pickerViewer = null; 
let tempPitch = 0; 
let tempYaw = 0;

// Full-scene preview Pannellum instance
let scenePreviewViewer = null;

function updateScenePreview() { /* reserved e.g. URL validation; .sc-img oninput calls this */ }

// --- UI helpers: collapse, reorder blocks ---
// Toggle visibility of a scene or hotspot body
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
// Move DOM node up among siblings
function moveUp(elemId) { 
    const el = document.getElementById(elemId); 
    if(el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling); 
}
// Move DOM node down among siblings
function moveDown(elemId) { 
    const el = document.getElementById(elemId); 
    if(el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el); 
}

// --- Add scene ---
// Inserts a new scene block into #scenes-container
function addScene(scIdVal = null, scImgVal = null, scTitleVal = "") {
    sceneIdCounter++; 
    const sId = sceneIdCounter;
    
    // Defaults when not provided (e.g. new scene or JSON load)
    if(!scIdVal) scIdVal = "scene_" + sId; 
    if(!scImgVal) scImgVal = "salle.jpg";
    
    const sceneHTML = `
    <div class="scene-block" id="scene_${sId}">
        <div class="scene-header">
            <div style="display:flex; align-items:center;">
                <button class="btn-icon" onclick="toggleCollapse('scene_body_${sId}', this)">▼</button>
                <h3 style="margin:0;">🎬 Scene ${sId}</h3>
                <input type="text" class="title-input sc-title" placeholder="Title / note (e.g. Kitchen)" value="${scTitleVal}">
            </div>
            <div>
                <button class="btn-icon" onclick="moveUp('scene_${sId}')" title="Move up">⬆️</button>
                <button class="btn-icon" onclick="moveDown('scene_${sId}')" title="Move down">⬇️</button>
                <button class="btn-icon" onclick="duplicateScene(${sId})" title="Duplicate entire scene">📑</button>
                <button class="btn-preview-scene" onclick="previewScene(${sId})">👁️ Test</button>
                <button class="btn-del" onclick="document.getElementById('scene_${sId}').remove()">X</button>
            </div>
        </div>
        <div id="scene_body_${sId}">
            <div class="row">
                <div class="col"><label>Short scene ID (e.g. kitchen):</label><input type="text" class="sc-id" value="${scIdVal}"></div>
                <div class="col"><label>360° image (e.g. room.jpg or http...):</label><input type="text" class="sc-img" value="${scImgVal}" oninput="updateScenePreview(this)"></div>
                <div class="col" style="flex: 1; min-width: 200px;"><label>🎵 Ambient audio (mp3 URL):</label><input type="text" class="sc-audio" placeholder="Optional"></div>
            </div>
            <h4>Hotspots</h4>
            <div id="hs-container-${sId}"></div>
            <button class="btn-add-hs" onclick="addHotspot(${sId})">+ Add hotspot</button>
        </div>
    </div>`;
    
    document.getElementById('scenes-container').insertAdjacentHTML('beforeend', sceneHTML); 
    return sId;
}

// --- Add hotspot to a scene ---
function addHotspot(sceneId, hsData = null) {
    hsIdCounter++; 
    const hId = hsIdCounter;
    
    // Hotspot defaults
    let pitch = 0, yaw = 0, type = 'msg', hsTitleVal = "";
    let customCss = "width: 120px; height: 250px; background: rgba(255,0,0,0.2); border-radius: 0px; cursor: pointer; display: flex; align-items: center; justify-content: center;";
    
    // No-code visual editor defaults
    let uiW = 120, uiH = 250, uiShape = "0px", uiBgc = "#ff0000", uiBga = "0.2", uiImg = "";
    let uiBrdStyle = "none", uiBrdW = 2, uiBrdC = "#ffffff";

    // If hsData is set (load / duplicate), override defaults
    if(hsData) { 
        pitch = hsData.pitch; yaw = hsData.yaw; customCss = hsData.customCss; type = hsData.type; 
        if(hsData.hsTitle) hsTitleVal = hsData.hsTitle;
        if(hsData.ui_w !== undefined) { 
            uiW = hsData.ui_w; uiH = hsData.ui_h; uiShape = hsData.ui_shape; uiBgc = hsData.ui_bgc; uiBga = hsData.ui_bga; uiImg = hsData.ui_img; 
            uiBrdStyle = hsData.ui_brd_style || "none"; uiBrdW = hsData.ui_brd_w || 2; uiBrdC = hsData.ui_brd_c || "#ffffff";
        }
    }

    // Build hotspot DOM template
    const hsHTML = `
    <div class="hotspot-block" id="hs_${hId}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; background:#e8f8f5; padding:8px; border-radius:5px;">
            <div style="display:flex; align-items:center;">
                <button class="btn-icon" onclick="toggleCollapse('hs_body_${hId}', this)">▼</button>
                <b>Hotspot ${hId}</b>
                <input type="text" class="title-input hs-title" placeholder="Note (e.g. Blue door)" value="${hsTitleVal}">
            </div>
            <div>
                <button class="btn-icon" onclick="moveUp('hs_${hId}')" title="Move up">⬆️</button>
                <button class="btn-icon" onclick="moveDown('hs_${hId}')" title="Move down">⬇️</button>
                <button class="btn-icon" onclick="duplicateHotspot(${sceneId}, ${hId})" title="Duplicate hotspot">📑</button>
                <button class="btn-del" onclick="document.getElementById('hs_${hId}').remove()">X</button>
            </div>
        </div>
        
        <div id="hs_body_${hId}">
            <button class="btn-target" onclick="openPicker(${sceneId}, ${hId})">📍 Pick on panorama (pitch / yaw)</button>
            
            <div class="row">
                <div class="col"><label>Pitch :</label><input type="number" step="0.1" class="hs-pitch" value="${pitch}"></div>
                <div class="col"><label>Yaw :</label><input type="number" step="0.1" class="hs-yaw" value="${yaw}"></div>
            </div>
            
            <!-- No-code CSS UI -->
            <div class="visual-css-editor" id="nocode_ui_${hId}">
                <b style="color:#2980b9;">🎨 Visual style editor:</b>
                <div class="row">
                    <div class="col"><label>Width:</label><input type="number" class="ui-w" value="${uiW}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Height:</label><input type="number" class="ui-h" value="${uiH}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Shape:</label><select class="ui-shape" onchange="buildCss(${hId})"><option value="0px" ${uiShape==='0px'?'selected':''}>Square / rectangle</option><option value="50%" ${uiShape==='50%'?'selected':''}>Round</option></select></div>
                </div>
                <div class="row">
                    <div class="col"><label>Fill color:</label><input type="color" class="ui-bgc" value="${uiBgc}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Opacity (0–1):</label><input type="range" class="ui-bga" min="0" max="1" step="0.1" value="${uiBga}" oninput="buildCss(${hId})"></div>
                </div>
                <div class="row">
                    <div class="col"><label>Border style:</label><select class="ui-brd-style" onchange="buildCss(${hId})"><option value="none" ${uiBrdStyle==='none'?'selected':''}>None</option><option value="solid" ${uiBrdStyle==='solid'?'selected':''}>Solid</option><option value="dashed" ${uiBrdStyle==='dashed'?'selected':''}>Dashed</option></select></div>
                    <div class="col"><label>Border width:</label><input type="number" class="ui-brd-w" value="${uiBrdW}" oninput="buildCss(${hId})"></div>
                    <div class="col"><label>Border color:</label><input type="color" class="ui-brd-c" value="${uiBrdC}" oninput="buildCss(${hId})"></div>
                </div>
                <div class="row">
                    <div class="col"><label>Image URL (optional):</label><input type="text" class="ui-img" value="${uiImg}" placeholder="e.g. icon.png" oninput="buildCss(${hId})"></div>
                </div>
            </div>

            <!-- Expert CSS textarea -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:15px;">
                <label>Generated CSS:</label>
                <button class="btn-icon" style="background:#7f8c8d; margin-bottom:5px;" onclick="toggleExpertMode(${hId})">🧑‍💻 Expert mode (free CSS)</button>
            </div>
            <textarea class="css-editor hs-custom-css" id="css_text_${hId}" rows="2" readonly>${customCss}</textarea>
            
            <!-- Hotspot action type -->
            <label style="margin-top:10px;">On click:</label>
            <select class="hs-type" onchange="updateHsFields(${hId})">
                <option value="msg">Show message</option>
                <option value="pick">Pick up item</option>
                <option value="req">Required item</option>
                <option value="pwd">Puzzle / passcode</option>
                <option value="scene">Go to scene</option>
                <option value="selector">Choice menu (selector)</option>
            </select>
            <!-- Dynamic fields for selected action type -->
            <div class="dynamic-fields" id="fields_${hId}"></div>
        </div>
    </div>`;
    
    // Append to this scene's hotspot list
    document.getElementById(`hs-container-${sceneId}`).insertAdjacentHTML('beforeend', hsHTML);
    
    const hsDiv = document.getElementById(`hs_${hId}`);
    hsDiv.querySelector('.hs-type').value = type;
    
    // Rebuild type-specific fields
    updateHsFields(hId); 

    // Restore field values when loading hsData from JSON
    if(hsData) {
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-choices'];
        fields.forEach(f => {
            let el = hsDiv.querySelector('.' + f);
            if(el && hsData[f.replace(/-/g, '_')] !== undefined) {
                el.value = hsData[f.replace(/-/g, '_')];
                if(f === 'f-pwd-action' || f === 'f-req-action') el.dispatchEvent(new Event('change')); // Show nested reward fields
            }
        });
        // Restore expert CSS mode if it was on
        if(hsData.expertMode) toggleExpertMode(hId, true); 
    }
}

// --- Duplicate / export hotspot data ---
// Serializes one hotspot for copy or JSON save
function extractHotspotData(hId) {
    const hsDiv = document.getElementById(`hs_${hId}`);
    let hs = { 
        hsTitle: hsDiv.querySelector('.hs-title').value, 
        pitch: hsDiv.querySelector('.hs-pitch').value, 
        yaw: hsDiv.querySelector('.hs-yaw').value, 
        customCss: hsDiv.querySelector('.hs-custom-css').value, 
        type: hsDiv.querySelector('.hs-type').value 
    };
    
    let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-choices', 'ui-w', 'ui-h', 'ui-shape', 'ui-bgc', 'ui-bga', 'ui-brd-style', 'ui-brd-w', 'ui-brd-c', 'ui-img'];
    fields.forEach(f => { 
        let el = hsDiv.querySelector('.' + f); 
        if(el) hs[f.replace(/-/g, '_')] = el.value; 
    });
    
    // Expert mode = textarea not readonly
    if(!hsDiv.querySelector('.hs-custom-css').hasAttribute("readonly")) hs.expertMode = true;
    return hs;
}

// Prompt for target scene, then duplicate hotspot there
function duplicateHotspot(currentSId, hId) {
    let sceneList = ""; 
    let mapIds = [];
    
    // Numbered scene list for the prompt
    document.querySelectorAll('.scene-block').forEach((sDiv, idx) => {
        let sid = sDiv.id.split('_')[1];
        let title = sDiv.querySelector('.sc-title').value || sDiv.querySelector('.sc-id').value || "Scene " + sid;
        sceneList += `${idx + 1} : ${title}\n`;
        mapIds.push(sid);
    });
    
    let dest = prompt(`Copy this hotspot to which scene?\n(Leave empty to use the current scene)\n\nScenes:\n${sceneList}`, "");
    let targetSId = currentSId;
    
    if(dest !== null && dest.trim() !== "") {
        let idx = parseInt(dest) - 1;
        if(idx >= 0 && idx < mapIds.length) targetSId = mapIds[idx];
        else alert("Invalid number. Copied to the current scene.");
    } else if (dest === null) return; // User cancelled prompt
    
    // Create duplicate
    addHotspot(targetSId, extractHotspotData(hId));
}

// Duplicate scene and all its hotspots (incl. ambient audio URL)
function duplicateScene(sId) {
    const sDiv = document.getElementById(`scene_${sId}`);
    
    // New scene block
    const newSId = addScene(
        sDiv.querySelector('.sc-id').value + "_copy", 
        sDiv.querySelector('.sc-img').value, 
        sDiv.querySelector('.sc-title').value + " (Copy)"
    );
    
    const newScDiv = document.getElementById('scene_' + newSId);
    if (newScDiv && newScDiv.querySelector('.sc-audio') && sDiv.querySelector('.sc-audio')) {
        newScDiv.querySelector('.sc-audio').value = sDiv.querySelector('.sc-audio').value;
    }

    // Clone each hotspot
    sDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
        addHotspot(newSId, extractHotspotData(hsDiv.id.split('_')[1]));
    });
}

// --- CSS helpers (no-code + expert) ---
// Hex + alpha → rgba(...) for inline CSS
function hexToRgba(hex, alpha) { 
    let r = parseInt(hex.slice(1, 3), 16), 
        g = parseInt(hex.slice(3, 5), 16), 
        b = parseInt(hex.slice(5, 7), 16); 
    return `rgba(${r}, ${g}, ${b}, ${alpha})`; 
}

// Build hotspot CSS string from visual controls
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
    
    // Assemble declaration
    let css = `width: ${w}px; height: ${h}px; background: ${hexToRgba(bgc, bga)}; border-radius: ${shape}; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
    if (brdStyle !== 'none') css += ` border: ${brdW}px ${brdStyle} ${brdC};`;
    if (img !== "") css += ` background-image: url('${img}'); background-size: contain; background-repeat: no-repeat; background-position: center;`;
    
    // Write into expert / generated textarea
    hsDiv.querySelector('.hs-custom-css').value = css;
}

// Toggle between visual CSS editor and freeform textarea
function toggleExpertMode(hId, forceExpert = false) {
    const textArea = document.getElementById(`css_text_${hId}`); 
    const noCodeUi = document.getElementById(`nocode_ui_${hId}`); 
    const btn = document.querySelector(`#hs_${hId} button[onclick="toggleExpertMode(${hId})"]`);
    
    if (textArea.hasAttribute("readonly") || forceExpert) {
        // Enable expert mode
        if(forceExpert || confirm("Warning: Expert mode disables the visual controls. Continue?")) {
            textArea.removeAttribute("readonly"); 
            textArea.style.border = "2px solid #e74c3c";
            noCodeUi.style.opacity = "0.3"; 
            noCodeUi.style.pointerEvents = "none"; // Disable sliders while editing raw CSS
            btn.innerHTML = "🔙 Back to visual mode (overwrites CSS)"; 
            btn.style.background = "#e74c3c";
        }
    } else {
        // Back to visual mode
        textArea.setAttribute("readonly", "readonly"); 
        textArea.style.border = "1px solid #ccc";
        noCodeUi.style.opacity = "1"; 
        noCodeUi.style.pointerEvents = "auto";
        btn.innerHTML = "🧑‍💻 Expert mode (free CSS)"; 
        btn.style.background = "#7f8c8d"; 
        buildCss(hId); // Overwrite textarea from sliders (discards manual CSS)
    }
}

// --- 360° picker & scene preview ---
// Open fullscreen picker; saves pitch/yaw into selected hotspot
function openPicker(sceneLocalId, hId) { 
    const scImg = document.querySelector(`#scene_${sceneLocalId} .sc-img`).value; 
    if(!scImg) return; 
    currentPickerHsId = hId; 
    document.getElementById('picker-modal').style.display = 'flex'; 
    let imgUrl = scImg; 
    // Prefix relative image paths for file:// / same-folder hosting
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) imgUrl = "./" + imgUrl; 
    
    if(pickerViewer) pickerViewer.destroy(); 
    pickerViewer = pannellum.viewer('picker-panorama', { "type": "equirectangular", "panorama": imgUrl, "autoLoad": true, "showControls": false }); 
    
    // Poll viewer pitch/yaw while modal is open
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

// Apply picked angles to hotspot fields
function validerCoordonnees() { 
    document.querySelector(`#hs_${currentPickerHsId} .hs-pitch`).value = tempPitch.toFixed(1); 
    document.querySelector(`#hs_${currentPickerHsId} .hs-yaw`).value = tempYaw.toFixed(1); 
    closePicker(); 
}
// Close picker and destroy viewer
function closePicker() { 
    document.getElementById('picker-modal').style.display = 'none'; 
    if(pickerViewer) { pickerViewer.destroy(); pickerViewer = null; } 
    currentPickerHsId = null; 
}

// Full-screen scene preview with hotspot outlines + labels
function previewScene(sceneLocalId) { 
    const scImg = document.querySelector(`#scene_${sceneLocalId} .sc-img`).value; 
    if(!scImg) { alert("Missing image!"); return; } 
    document.getElementById('scene-preview-modal').style.display = 'flex'; 
    
    let imgUrl = scImg; 
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) imgUrl = "./" + imgUrl; 
    
    let previewCSS = ""; 
    let hsArray = []; 
    
    // Build Pannellum hotSpots from editor fields
    document.querySelectorAll(`#scene_${sceneLocalId} .hotspot-block`).forEach((hsDiv, index) => { 
        const pitch = parseFloat(hsDiv.querySelector('.hs-pitch').value); 
        const yaw = parseFloat(hsDiv.querySelector('.hs-yaw').value); 
        const rawCss = hsDiv.querySelector('.hs-custom-css').value; 
        const hsIdText = hsDiv.querySelector('.hs-title').value || ("HS " + (index + 1)); 
        const hsClass = `prev-hs-${sceneLocalId}-${index}`; 
        
        // Red dashed outline so transparent hotspots stay visible
        previewCSS += `.${hsClass} { ${rawCss} outline: 3px dashed red !important; outline-offset: 2px; pointer-events: auto; display: flex; align-items: center; justify-content: center; }\n`;
        // ::after label from hotspot note / title
        previewCSS += `.${hsClass}::after { content: '${hsIdText}'; background: black; color: white; padding: 2px 5px; font-size: 12px; font-weight: bold; border-radius: 3px; }\n`; 
        
        hsArray.push({ pitch: pitch, yaw: yaw, cssClass: hsClass }); 
    }); 
    
    document.getElementById('live-preview-styles').innerHTML = previewCSS; 
    
    if(scenePreviewViewer) scenePreviewViewer.destroy(); 
    scenePreviewViewer = pannellum.viewer('scene-preview-panorama', { "type": "equirectangular", "panorama": imgUrl, "autoLoad": true, "hotSpots": hsArray }); 
}
// Close preview modal
function closeScenePreview() { 
    document.getElementById('scene-preview-modal').style.display = 'none'; 
    if(scenePreviewViewer) { scenePreviewViewer.destroy(); scenePreviewViewer = null; } 
}

// --- Dynamic hotspot form fields by action type ---
function updateHsFields(hId) {
    const type = document.querySelector(`#hs_${hId} .hs-type`).value; 
    const container = document.getElementById(`fields_${hId}`);
    
    // Replace #fields_${hId} inner HTML
    if(type === 'msg') {
        container.innerHTML = `<label>Text (HTML):</label><textarea class="f-txt" rows="3">Well done.</textarea>`;
    }
    else if(type === 'pick') {
        container.innerHTML = `<div class="row"><div class="col"><label>Item ID:</label><input type="text" class="f-item-id" value="key"></div><div class="col"><label>Name:</label><input type="text" class="f-item-name" value="Golden key"></div></div><label>Narration:</label><textarea class="f-pick-msg" rows="2">You find <b>a key</b>.</textarea>`;
    }
    else if(type === 'req') {
        container.innerHTML = `
        <label>Required item ID:</label><input type="text" class="f-item-id" value="key">
        <label style="color:red;">If missing:</label><textarea class="f-ko" rows="2">Locked.</textarea>
        <label style="margin-top:10px; color:#27ae60;"><b>If player has item:</b></label>
        <select class="f-req-action" onchange="document.getElementById('req_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Change scene</option><option value="msg">Show message</option><option value="pick">Give new item</option>
        </select>
        <div id="req_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#req_res_${hId} .s-scene, #req_res_${hId} .s-msg, #req_res_${hId} .s-pick { display: none; } #req_res_${hId}.res-scene .s-scene { display: block; } #req_res_${hId}.res-msg .s-msg { display: block; } #req_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Go to scene (ID):</label><input type="text" class="f-target" value="scene_2"><label>Transition text:</label><textarea class="f-trans-txt" rows="2"></textarea><label>Button:</label><input type="text" class="f-trans-btn" value="Enter"></div>
            <div class="s-msg"><label>Message:</label><textarea class="f-ok-msg" rows="2">Unlocked!</textarea></div>
            <div class="s-pick"><div class="row"><div class="col"><label>New item ID:</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>New name:</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Find message:</label><textarea class="f-pick-msg" rows="2">Found!</textarea></div>
        </div>`;
    }
    else if(type === 'scene') {
        container.innerHTML = `<label>Go to scene (ID):</label><input type="text" class="f-target" value="scene_2"><label style="color:#2980b9;">Transition text:</label><textarea class="f-trans-txt" rows="2"></textarea><label>Button:</label><input type="text" class="f-trans-btn" value="Continue">`;
    }
    else if(type === 'pwd') {
        container.innerHTML = `
        <label>Puzzle / question (HTML):</label><textarea class="f-enigme-txt" rows="2">Code:</textarea>
        <label>Expected answer:</label><input type="text" class="f-pwd" value="1234">
        <label style="margin-top:10px;"><b>When solved:</b></label>
        <select class="f-pwd-action" onchange="document.getElementById('pwd_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Change scene</option><option value="msg">Show message</option><option value="pick">Give item</option>
        </select>
        <div id="pwd_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#pwd_res_${hId} .s-scene, #pwd_res_${hId} .s-msg, #pwd_res_${hId} .s-pick { display: none; } #pwd_res_${hId}.res-scene .s-scene { display: block; } #pwd_res_${hId}.res-msg .s-msg { display: block; } #pwd_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Go to scene (ID):</label><input type="text" class="f-target" value="scene_2"><label>Transition text:</label><textarea class="f-trans-txt" rows="2"></textarea><label>Button:</label><input type="text" class="f-trans-btn" value="Enter"></div>
            <div class="s-msg"><label>Message:</label><textarea class="f-ok-msg" rows="2">Unlocked!</textarea></div>
            <div class="s-pick"><div class="row"><div class="col"><label>Item ID:</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Name:</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Find message:</label><textarea class="f-pick-msg" rows="2">Found.</textarea></div>
        </div>`;
    }
    else if(type === 'selector') {
        container.innerHTML = `
        <label>Menu title:</label><input type="text" class="f-sel-title" value="Choose an action">
        <label>Introduction (HTML, optional):</label><textarea class="f-sel-intro" rows="2"></textarea>
        <label>Choices — JSON array:</label>
        <textarea class="f-sel-choices" rows="12" style="font-family:Consolas,monospace;font-size:12px;">[
  { "label": "Show message", "actionType": "msg", "txt": "&lt;p&gt;Hello!&lt;/p&gt;" },
  { "label": "Go elsewhere", "actionType": "scene", "target": "scene_2", "transTxt": "", "transBtn": "Continue" }
]</textarea>
        <small style="color:#555;">Allowed <code>actionType</code> (v1): <code>msg</code>, <code>scene</code>, <code>pick</code> — fields same as the matching hotspot type.</small>`;
    }
}

// --- Save / load project JSON ---
function saveProject() {
    // Collect editor state into one object
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
    
    // All scenes and nested hotspots
    document.querySelectorAll('.scene-block').forEach(sceneDiv => {
        let scene = { 
			scId: sceneDiv.querySelector('.sc-id').value,
			scImg: sceneDiv.querySelector('.sc-img').value,
			scTitle: sceneDiv.querySelector('.sc-title').value,
			scAudio: sceneDiv.querySelector('.sc-audio') ? sceneDiv.querySelector('.sc-audio').value : "",
			hotspots: [] 
        };
        // Hotspots for this scene
        sceneDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => { 
            scene.hotspots.push(extractHotspotData(hsDiv.id.split('_')[1])); 
        });
        project.scenes.push(scene);
    });
    
    // Trigger browser download
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const lien = document.createElement("a"); 
    lien.href = URL.createObjectURL(blob); 
    lien.download = "project.json";
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
            
            // Reset UI
            document.getElementById('scenes-container').innerHTML = ''; 
            sceneIdCounter = 0; 
            hsIdCounter = 0;
            
            // Game title
            document.getElementById('gameTitle').value = project.title || "My awesome game";
            
            // --- Inventory ---
            const useInv = project.useInv !== false;
            document.getElementById('useInventory').checked = useInv;
            // Show / hide inventory settings panel
            document.getElementById('inv-settings-container').style.display = useInv ? 'flex' : 'none';
            
            if(useInv) { 
                document.getElementById('inv-pos').value = project.invPos || "top-right"; 
                document.getElementById('inv-icon').value = project.invIcon || "🎒"; 
                document.getElementById('inv-bgc').value = project.invBgc || "#000000"; 
                document.getElementById('inv-bga').value = project.invBga !== undefined ? project.invBga : "0.8"; 
                document.getElementById('inv-color').value = project.invColor || "#ffffff"; 
            }
            
            // --- Dialog styling ---
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

            // Global background music
            const useAudio = project.useGlobalAudio || false;
            document.getElementById('useGlobalAudio').checked = useAudio;
            document.getElementById('audio-settings-container').style.display = useAudio ? 'flex' : 'none';
            document.getElementById('globalAudioUrl').value = project.globalAudioUrl || "";
            // Scenes + hotspots (+ per-scene ambient URL)
            project.scenes.forEach(scene => { 
                const sId = addScene(scene.scId, scene.scImg, scene.scTitle);
				
                // Scene ambient audio field
                var scDiv = document.getElementById('scene_' + sId);
                if (scDiv && scDiv.querySelector('.sc-audio')) {
                    scDiv.querySelector('.sc-audio').value = scene.scAudio || "";
                }
				
                scene.hotspots.forEach(hs => { addHotspot(sId, hs); }); 
            });
            
            // Refresh inventory / popup previews
            updatePreview();
            
        } catch (err) { alert("Invalid file!"); }
    };
    reader.readAsText(file); 
    event.target.value = ''; // Allow re-selecting same file
}

// --- Live preview widgets (inventory + dialogs) ---
function updatePreview() {
    // 1. Inventory card preview
    if(document.getElementById('useInventory').checked) {
        document.getElementById('preview-inv-container').style.display = 'inline-block';
		document.getElementById('preview-inv-disabled').style.display = 'none';
        
        const invBgc = document.getElementById('inv-bgc').value;
        const invBga = document.getElementById('inv-bga').value;
        const invColor = document.getElementById('inv-color').value;
        const invIcon = document.getElementById('inv-icon').value;
        
        // Hex → rgba for preview box (duplicate of hexToRgba logic)
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

    // 2. Dialog preview card
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
        popBtn.style.fontFamily = popFont;
    } else {
        // Defaults when custom dialogs are off
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
