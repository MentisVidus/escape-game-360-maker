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

// --- Bundle projet .escapegame (ZIP + project.json + assets/) : URLs blob: et ./assets/ ---
window.bundleAssets = window.bundleAssets || new Map();
window.bundleAssetPathBlobs = window.bundleAssetPathBlobs || new Map();
var bundleTrackedObjectUrls = [];
var bundleLocalMediaTargetEl = null;
var bundleLocalMediaAccept = "*/*";

function registerBundleBlobUrl(url) {
    if (url && bundleTrackedObjectUrls.indexOf(url) < 0) bundleTrackedObjectUrls.push(url);
}

function revokeEditorBundleSession() {
    bundleTrackedObjectUrls.forEach(function (u) {
        try {
            URL.revokeObjectURL(u);
        } catch (e) {}
    });
    bundleTrackedObjectUrls = [];
    window.bundleAssets.clear();
    window.bundleAssetPathBlobs.clear();
}

function canonicalAssetRef(url) {
    if (typeof url !== "string") return null;
    var t = url.trim();
    if (t.indexOf("\0") >= 0) return null;
    if (t.startsWith("./assets/")) return t;
    if (t.startsWith("assets/")) return "./" + t;
    return null;
}

function getBlobOrFileForPortableUrl(url) {
    if (typeof url !== "string") return null;
    var t = url.trim();
    if (t.startsWith("blob:")) {
        if (!window.bundleAssets) return null;
        return window.bundleAssets.get(t) || window.bundleAssets.get(url) || null;
    }
    var c = canonicalAssetRef(t);
    if (c && window.bundleAssetPathBlobs && window.bundleAssetPathBlobs.has(c)) return window.bundleAssetPathBlobs.get(c);
    return null;
}

function eachPortableMediaUrlInProject(project, visit) {
    function V(u) {
        if (u == null) return;
        var s = String(u).trim();
        if (s) visit(s);
    }
    function VifUrlLike(u) {
        if (u == null) return;
        var s = String(u).trim();
        if (!s) return;
        if (/^(https?:|blob:|data:|\.\/)/i.test(s)) V(s);
    }
    if (project.globalMusic && project.globalMusic.url) V(project.globalMusic.url);
    if (project.globalAudioUrl) V(project.globalAudioUrl);
    VifUrlLike(project.invIcon);
    (project.scenes || []).forEach(function (scene) {
        var media = scene.media || {};
        V(media.panoramaUrl);
        if (media.ambianceUrl != null) V(media.ambianceUrl);
        var amb = media.ambiance;
        if (typeof amb === "string") V(amb);
        else if (amb && amb.url) V(amb.url);
        (scene.hotspots || []).forEach(function (hs) {
            var app = hs.appearance || {};
            if (app.ui_img) V(app.ui_img);
            walkActionMediaUrls(hs.action, V);
        });
    });
}

function walkActionMediaUrls(action, V) {
    if (!action) return;
    if (action.sfx && action.sfx.url) V(action.sfx.url);
    var p = action.payload;
    if (!p) return;
    if (p.nested && Array.isArray(p.nested.choices)) {
        p.nested.choices.forEach(function (ch) {
            walkActionMediaUrls(ch.action, V);
        });
    }
    if (p.rewardAction) walkActionMediaUrls(p.rewardAction, V);
}

function rewritePortableUrlsInProjectClone(project, rewriteStr) {
    function Rw(x) {
        if (x == null) return x;
        return rewriteStr(String(x));
    }
    if (project.globalMusic && project.globalMusic.url != null) project.globalMusic.url = Rw(project.globalMusic.url);
    if (project.globalAudioUrl != null) project.globalAudioUrl = Rw(project.globalAudioUrl);
    if (project.invIcon != null && /^(https?:|blob:|data:|\.\/)/i.test(String(project.invIcon).trim())) {
        project.invIcon = Rw(project.invIcon);
    }
    (project.scenes || []).forEach(function (scene) {
        var media = scene.media || {};
        if (media.panoramaUrl != null) media.panoramaUrl = Rw(media.panoramaUrl);
        if (media.ambianceUrl != null) media.ambianceUrl = Rw(media.ambianceUrl);
        var amb = media.ambiance;
        if (typeof amb === "string") scene.media.ambiance = Rw(amb);
        else if (amb && typeof amb === "object" && amb.url != null) amb.url = Rw(amb.url);
        (scene.hotspots || []).forEach(function (hs) {
            var app = hs.appearance || {};
            if (app.ui_img != null) app.ui_img = Rw(app.ui_img);
            rewriteActionMediaUrls(hs.action, Rw);
        });
    });
}

function rewriteActionMediaUrls(action, Rw) {
    if (!action) return;
    if (action.sfx && action.sfx.url != null) action.sfx.url = Rw(action.sfx.url);
    var p = action.payload;
    if (!p) return;
    if (p.nested && Array.isArray(p.nested.choices)) {
        p.nested.choices.forEach(function (ch) {
            rewriteActionMediaUrls(ch.action, Rw);
        });
    }
    if (p.rewardAction) rewriteActionMediaUrls(p.rewardAction, Rw);
}

function sanitizeBundleFileName(name, fallback) {
    var base = String(name || fallback || "asset")
        .split(/[/\\]/)
        .pop();
    base = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
    if (!base || base === "." || base === "..") base = fallback || "asset.bin";
    return base.slice(0, 120);
}

