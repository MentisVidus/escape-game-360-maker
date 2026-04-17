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

// --- Portable project bundle .escapegame (ZIP + project.json + assets/) — shared FR/EN helpers ---
var EditorSharedBundleApi = window.EditorSharedBundle;
if (!EditorSharedBundleApi) {
    throw new Error("EditorSharedBundle unavailable (js/editor-shared-bundle.js).");
}
var registerBundleBlobUrl = EditorSharedBundleApi.registerBundleBlobUrl;
var revokeEditorBundleSession = EditorSharedBundleApi.revokeEditorBundleSession;
var canonicalAssetRef = EditorSharedBundleApi.canonicalAssetRef;
var getBlobOrFileForPortableUrl = EditorSharedBundleApi.getBlobOrFileForPortableUrl;
var eachPortableMediaUrlInProject = EditorSharedBundleApi.eachPortableMediaUrlInProject;
var walkActionMediaUrls = EditorSharedBundleApi.walkActionMediaUrls;
var rewritePortableUrlsInProjectClone = EditorSharedBundleApi.rewritePortableUrlsInProjectClone;
var rewriteActionMediaUrls = EditorSharedBundleApi.rewriteActionMediaUrls;
var sanitizeBundleFileName = EditorSharedBundleApi.sanitizeBundleFileName;
var uniqueNameInSet = EditorSharedBundleApi.uniqueNameInSet;
var deriveBundleNameHint = EditorSharedBundleApi.deriveBundleNameHint;
var isZipArrayBuffer = EditorSharedBundleApi.isZipArrayBuffer;
var openBundleLocalMediaPicker = EditorSharedBundleApi.openBundleLocalMediaPicker;
var onBundleLocalMediaSelected = EditorSharedBundleApi.onBundleLocalMediaSelected;
var mapZipAssetsToEditorSession = EditorSharedBundleApi.mapZipAssetsToEditorSession;
var rewriteLoadedProjectPathsToBlobUrls = EditorSharedBundleApi.rewriteLoadedProjectPathsToBlobUrls;
window.collectPortableBundleEmbeds = EditorSharedBundleApi.collectPortableBundleEmbeds;

