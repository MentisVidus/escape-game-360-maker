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
            
            <div class="editor-collapse-section">
                <button type="button" class="editor-collapse-header" onclick="toggleCollapse('hs_appearance_body_${hId}', this)">▶ Hotspot appearance (clickable area)</button>
                <div id="hs_appearance_body_${hId}" style="display:none">
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
                </div>
            </div>
            
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
    
    // Rebuild type-specific fields (defer selector init when restoring from JSON so f_sel_choices is not overwritten)
    updateHsFields(hId, { deferSelectorInit: !!hsData }); 

    // Restore field values when loading hsData from JSON
    if(hsData) {
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-display', 'f-sel-choices'];
        fields.forEach(f => {
            let el = hsDiv.querySelector('.' + f);
            if(el && hsData[f.replace(/-/g, '_')] !== undefined) {
                el.value = hsData[f.replace(/-/g, '_')];
                if(f === 'f-pwd-action' || f === 'f-req-action') el.dispatchEvent(new Event('change')); // Show nested reward fields
            }
        });
        if(hsData.type === 'selector') {
            if(hsData.selJsonExpertMode) toggleSelectorJsonExpert(hId, true);
            else initSelectorChoicesForm(hId);
        }
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
    
    let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-display', 'f-sel-choices', 'ui-w', 'ui-h', 'ui-shape', 'ui-bgc', 'ui-bga', 'ui-brd-style', 'ui-brd-w', 'ui-brd-c', 'ui-img'];
    fields.forEach(f => { 
        let el = hsDiv.querySelector('.' + f); 
        if(el) hs[f.replace(/-/g, '_')] = el.value; 
    });
    
    // Expert mode = textarea not readonly
    if(!hsDiv.querySelector('.hs-custom-css').hasAttribute("readonly")) hs.expertMode = true;
    if(hs.type === 'selector') {
        var fc = hsDiv.querySelector('.f-sel-choices');
        if(fc && !fc.hasAttribute('readonly')) hs.selJsonExpertMode = true;
    }
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

// --- Selector: choice form + advanced JSON (readonly by default) ---
var SELECTOR_MAX_DEPTH = 3;

function getDefaultSelectorChoices() {
    return [
        { label: "Welcome message", actionType: "msg", txt: "<p>Text shown to the player.</p>" },
        { label: "Go elsewhere", actionType: "scene", target: "scene_2", transTxt: "", transBtn: "Continue" }
    ];
}

function getDefaultChoice() {
    return { label: "New choice", actionType: "msg", txt: "<p>Text</p>" };
}

function collectChoicesFromList(listEl) {
    if(!listEl) return [];
    var cards = Array.prototype.filter.call(listEl.children || [], function(el) {
        return el.classList && el.classList.contains("sel-choice-card");
    });
    return cards.map(function(c) { return cardToChoice(c); });
}

function getOwnChoiceField(card, selector) {
    var nodes = card.querySelectorAll(selector);
    for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].closest(".sel-choice-card") === card) return nodes[i];
    }
    return null;
}