function uniqueNameInSet(desired, usedSet) {
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

function deriveBundleNameHint(url, blob) {
    if (blob instanceof File && blob.name) return blob.name;
    var c = canonicalAssetRef(String(url || "").trim());
    if (c) {
        var seg = c.replace(/^\.\/assets\//, "").split("/");
        return seg[seg.length - 1] || "asset.bin";
    }
    return "media.bin";
}

function isZipArrayBuffer(buf) {
    if (!buf || buf.byteLength < 4) return false;
    var a = new Uint8Array(buf, 0, 4);
    return a[0] === 0x50 && a[1] === 0x4b;
}

function openBundleLocalMediaPicker(targetInput, accept) {
    bundleLocalMediaTargetEl = targetInput;
    bundleLocalMediaAccept = accept || "*/*";
    var el = document.getElementById("bundle-media-file");
    if (!el) return;
    el.accept = bundleLocalMediaAccept;
    el.value = "";
    el.click();
}

function onBundleLocalMediaSelected(event) {
    var inp = event.target;
    var file = inp.files && inp.files[0];
    var target = bundleLocalMediaTargetEl;
    bundleLocalMediaTargetEl = null;
    if (!file || !target) {
        if (inp) inp.value = "";
        return;
    }
    var old = (target.value || "").trim();
    if (old.startsWith("blob:")) {
        if (window.bundleAssets && window.bundleAssets.has(old)) window.bundleAssets.delete(old);
        try {
            URL.revokeObjectURL(old);
        } catch (e) {}
        var ix = bundleTrackedObjectUrls.indexOf(old);
        if (ix >= 0) bundleTrackedObjectUrls.splice(ix, 1);
    }
    var url = URL.createObjectURL(file);
    registerBundleBlobUrl(url);
    window.bundleAssets.set(url, file);
    target.value = url;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    inp.value = "";
}

window.collectPortableBundleEmbeds = function (project) {
    var out = [];
    var seen = {};
    eachPortableMediaUrlInProject(project, function (u) {
        if (!u || seen[u]) return;
        if (!u.startsWith("blob:") && !canonicalAssetRef(u)) return;
        var blob = getBlobOrFileForPortableUrl(u);
        if (!blob) return;
        seen[u] = true;
        out.push({ url: u, blob: blob, nameHint: deriveBundleNameHint(u, blob) });
    });
    return out;
};

async function mapZipAssetsToEditorSession(zip) {
    var pathToBlobUrl = {};
    var tasks = [];
    zip.forEach(function (relPath, entry) {
        if (entry.dir) return;
        var norm = relPath.replace(/\\/g, "/");
        if (!norm.startsWith("assets/") || norm === "assets/") return;
        var inner = norm.slice("assets/".length);
        if (!inner || inner.endsWith("/")) return;
        tasks.push(
            entry.async("blob").then(function (blob) {
                var relKey = "./assets/" + inner;
                window.bundleAssetPathBlobs.set(relKey, blob);
                var baseName = inner.split("/").pop() || "asset.bin";
                var f = new File([blob], baseName, { type: blob.type || "application/octet-stream" });
                var blobUrl = URL.createObjectURL(blob);
                registerBundleBlobUrl(blobUrl);
                window.bundleAssets.set(blobUrl, f);
                pathToBlobUrl[relKey] = blobUrl;
            })
        );
    });
    await Promise.all(tasks);
    return pathToBlobUrl;
}

function rewriteLoadedProjectPathsToBlobUrls(project, pathToBlobUrl) {
    function R(s) {
        if (typeof s !== "string") return s;
        var t = s.trim();
        var c = canonicalAssetRef(t);
        if (c && pathToBlobUrl[c]) return pathToBlobUrl[c];
        return s;
    }
    rewritePortableUrlsInProjectClone(project, R);
}

async function saveProjectBundle() {
    if (typeof JSZip === "undefined" || typeof saveAs === "undefined") {
        alert(
            "JSZip ou FileSaver.js n’est pas chargé. Vérifiez votre connexion (CDN), puis rechargez la page."
        );
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
        alert(
            "Échec de la sauvegarde .escapegame : " + (e && e.message ? e.message : String(e))
        );
    }
}

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

/** Depuis la carte : nouvelle scène puis rafraîchissement du graphe si la modale est ouverte. */
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

/** Replier ou déplier d’un coup le corps principal de tous les hotspots d’une scène. */
function toggleAllHotspotsInScene(sceneNumericId) {
    const wrap = document.getElementById("hs-container-" + sceneNumericId);
    if (!wrap) return;
    const blocks = wrap.querySelectorAll(":scope > .hotspot-block");
    let anyExpanded = false;
    blocks.forEach((hb) => {
        const m = hb.id && hb.id.match(/^hs_(\d+)$/);
        if (!m) return;
        const body = document.getElementById("hs_body_" + m[1]);
        if (body && body.style.display !== "none") anyExpanded = true;
    });
    const expand = !anyExpanded;
    blocks.forEach((hb) => {
        const m = hb.id && hb.id.match(/^hs_(\d+)$/);
        if (!m) return;
        const hId = m[1];
        const body = document.getElementById("hs_body_" + hId);
        const btn = hb.querySelector(".hs-block-header-main > .btn-icon");
        if (!body || !btn) return;
        if (expand) {
            body.style.display = "";
            btn.innerHTML = "▼";
        } else {
            body.style.display = "none";
            btn.innerHTML = "▶";
        }
    });
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
    if(!scImgVal) scImgVal = EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL;
    
    const sceneHTML = `
    <div class="scene-block" id="scene_${sId}">
        <div class="scene-header">
            <div class="scene-header-main">
                <button class="btn-icon" onclick="toggleCollapse('scene_body_${sId}', this)">▼</button>
                <h3 class="scene-block-heading">🎬 Scène ${sId}</h3>
                <input type="text" class="title-input sc-title" placeholder="Titre/Note (ex: Cuisine)" value="${scTitleVal}">
            </div>
            <div class="scene-header-actions">
                <button type="button" class="btn-icon" onclick="addHotspot(${sId})" title="Ajouter un point d'interaction">+</button>
                <button type="button" class="btn-icon" onclick="toggleAllHotspotsInScene(${sId})" title="Plier ou déplier tous les points d'interaction">⇕</button>
                <button class="btn-icon" onclick="moveUp('scene_${sId}')" title="Monter">⬆️</button>
                <button class="btn-icon" onclick="moveDown('scene_${sId}')" title="Descendre">⬇️</button>
                <button class="btn-icon" onclick="duplicateScene(${sId})" title="Dupliquer la scène entière">📑</button>
                <button class="btn-preview-scene" onclick="previewScene(${sId})">👁️ Tester</button>
                <button class="btn-del" onclick="var _sb=document.getElementById('scene_${sId}');if(_sb)_sb.remove();if(typeof refreshAllSceneTargetSelects==='function')refreshAllSceneTargetSelects();">X</button>
            </div>
        </div>
        <div id="scene_body_${sId}">
            <div class="row">
                <div class="col"><label>ID court système (ex: cuisine) :</label><input type="text" class="sc-id" value="${scIdVal}"></div>
                <div class="col"><label>Image 360 (URL https… ou fichier local) :</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="sc-img" style="flex:1;min-width:0" value="${scImgVal}" oninput="updateScenePreview(this)"><button type="button" class="btn-icon" title="Choisir un fichier image local" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'image/*,.jpg,.jpeg,.png,.webp')">📎</button></div></div>
                <div class="col col-wide"><label>🎵 Audio d'ambiance (URL mp3) :</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="sc-audio" style="flex:1;min-width:0" placeholder="Optionnel"><button type="button" class="btn-icon" title="Choisir un fichier audio local" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'audio/*,.mp3,.ogg,.wav,.m4a')">📎</button><button type="button" class="btn-icon" title="Écouter avec le volume réglé sous la ligne" onclick="editorAudioPreviewToggle(this.closest('.scene-block').querySelector('.sc-audio'), this.closest('.scene-block').querySelector('.sc-audio-vol'), this)">▶</button></div></div>
            </div>
            <div class="row">
                <div class="col col-wide"><label>Volume ambiance (0 à 1) :</label><input type="range" class="sc-audio-vol" min="0" max="1" step="0.05" value="1" style="width:100%;max-width:320px;" title="Volume relatif de l’ambiance dans le mix audio du joueur"></div>
            </div>
            <h4>Points d'interaction</h4>
            <div id="hs-container-${sId}"></div>
            <button class="btn-add-hs" onclick="addHotspot(${sId})">+ Ajouter un point d'interaction</button>
        </div>
    </div>`;
    
    document.getElementById('scenes-container').insertAdjacentHTML('beforeend', sceneHTML);
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof initAllSceneIdStableFields === "function") {
        initAllSceneIdStableFields();
    }
    return sId;
}

// --- FONCTION : AJOUTER UN HOTSPOT ---
// Ajoute un point d'interaction à une scène spécifique
function addHotspot(sceneId, hsData = null) {
    hsIdCounter++; 
    const hId = hsIdCounter;
    
    // Définition des valeurs par défaut du Hotspot
    let pitch = 0, yaw = 0, type = 'msg', hsTitleVal = "";
    let customCss = "width: 120px; height: 120px; background: rgba(255,0,0,0.2); border-radius: 0px; cursor: pointer; display: flex; align-items: center; justify-content: center;";
    
    // Valeurs par défaut pour l'interface No-Code (UI)
    let uiW = 120, uiH = 120, uiShape = "0px", uiBgc = "#ff0000", uiBga = "0.2", uiImg = "";
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
        <div class="hs-block-header">
            <div class="hs-block-header-main">
                <button class="btn-icon" onclick="toggleCollapse('hs_body_${hId}', this)">▼</button>
                <b class="hs-block-id">Hotspot ${hId}</b>
                <input type="text" class="title-input hs-title" placeholder="Note (ex: Porte Bleue)" value="${hsTitleVal}">
            </div>
            <div class="hs-block-header-actions">
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
            
            <div class="editor-collapse-section">
                <button type="button" class="editor-collapse-header" onclick="toggleCollapse('hs_appearance_body_${hId}', this)">▶ Apparence du hotspot (zone cliquable)</button>
                <div id="hs_appearance_body_${hId}" style="display:none">
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
                    <div class="col"><label>Image URL (optionnel):</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="ui-img" style="flex:1;min-width:0" value="${uiImg}" placeholder="ex: icone.png" oninput="buildCss(${hId})"><button type="button" class="btn-icon" title="Fichier image local" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'image/*')">📎</button></div></div>
                </div>
            </div>

            <!-- Éditeur de code CSS libre -->
            <div class="editor-row-spread">
                <label class="editor-row-spread-label">Code CSS généré :</label>
                <button type="button" class="btn-icon btn-expert-css" onclick="toggleExpertMode(${hId})">🧑‍💻 Mode Expert (CSS Libre)</button>
            </div>
            <textarea class="css-editor hs-custom-css" id="css_text_${hId}" rows="2" readonly>${customCss}</textarea>
                </div>
            </div>
            
            <!-- Type d'action du Hotspot -->
            <label class="editor-field-label">Action au clic :</label>
            <select class="hs-type" onchange="updateHsFields(${hId})">
                <option value="msg">Afficher message</option>
                <option value="pick">Ramasser objet</option>
                <option value="req">Objet requis</option>
                <option value="pwd">Énigme / Code</option>
                <option value="scene">Aller à une scène</option>
                <option value="selector">Menu de choix (selector)</option>
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
    // Si on restaure un projet, ne pas initialiser le selector avant d'avoir injecté f_sel_choices (sinon sync DOM -> textarea écrase le JSON).
    updateHsFields(hId, { deferSelectorInit: !!hsData }); 

    // Remplissage des champs dynamiques avec les données sauvegardées (si on charge un projet)
    if(hsData) {
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-display', 'f-sel-choices', 'f-hs-req-item', 'f-hs-ghost-click', 'f-hs-hidden-if', 'f-sfx-url', 'f-sfx-vol'];
        fields.forEach(f => {
            let el = hsDiv.querySelector('.' + f);
            if(el && hsData[f.replace(/-/g, '_')] !== undefined) {
                el.value = hsData[f.replace(/-/g, '_')];
                if(f === 'f-pwd-action' || f === 'f-req-action') el.dispatchEvent(new Event('change')); // Force l'affichage des sous-champs
            }
        });
        if(hsData.type === 'selector') {
            if(hsData.selJsonExpertMode) toggleSelectorJsonExpert(hId, true);
            else initSelectorChoicesForm(hId);
        }
        // Restaure l'état du mode expert
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

// --- FONCTIONS DE DUPLICATION ---
// Extrait toutes les données d'un hotspot existant pour pouvoir le copier
function extractHotspotData(hId) {
    const hsDiv = document.getElementById(`hs_${hId}`);
    if (typeof flushRichEditorsIn === "function") flushRichEditorsIn(hsDiv);
    let hs = { 
        hsTitle: hsDiv.querySelector('.hs-title').value, 
        pitch: hsDiv.querySelector('.hs-pitch').value, 
        yaw: hsDiv.querySelector('.hs-yaw').value, 
        customCss: hsDiv.querySelector('.hs-custom-css').value, 
        type: hsDiv.querySelector('.hs-type').value 
    };
    
    let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-display', 'f-sel-choices', 'f-hs-req-item', 'f-hs-ghost-click', 'f-hs-hidden-if', 'f-sfx-url', 'f-sfx-vol', 'ui-w', 'ui-h', 'ui-shape', 'ui-bgc', 'ui-bga', 'ui-brd-style', 'ui-brd-w', 'ui-brd-c', 'ui-img'];
    fields.forEach(f => { 
        let el = hsDiv.querySelector('.' + f); 
        if(el) hs[f.replace(/-/g, '_')] = el.value; 
    });
    
    // Mémorise si le joueur avait activé le mode expert pour ce hotspot
    if(!hsDiv.querySelector('.hs-custom-css').hasAttribute("readonly")) hs.expertMode = true;
    if(hs.type === 'selector') {
        var fc = hsDiv.querySelector('.f-sel-choices');
        if(fc && !fc.hasAttribute('readonly')) hs.selJsonExpertMode = true;
    }
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
    if (newScDiv && newScDiv.querySelector('.sc-audio-vol') && sDiv.querySelector('.sc-audio-vol')) {
        newScDiv.querySelector('.sc-audio-vol').value = sDiv.querySelector('.sc-audio-vol').value;
    }

    // Copie chaque hotspot de l'ancienne scène dans la nouvelle
    sDiv.querySelectorAll('.hotspot-block').forEach(hsDiv => {
        addHotspot(newSId, extractHotspotData(hsDiv.id.split('_')[1]));
    });
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
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
    // Ajuste le chemin si l'image est locale (pas blob:, data:, http)
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('blob:')) imgUrl = "./" + imgUrl; 
    
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
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('blob:')) imgUrl = "./" + imgUrl; 
    
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

// --- Selector : formulaire des choix + JSON avancé (lecture seule par défaut) ---
var SELECTOR_MAX_DEPTH = 3;

function getDefaultSelectorChoices() {
    return [
        { label: "Message d'accueil", actionType: "msg", txt: "<p>Texte affiché au joueur.</p>" },
        { label: "Aller ailleurs", actionType: "scene", target: "scene_2", transTxt: "", transBtn: "Continuer" }
    ];
}

function getDefaultChoice() {
    return { label: "Nouveau choix", actionType: "msg", txt: "<p>Texte</p>" };
}

function collectChoicesFromList(listEl) {
    if(!listEl) return [];
    if (typeof flushRichEditorsIn === "function") flushRichEditorsIn(listEl);
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
        alert("Profondeur maximale de sous-menus atteinte (" + SELECTOR_MAX_DEPTH + " niveaux).");
        return;
    }
    list.appendChild(renderChoiceCardElement(getDefaultChoice(), hId, depth + 1));
    syncSelectorChoicesToTextarea(hId);
}