async function saveProjectBundle() {
    if (typeof JSZip === "undefined" || typeof saveAs === "undefined") {
        alert("JSZip or FileSaver.js is not loaded. Check your network (CDN) and reload the page.");
        return;
    }
    try {
        var project = JSON.parse(JSON.stringify(getCurrentProjectData()));
        var neededUrls = [];
        var seen = {};
        eachPortableMediaUrlInProject(project, function (u) {
            if (!u || seen[u]) return;
            if (!u.startsWith("blob:") && !canonicalAssetRef(u)) return;
            if (!getBlobOrFileForPortableUrl(u)) return;
            seen[u] = true;
            neededUrls.push(u);
        });
        var usedZipNames = {};
        var urlToRelPath = {};
        neededUrls.forEach(function (srcUrl) {
            var blob = getBlobOrFileForPortableUrl(srcUrl);
            if (!blob) return;
            var hint = deriveBundleNameHint(srcUrl, blob);
            var safe = sanitizeBundleFileName(hint, "asset.bin");
            var finalName = uniqueNameInSet(safe, usedZipNames);
            var rel = "./assets/" + finalName;
            var tr = srcUrl.trim();
            urlToRelPath[tr] = rel;
            if (srcUrl !== tr) urlToRelPath[srcUrl] = rel;
        });
        rewritePortableUrlsInProjectClone(project, function (s) {
            var t = typeof s === "string" ? s.trim() : "";
            if (typeof s === "string" && urlToRelPath[s]) return urlToRelPath[s];
            if (urlToRelPath[t]) return urlToRelPath[t];
            return s;
        });
        var zip = new JSZip();
        zip.file("project.json", JSON.stringify(project, null, 2));
        var folder = zip.folder("assets");
        neededUrls.forEach(function (u) {
            var rel = urlToRelPath[u.trim()];
            var blob = getBlobOrFileForPortableUrl(u);
            if (!rel || !blob || !folder) return;
            var base = rel.replace(/^\.\/assets\//, "");
            folder.file(base, blob);
        });
        var outBlob = await zip.generateAsync({ type: "blob" });
        var baseTitle = String(project.title || "EscapeGame")
            .replace(/[\\/:*?"<>|]+/g, "_")
            .trim()
            .slice(0, 80);
        saveAs(outBlob, (baseTitle || "EscapeGame") + ".escapegame");
    } catch (e) {
        console.error(e);
        alert("Failed to save .escapegame: " + (e && e.message ? e.message : String(e)));
    }
}

// --- Shared FR/EN UI helpers (no localized strings) ---
var EditorSharedUiApi = window.EditorSharedUi;
if (!EditorSharedUiApi) {
    throw new Error("EditorSharedUi unavailable (js/editor-shared-ui-utils.js).");
}
var updateScenePreview = EditorSharedUiApi.updateScenePreview;
var toggleCollapse = EditorSharedUiApi.toggleCollapse;
var toggleAllHotspotsInScene = EditorSharedUiApi.toggleAllHotspotsInScene;
var moveUp = EditorSharedUiApi.moveUp;
var moveDown = EditorSharedUiApi.moveDown;
var hexToRgba = EditorSharedUiApi.hexToRgba;
var buildCss = EditorSharedUiApi.buildCss;
var applyPickHiddenIfAutoFillInitial = EditorSharedUiApi.applyPickHiddenIfAutoFillInitial;
var wirePickIdToHiddenIfAutoFill = EditorSharedUiApi.wirePickIdToHiddenIfAutoFill;
var EditorSharedSelectorCoreApi = window.EditorSharedSelectorCore;
if (!EditorSharedSelectorCoreApi) {
    throw new Error("EditorSharedSelectorCore unavailable (js/editor-shared-selector-core.js).");
}
var getOwnChoiceField = EditorSharedSelectorCoreApi.getOwnChoiceField;
var collectChoicesFromList = EditorSharedSelectorCoreApi.collectChoicesFromList;
var syncSelectorChoicesToTextarea = EditorSharedSelectorCoreApi.syncSelectorChoicesToTextarea;
var attachSelectorChoicesListeners = EditorSharedSelectorCoreApi.attachSelectorChoicesListeners;
var selectorMoveChoice = EditorSharedSelectorCoreApi.selectorMoveChoice;
var selectorRemoveChoice = EditorSharedSelectorCoreApi.selectorRemoveChoice;
var selectorChoicesFromTextarea = EditorSharedSelectorCoreApi.selectorChoicesFromTextarea;
var EditorSharedHotspotSerializationApi = window.EditorSharedHotspotSerialization;
if (!EditorSharedHotspotSerializationApi) {
    throw new Error("EditorSharedHotspotSerialization unavailable (js/editor-shared-hotspot-serialization.js).");
}
var extractHotspotData = EditorSharedHotspotSerializationApi.extractHotspotData;
var EditorSharedActionMappersApi = window.EditorSharedActionMappers;
if (!EditorSharedActionMappersApi) {
    throw new Error("EditorSharedActionMappers unavailable (js/editor-shared-action-mappers.js).");
}
var ActionMappers = EditorSharedActionMappersApi.createActionMappers({
    EditorCore: window.EditorCore,
    defaultTransitionLabel: "Continue"
});
var selectorChoiceLegacyToV2 = ActionMappers.selectorChoiceLegacyToV2;
var legacyActionToV2 = ActionMappers.legacyActionToV2;
var legacyRewardToV2 = ActionMappers.legacyRewardToV2;
var actionV2ToLegacyChoice = ActionMappers.actionV2ToLegacyChoice;
var EditorSharedHotspotDomMapperApi = window.EditorSharedHotspotDomMapper;
if (!EditorSharedHotspotDomMapperApi) {
    throw new Error("EditorSharedHotspotDomMapper unavailable (js/editor-shared-hotspot-dom-mapper.js).");
}
var HotspotDomMapper = EditorSharedHotspotDomMapperApi.createHotspotDomMapper({
    defaultTransitionLabel: "Continue",
    selectorChoicesFromTextarea: selectorChoicesFromTextarea,
    legacyActionToV2: legacyActionToV2
});
var hotspotDomToV2 = HotspotDomMapper.hotspotDomToV2;

/** From map: add scene then refresh graph if modal is open. */
function addSceneFromMap() {
    addScene();
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var last = blocks[blocks.length - 1];
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
    if (last && typeof window.mountProjectMapSidePanelElement === "function") {
        window.mountProjectMapSidePanelElement(last);
    }
}
window.addSceneFromMap = addSceneFromMap;

// --- Add scene ---
// Inserts a new scene block into #scenes-container
/** @param {Object} [sceneTargetRefreshOpts] — forwarded to refreshAllSceneTargetSelects (e.g. { preferSelect, preferVal } after “+ New scene”). */
function addScene(scIdVal = null, scImgVal = null, scTitleVal = "", sceneTargetRefreshOpts = null) {
    sceneIdCounter++; 
    const sId = sceneIdCounter;
    
    // Defaults when not provided (e.g. new scene or JSON load)
    if(!scIdVal) scIdVal = "scene_" + sId; 
    if(!scImgVal) scImgVal = EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL;
    
    const sceneHTML = `
    <div class="scene-block" id="scene_${sId}">
        <div class="scene-header">
            <div class="scene-header-main">
                <button class="btn-icon" onclick="toggleCollapse('scene_body_${sId}', this)">▼</button>
                <h3 class="scene-block-heading">🎬 Scene ${sId}</h3>
                <input type="text" class="title-input sc-title" placeholder="Title / note (e.g. Kitchen)" value="${scTitleVal}">
            </div>
            <div class="scene-header-actions">
                <button type="button" class="btn-icon" onclick="addHotspot(${sId})" title="Add hotspot">+</button>
                <button type="button" class="btn-icon" onclick="toggleAllHotspotsInScene(${sId})" title="Collapse or expand all hotspots">⇕</button>
                <button class="btn-icon" onclick="moveUp('scene_${sId}')" title="Move up">⬆️</button>
                <button class="btn-icon" onclick="moveDown('scene_${sId}')" title="Move down">⬇️</button>
                <button class="btn-icon" onclick="duplicateScene(${sId})" title="Duplicate entire scene">📑</button>
                <button class="btn-preview-scene" onclick="previewScene(${sId})">👁️ Test</button>
                <button class="btn-del" onclick="var _sb=document.getElementById('scene_${sId}');if(_sb)_sb.remove();if(typeof refreshAllSceneTargetSelects==='function')refreshAllSceneTargetSelects();">X</button>
            </div>
        </div>
        <div id="scene_body_${sId}">
            <div class="row">
                <div class="col"><label>Short scene ID (e.g. kitchen):</label><input type="text" class="sc-id" value="${scIdVal}"></div>
                <div class="col"><label>360° image (https URL or local file):</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="sc-img" style="flex:1;min-width:0" value="${scImgVal}" oninput="updateScenePreview(this)"><button type="button" class="btn-icon" title="Pick a local image file" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'image/*,.jpg,.jpeg,.png,.webp')">📎</button></div></div>
                <div class="col col-wide"><label>🎵 Ambient audio (mp3 URL):</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="sc-audio" style="flex:1;min-width:0" placeholder="Optional"><button type="button" class="btn-icon" title="Pick a local audio file" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'audio/*,.mp3,.ogg,.wav,.m4a')">📎</button><button type="button" class="btn-icon" title="Play at the volume set on the line below" onclick="editorAudioPreviewToggle(this.closest('.scene-block').querySelector('.sc-audio'), this.closest('.scene-block').querySelector('.sc-audio-vol'), this)">▶</button></div></div>
            </div>
            <div class="row">
                <div class="col col-wide"><label>Ambient volume (0–1):</label><input type="range" class="sc-audio-vol" min="0" max="1" step="0.05" value="1" style="width:100%;max-width:320px;" title="Relative volume of scene ambiance in the player mix"></div>
            </div>
            <h4>Hotspots</h4>
            <div id="hs-container-${sId}"></div>
            <button class="btn-add-hs" onclick="addHotspot(${sId})">+ Add hotspot</button>
        </div>
    </div>`;
    
    document.getElementById('scenes-container').insertAdjacentHTML('beforeend', sceneHTML);
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects(sceneTargetRefreshOpts || undefined);
    }
    if (typeof initAllSceneIdStableFields === "function") {
        initAllSceneIdStableFields();
    }
    return sId;
}

// --- Add hotspot to a scene ---
function addHotspot(sceneId, hsData = null) {
    hsIdCounter++; 
    const hId = hsIdCounter;
    
    // Hotspot defaults
    let pitch = 0, yaw = 0, type = 'msg', hsTitleVal = "";
    let customCss = "width: 120px; height: 120px; background: rgba(255,0,0,0.2); border-radius: 0px; cursor: pointer; display: flex; align-items: center; justify-content: center;";
    
    // No-code visual editor defaults
    let uiW = 120, uiH = 120, uiShape = "0px", uiBgc = "#ff0000", uiBga = "0.2", uiImg = "";
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
        <div class="hs-block-header">
            <div class="hs-block-header-main">
                <button class="btn-icon" onclick="toggleCollapse('hs_body_${hId}', this)">▼</button>
                <b class="hs-block-id">Hotspot ${hId}</b>
                <input type="text" class="title-input hs-title" placeholder="Note (e.g. Blue door)" value="${hsTitleVal}">
            </div>
            <div class="hs-block-header-actions">
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
                    <div class="col"><label>Image URL (optional):</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="ui-img" style="flex:1;min-width:0" value="${uiImg}" placeholder="e.g. icon.png" oninput="buildCss(${hId})"><button type="button" class="btn-icon" title="Local image file" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'image/*')">📎</button></div></div>
                </div>
            </div>

            <!-- Expert CSS textarea -->
            <div class="editor-row-spread">
                <label class="editor-row-spread-label">Generated CSS:</label>
                <button type="button" class="btn-icon btn-expert-css" onclick="toggleExpertMode(${hId})">🧑‍💻 Expert mode (free CSS)</button>
            </div>
            <textarea class="css-editor hs-custom-css" id="css_text_${hId}" rows="2" readonly>${customCss}</textarea>
                </div>
            </div>
            
            <!-- Hotspot action type -->
            <label class="editor-field-label">On click:</label>
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
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-display', 'f-sel-choices', 'f-hs-req-item', 'f-hs-ghost-click', 'f-hs-hidden-if', 'f-sfx-url', 'f-sfx-vol'];
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
        if (hsData.type === "pick") {
            var _pickFld = document.getElementById("fields_" + hId);
            if (_pickFld) {
                applyPickHiddenIfAutoFillInitial(_pickFld.querySelector(".f-item-id"), _pickFld.querySelector(".f-hs-hidden-if"));
            }
        }
    }
    var _fld = document.getElementById("fields_" + hId);
    if (hsData && _fld && typeof destroyRichEditorsIn === "function") {
        destroyRichEditorsIn(_fld);
    }
    if (_fld && typeof initRichEditorsIn === "function") {
        initRichEditorsIn(_fld);
    }
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
}