function cardToChoice(card) {
    var typeEl = getOwnChoiceField(card, ".sel-action-type");
    var type = typeEl ? typeEl.value : "msg";
    var labelEl = getOwnChoiceField(card, ".sel-label");
    var label = ((labelEl && labelEl.value) || "").trim();
    var out = { label: label || "Option", actionType: type };
    if(type === "msg") {
        var t = getOwnChoiceField(card, ".sel-msg-txt");
        out.txt = t ? t.value : "";
    } else if(type === "scene") {
        var scTarget = getOwnChoiceField(card, ".sel-scene-target");
        var scTrans = getOwnChoiceField(card, ".sel-scene-trans");
        var scBtn = getOwnChoiceField(card, ".sel-scene-btn");
        out.target = scTarget ? scTarget.value : "";
        out.transTxt = scTrans ? scTrans.value : "";
        out.transBtn = scBtn ? scBtn.value : "";
    } else if(type === "pick") {
        var pkId = getOwnChoiceField(card, ".sel-pick-id");
        var pkName = getOwnChoiceField(card, ".sel-pick-name");
        var pkTxt = getOwnChoiceField(card, ".sel-pick-txt");
        out.itemId = pkId ? pkId.value : "";
        out.itemName = pkName ? pkName.value : "";
        out.txt = pkTxt ? pkTxt.value : "";
    } else if(type === "selector") {
        var nestedListEl = card.querySelector(".sel-action-fields .sel-nested-list");
        var nest = {
            title: (getOwnChoiceField(card, ".sel-nested-title") || { value: "" }).value,
            introHtml: (getOwnChoiceField(card, ".sel-nested-intro") || { value: "" }).value,
            choices: collectChoicesFromList(nestedListEl)
        };
        var dm = getOwnChoiceField(card, ".sel-nested-display");
        if(dm && dm.value === "dropdown") nest.displayMode = "dropdown";
        out.nested = nest;
    }
    var req = getOwnChoiceField(card, ".sel-opt-req");
    if(req && req.value.trim()) out.requiresItem = req.value.trim();
    var hid = getOwnChoiceField(card, ".sel-opt-hidden");
    if(hid && hid.value.trim()) out.hiddenIfHasItem = hid.value.trim();
    else if(type === "pick") delete out.hiddenIfHasItem;
    var sfx = getOwnChoiceField(card, ".sel-opt-sfx");
    if(sfx && sfx.value.trim()) out.sfxUrl = sfx.value.trim();
    var sfxv = getOwnChoiceField(card, ".sel-opt-sfxvol");
    if(sfxv && sfxv.value.trim() !== "") {
        var v = parseFloat(sfxv.value);
        if(!isNaN(v)) out.sfxVolume = v;
    }
    return out;
}

function syncSelectorChoicesToTextarea(hId) {
    var hsDiv = document.getElementById("hs_" + hId);
    if(!hsDiv) return;
    var ta = hsDiv.querySelector(".f-sel-choices");
    if(!ta || !ta.hasAttribute("readonly")) return;
    var root = document.getElementById("sel_choices_root_" + hId);
    if(!root) return;
    var arr = collectChoicesFromList(root);
    ta.value = JSON.stringify(arr, null, 2);
}

function attachSelectorChoicesListeners(hId) {
    var wrap = document.getElementById("fields_" + hId);
    if(!wrap) return;
    var root = wrap.querySelector(".sel-choices-root");
    if(!root) return;
    var sync = function() { syncSelectorChoicesToTextarea(hId); };
    root.removeEventListener("input", root._selSync);
    root.removeEventListener("change", root._selSync);
    root._selSync = sync;
    root.addEventListener("input", sync);
    root.addEventListener("change", sync);
}

function selectorMoveChoice(btn, dir) {
    var card = btn.closest(".sel-choice-card");
    if(!card) return;
    var list = card.parentElement;
    var hId = parseInt(card.closest(".hotspot-block").id.replace("hs_", ""), 10);
    if(dir < 0 && card.previousElementSibling) list.insertBefore(card, card.previousElementSibling);
    else if(dir > 0 && card.nextElementSibling) list.insertBefore(card.nextElementSibling, card);
    syncSelectorChoicesToTextarea(hId);
}

function selectorRemoveChoice(btn) {
    var card = btn.closest(".sel-choice-card");
    if(!card) return;
    var hId = parseInt(card.closest(".hotspot-block").id.replace("hs_", ""), 10);
    card.remove();
    syncSelectorChoicesToTextarea(hId);
}

function selectorAddChoice(hId) {
    var root = document.getElementById("sel_choices_root_" + hId);
    if(!root) return;
    root.appendChild(renderChoiceCardElement(getDefaultChoice(), hId, 0));
    syncSelectorChoicesToTextarea(hId);
}