/** Remplit « Masquer si… » avec l’ID ramassé si vide (utile aussi après chargement JSON). */
function applyPickHiddenIfAutoFillInitial(pickIdInput, hiddenIfInput) {
    if (!pickIdInput || !hiddenIfInput) return;
    if ((hiddenIfInput.value || "").trim() === "" && (pickIdInput.value || "").trim() !== "") {
        hiddenIfInput.value = pickIdInput.value.trim();
        hiddenIfInput.dataset.autoFilled = "1";
    }
}

/** « Masquer si… » suit l’ID d’objet ramassé tant que le champ n’a pas été saisi à la main (même logique partout). */
function wirePickIdToHiddenIfAutoFill(pickIdInput, hiddenIfInput) {
    applyPickHiddenIfAutoFillInitial(pickIdInput, hiddenIfInput);
    if (!pickIdInput || !hiddenIfInput) return;
    hiddenIfInput.addEventListener("input", function () { hiddenIfInput.dataset.autoFilled = "0"; });
    pickIdInput.addEventListener("input", function () {
        if (hiddenIfInput.dataset.autoFilled === "1" || (hiddenIfInput.value || "").trim() === "") {
            hiddenIfInput.value = pickIdInput.value.trim();
            hiddenIfInput.dataset.autoFilled = "1";
        }
    });
}