// --- Duplicate / export hotspot data ---
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
    if (newScDiv && newScDiv.querySelector('.sc-audio-vol') && sDiv.querySelector('.sc-audio-vol')) {
        newScDiv.querySelector('.sc-audio-vol').value = sDiv.querySelector('.sc-audio-vol').value;
    }

    // Clone each hotspot
    sDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
        addHotspot(newSId, extractHotspotData(hsDiv.id.split('_')[1]));
    });
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
}

// --- CSS helpers (no-code + expert) ---

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
    // Prefix relative image paths for file:// / same-folder hosting (not blob: / data: / http)
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('blob:')) imgUrl = "./" + imgUrl; 
    
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
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('blob:')) imgUrl = "./" + imgUrl; 
    
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

function cardToChoice(card) {
    if (typeof flushRichEditorsIn === "function") flushRichEditorsIn(card);
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
        if(!isNaN(v) && (out.sfxUrl || v !== 1)) out.sfxVolume = v;
    }
    return out;
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

function buildHotspotAdvancedDrawersHtml() {
    return (
        `<details class="hs-vis-advanced" style="margin-top:12px;">
            <summary style="cursor:pointer;font-weight:600;">Conditional display (optional)</summary>
            <div class="hs-vis-controls" style="margin-top:8px;">
                <label>Show only if the player has item (ID):</label>
                <input type="text" class="f-hs-req-item" style="width:100%;max-width:100%;box-sizing:border-box;" placeholder="empty = always shown">
                <label style="margin-top:8px;display:block;">Clickable when the hotspot is invisible (opacity 0):</label>
                <select class="f-hs-ghost-click" style="max-width:100%;">
                    <option value="yes" selected>Yes</option>
                    <option value="no">No</option>
                </select>
                <small style="color:#666;display:block;margin-top:4px;">No effect for a “Choice menu” hotspot. Not used on selector choice rows.</small>
                <label style="margin-top:8px;display:block;">Hide if the player has item (ID):</label>
                <input type="text" class="f-hs-hidden-if" style="width:100%;max-width:100%;box-sizing:border-box;" placeholder="empty = no hiding rule">
            </div>
        </details>` +
        `<details class="hs-sfx-advanced" style="margin-top:12px;">
            <summary style="cursor:pointer;font-weight:600;">🔊 SFX (optional)</summary>
            <div class="hs-sfx-controls" style="margin-top:8px;">
                <label>SFX audio (URL):</label>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;width:100%;">
                    <input type="text" class="f-sfx-url" style="flex:1;min-width:0" placeholder="optional">
                    <button type="button" class="btn-icon" title="Local audio file" onclick="openBundleLocalMediaPicker(this.closest('.hs-sfx-controls').querySelector('.f-sfx-url'), 'audio/*,.mp3,.ogg,.wav,.m4a')">📎</button>
                    <button type="button" class="btn-icon" title="Play at the volume set on the line below" onclick="editorAudioPreviewToggle(this.closest('.hs-sfx-controls').querySelector('.f-sfx-url'), this.closest('.hs-sfx-controls').querySelector('.f-sfx-vol'), this)">▶</button>
                </div>
                <label>SFX volume (0–1):</label>
                <input type="range" class="f-sfx-vol" min="0" max="1" step="0.05" value="1" style="width:100%;max-width:320px;">
            </div>
        </details>`
    );
}

