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
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko'];
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
    
    let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'ui-w', 'ui-h', 'ui-shape', 'ui-bgc', 'ui-bga', 'ui-brd-style', 'ui-brd-w', 'ui-brd-c', 'ui-img'];
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
    
    // Reward branch after passcode / required item
    function executeReward(args, hsDiv) {
        if(args.action === 'scene') { 
            if(args.transTxt) { 
                afficherPopup("", args.transTxt, args.transBtn || "Continue", function(){ viewer.loadScene(args.target); }); 
            } else { 
                viewer.loadScene(args.target); 
            } 
        }
        else if(args.action === 'msg') { afficherPopup("", args.okMsg); }
        else if(args.action === 'pick') { 
            inventaire[args.pickId] = { name: args.pickName }; 
            hsDiv.style.display = 'none'; 
            majInventaireUI(); 
            afficherPopup("", args.pickMsg); 
        }
    }
    
    // Hotspot factory: wires click → game logic
    function hotspotDispatcher(hsDiv, args) {
        hsDiv.onclick = function() {
            if(args.type === 'msg') { afficherPopup("", args.txt); } 
            else if(args.type === 'scene') { 
                if(args.transTxt) { afficherPopup("", args.transTxt, args.transBtn, function(){ viewer.loadScene(args.target); }); } 
                else { viewer.loadScene(args.target); } 
            }
            else if(args.type === 'pick') { 
                inventaire[args.itemId] = { name: args.itemName }; 
                hsDiv.style.display = 'none'; 
                majInventaireUI(); 
                afficherPopup("", args.txt); 
            }
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