/** Tiroirs visibilité + SFX pour les champs dynamiques d’hotspot (HTML injecté dans updateHsFields). */
function buildHotspotAdvancedDrawersHtml() {
    return (
        `<details class="hs-vis-advanced" style="margin-top:12px;">
            <summary style="cursor:pointer;font-weight:600;">Affichage conditionnel (optionnel)</summary>
            <div class="hs-vis-controls" style="margin-top:8px;">
                <label>Afficher seulement si le joueur a l’objet (ID) :</label>
                <input type="text" class="f-hs-req-item" style="width:100%;max-width:100%;box-sizing:border-box;" placeholder="vide = toujours affiché">
                <label style="margin-top:8px;display:block;">Est cliquable quand le hotspot est invisible (opacité 0) :</label>
                <select class="f-hs-ghost-click" style="max-width:100%;">
                    <option value="yes" selected>Oui</option>
                    <option value="no">Non</option>
                </select>
                <small style="color:#666;display:block;margin-top:4px;">Sans effet pour un hotspot « Menu de choix ». Inutile pour les tiroirs des lignes d’un selector.</small>
                <label style="margin-top:8px;display:block;">Masquer si le joueur possède l’objet (ID) :</label>
                <input type="text" class="f-hs-hidden-if" style="width:100%;max-width:100%;box-sizing:border-box;" placeholder="vide = pas de masquage">
            </div>
        </details>` +
        `<details class="hs-sfx-advanced" style="margin-top:12px;">
            <summary style="cursor:pointer;font-weight:600;">🔊 SFX (optionnel)</summary>
            <div class="hs-sfx-controls" style="margin-top:8px;">
                <label>Audio SFX (URL) :</label>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;width:100%;">
                    <input type="text" class="f-sfx-url" style="flex:1;min-width:0" placeholder="optionnel">
                    <button type="button" class="btn-icon" title="Fichier audio local" onclick="openBundleLocalMediaPicker(this.closest('.hs-sfx-controls').querySelector('.f-sfx-url'), 'audio/*,.mp3,.ogg,.wav,.m4a')">📎</button>
                    <button type="button" class="btn-icon" title="Écouter avec le volume réglé sous la ligne" onclick="editorAudioPreviewToggle(this.closest('.hs-sfx-controls').querySelector('.f-sfx-url'), this.closest('.hs-sfx-controls').querySelector('.f-sfx-vol'), this)">▶</button>
                </div>
                <label>Volume SFX (0 à 1) :</label>
                <input type="range" class="f-sfx-vol" min="0" max="1" step="0.05" value="1" style="width:100%;max-width:320px;">
            </div>
        </details>`
    );
}