function appendSelectorChoiceAdvancedDrawers(card, ch) {
    ch = ch || {};
    var detVis = document.createElement("details");
    detVis.className = "hs-vis-advanced";
    detVis.style.marginTop = "12px";
    var sumVis = document.createElement("summary");
    sumVis.style.cursor = "pointer";
    sumVis.style.fontWeight = "600";
    sumVis.textContent = "Conditional display (optional)";
    detVis.appendChild(sumVis);
    var wrapVis = document.createElement("div");
    wrapVis.className = "hs-vis-controls";
    wrapVis.style.marginTop = "8px";
    var lr = document.createElement("label");
    lr.textContent = "Show only if the player has item (ID):";
    var ir = document.createElement("input");
    ir.type = "text";
    ir.className = "sel-opt-req";
    ir.style.cssText = "width:100%;max-width:100%;box-sizing:border-box;";
    ir.placeholder = "empty = always shown";
    ir.value = ch.requiresItem || "";
    var lh = document.createElement("label");
    lh.style.marginTop = "8px";
    lh.style.display = "block";
    lh.textContent = "Hide if the player has item (ID):";
    var ih = document.createElement("input");
    ih.type = "text";
    ih.className = "sel-opt-hidden";
    ih.style.cssText = "width:100%;max-width:100%;box-sizing:border-box;";
    ih.placeholder = "empty = no hiding rule";
    ih.value = ch.hiddenIfHasItem || "";
    wrapVis.appendChild(lr);
    wrapVis.appendChild(ir);
    wrapVis.appendChild(lh);
    wrapVis.appendChild(ih);
    detVis.appendChild(wrapVis);
    card.appendChild(detVis);

    var detSfx = document.createElement("details");
    detSfx.className = "hs-sfx-advanced";
    detSfx.style.marginTop = "12px";
    var sumSfx = document.createElement("summary");
    sumSfx.style.cursor = "pointer";
    sumSfx.style.fontWeight = "600";
    sumSfx.textContent = "🔊 SFX (optional)";
    detSfx.appendChild(sumSfx);
    var wrapSfx = document.createElement("div");
    wrapSfx.className = "hs-sfx-controls";
    wrapSfx.style.marginTop = "8px";
    var ls = document.createElement("label");
    ls.textContent = "SFX audio (URL):";
    var is = document.createElement("input");
    is.type = "text";
    is.className = "sel-opt-sfx";
    is.style.flex = "1";
    is.style.minWidth = "0";
    is.placeholder = "optional";
    is.value = ch.sfxUrl || "";
    var lsv = document.createElement("label");
    lsv.textContent = "SFX volume (0–1):";
    var isv = document.createElement("input");
    isv.type = "range";
    isv.className = "sel-opt-sfxvol";
    isv.min = "0";
    isv.max = "1";
    isv.step = "0.05";
    isv.value =
        ch.sfxVolume !== undefined && ch.sfxVolume !== null && String(ch.sfxVolume).trim() !== ""
            ? String(ch.sfxVolume)
            : "1";
    isv.style.cssText = "width:100%;max-width:320px;";
    var sfxBtn = document.createElement("button");
    sfxBtn.type = "button";
    sfxBtn.className = "btn-icon";
    sfxBtn.title = "Local audio file";
    sfxBtn.textContent = "📎";
    sfxBtn.onclick = function () {
        openBundleLocalMediaPicker(is, "audio/*,.mp3,.ogg,.wav,.m4a");
    };
    var sfxPreviewBtn = document.createElement("button");
    sfxPreviewBtn.type = "button";
    sfxPreviewBtn.className = "btn-icon";
    sfxPreviewBtn.title = "Play at the volume set on the line below";
    sfxPreviewBtn.textContent = "▶";
    sfxPreviewBtn.onclick = function () {
        if (typeof window.editorAudioPreviewToggle === "function") {
            window.editorAudioPreviewToggle(is, isv, sfxPreviewBtn);
        }
    };
    var sfxRow = document.createElement("div");
    sfxRow.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap;width:100%;";
    sfxRow.appendChild(is);
    sfxRow.appendChild(sfxBtn);
    sfxRow.appendChild(sfxPreviewBtn);
    wrapSfx.appendChild(ls);
    wrapSfx.appendChild(sfxRow);
    wrapSfx.appendChild(lsv);
    wrapSfx.appendChild(isv);
    detSfx.appendChild(wrapSfx);
    card.appendChild(detSfx);
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
    if (typeof destroyRichEditorsIn === "function") destroyRichEditorsIn(container);
    container.innerHTML = "";

    if(type === "msg") {
        var l1 = document.createElement("label");
        l1.textContent = "Message content:";
        var wrap = document.createElement("div");
        wrap.className = "wysiwyg-wrap";
        var ta = document.createElement("textarea");
        ta.className = "sel-msg-txt editor-rich-text";
        ta.rows = 3;
        ta.value = ch.txt || "";
        wrap.appendChild(ta);
        container.appendChild(l1);
        container.appendChild(wrap);
    } else if(type === "scene") {
        var r1 = document.createElement("div");
        r1.className = "row";
        var col = document.createElement("div");
        col.className = "col";
        var lb0 = document.createElement("label");
        lb0.textContent = "Target scene:";
        col.appendChild(lb0);
        if (typeof buildSceneTargetSelect === "function") {
            col.insertAdjacentHTML("beforeend", buildSceneTargetSelect("sel-scene-target", ch.target || ""));
        } else {
            var inp = document.createElement("input");
            inp.type = "text";
            inp.className = "sel-scene-target";
            inp.value = ch.target || "";
            col.appendChild(inp);
        }
        r1.appendChild(col);
        container.appendChild(r1);
        var l2 = document.createElement("label");
        l2.textContent = "Transition text:";
        var w2 = document.createElement("div");
        w2.className = "wysiwyg-wrap";
        var t2 = document.createElement("textarea");
        t2.className = "sel-scene-trans editor-rich-text";
        t2.rows = 2;
        t2.value = ch.transTxt || "";
        w2.appendChild(t2);
        var l3 = document.createElement("label");
        l3.textContent = "Button label:";
        var i3 = document.createElement("input");
        i3.type = "text";
        i3.className = "sel-scene-btn";
        i3.value = ch.transBtn || "Continue";
        container.appendChild(l2);
        container.appendChild(w2);
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
        lp.textContent = "Pickup message:";
        var wp = document.createElement("div");
        wp.className = "wysiwyg-wrap";
        var tp = document.createElement("textarea");
        tp.className = "sel-pick-txt editor-rich-text";
        tp.rows = 2;
        tp.value = ch.txt || "";
        wp.appendChild(tp);
        container.appendChild(lp);
        container.appendChild(wp);
        wirePickIdToHiddenIfAutoFill(rp.querySelector(".sel-pick-id"), getOwnChoiceField(card, ".sel-opt-hidden"));
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
        li.textContent = "Introduction (optional):";
        var wi = document.createElement("div");
        wi.className = "wysiwyg-wrap";
        var ti = document.createElement("textarea");
        ti.className = "sel-nested-intro editor-rich-text";
        ti.rows = 2;
        ti.value = (nest.copy && nest.copy.bodyHtml) || nest.introHtml || "";
        wi.appendChild(ti);
        var ld = document.createElement("label");
        ld.textContent = "Sub-choices layout:";
        var sd = document.createElement("select");
        sd.className = "sel-nested-display";
        sd.innerHTML = "<option value=\"buttons\">Buttons</option><option value=\"dropdown\">Dropdown + OK</option>";
        if(nest.displayMode === "dropdown") sd.value = "dropdown";
        nb.appendChild(lt);
        nb.appendChild(it);
        nb.appendChild(li);
        nb.appendChild(wi);
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
    if (typeof initRichEditorsIn === "function") initRichEditorsIn(container);
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

    appendSelectorChoiceAdvancedDrawers(card, ch);

    ch.actionType = selA.value;
    selectorRebuildActionFields(card, ch, hId);
    return card;
}

function initSelectorChoicesForm(hId) {
    var hsDiv = document.getElementById("hs_" + hId);
    var ta = hsDiv.querySelector(".f-sel-choices");
    var root = document.getElementById("sel_choices_root_" + hId);
    if(!ta || !root) return;
    if (typeof destroyRichEditorsIn === "function") destroyRichEditorsIn(root);
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
    if (!container) return;
    if (typeof destroyRichEditorsIn === "function") destroyRichEditorsIn(container);
    var sceneSel =
        typeof buildSceneTargetSelect === "function"
            ? buildSceneTargetSelect("f-target")
            : '<input type="text" class="f-target" value="scene_2">';
    var hsAdvancedHtml = buildHotspotAdvancedDrawersHtml();

    if(type === 'msg') {
        container.innerHTML = `<label>Displayed text:</label><div class="wysiwyg-wrap"><textarea class="f-txt editor-rich-text" rows="3">Well done.</textarea></div>${hsAdvancedHtml}`;
    }
    else if(type === 'pick') {
        container.innerHTML = `<div class="row"><div class="col"><label>Item ID:</label><input type="text" class="f-item-id" value="key"></div><div class="col"><label>Name:</label><input type="text" class="f-item-name" value="Golden key"></div></div><label>Narration:</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2">You find a key.</textarea></div>${hsAdvancedHtml}`;
    }
    else if(type === 'req') {
        container.innerHTML = `
        <label>Required item ID:</label><input type="text" class="f-item-id" value="key">
        <label style="color:red;">If missing:</label><div class="wysiwyg-wrap"><textarea class="f-ko editor-rich-text" rows="2">Locked.</textarea></div>
        <label style="margin-top:10px; color:#27ae60;"><b>If player has item:</b></label>
        <select class="f-req-action" onchange="document.getElementById('req_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Change scene</option><option value="msg">Show message</option><option value="pick">Give new item</option>
        </select>
        <div id="req_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#req_res_${hId} .s-scene, #req_res_${hId} .s-msg, #req_res_${hId} .s-pick { display: none; } #req_res_${hId}.res-scene .s-scene { display: block; } #req_res_${hId}.res-msg .s-msg { display: block; } #req_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Go to scene:</label>${sceneSel}<label>Transition text:</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Button:</label><input type="text" class="f-trans-btn" value="Enter"></div>
            <div class="s-msg"><label>Message:</label><div class="wysiwyg-wrap"><textarea class="f-ok-msg editor-rich-text" rows="2">Unlocked!</textarea></div></div>
            <div class="s-pick"><div class="row"><div class="col"><label>New item ID:</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>New name:</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Find message:</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2">Found!</textarea></div></div>
        </div>${hsAdvancedHtml}`;
    }
    else if(type === 'scene') {
        container.innerHTML = `<label>Go to scene:</label>${sceneSel}<label style="color:#2980b9;">Transition text:</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Button:</label><input type="text" class="f-trans-btn" value="Continue">${hsAdvancedHtml}`;
    }
    else if(type === 'pwd') {
        container.innerHTML = `
        <label>Puzzle / question:</label><div class="wysiwyg-wrap"><textarea class="f-enigme-txt editor-rich-text" rows="2">Code:</textarea></div>
        <label>Expected answer:</label><input type="text" class="f-pwd" value="1234">
        <label style="margin-top:10px;"><b>When solved:</b></label>
        <select class="f-pwd-action" onchange="document.getElementById('pwd_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Change scene</option><option value="msg">Show message</option><option value="pick">Give item</option>
        </select>
        <div id="pwd_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#pwd_res_${hId} .s-scene, #pwd_res_${hId} .s-msg, #pwd_res_${hId} .s-pick { display: none; } #pwd_res_${hId}.res-scene .s-scene { display: block; } #pwd_res_${hId}.res-msg .s-msg { display: block; } #pwd_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Go to scene:</label>${sceneSel}<label>Transition text:</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Button:</label><input type="text" class="f-trans-btn" value="Enter"></div>
            <div class="s-msg"><label>Message:</label><div class="wysiwyg-wrap"><textarea class="f-ok-msg editor-rich-text" rows="2">Unlocked!</textarea></div></div>
            <div class="s-pick"><div class="row"><div class="col"><label>Item ID:</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Name:</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Find message:</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2">Found.</textarea></div></div>
        </div>${hsAdvancedHtml}`;
    }
    else if(type === 'selector') {
        var defaultSelJson = JSON.stringify(getDefaultSelectorChoices(), null, 2);
        container.innerHTML = `
        <label>Menu title:</label><input type="text" class="f-sel-title" value="Choose an action">
        <label>Introduction (optional):</label><div class="wysiwyg-wrap"><textarea class="f-sel-intro editor-rich-text" rows="2"></textarea></div>
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
                <div class="editor-row-spread">
                    <label class="editor-row-spread-label">Choices JSON data</label>
                    <button type="button" class="btn-icon btn-sel-json-expert" onclick="toggleSelectorJsonExpert(${hId})">🧑‍💻 JSON expert mode</button>
                </div>
                <textarea class="f-sel-choices css-editor" rows="12" readonly style="font-family:Consolas,monospace;font-size:12px;">${defaultSelJson}</textarea>
            </div>
        </div>
        ${hsAdvancedHtml}
        <small style="color:#555;display:block;margin-top:10px;">Tip: per-choice visibility and SFX are in the <b>drawers under each line</b>, or in the JSON. The drawers at the bottom of this form control the selector menu itself.</small>`;
        if(!opts.deferSelectorInit) initSelectorChoicesForm(hId);
    }
    if (type === "pick") {
        wirePickIdToHiddenIfAutoFill(container.querySelector(".f-item-id"), container.querySelector(".f-hs-hidden-if"));
    }
    if (typeof initRichEditorsIn === "function") initRichEditorsIn(container);
}

// --- Save / load project JSON ---


/** Export current editor state in schema v2 (unified action model). */
function getCurrentProjectData() {
    if(!window.EditorCore) throw new Error("EditorCore not loaded.");
    var _scRoot = document.getElementById("scenes-container");
    if (_scRoot && typeof flushRichEditorsIn === "function") {
        flushRichEditorsIn(_scRoot);
    }
    let project = EditorCore.createEmptyProject();
    project.title = document.getElementById('gameTitle').value;
    project.useInv = document.getElementById('useInventory').checked;
    project.invPos = document.getElementById('inv-pos').value;
    project.invIcon = document.getElementById('inv-icon').value;
    project.invBgc = document.getElementById('inv-bgc').value;
    project.invBga = parseFloat(document.getElementById('inv-bga').value || "0.8");
    project.invColor = document.getElementById('inv-color').value;
    project.useCustomPopup = document.getElementById('useCustomPopup').checked;
    project.useGlobalAudio = document.getElementById('useGlobalAudio').checked;
    var globalVolEl = document.getElementById("globalAudioVol");
    var gMusicVol = 0.5;
    if (globalVolEl) {
        var gv = parseFloat(globalVolEl.value);
        gMusicVol = isNaN(gv) ? 0.5 : Math.max(0, Math.min(1, gv));
    }
    project.globalMusic = {
        url: document.getElementById('globalAudioUrl').value,
        volume: gMusicVol
    };
    project.popFont = document.getElementById('pop-font').value;
    project.popColor = document.getElementById('pop-color').value;
    project.popBgc = document.getElementById('pop-bgc').value;
    project.popBga = parseFloat(document.getElementById('pop-bga').value || "0.9");
    project.popBtnBg = document.getElementById('pop-btn-bg').value;
    project.popBtnCol = document.getElementById('pop-btn-col').value;

    document.querySelectorAll('.scene-block').forEach(sceneDiv => {
        let scene = {
            id: (sceneDiv.querySelector('.sc-id') || { value: "" }).value.trim(),
            title: (sceneDiv.querySelector('.sc-title') || { value: "" }).value,
            media: {
                panoramaUrl: (sceneDiv.querySelector('.sc-img') || { value: "" }).value,
                ambiance: {
                    url: sceneDiv.querySelector('.sc-audio') ? sceneDiv.querySelector('.sc-audio').value : "",
                    volume: (function () {
                        var el = sceneDiv.querySelector(".sc-audio-vol");
                        if (!el) return 1;
                        var av = parseFloat(el.value);
                        return isNaN(av) ? 1 : Math.max(0, Math.min(1, av));
                    })()
                }
            },
            hotspots: []
        };
        sceneDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
            scene.hotspots.push(hotspotDomToV2(hsDiv));
        });
        project.scenes.push(scene);
    });
    return project;
}