function selectorAddNestedChoice(btn) {
    var list = btn.previousElementSibling;
    var card = btn.closest(".sel-choice-card");
    if(!list || !list.classList.contains("sel-nested-list") || !card) return;
    var hId = parseInt(card.closest(".hotspot-block").id.replace("hs_", ""), 10);
    var depth = parseInt(card.dataset.depth || "0", 10);
    if(depth + 1 >= SELECTOR_MAX_DEPTH) {
        alert("Maximum sub-menu depth reached (" + SELECTOR_MAX_DEPTH + " levels).");
        return;
    }
    list.appendChild(renderChoiceCardElement(getDefaultChoice(), hId, depth + 1));
    syncSelectorChoicesToTextarea(hId);
}

function selectorRebuildActionFields(card, ch, hsHotspotId) {
    ch = ch || {};
    var type = card.querySelector(".sel-action-type").value;
    var container = card.querySelector(".sel-action-fields");
    var depth = parseInt(card.dataset.depth || "0", 10);
    if(!container) return;
    var hsIdNum = hsHotspotId;
    if(hsIdNum == null || isNaN(hsIdNum)) {
        var hb = card.closest(".hotspot-block");
        hsIdNum = hb ? parseInt(hb.id.replace("hs_", ""), 10) : NaN;
    }
    container.innerHTML = "";

    if(type === "msg") {
        var l1 = document.createElement("label");
        l1.textContent = "Message content (HTML):";
        var ta = document.createElement("textarea");
        ta.className = "sel-msg-txt";
        ta.rows = 3;
        ta.value = ch.txt || "";
        container.appendChild(l1);
        container.appendChild(ta);
    } else if(type === "scene") {
        var r1 = document.createElement("div");
        r1.className = "row";
        r1.innerHTML = "<div class=\"col\"><label>Target scene ID:</label><input type=\"text\" class=\"sel-scene-target\" value=\"\"></div>";
        container.appendChild(r1);
        r1.querySelector(".sel-scene-target").value = ch.target || "";
        var l2 = document.createElement("label");
        l2.textContent = "Transition text:";
        var t2 = document.createElement("textarea");
        t2.className = "sel-scene-trans";
        t2.rows = 2;
        t2.value = ch.transTxt || "";
        var l3 = document.createElement("label");
        l3.textContent = "Button label:";
        var i3 = document.createElement("input");
        i3.type = "text";
        i3.className = "sel-scene-btn";
        i3.value = ch.transBtn || "Continue";
        container.appendChild(l2);
        container.appendChild(t2);
        container.appendChild(l3);
        container.appendChild(i3);
    } else if(type === "pick") {
        var rp = document.createElement("div");
        rp.className = "row";
        rp.innerHTML = "<div class=\"col\"><label>Item ID:</label><input type=\"text\" class=\"sel-pick-id\" value=\"\"></div><div class=\"col\"><label>Display name:</label><input type=\"text\" class=\"sel-pick-name\" value=\"\"></div>";
        container.appendChild(rp);
        rp.querySelector(".sel-pick-id").value = ch.itemId || "";
        rp.querySelector(".sel-pick-name").value = ch.itemName || "";
        var lp = document.createElement("label");
        lp.textContent = "Pickup message (HTML):";
        var tp = document.createElement("textarea");
        tp.className = "sel-pick-txt";
        tp.rows = 2;
        tp.value = ch.txt || "";
        container.appendChild(lp);
        container.appendChild(tp);
        var advHidden = getOwnChoiceField(card, ".sel-opt-hidden");
        var pickIdInput = rp.querySelector(".sel-pick-id");
        if(advHidden) {
            if((advHidden.value || "").trim() === "" && (pickIdInput.value || "").trim() !== "") {
                advHidden.value = pickIdInput.value.trim();
                advHidden.dataset.autoFilled = "1";
            }
            advHidden.addEventListener("input", function() { advHidden.dataset.autoFilled = "0"; });
        }
        pickIdInput.addEventListener("input", function() {
            if(advHidden && (advHidden.dataset.autoFilled === "1" || (advHidden.value || "").trim() === "")) {
                advHidden.value = pickIdInput.value.trim();
                advHidden.dataset.autoFilled = "1";
            }
        });
    } else if(type === "selector") {
        if(isNaN(hsIdNum)) return;
        var nest = ch.nested || {};
        var nb = document.createElement("div");
        nb.className = "sel-nested-block";
        var lt = document.createElement("label");
        lt.textContent = "Sub-menu title:";
        var it = document.createElement("input");
        it.type = "text";
        it.className = "sel-nested-title";
        it.value = nest.title || "";
        var li = document.createElement("label");
        li.textContent = "Introduction (HTML, optional):";
        var ti = document.createElement("textarea");
        ti.className = "sel-nested-intro";
        ti.rows = 2;
        ti.value = nest.introHtml || "";
        var ld = document.createElement("label");
        ld.textContent = "Sub-choices layout:";
        var sd = document.createElement("select");
        sd.className = "sel-nested-display";
        sd.innerHTML = "<option value=\"buttons\">Buttons</option><option value=\"dropdown\">Dropdown + OK</option>";
        if(nest.displayMode === "dropdown") sd.value = "dropdown";
        nb.appendChild(lt);
        nb.appendChild(it);
        nb.appendChild(li);
        nb.appendChild(ti);
        nb.appendChild(ld);
        nb.appendChild(sd);
        var nestedList = document.createElement("div");
        nestedList.className = "sel-choices-list sel-nested-list";
        var arr = Array.isArray(nest.choices) && nest.choices.length ? nest.choices : [getDefaultChoice()];
        arr.forEach(function(nch) { nestedList.appendChild(renderChoiceCardElement(nch, hsIdNum, depth + 1)); });
        var btnAdd = document.createElement("button");
        btnAdd.type = "button";
        btnAdd.className = "btn-add-hs";
        btnAdd.textContent = "+ Add sub-choice";
        btnAdd.onclick = function() { selectorAddNestedChoice(btnAdd); };
        nb.appendChild(nestedList);
        nb.appendChild(btnAdd);
        container.appendChild(nb);
    }
}