/** Même schéma que buildHotspotAdvancedDrawersHtml, en DOM pour une carte de choix selector. */
function appendSelectorChoiceAdvancedDrawers(card, ch) {
    ch = ch || {};
    var detVis = document.createElement("details");
    detVis.className = "hs-vis-advanced";
    detVis.style.marginTop = "12px";
    var sumVis = document.createElement("summary");
    sumVis.style.cursor = "pointer";
    sumVis.style.fontWeight = "600";
    sumVis.textContent = "Affichage conditionnel (optionnel)";
    detVis.appendChild(sumVis);
    var wrapVis = document.createElement("div");
    wrapVis.className = "hs-vis-controls";
    wrapVis.style.marginTop = "8px";
    var lr = document.createElement("label");
    lr.textContent = "Afficher seulement si le joueur a l’objet (ID) :";
    var ir = document.createElement("input");
    ir.type = "text";
    ir.className = "sel-opt-req";
    ir.style.cssText = "width:100%;max-width:100%;box-sizing:border-box;";
    ir.placeholder = "vide = toujours affiché";
    ir.value = ch.requiresItem || "";
    var lh = document.createElement("label");
    lh.style.marginTop = "8px";
    lh.style.display = "block";
    lh.textContent = "Masquer si le joueur possède l'objet (ID) :";
    var ih = document.createElement("input");
    ih.type = "text";
    ih.className = "sel-opt-hidden";
    ih.style.cssText = "width:100%;max-width:100%;box-sizing:border-box;";
    ih.placeholder = "vide = pas de masquage";
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
    sumSfx.textContent = "🔊 SFX (optionnel)";
    detSfx.appendChild(sumSfx);
    var wrapSfx = document.createElement("div");
    wrapSfx.className = "hs-sfx-controls";
    wrapSfx.style.marginTop = "8px";
    var ls = document.createElement("label");
    ls.textContent = "Audio SFX (URL) :";
    var is = document.createElement("input");
    is.type = "text";
    is.className = "sel-opt-sfx";
    is.style.flex = "1";
    is.style.minWidth = "0";
    is.placeholder = "optionnel";
    is.value = ch.sfxUrl || "";
    var lsv = document.createElement("label");
    lsv.textContent = "Volume SFX (0 à 1) :";
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
    sfxBtn.title = "Fichier audio local";
    sfxBtn.textContent = "📎";
    sfxBtn.onclick = function () {
        openBundleLocalMediaPicker(is, "audio/*,.mp3,.ogg,.wav,.m4a");
    };
    var sfxPreviewBtn = document.createElement("button");
    sfxPreviewBtn.type = "button";
    sfxPreviewBtn.className = "btn-icon";
    sfxPreviewBtn.title = "Écouter avec le volume réglé sous la ligne";
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
        l1.textContent = "Contenu du message :";
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
        lb0.textContent = "Scène cible :";
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
        l2.textContent = "Texte de transition :";
        var w2 = document.createElement("div");
        w2.className = "wysiwyg-wrap";
        var t2 = document.createElement("textarea");
        t2.className = "sel-scene-trans editor-rich-text";
        t2.rows = 2;
        t2.value = ch.transTxt || "";
        w2.appendChild(t2);
        var l3 = document.createElement("label");
        l3.textContent = "Libellé du bouton :";
        var i3 = document.createElement("input");
        i3.type = "text";
        i3.className = "sel-scene-btn";
        i3.value = ch.transBtn || "Continuer";
        container.appendChild(l2);
        container.appendChild(w2);
        container.appendChild(l3);
        container.appendChild(i3);
    } else if(type === "pick") {
        var rp = document.createElement("div");
        rp.className = "row";
        rp.innerHTML = "<div class=\"col\"><label>ID de l'objet :</label><input type=\"text\" class=\"sel-pick-id\" value=\"\"></div><div class=\"col\"><label>Nom affiché :</label><input type=\"text\" class=\"sel-pick-name\" value=\"\"></div>";
        container.appendChild(rp);
        rp.querySelector(".sel-pick-id").value = ch.itemId || "";
        rp.querySelector(".sel-pick-name").value = ch.itemName || "";
        var lp = document.createElement("label");
        lp.textContent = "Texte lors du ramassage :";
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
        lt.textContent = "Titre du sous-menu :";
        var it = document.createElement("input");
        it.type = "text";
        it.className = "sel-nested-title";
        it.value = nest.title || "";
        var li = document.createElement("label");
        li.textContent = "Introduction (optionnel) :";
        var wi = document.createElement("div");
        wi.className = "wysiwyg-wrap";
        var ti = document.createElement("textarea");
        ti.className = "sel-nested-intro editor-rich-text";
        ti.rows = 2;
        ti.value = (nest.copy && nest.copy.bodyHtml) || nest.introHtml || "";
        wi.appendChild(ti);
        var ld = document.createElement("label");
        ld.textContent = "Présentation des sous-choix :";
        var sd = document.createElement("select");
        sd.className = "sel-nested-display";
        sd.innerHTML = "<option value=\"buttons\">Boutons</option><option value=\"dropdown\">Liste déroulante + Valider</option>";
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
        btnAdd.textContent = "+ Ajouter un sous-choix";
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
    h.textContent = "Choix";
    var bUp = document.createElement("button");
    bUp.type = "button";
    bUp.className = "btn-icon";
    bUp.title = "Monter";
    bUp.textContent = "↑";
    bUp.onclick = function() { selectorMoveChoice(bUp, -1); };
    var bDn = document.createElement("button");
    bDn.type = "button";
    bDn.className = "btn-icon";
    bDn.title = "Descendre";
    bDn.textContent = "↓";
    bDn.onclick = function() { selectorMoveChoice(bDn, 1); };
    var bRm = document.createElement("button");
    bRm.type = "button";
    bRm.className = "btn-del";
    bRm.title = "Supprimer ce choix";
    bRm.textContent = "×";
    bRm.onclick = function() { selectorRemoveChoice(bRm); };
    tb.appendChild(h);
    tb.appendChild(bUp);
    tb.appendChild(bDn);
    tb.appendChild(bRm);

    var lblL = document.createElement("label");
    lblL.textContent = "Texte affiché (bouton ou ligne) :";
    var inpL = document.createElement("input");
    inpL.type = "text";
    inpL.className = "sel-label";
    inpL.value = ch.label || "";

    var lblA = document.createElement("label");
    lblA.textContent = "Action :";
    var selA = document.createElement("select");
    selA.className = "sel-action-type";
    var opts = depth >= SELECTOR_MAX_DEPTH - 1
        ? [
            ["msg", "Afficher un message"],
            ["scene", "Aller à une autre scène"],
            ["pick", "Ramasser un objet"]
          ]
        : [
            ["msg", "Afficher un message"],
            ["scene", "Aller à une autre scène"],
            ["pick", "Ramasser un objet"],
            ["selector", "Sous-menu (menu imbriqué)"]
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
        console.warn("f_sel_choices JSON invalide:", e);
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
        if(forceExpert || confirm("Attention : le mode expert JSON désactive le formulaire. Vous pourrez éditer le JSON à la main. Continuer ?")) {
            ta.removeAttribute("readonly");
            ta.style.border = "2px solid #e74c3c";
            formUi.style.opacity = "0.35";
            formUi.style.pointerEvents = "none";
            if(btn) {
                btn.innerHTML = "🔙 Revenir au formulaire (réappliquer le JSON)";
                btn.style.background = "#e74c3c";
            }
        }
    } else {
        try { JSON.parse(ta.value.trim()); } catch(e) { alert("JSON invalide : " + e.message); return; }
        ta.setAttribute("readonly", "readonly");
        ta.style.border = "";
        formUi.style.opacity = "1";
        formUi.style.pointerEvents = "auto";
        if(btn) {
            btn.innerHTML = "🧑‍💻 Mode expert JSON";
            btn.style.background = "#7f8c8d";
        }
        initSelectorChoicesForm(hId);
    }
}