function saveProject() {
    const project = getCurrentProjectData();
    var embedList =
        typeof window.collectPortableBundleEmbeds === "function"
            ? window.collectPortableBundleEmbeds(project)
            : [];
    if (embedList.length > 0) {
        var proceed = window.confirm(
            "This project references local media (.escapegame bundle or imported files). " +
                "The JSON file does not embed binaries — after you reload, those media will be missing.\n\n" +
                "Use “Save project (.escapegame)” to keep files inside the archive.\n\n" +
                "Download the JSON anyway?"
        );
        if (!proceed) return;
    }

    // Trigger browser download
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const lien = document.createElement("a"); 
    lien.href = URL.createObjectURL(blob); 
    lien.download = "project.json";
    document.body.appendChild(lien); 
    lien.click(); 
    document.body.removeChild(lien);
}

function actionV2ToLegacyHotspotData(hs) {
    var a = hs.action || EditorCore.createDefaultAction("msg");
    var p = a.payload || {};
    var out = {
        hsTitle: hs.title || "",
        pitch: hs.pitch != null ? hs.pitch : 0,
        yaw: hs.yaw != null ? hs.yaw : 0,
        customCss: hs.customCss || "",
        type: a.type || "msg"
    };
    var app = hs.appearance || {};
    if(app.ui_w !== undefined) {
        out.ui_w = app.ui_w; out.ui_h = app.ui_h; out.ui_shape = app.ui_shape;
        out.ui_bgc = app.ui_bgc; out.ui_bga = app.ui_bga; out.ui_img = app.ui_img;
        out.ui_brd_style = app.ui_brd_style; out.ui_brd_w = app.ui_brd_w; out.ui_brd_c = app.ui_brd_c;
    }
    var pc = p.copy || {};
    if(a.type === "msg") {
        out.f_txt = pc.bodyHtml || "";
    } else if(a.type === "scene") {
        out.f_target = p.target || "";
        out.f_trans_txt = pc.bodyHtml || "";
        out.f_trans_btn = pc.buttonLabel || "Continue";
    } else if(a.type === "pick") {
        out.f_item_id = p.itemId || "";
        out.f_item_name = p.itemName || "";
        out.f_pick_msg = pc.bodyHtml || "";
    } else if(a.type === "req") {
        out.f_item_id = p.itemId || "";
        out.f_ko = pc.bodyHtml || "";
        var r = p.rewardAction || EditorCore.createDefaultAction("scene");
        var rc = (r.payload && r.payload.copy) || {};
        out.f_req_action = r.type || "scene";
        if(r.type === "scene") {
            out.f_target = (r.payload && r.payload.target) || "";
            out.f_trans_txt = rc.bodyHtml || "";
            out.f_trans_btn = rc.buttonLabel || "Continue";
        } else if(r.type === "msg") {
            out.f_ok_msg = rc.bodyHtml || "";
        } else if(r.type === "pick") {
            out.f_pick_id = (r.payload && r.payload.itemId) || "";
            out.f_pick_name = (r.payload && r.payload.itemName) || "";
            out.f_pick_msg = rc.bodyHtml || "";
        }
    } else if(a.type === "pwd") {
        out.f_enigme_txt = pc.bodyHtml || "";
        out.f_pwd = p.answer || "";
        var rp = p.rewardAction || EditorCore.createDefaultAction("scene");
        var rpc = (rp.payload && rp.payload.copy) || {};
        out.f_pwd_action = rp.type || "scene";
        if(rp.type === "scene") {
            out.f_target = (rp.payload && rp.payload.target) || "";
            out.f_trans_txt = rpc.bodyHtml || "";
            out.f_trans_btn = rpc.buttonLabel || "Continue";
        } else if(rp.type === "msg") {
            out.f_ok_msg = rpc.bodyHtml || "";
        } else if(rp.type === "pick") {
            out.f_pick_id = (rp.payload && rp.payload.itemId) || "";
            out.f_pick_name = (rp.payload && rp.payload.itemName) || "";
            out.f_pick_msg = rpc.bodyHtml || "";
        }
    } else if(a.type === "selector") {
        var n = p.nested || {};
        var ncopy = n.copy || {};
        out.f_sel_title = n.title || "";
        out.f_sel_intro = ncopy.bodyHtml || "";
        out.f_sel_display = n.displayMode === "dropdown" ? "dropdown" : "buttons";
        out.f_sel_choices = JSON.stringify((Array.isArray(n.choices) ? n.choices : []).map(function(c, i) {
            return actionV2ToLegacyChoice(c.action, c.label, i);
        }), null, 2);
    }
    if(a.sfx && a.sfx.url) out.f_sfx_url = a.sfx.url;
    if(a.sfx && a.sfx.volume !== undefined) out.f_sfx_vol = a.sfx.volume;
    if(a.visibility && a.visibility.requiresItem) out.f_hs_req_item = a.visibility.requiresItem;
    if(a.visibility && a.visibility.clickWhenInvisible === false) out.f_hs_ghost_click = "no";
    if(a.visibility && a.visibility.hiddenIfHasItem) out.f_hs_hidden_if = a.visibility.hiddenIfHasItem;
    return out;
}