function renderChoiceCardElement(ch, hId, depth) {
    ch = ch || getDefaultChoice();
    var at = ch.actionType || "msg";
    if(depth >= SELECTOR_MAX_DEPTH && at === "selector") at = "msg";

    var card = document.createElement("div");
    card.className = "sel-choice-card";
    card.dataset.depth = String(depth);

    var tb = document.createElement("div");
    tb.className = "sel-choice-toolbar";
    var h = document.createElement("span");
    h.className = "sel-choice-heading";
    h.textContent = "Choice";
    var bUp = document.createElement("button");
    bUp.type = "button";
    bUp.className = "btn-icon";
    bUp.title = "Move up";
    bUp.textContent = "↑";
    bUp.onclick = function() { selectorMoveChoice(bUp, -1); };
    var bDn = document.createElement("button");
    bDn.type = "button";
    bDn.className = "btn-icon";
    bDn.title = "Move down";
    bDn.textContent = "↓";
    bDn.onclick = function() { selectorMoveChoice(bDn, 1); };
    var bRm = document.createElement("button");
    bRm.type = "button";
    bRm.className = "btn-del";
    bRm.title = "Remove this choice";
    bRm.textContent = "×";
    bRm.onclick = function() { selectorRemoveChoice(bRm); };
    tb.appendChild(h);
    tb.appendChild(bUp);
    tb.appendChild(bDn);
    tb.appendChild(bRm);

    var lblL = document.createElement("label");
    lblL.textContent = "Label (button or line):";
    var inpL = document.createElement("input");
    inpL.type = "text";
    inpL.className = "sel-label";
    inpL.value = ch.label || "";

    var lblA = document.createElement("label");
    lblA.textContent = "Action:";
    var selA = document.createElement("select");
    selA.className = "sel-action-type";
    var opts = depth >= SELECTOR_MAX_DEPTH - 1
        ? [
            ["msg", "Show message"],
            ["scene", "Go to another scene"],
            ["pick", "Pick up an item"]
          ]
        : [
            ["msg", "Show message"],
            ["scene", "Go to another scene"],
            ["pick", "Pick up an item"],
            ["selector", "Sub-menu (nested)"]
          ];
    opts.forEach(function(o) {
        var oel = document.createElement("option");
        oel.value = o[0];
        oel.textContent = o[1];
        if(at === o[0]) oel.selected = true;
        selA.appendChild(oel);
    });
    if(!at || !opts.some(function(o) { return o[0] === at; })) selA.value = "msg";

    selA.onchange = function() {
        selectorRebuildActionFields(card, {}, hId);
        syncSelectorChoicesToTextarea(hId);
    };

    var fields = document.createElement("div");
    fields.className = "sel-action-fields";

    card.appendChild(tb);
    card.appendChild(lblL);
    card.appendChild(inpL);
    card.appendChild(lblA);
    card.appendChild(selA);
    card.appendChild(fields);

    var det = document.createElement("details");
    det.className = "sel-opt-advanced";
    var sum = document.createElement("summary");
    sum.textContent = "Advanced options (inventory, sound)";
    det.appendChild(sum);
    var lr = document.createElement("label");
    lr.textContent = "Show only if player has item (ID):";
    var ir = document.createElement("input");
    ir.type = "text";
    ir.className = "sel-opt-req";
    ir.placeholder = "optional";
    ir.value = ch.requiresItem || "";
    var lh = document.createElement("label");
    lh.textContent = "Hide if player already has item (ID):";
    var ih = document.createElement("input");
    ih.type = "text";
    ih.className = "sel-opt-hidden";
    ih.placeholder = "optional";
    ih.value = ch.hiddenIfHasItem || "";
    var ls = document.createElement("label");
    ls.textContent = "Click sound (URL):";
    var is = document.createElement("input");
    is.type = "text";
    is.className = "sel-opt-sfx";
    is.placeholder = "optional";
    is.value = ch.sfxUrl || "";
    var lsv = document.createElement("label");
    lsv.textContent = "Sound volume (0–1):";
    var isv = document.createElement("input");
    isv.type = "number";
    isv.className = "sel-opt-sfxvol";
    isv.min = "0";
    isv.max = "1";
    isv.step = "0.1";
    isv.value = ch.sfxVolume !== undefined && ch.sfxVolume !== null ? String(ch.sfxVolume) : "";
    det.appendChild(lr);
    det.appendChild(ir);
    det.appendChild(lh);
    det.appendChild(ih);
    det.appendChild(ls);
    det.appendChild(is);
    det.appendChild(lsv);
    det.appendChild(isv);
    card.appendChild(det);

    ch.actionType = selA.value;
    selectorRebuildActionFields(card, ch, hId);
    return card;
}