// --- FONCTION : AFFICHER LES BONS CHAMPS SELON LE TYPE DE HOTSPOT ---
// opts.deferSelectorInit : si true, ne pas appeler initSelectorChoicesForm (chargement projet / duplication après coup)
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
        container.innerHTML = `<label>Texte affiché :</label><div class="wysiwyg-wrap"><textarea class="f-txt editor-rich-text" rows="3">Bravo.</textarea></div>${hsAdvancedHtml}`;
    }
    else if(type === 'pick') {
        container.innerHTML = `<div class="row"><div class="col"><label>ID objet :</label><input type="text" class="f-item-id" value="cle"></div><div class="col"><label>Nom :</label><input type="text" class="f-item-name" value="La clé dorée"></div></div><label>Texte narratif :</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2">Vous trouvez une clé.</textarea></div>${hsAdvancedHtml}`;
    }
    else if(type === 'req') {
        container.innerHTML = `
        <label>ID objet requis :</label><input type="text" class="f-item-id" value="cle">
        <label style="color:red;">Si ABSENT (Erreur) :</label><div class="wysiwyg-wrap"><textarea class="f-ko editor-rich-text" rows="2">Verrouillé.</textarea></div>
        <label style="margin-top:10px; color:#27ae60;"><b>Si PRÉSENT (Récompense) :</b></label>
        <select class="f-req-action" onchange="document.getElementById('req_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Changer de scène</option><option value="msg">Afficher un message</option><option value="pick">Donner NOUVEL objet</option>
        </select>
        <div id="req_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#req_res_${hId} .s-scene, #req_res_${hId} .s-msg, #req_res_${hId} .s-pick { display: none; } #req_res_${hId}.res-scene .s-scene { display: block; } #req_res_${hId}.res-msg .s-msg { display: block; } #req_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Aller vers la scène :</label>${sceneSel}<label>Texte transition :</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Bouton :</label><input type="text" class="f-trans-btn" value="Entrer"></div>
            <div class="s-msg"><label>Message :</label><div class="wysiwyg-wrap"><textarea class="f-ok-msg editor-rich-text" rows="2">Ouvert !</textarea></div></div>
            <div class="s-pick"><div class="row"><div class="col"><label>Nouvel ID objet :</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Nouveau Nom :</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Texte trouvaille :</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2">Trouvé !</textarea></div></div>
        </div>${hsAdvancedHtml}`;
    }
    else if(type === 'scene') {
        container.innerHTML = `<label>Aller vers la scène :</label>${sceneSel}<label style="color:#2980b9;">Texte transition :</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Bouton :</label><input type="text" class="f-trans-btn" value="Continuer">${hsAdvancedHtml}`;
    }
    else if(type === 'pwd') {
        container.innerHTML = `
        <label>Énigme / question :</label><div class="wysiwyg-wrap"><textarea class="f-enigme-txt editor-rich-text" rows="2">Code :</textarea></div>
        <label>Réponse attendue :</label><input type="text" class="f-pwd" value="1234">
        <label style="margin-top:10px;"><b>Récompense quand résolu :</b></label>
        <select class="f-pwd-action" onchange="document.getElementById('pwd_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Changer de scène</option><option value="msg">Afficher un message</option><option value="pick">Donner un objet</option>
        </select>
        <div id="pwd_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#pwd_res_${hId} .s-scene, #pwd_res_${hId} .s-msg, #pwd_res_${hId} .s-pick { display: none; } #pwd_res_${hId}.res-scene .s-scene { display: block; } #pwd_res_${hId}.res-msg .s-msg { display: block; } #pwd_res_${hId}.res-pick .s-pick { display: block; }</style>
            <div class="s-scene"><label>Aller vers la scène :</label>${sceneSel}<label>Texte transition :</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Bouton :</label><input type="text" class="f-trans-btn" value="Entrer"></div>
            <div class="s-msg"><label>Message :</label><div class="wysiwyg-wrap"><textarea class="f-ok-msg editor-rich-text" rows="2">Déverrouillé !</textarea></div></div>
            <div class="s-pick"><div class="row"><div class="col"><label>ID objet :</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Nom :</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Texte trouvaille :</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2">Trouvé.</textarea></div></div>
        </div>${hsAdvancedHtml}`;
    }
    else if(type === 'selector') {
        var defaultSelJson = JSON.stringify(getDefaultSelectorChoices(), null, 2);
        container.innerHTML = `
        <label>Titre du menu :</label><input type="text" class="f-sel-title" value="Choisissez une action">
        <label>Introduction (optionnel) :</label><div class="wysiwyg-wrap"><textarea class="f-sel-intro editor-rich-text" rows="2"></textarea></div>
        <label>Présentation des choix :</label>
        <select class="f-sel-display">
            <option value="buttons" selected>Boutons</option>
            <option value="dropdown">Liste déroulante + Valider</option>
        </select>
        <p style="margin:12px 0 6px 0;color:#2c3e50;"><b>Choix proposés au joueur</b> — ajoutez ou réordonnez des lignes ; chaque ligne peut ouvrir un message, une scène, un objet, ou un sous-menu.</p>
        <div id="selector_form_ui_${hId}" class="selector-form-wrap">
            <div id="sel_choices_root_${hId}" class="sel-choices-list sel-choices-root"></div>
            <button type="button" class="btn-add-hs" onclick="selectorAddChoice(${hId})">+ Ajouter un choix</button>
        </div>
        <div class="editor-collapse-section">
            <button type="button" class="editor-collapse-header" onclick="toggleCollapse('sel_json_wrap_${hId}', this)">▶ JSON avancé (référence technique)</button>
            <div id="sel_json_wrap_${hId}" style="display:none">
                <p class="selector-json-hint">Le jeu lit ce tableau JSON. En usage courant, le formulaire ci-dessus suffit ; ouvrez cette zone pour <b>voir</b> ou <b>copier</b> la structure. Le mode expert permet de modifier le JSON à la main (comme le CSS en mode expert).</p>
                <div class="editor-row-spread">
                    <label class="editor-row-spread-label">Données JSON des choix</label>
                    <button type="button" class="btn-icon btn-sel-json-expert" onclick="toggleSelectorJsonExpert(${hId})">🧑‍💻 Mode expert JSON</button>
                </div>
                <textarea class="f-sel-choices css-editor" rows="12" readonly style="font-family:Consolas,monospace;font-size:12px;">${defaultSelJson}</textarea>
            </div>
        </div>
        ${hsAdvancedHtml}
        <small style="color:#555;display:block;margin-top:10px;">Astuce : conditions d’affichage et SFX par choix se règlent dans les <b>tiroirs sous chaque ligne</b>, ou dans le JSON. Les tiroirs au bas du formulaire pilotent le menu selector lui-même.</small>`;
        if(!opts.deferSelectorInit) initSelectorChoicesForm(hId);
    }
    if (type === "pick") {
        wirePickIdToHiddenIfAutoFill(container.querySelector(".f-item-id"), container.querySelector(".f-hs-hidden-if"));
    }
    if (typeof initRichEditorsIn === "function") initRichEditorsIn(container);
}