function applyLoadedProject(project) {
    document.getElementById("scenes-container").innerHTML = "";
    sceneIdCounter = 0;
    hsIdCounter = 0;

    document.getElementById("gameTitle").value = project.title || "My awesome game";

    const useInv = project.useInv !== false;
    document.getElementById("useInventory").checked = useInv;
    document.getElementById("inv-settings-container").style.display = useInv ? "flex" : "none";

    if (useInv) {
        document.getElementById("inv-pos").value = project.invPos || "top-right";
        document.getElementById("inv-icon").value = project.invIcon || "🎒";
        document.getElementById("inv-bgc").value = project.invBgc || "#000000";
        document.getElementById("inv-bga").value = project.invBga !== undefined ? project.invBga : "0.8";
        document.getElementById("inv-color").value = project.invColor || "#ffffff";
    }

    const usePopup = project.useCustomPopup || false;
    document.getElementById("useCustomPopup").checked = usePopup;
    document.getElementById("popup-settings-container").style.display = usePopup ? "flex" : "none";

    if (usePopup) {
        document.getElementById("pop-font").value = project.popFont || "Arial, sans-serif";
        document.getElementById("pop-color").value = project.popColor || "#ffffff";
        document.getElementById("pop-bgc").value = project.popBgc || "#000000";
        document.getElementById("pop-bga").value = project.popBga !== undefined ? project.popBga : "0.9";
        document.getElementById("pop-btn-bg").value = project.popBtnBg || "#27ae60";
        document.getElementById("pop-btn-col").value = project.popBtnCol || "#ffffff";
    }

    const useAudio = project.useGlobalAudio || false;
    document.getElementById("useGlobalAudio").checked = useAudio;
    document.getElementById("audio-settings-container").style.display = useAudio ? "flex" : "none";
    var gm = project.globalMusic || {};
    document.getElementById("globalAudioUrl").value = gm.url != null ? gm.url : project.globalAudioUrl || "";
    var gVolEl = document.getElementById("globalAudioVol");
    if (gVolEl) {
        var gv =
            gm.volume !== undefined && gm.volume !== null && !isNaN(Number(gm.volume))
                ? Number(gm.volume)
                : 0.5;
        gVolEl.value = String(Math.max(0, Math.min(1, gv)));
        var gVolDisp = document.getElementById("globalAudioVolVal");
        if (gVolDisp) gVolDisp.textContent = Number(gVolEl.value).toFixed(2);
    }

    project.scenes.forEach(function (scene) {
        var scMedia = scene.media || {};
        const sId = addScene(scene.id || "", scMedia.panoramaUrl || EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL, scene.title || "");

        var scDiv = document.getElementById("scene_" + sId);
        if (scDiv && scDiv.querySelector(".sc-audio")) {
            var amb = scMedia.ambiance || {};
            scDiv.querySelector(".sc-audio").value = amb.url != null ? amb.url : scMedia.ambianceUrl || "";
            var avEl = scDiv.querySelector(".sc-audio-vol");
            if (avEl) {
                var av =
                    amb.volume !== undefined && amb.volume !== null && !isNaN(Number(amb.volume))
                        ? Number(amb.volume)
                        : 1;
                avEl.value = String(Math.max(0, Math.min(1, av)));
            }
        }

        (scene.hotspots || []).forEach(function (hs) {
            addHotspot(sId, actionV2ToLegacyHotspotData(hs));
        });
    });
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof initAllSceneIdStableFields === "function") {
        initAllSceneIdStableFields();
    }

    updatePreview();
}