function initSelectorChoicesForm(hId) {
    var hsDiv = document.getElementById("hs_" + hId);
    var ta = hsDiv.querySelector(".f-sel-choices");
    var root = document.getElementById("sel_choices_root_" + hId);
    if(!ta || !root) return;
    var arr;
    try { arr = JSON.parse(ta.value.trim()); } catch(e) {
        console.warn("f_sel_choices invalid JSON:", e);
        arr = getDefaultSelectorChoices();
    }
    if(!Array.isArray(arr)) arr = getDefaultSelectorChoices();
    root.innerHTML = "";
    arr.forEach(function(ch) { root.appendChild(renderChoiceCardElement(ch, hId, 0)); });
    attachSelectorChoicesListeners(hId);
    syncSelectorChoicesToTextarea(hId);
}

function toggleSelectorJsonExpert(hId, forceExpert) {
    if(forceExpert === undefined) forceExpert = false;
    var ta = document.querySelector("#hs_" + hId + " .f-sel-choices");
    var formUi = document.getElementById("selector_form_ui_" + hId);
    var btn = document.querySelector("#hs_" + hId + " .btn-sel-json-expert");
    if(!ta || !formUi) return;
    if(ta.hasAttribute("readonly") || forceExpert) {
        if(forceExpert || confirm("Warning: JSON expert mode disables the form so you can edit the JSON by hand. Continue?")) {
            ta.removeAttribute("readonly");
            ta.style.border = "2px solid #e74c3c";
            formUi.style.opacity = "0.35";
            formUi.style.pointerEvents = "none";
            if(btn) {
                btn.innerHTML = "🔙 Back to form (apply JSON)";
                btn.style.background = "#e74c3c";
            }
        }
    } else {
        try { JSON.parse(ta.value.trim()); } catch(e) { alert("Invalid JSON: " + e.message); return; }
        ta.setAttribute("readonly", "readonly");
        ta.style.border = "";
        formUi.style.opacity = "1";
        formUi.style.pointerEvents = "auto";
        if(btn) {
            btn.innerHTML = "🧑‍💻 JSON expert mode";
            btn.style.background = "#7f8c8d";
        }
        initSelectorChoicesForm(hId);
    }
}