// --- FONCTIONS DE SAUVEGARDE ET CHARGEMENT DU FICHIER .JSON ---

function selectorChoicesFromTextarea(hsDiv, hId) {
    var ta = hsDiv.querySelector(".f-sel-choices");
    if(!ta) return [];
    if(ta.hasAttribute("readonly")) syncSelectorChoicesToTextarea(hId);
    var arr = [];
    try { arr = JSON.parse(ta.value || "[]"); } catch(e) { arr = []; }
    if(!Array.isArray(arr)) arr = [];
    return arr;
}

function selectorChoiceLegacyToV2(ch, idx) {
    var out = {
        id: (ch.id && String(ch.id).trim()) || ("choice_" + (idx + 1)),
        label: (ch.label && String(ch.label).trim()) || "Option",
        action: legacyActionToV2(ch.actionType || "msg", ch)
    };
    return out;
}

function legacyActionToV2(type, source) {
    if(!window.EditorCore) throw new Error("EditorCore indisponible (js/editor-core.js).");
    var src = source || {};
    var action = EditorCore.createDefaultAction(type || "msg");
    var p = action.payload;

    if(src.requiresItem) action.visibility.requiresItem = String(src.requiresItem).trim();
    if(src.hiddenIfHasItem) action.visibility.hiddenIfHasItem = String(src.hiddenIfHasItem).trim();
    var gcRaw = src.f_hs_ghost_click != null ? src.f_hs_ghost_click : src.ghostClick;
    if(gcRaw != null && gcRaw !== "") {
        var gcs = String(gcRaw).trim().toLowerCase();
        if(gcs === "no" || gcs === "non" || gcs === "0" || gcRaw === false) action.visibility.clickWhenInvisible = false;
    }
    if(src.sfxUrl) action.sfx.url = String(src.sfxUrl).trim();
    if(src.sfxVolume !== undefined && src.sfxVolume !== null && src.sfxVolume !== "") {
        var v = parseFloat(src.sfxVolume);
        if(!isNaN(v)) action.sfx.volume = v;
    }

    if(action.type === "msg") {
        p.copy.bodyHtml = src.txt || "";
    } else if(action.type === "scene") {
        p.target = src.target || "";
        p.copy.bodyHtml = src.transTxt || "";
        p.copy.buttonLabel = src.transBtn || "Continuer";
    } else if(action.type === "pick") {
        p.itemId = src.itemId || "";
        p.itemName = src.itemName || "";
        p.copy.bodyHtml = src.txt || "";
    } else if(action.type === "req") {
        p.itemId = src.itemId || "";
        p.copy.bodyHtml = src.ko || "";
        p.rewardAction = legacyRewardToV2(src.f_req_action || src.reqAction || "scene", src);
    } else if(action.type === "pwd") {
        p.copy.bodyHtml = src.enigmeTxt || src.enigme_txt || src.f_enigme_txt || "";
        p.answer = src.pwd || src.f_pwd || "";
        p.rewardAction = legacyRewardToV2(src.f_pwd_action || src.pwdAction || "scene", src);
    } else if(action.type === "selector") {
        var nested = src.nested || {};
        var intro =
            (nested.copy && nested.copy.bodyHtml != null ? nested.copy.bodyHtml : null) ||
            nested.introHtml ||
            "";
        p.nested = {
            title: nested.title || "",
            copy: {
                bodyHtml: String(intro || ""),
                buttonLabel: String((nested.copy && nested.copy.buttonLabel) || "")
            },
            displayMode: nested.displayMode === "dropdown" ? "dropdown" : "buttons",
            choices: (Array.isArray(nested.choices) ? nested.choices : []).map(function(ch, idx) {
                return selectorChoiceLegacyToV2(ch || {}, idx);
            })
        };
    }
    /* Hotspot selector : pas de « zone fantôme » (menus/boutons invisibles). */
    if(action.type === "selector") action.visibility.clickWhenInvisible = true;
    return action;
}

function legacyRewardToV2(kind, src) {
    if(kind === "msg") {
        return legacyActionToV2("msg", { txt: src.f_ok_msg || src.okMsg || src.ok_msg || "" });
    }
    if(kind === "pick") {
        return legacyActionToV2("pick", {
            itemId: src.f_pick_id || src.pickId || "",
            itemName: src.f_pick_name || src.pickName || "",
            txt: src.f_pick_msg || src.pickMsg || ""
        });
    }
    return legacyActionToV2("scene", {
        target: src.f_target || src.target || "",
        transTxt: src.f_trans_txt || src.transTxt || "",
        transBtn: src.f_trans_btn || src.transBtn || "Continuer"
    });
}