function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const buf = e.target.result;
        const inputEl = event.target;

        function fail(err) {
            console.error(err);
            alert("Invalid file or load error: " + (err && err.message ? err.message : String(err)));
            inputEl.value = "";
        }

        try {
            if (isZipArrayBuffer(buf)) {
                if (typeof JSZip === "undefined") {
                    fail(new Error("JSZip is not loaded (CDN). Reload the page."));
                    return;
                }
                JSZip.loadAsync(buf)
                    .then(function (zip) {
                        var pj = zip.file("project.json");
                        if (!pj) throw new Error("project.json not found in the .escapegame archive.");
                        return pj.async("string").then(function (text) {
                            return { zip: zip, text: text };
                        });
                    })
                    .then(function (o) {
                        var project = EditorCore.parseProjectJSON(o.text);
                        revokeEditorBundleSession();
                        return mapZipAssetsToEditorSession(o.zip).then(function (pathMap) {
                            rewriteLoadedProjectPathsToBlobUrls(project, pathMap);
                            applyLoadedProject(project);
                            inputEl.value = "";
                        });
                    })
                    .catch(fail);
            } else {
                var text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
                var project = EditorCore.parseProjectJSON(text);
                revokeEditorBundleSession();
                applyLoadedProject(project);
                inputEl.value = "";
            }
        } catch (err) {
            fail(err);
        }
    };
    reader.readAsArrayBuffer(file);
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

    if (typeof updateQuillTheme === "function") {
        updateQuillTheme();
    }
}