// --- Dynamic hotspot form fields by action type ---
function updateHsFields(hId, opts) {
    opts = opts || {};
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
        var defaultSelJson = JSON.stringify(getDefaultSelectorChoices(), null, 2);
        container.innerHTML = `
        <label>Menu title:</label><input type="text" class="f-sel-title" value="Choose an action">
        <label>Introduction (HTML, optional):</label><textarea class="f-sel-intro" rows="2"></textarea>
        <label>Choice layout:</label>
        <select class="f-sel-display">
            <option value="buttons" selected>Buttons</option>
            <option value="dropdown">Dropdown + OK</option>
        </select>
        <p style="margin:12px 0 6px 0;color:#2c3e50;"><b>Choices for the player</b> — add or reorder lines; each line can show a message, change scene, pick an item, or open a sub-menu.</p>
        <div id="selector_form_ui_${hId}" class="selector-form-wrap">
            <div id="sel_choices_root_${hId}" class="sel-choices-list sel-choices-root"></div>
            <button type="button" class="btn-add-hs" onclick="selectorAddChoice(${hId})">+ Add choice</button>
        </div>
        <div class="editor-collapse-section">
            <button type="button" class="editor-collapse-header" onclick="toggleCollapse('sel_json_wrap_${hId}', this)">▶ Advanced JSON (technical reference)</button>
            <div id="sel_json_wrap_${hId}" style="display:none">
                <p class="selector-json-hint">The game reads this JSON array. Usually the form above is enough; open this section to <b>view</b> or <b>copy</b> the structure. Expert mode unlocks hand-editing (like free CSS).</p>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:8px;">
                    <label style="margin:0;">Choices JSON data</label>
                    <button type="button" class="btn-icon btn-sel-json-expert" style="background:#7f8c8d;" onclick="toggleSelectorJsonExpert(${hId})">🧑‍💻 JSON expert mode</button>
                </div>
                <textarea class="f-sel-choices css-editor" rows="12" readonly style="font-family:Consolas,monospace;font-size:12px;">${defaultSelJson}</textarea>
            </div>
        </div>
        <small style="color:#555;display:block;margin-top:10px;">Tip: per-choice visibility and sounds are under <b>Advanced options</b> on each line, or in the JSON.</small>`;
        if(!opts.deferSelectorInit) initSelectorChoicesForm(hId);
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
            
        } catch (err) {
            console.error(err);
            alert("Invalid file or load error: " + (err && err.message ? err.message : String(err)));
        }
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