function hotspotDomToV2(hsDiv) {
    if (typeof flushRichEditorsIn === "function") flushRichEditorsIn(hsDiv);
    var hId = parseInt(hsDiv.id.replace("hs_", ""), 10);
    var type = hsDiv.querySelector(".hs-type").value;
    var legacy = {};
    if(type === "msg") {
        legacy.txt = (hsDiv.querySelector(".f-txt") || { value: "" }).value;
    } else if(type === "scene") {
        legacy.target = (hsDiv.querySelector(".f-target") || { value: "" }).value;
        legacy.transTxt = (hsDiv.querySelector(".f-trans-txt") || { value: "" }).value;
        legacy.transBtn = (hsDiv.querySelector(".f-trans-btn") || { value: "Continuer" }).value;
    } else if(type === "pick") {
        legacy.itemId = (hsDiv.querySelector(".f-item-id") || { value: "" }).value;
        legacy.itemName = (hsDiv.querySelector(".f-item-name") || { value: "" }).value;
        legacy.txt = (hsDiv.querySelector(".f-pick-msg") || { value: "" }).value;
    } else if(type === "req") {
        legacy.itemId = (hsDiv.querySelector(".f-item-id") || { value: "" }).value;
        legacy.ko = (hsDiv.querySelector(".f-ko") || { value: "" }).value;
        legacy.f_req_action = (hsDiv.querySelector(".f-req-action") || { value: "scene" }).value;
        legacy.f_target = (hsDiv.querySelector(".f-target") || { value: "" }).value;
        legacy.f_trans_txt = (hsDiv.querySelector(".f-trans-txt") || { value: "" }).value;
        legacy.f_trans_btn = (hsDiv.querySelector(".f-trans-btn") || { value: "Continuer" }).value;
        legacy.f_ok_msg = (hsDiv.querySelector(".f-ok-msg") || { value: "" }).value;
        legacy.f_pick_id = (hsDiv.querySelector(".f-pick-id") || { value: "" }).value;
        legacy.f_pick_name = (hsDiv.querySelector(".f-pick-name") || { value: "" }).value;
        legacy.f_pick_msg = (hsDiv.querySelector(".f-pick-msg") || { value: "" }).value;
    } else if(type === "pwd") {
        legacy.enigmeTxt = (hsDiv.querySelector(".f-enigme-txt") || { value: "" }).value;
        legacy.pwd = (hsDiv.querySelector(".f-pwd") || { value: "" }).value;
        legacy.f_pwd_action = (hsDiv.querySelector(".f-pwd-action") || { value: "scene" }).value;
        legacy.f_target = (hsDiv.querySelector(".f-target") || { value: "" }).value;
        legacy.f_trans_txt = (hsDiv.querySelector(".f-trans-txt") || { value: "" }).value;
        legacy.f_trans_btn = (hsDiv.querySelector(".f-trans-btn") || { value: "Continuer" }).value;
        legacy.f_ok_msg = (hsDiv.querySelector(".f-ok-msg") || { value: "" }).value;
        legacy.f_pick_id = (hsDiv.querySelector(".f-pick-id") || { value: "" }).value;
        legacy.f_pick_name = (hsDiv.querySelector(".f-pick-name") || { value: "" }).value;
        legacy.f_pick_msg = (hsDiv.querySelector(".f-pick-msg") || { value: "" }).value;
    } else if(type === "selector") {
        legacy.nested = {
            title: (hsDiv.querySelector(".f-sel-title") || { value: "" }).value,
            introHtml: (hsDiv.querySelector(".f-sel-intro") || { value: "" }).value,
            displayMode: (hsDiv.querySelector(".f-sel-display") || { value: "buttons" }).value,
            choices: selectorChoicesFromTextarea(hsDiv, hId)
        };
    }
    legacy.requiresItem = (hsDiv.querySelector(".f-hs-req-item") || { value: "" }).value;
    legacy.f_hs_ghost_click = (hsDiv.querySelector(".f-hs-ghost-click") || { value: "yes" }).value;
    legacy.hiddenIfHasItem = (hsDiv.querySelector(".f-hs-hidden-if") || { value: "" }).value;
    legacy.sfxUrl = (hsDiv.querySelector(".f-sfx-url") || { value: "" }).value;
    legacy.sfxVolume = (hsDiv.querySelector(".f-sfx-vol") || { value: "" }).value;

    return {
        id: hsDiv.id,
        title: (hsDiv.querySelector(".hs-title") || { value: "" }).value,
        pitch: parseFloat((hsDiv.querySelector(".hs-pitch") || { value: "0" }).value || "0"),
        yaw: parseFloat((hsDiv.querySelector(".hs-yaw") || { value: "0" }).value || "0"),
        customCss: (hsDiv.querySelector(".hs-custom-css") || { value: "" }).value,
        appearance: {
            ui_w: (hsDiv.querySelector(".ui-w") || { value: "" }).value,
            ui_h: (hsDiv.querySelector(".ui-h") || { value: "" }).value,
            ui_shape: (hsDiv.querySelector(".ui-shape") || { value: "" }).value,
            ui_bgc: (hsDiv.querySelector(".ui-bgc") || { value: "" }).value,
            ui_bga: (hsDiv.querySelector(".ui-bga") || { value: "" }).value,
            ui_img: (hsDiv.querySelector(".ui-img") || { value: "" }).value,
            ui_brd_style: (hsDiv.querySelector(".ui-brd-style") || { value: "" }).value,
            ui_brd_w: (hsDiv.querySelector(".ui-brd-w") || { value: "" }).value,
            ui_brd_c: (hsDiv.querySelector(".ui-brd-c") || { value: "" }).value
        },
        action: legacyActionToV2(type, legacy)
    };
}

/**
 * Projet sauvegardé au format schéma v2 (action unifiée).
 */
function getCurrentProjectData() {
    if(!window.EditorCore) throw new Error("EditorCore non chargé.");
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
            "Ce projet référence des médias locaux (fichiers du bundle .escapegame ou importés). " +
                "Le fichier JSON ne contient pas les binaires : au prochain chargement, ces médias seront absents.\n\n" +
                "Pour conserver les fichiers avec le projet, utilisez « Sauvegarder le projet (.escapegame) ».\n\n" +
                "Télécharger le JSON quand même ?"
        );
        if (!proceed) return;
    }

    // Lance le téléchargement du fichier JSON
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const lien = document.createElement("a"); 
    lien.href = URL.createObjectURL(blob); 
    lien.download = "projet.json";
    document.body.appendChild(lien); 
    lien.click(); 
    document.body.removeChild(lien);
}

function actionV2ToLegacyChoice(action, label, idx) {
    var a = action || EditorCore.createDefaultAction("msg");
    var p = a.payload || {};
    var out = { label: label || ("Option " + (idx + 1)), actionType: a.type || "msg" };
    var c = p.copy || {};
    if(a.type === "msg") {
        out.txt = c.bodyHtml || "";
    } else if(a.type === "scene") {
        out.target = p.target || "";
        out.transTxt = c.bodyHtml || "";
        out.transBtn = c.buttonLabel || "Continuer";
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
            choices: (Array.isArray(n.choices) ? n.choices : []).map(function(ch, i) {
                return actionV2ToLegacyChoice(ch.action, ch.label, i);
            })
        };
    }
    if(a.visibility && a.visibility.requiresItem) out.requiresItem = a.visibility.requiresItem;
    if(a.visibility && a.visibility.hiddenIfHasItem) out.hiddenIfHasItem = a.visibility.hiddenIfHasItem;
    if(a.sfx && a.sfx.url) out.sfxUrl = a.sfx.url;
    if(a.sfx && a.sfx.volume !== undefined) out.sfxVolume = a.sfx.volume;
    return out;
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
        out.f_trans_btn = pc.buttonLabel || "Continuer";
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
            out.f_trans_btn = rc.buttonLabel || "Continuer";
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
            out.f_trans_btn = rpc.buttonLabel || "Continuer";
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

    document.getElementById("gameTitle").value = project.title || "Mon Super Jeu";

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
            alert(
                "Fichier invalide ou erreur au chargement : " +
                    (err && err.message ? err.message : String(err))
            );
            inputEl.value = "";
        }

        try {
            if (isZipArrayBuffer(buf)) {
                if (typeof JSZip === "undefined") {
                    fail(new Error("JSZip n’est pas chargé (CDN). Rechargez la page."));
                    return;
                }
                JSZip.loadAsync(buf)
                    .then(function (zip) {
                        var pj = zip.file("project.json");
                        if (!pj) throw new Error("project.json introuvable dans l’archive .escapegame.");
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

    if (typeof updateQuillTheme === "function") {
        updateQuillTheme();
    }
}
