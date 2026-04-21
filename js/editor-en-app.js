// --- Global state ---
// Counters: unique numeric ids for scenes and hotspots
let sceneIdCounter = 0; 
let hsIdCounter = 0;

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
        try {
            await localDraftManager.markSynchronizedAfterSave("bundle-save");
            await refreshLocalDraftStatusUi();
        } catch (eSync) {
            console.error("draft.error", eSync);
        }
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
var actionV2ToLegacyHotspotData = ActionMappers.actionV2ToLegacyHotspotData;
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
var EditorSharedTimerApi = window.EditorSharedTimer;
if (!EditorSharedTimerApi) {
    throw new Error("EditorSharedTimer unavailable (js/editor-shared-timer.js).");
}
var readTimerSettingsFromDom = EditorSharedTimerApi.readTimerSettingsFromDom;
var applyTimerSettingsToDom = EditorSharedTimerApi.applyTimerSettingsToDom;
var EditorSharedProjectSerializationApi = window.EditorSharedProjectSerialization;
if (!EditorSharedProjectSerializationApi) {
    throw new Error("EditorSharedProjectSerialization unavailable (js/editor-shared-project-serialization.js).");
}
var ProjectSerializer = EditorSharedProjectSerializationApi.createSerializer({
    EditorCore: window.EditorCore,
    hotspotDomToV2: hotspotDomToV2,
    document: document,
    readTimerSettings: readTimerSettingsFromDom
});
var getCurrentProjectData = ProjectSerializer.getCurrentProjectData;

var EditorSharedLocalDraftApi = window.EditorSharedLocalDraft;
if (!EditorSharedLocalDraftApi) {
    throw new Error("EditorSharedLocalDraft unavailable (js/editor-shared-local-draft.js).");
}
var localDraftManager = EditorSharedLocalDraftApi.createManager({
    getCurrentProjectData: getCurrentProjectData,
    eachPortableMediaUrlInProject: eachPortableMediaUrlInProject,
    rewritePortableUrlsInProjectClone: rewritePortableUrlsInProjectClone,
    getBlobOrFileForPortableUrl: getBlobOrFileForPortableUrl,
    registerBundleBlobUrl: registerBundleBlobUrl,
    bundleAssetsMap: window.bundleAssets
});
var EditorSharedLocalDraftUiApi = window.EditorSharedLocalDraftUi;
if (!EditorSharedLocalDraftUiApi) {
    throw new Error("EditorSharedLocalDraftUi unavailable (js/editor-shared-local-draft-ui.js).");
}
var localDraftUi = EditorSharedLocalDraftUiApi.createLocalDraftUi({
    document: document,
    manager: localDraftManager,
    applyLoadedProject: applyLoadedProject,
    autosaveDelayMs: 45000,
    openSuccessDelayMs: 60000,
    strings: {
        dateLocale: "en-GB",
        sourceBundle: "bundle",
        sourceFile: "file",
        sourceSession: "session",
        titleSave: "Save",
        titleLoad: "Load",
        titleMap: "Map",
        panelSaveTitle: "Local draft",
        panelLoadTitle: "Load",
        panelMapTitle: "Map",
        statusInit: "Initializing...",
        labelEnable: "Enable",
        labelLightMode: "Light mode (no media)",
        btnSnapshot: "Snapshot",
        btnClear: "Clear",
        btnSaveJson: "Save .json",
        btnSaveBundle: "Save .escapegame",
        loadHelp: "Load a project from a local file.",
        btnLoadFile: "Open .json / .escapegame",
        mapHelp: "Quick map access.",
        btnOpenMap: "Open map",
        btnCloseMap: "Close map",
        btnMapViewFocus: "Focus view",
        btnMapViewFull: "Full graph",
        btnMapViewTree: "Acyclic view",
        labelMapNarration: "Narration mode",
        statusUnavailable: "Local draft unavailable (IndexedDB blocked or unsupported).",
        statusNoEstimate: "IndexedDB without quota estimate in this browser.",
        statusStoragePrefix: "Storage: ",
        unitMo: "MB",
        statusWarnHigh: "High warning (>=90%): consider light mode.",
        statusWarnLow: "Warning (>=80%).",
        alertSnapshotFailPrefix: "Local snapshot failed: ",
        confirmClearDrafts: "Clear local drafts for this tab?",
        confirmIncompatiblePurge:
            "Incompatible local drafts from an older version were found ({count}). Ignore and delete them?",
        flagSync: "sync",
        flagLight: "light",
        untitledProject: "(Untitled)",
        labelScenes: "scene(s)",
        restorePromptHelp: "Enter a number to restore (leave empty to skip).",
        restorePromptTitle: "Local drafts found:",
        alertPartialRestorePrefix: "Partial restore: ",
        alertPartialRestoreSuffix: "missing media file(s). Check related fields."
    },
    actions: {
        saveJson: function () {
            saveProject();
        },
        saveBundle: function () {
            void saveProjectBundle();
        },
        triggerLoadFile: function () {
            var inp = document.getElementById("file-import");
            if (inp) inp.click();
        }
    }
});
var refreshLocalDraftStatusUi = localDraftUi.refreshStatusUi;
var noteLocalDraftDirty = localDraftUi.noteDirty;
var initLocalDraftFeature = localDraftUi.init;

var EditorSharedPreviewPickerApi = window.EditorSharedPreviewPicker;
if (!EditorSharedPreviewPickerApi) {
    throw new Error("EditorSharedPreviewPicker unavailable (js/editor-shared-preview-picker.js).");
}
var PreviewPickerApi = EditorSharedPreviewPickerApi.createPreviewPicker({
    document: document,
    pannellum: window.pannellum,
    messages: { missingImageAlert: "Missing image!" }
});
var openPicker = PreviewPickerApi.openPicker;
var validerCoordonnees = PreviewPickerApi.validerCoordonnees;
var closePicker = PreviewPickerApi.closePicker;
var previewScene = PreviewPickerApi.previewScene;
var closeScenePreview = PreviewPickerApi.closeScenePreview;

var EditorSharedDuplicationApi = window.EditorSharedDuplication;
if (!EditorSharedDuplicationApi) {
    throw new Error("EditorSharedDuplication unavailable (js/editor-shared-duplication.js).");
}
var DuplicationHelpers = EditorSharedDuplicationApi.createDuplicationHelpers({
    document: document,
    addHotspot: addHotspot,
    extractHotspotData: extractHotspotData,
    addScene: addScene,
    refreshAllSceneTargetSelects:
        typeof refreshAllSceneTargetSelects === "function" ? refreshAllSceneTargetSelects : undefined,
    strings: {
        duplicateHotspotPrompt: function (sceneList) {
            return (
                "Copy this hotspot to which scene?\n" +
                "(Leave empty to use the current scene)\n\n" +
                "Scenes:\n" +
                sceneList
            );
        },
        duplicateHotspotInvalidNumber: "Invalid number. Copied to the current scene.",
        sceneDefaultTitlePrefix: "Scene ",
        sceneIdCopySuffix: "_copy",
        sceneTitleCopySuffix: " (Copy)"
    }
});
var duplicateHotspot = DuplicationHelpers.duplicateHotspot;
var duplicateScene = DuplicationHelpers.duplicateScene;

/**
 * Hidden technical scene: map hotspots not yet attached to a playable scene (editor-only JSON).
 * @returns {number|null} numeric scene id for addHotspot
 */
function ensureEditorMapStagingScene() {
    var root = document.getElementById("scenes-container");
    if (!root || typeof addScene !== "function" || typeof EditorCore === "undefined") return null;
    var existing = root.querySelector(".scene-block[data-editor-map-staging=\"1\"]");
    if (existing) {
        var m = /^scene_(\d+)$/.exec(existing.id || "");
        return m ? parseInt(m[1], 10) : null;
    }
    var sid = addScene(
        "__editorMapStaging",
        EditorCore.DEFAULT_SCENE_PANORAMA_PLACEHOLDER_URL,
        "Unassigned (map)"
    );
    var block = document.getElementById("scene_" + sid);
    if (block) {
        block.setAttribute("data-editor-map-staging", "1");
        block.style.display = "none";
        block.style.maxHeight = "0";
        block.style.overflow = "hidden";
        block.style.margin = "0";
        block.style.padding = "0";
        try {
            var hdr = block.querySelector(".scene-header");
            if (hdr) hdr.style.display = "none";
            var bd = block.querySelector("[id^=\"scene_body_\"]");
            if (bd) bd.style.display = "none";
        } catch (e) {
            /* ignore */
        }
    }
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    return sid;
}
window.ensureEditorMapStagingScene = ensureEditorMapStagingScene;

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

/** Path B (React map): add a hotspot of the given kind; side panel only for msg / pick unless opts.openPanel. */
function addHotspotFromMapWithKind(sceneIndex, kind, opts) {
    opts = opts || {};
    var el;
    var sid;
    if (opts.addToMapStaging) {
        if (typeof ensureEditorMapStagingScene !== "function") return;
        sid = ensureEditorMapStagingScene();
        if (sid == null) return;
        el = document.getElementById("scene_" + sid);
    } else {
        if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
        var blocks = document.querySelectorAll("#scenes-container > .scene-block");
        el = blocks[sceneIndex];
        if (!el || !el.id) return;
        var m = /^scene_(\d+)$/.exec(el.id);
        if (!m) return;
        sid = parseInt(m[1], 10);
    }
    if (!el || typeof addHotspot !== "function") return;
    addHotspot(sid, null);
    var wrap = el.querySelector('[id^="hs-container-"]');
    var hss = wrap ? wrap.querySelectorAll(":scope > .hotspot-block") : null;
    var lastHs = hss && hss.length ? hss[hss.length - 1] : null;
    if (lastHs) {
        var hm = /^hs_(\d+)$/.exec(lastHs.id);
        var typeSel = lastHs.querySelector(".hs-type");
        var hid = hm ? parseInt(hm[1], 10) : 0;
        var kindOk = false;
        if (typeSel && kind) {
            for (var oi = 0; oi < typeSel.options.length; oi++) {
                if (typeSel.options[oi].value === kind) {
                    kindOk = true;
                    break;
                }
            }
        }
        if (typeSel && kind && kindOk) {
            typeSel.value = kind;
            if (typeof updateHsFields === "function" && hid) {
                updateHsFields(hid);
            }
            if (kind === "scene") {
                var trg = lastHs.querySelector(".f-target");
                if (trg) {
                    trg.value = "";
                    if (trg.dataset) trg.dataset.prevValue = "";
                    trg.dispatchEvent(new Event("input", { bubbles: true }));
                    trg.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
        }
    }
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
    if (kind === "scene" && lastHs) {
        var trg2 = lastHs.querySelector(".f-target");
        if (trg2) {
            trg2.value = "";
            if (trg2.dataset) trg2.dataset.prevValue = "";
            trg2.dispatchEvent(new Event("input", { bubbles: true }));
            trg2.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }
    if (kind === "selector" && lastHs) {
        var hmSel = /^hs_(\d+)$/.exec(lastHs.id);
        var hidSel = hmSel ? parseInt(hmSel[1], 10) : 0;
        var taSel = lastHs.querySelector(".f-sel-choices");
        if (taSel && hidSel) {
            taSel.value = "[]";
            taSel.dispatchEvent(new Event("input", { bubbles: true }));
            taSel.dispatchEvent(new Event("change", { bubbles: true }));
            if (typeof initSelectorChoicesForm === "function") {
                initSelectorChoicesForm(hidSel);
            }
        }
    }
    var openPanel =
        opts.openPanel !== undefined ? !!opts.openPanel : kind === "msg" || kind === "pick";
    if (openPanel && lastHs && typeof window.mountProjectMapSidePanelElement === "function") {
        window.mountProjectMapSidePanelElement(lastHs);
    }
}
window.addHotspotFromMapWithKind = addHotspotFromMapWithKind;

/** Path B: set « Go to scene » hotspot target from map drag (DOM scene index, .sc-id value). */
function applyMapHotspotSceneConnection(sceneIndex, hotspotIndex, targetSceneIndex) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    if (typeof targetSceneIndex !== "number" || targetSceneIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var sceneEl = blocks[sceneIndex];
    var tgtBlock = blocks[targetSceneIndex];
    if (!sceneEl || !tgtBlock) return;
    var wrap = sceneEl.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    var typeSel = hb.querySelector(".hs-type");
    if (!typeSel) return;
    if (typeSel.value !== "scene") {
        var hasSceneOpt = false;
        if (typeSel.options && typeSel.options.length) {
            for (var oi = 0; oi < typeSel.options.length; oi++) {
                if (typeSel.options[oi].value === "scene") {
                    hasSceneOpt = true;
                    break;
                }
            }
        }
        if (hasSceneOpt) {
            typeSel.value = "scene";
            var hidM = /^hs_(\d+)$/.exec(hb.id);
            var hidNum = hidM ? parseInt(hidM[1], 10) : 0;
            if (hidNum && typeof updateHsFields === "function") {
                updateHsFields(hidNum);
            }
        }
    }
    if (!typeSel || typeSel.value !== "scene") return;
    var scIdInp = tgtBlock.querySelector(".sc-id");
    var domTarget = scIdInp ? String(scIdInp.value || "").trim() : "";
    if (!domTarget) return;
    var ft = hb.querySelector(".f-target");
    if (!ft) return;
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    ft = hb.querySelector(".f-target");
    if (!ft) return;
    if (ft.tagName === "SELECT" || ft.tagName === "select") {
        ft.value = domTarget;
    } else {
        ft.value = domTarget;
    }
    ft.dispatchEvent(new Event("input", { bubbles: true }));
    ft.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.applyMapHotspotSceneConnection = applyMapHotspotSceneConnection;

/** Path B: move a hotspot DOM node from one scene to another (e.g. unassigned → playable scene). */
function attachHotspotToMapScene(fromSceneIndex, hotspotIndex, targetSceneIndex) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof fromSceneIndex !== "number" || fromSceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    if (typeof targetSceneIndex !== "number" || targetSceneIndex < 0) return;
    if (fromSceneIndex === targetSceneIndex) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var src = blocks[fromSceneIndex];
    var dst = blocks[targetSceneIndex];
    if (!src || !dst) return;
    if (dst.getAttribute("data-editor-map-staging") === "1") return;
    var wrap = src.querySelector('[id^="hs-container-"]');
    var dstWrap = dst.querySelector('[id^="hs-container-"]');
    if (!wrap || !dstWrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    dstWrap.appendChild(hb);
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.attachHotspotToMapScene = attachHotspotToMapScene;

/** Path B: move hotspot into map staging scene (editor-only), without deleting it. */
function detachHotspotToStaging(sceneIndex, hotspotIndex) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof ensureEditorMapStagingScene !== "function") return;
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var sceneEl = blocks[sceneIndex];
    if (!sceneEl || sceneEl.getAttribute("data-editor-map-staging") === "1") return;
    var wrap = sceneEl.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    var stSid = ensureEditorMapStagingScene();
    if (stSid == null) return;
    var stBlock = document.getElementById("scene_" + stSid);
    if (!stBlock) return;
    var stWrap = stBlock.querySelector('[id^="hs-container-"]');
    if (!stWrap) return;
    stWrap.appendChild(hb);
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.detachHotspotToStaging = detachHotspotToStaging;

function copyHotspotToMapScene(fromSceneIndex, hotspotIndex, toSceneIndex) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof fromSceneIndex !== "number" || fromSceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    if (typeof toSceneIndex !== "number" || toSceneIndex < 0) return;
    if (fromSceneIndex === toSceneIndex) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var src = blocks[fromSceneIndex];
    var dst = blocks[toSceneIndex];
    if (!src || !dst) return;
    if (dst.getAttribute("data-editor-map-staging") === "1") return;
    var wrap = src.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    var hm = /^hs_(\d+)$/.exec(hb.id);
    if (!hm) return;
    var hId = parseInt(hm[1], 10);
    var dstM = /^scene_(\d+)$/.exec(dst.id);
    if (!dstM) return;
    var targetSId = parseInt(dstM[1], 10);
    if (typeof addHotspot !== "function" || typeof extractHotspotData !== "function") return;
    addHotspot(targetSId, extractHotspotData(hId));
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.copyHotspotToMapScene = copyHotspotToMapScene;

/** Path B (React map): map `extractHotspotData` output to legacy selector `choices[]` row. */
function mapExtractedHotspotToSelectorChoiceLegacy(hs) {
    if (!hs || !hs.type) return null;
    var t = String(hs.type).trim();
    if (t === "selector") return null;
    var id = "choice_map_" + Date.now().toString(36) + "_" + String(Math.floor(Math.random() * 1e6));
    var label = (hs.hsTitle && String(hs.hsTitle).trim()) || "Choice";
    if (t === "msg") {
        return { id: id, label: label, actionType: "msg", txt: hs.f_txt != null ? String(hs.f_txt) : "" };
    }
    if (t === "scene") {
        return {
            id: id,
            label: label,
            actionType: "scene",
            target: hs.f_target != null ? String(hs.f_target) : "",
            transTxt: hs.f_trans_txt != null ? String(hs.f_trans_txt) : "",
            transBtn: hs.f_trans_btn != null ? String(hs.f_trans_btn) : ""
        };
    }
    if (t === "pick") {
        return {
            id: id,
            label: label,
            actionType: "pick",
            itemId: hs.f_pick_id != null ? String(hs.f_pick_id) : "",
            itemName: hs.f_pick_name != null ? String(hs.f_pick_name) : "",
            txt: hs.f_txt != null ? String(hs.f_txt) : ""
        };
    }
    if (t === "req") {
        return {
            id: id,
            label: label,
            actionType: "req",
            itemId: hs.f_item_id != null ? String(hs.f_item_id) : "",
            itemName: hs.f_item_name != null ? String(hs.f_item_name) : "",
            ko: hs.f_ko != null ? String(hs.f_ko) : "",
            f_req_action: hs.f_req_action != null ? String(hs.f_req_action) : "scene",
            target: hs.f_ok != null ? String(hs.f_ok) : "",
            f_ok_msg: hs.f_ok_msg != null ? String(hs.f_ok_msg) : ""
        };
    }
    if (t === "pwd") {
        return {
            id: id,
            label: label,
            actionType: "pwd",
            enigmeTxt: hs.f_enigme_txt != null ? String(hs.f_enigme_txt) : "",
            pwd: hs.f_pwd != null ? String(hs.f_pwd) : "",
            f_pwd_action: hs.f_pwd_action != null ? String(hs.f_pwd_action) : "scene",
            target: hs.f_ok != null ? String(hs.f_ok) : "",
            f_ok_msg: hs.f_ok_msg != null ? String(hs.f_ok_msg) : ""
        };
    }
    return { id: id, label: label, actionType: "msg", txt: "" };
}

/** Path B: map-queue orphan → selector hotspot: append root `choices[]`, remove orphan DOM. */
function promoteMapOrphanHotspotIntoSelectorRoot(fromSceneIndex, fromHotspotIndex, toSceneIndex, toHotspotIndex) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (
        typeof fromSceneIndex !== "number" ||
        fromSceneIndex < 0 ||
        typeof fromHotspotIndex !== "number" ||
        fromHotspotIndex < 0 ||
        typeof toSceneIndex !== "number" ||
        toSceneIndex < 0 ||
        typeof toHotspotIndex !== "number" ||
        toHotspotIndex < 0
    ) {
        return;
    }
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var srcEl = blocks[fromSceneIndex];
    var dstEl = blocks[toSceneIndex];
    if (!srcEl || !dstEl) return;
    var dstStaging = dstEl.getAttribute("data-editor-map-staging") === "1";
    var srcStaging = srcEl.getAttribute("data-editor-map-staging") === "1";
    if (dstStaging && !srcStaging) return;
    var sw = srcEl.querySelector('[id^="hs-container-"]');
    var dw = dstEl.querySelector('[id^="hs-container-"]');
    if (!sw || !dw) return;
    var sb = sw.querySelectorAll(":scope > .hotspot-block")[fromHotspotIndex];
    var tb = dw.querySelectorAll(":scope > .hotspot-block")[toHotspotIndex];
    if (!sb || !tb) return;
    var typeSrc = sb.querySelector(".hs-type");
    var typeDst = tb.querySelector(".hs-type");
    if (!typeSrc || !typeDst) return;
    if (typeDst.value !== "selector") return;
    if (typeSrc.value === "selector") return;
    var hm = /^hs_(\d+)$/.exec(sb.id);
    if (!hm) return;
    var hIdSrc = parseInt(hm[1], 10);
    if (typeof extractHotspotData !== "function") return;
    var hs = extractHotspotData(hIdSrc);
    if (!hs) return;
    var ch = mapExtractedHotspotToSelectorChoiceLegacy(hs);
    if (!ch) return;
    var hmT = /^hs_(\d+)$/.exec(tb.id);
    if (!hmT) return;
    var hIdDst = parseInt(hmT[1], 10);
    var ta = tb.querySelector(".f-sel-choices");
    if (!ta) return;
    var arr = [];
    try {
        arr = JSON.parse(ta.value || "[]");
    } catch (e) {
        arr = [];
    }
    if (!Array.isArray(arr)) arr = [];
    arr.push(ch);
    ta.value = JSON.stringify(arr, null, 2);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof initSelectorChoicesForm === "function") {
        initSelectorChoicesForm(hIdDst);
    }
    sb.remove();
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.promoteMapOrphanHotspotIntoSelectorRoot = promoteMapOrphanHotspotIntoSelectorRoot;

function focusSceneMediaFromMap(sceneIndex, field) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var el = blocks[sceneIndex];
    if (!el) return;
    var sel = field === "ambiance" ? ".sc-audio" : ".sc-img";
    var inp = el.querySelector(sel);
    if (inp && typeof inp.focus === "function") {
        try {
            inp.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
            inp.scrollIntoView();
        }
        inp.focus();
    }
}
window.focusSceneMediaFromMap = focusSceneMediaFromMap;

function applyMapResourceVolumeFromReactNode(opts) {
    if (!opts || typeof opts !== "object") return;
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    var vol = Number(opts.volume);
    if (isNaN(vol)) return;
    vol = Math.max(0, Math.min(1, vol));
    var rt = opts.resourceType != null ? String(opts.resourceType) : "";
    if (rt === "globalMusic") {
        var g = document.getElementById("globalAudioVol");
        if (g) {
            g.value = String(vol);
            g.dispatchEvent(new Event("input", { bubbles: true }));
            g.dispatchEvent(new Event("change", { bubbles: true }));
        }
    } else if (typeof opts.sceneIndex === "number" && opts.sceneIndex >= 0) {
        var blocks = document.querySelectorAll("#scenes-container > .scene-block");
        var sceneEl = blocks[opts.sceneIndex];
        if (!sceneEl) return;
        if (rt === "sceneAmbiance") {
            var v = sceneEl.querySelector(".sc-audio-vol");
            if (v) {
                v.value = String(vol);
                v.dispatchEvent(new Event("input", { bubbles: true }));
                v.dispatchEvent(new Event("change", { bubbles: true }));
            }
        } else if (rt === "hotspotSfx" && typeof opts.hotspotIndex === "number") {
            var wrap = sceneEl.querySelector('[id^="hs-container-"]');
            if (!wrap) return;
            var hss = wrap.querySelectorAll(":scope > .hotspot-block");
            var hb = hss[opts.hotspotIndex];
            if (!hb) return;
            var sfxVol = hb.querySelector(".f-sfx-vol");
            if (sfxVol) {
                sfxVol.value = String(vol);
                sfxVol.dispatchEvent(new Event("input", { bubbles: true }));
                sfxVol.dispatchEvent(new Event("change", { bubbles: true }));
            }
        } else if (rt === "choiceSfx" && typeof opts.hotspotIndex === "number" && opts.choicePath) {
            var path = Array.isArray(opts.choicePath)
                ? opts.choicePath
                : typeof opts.choicePath === "number"
                  ? [opts.choicePath]
                  : [];
            if (path.length === 0) return;
            var wrap2 = sceneEl.querySelector('[id^="hs-container-"]');
            if (!wrap2) return;
            var hss2 = wrap2.querySelectorAll(":scope > .hotspot-block");
            var hb2 = hss2[opts.hotspotIndex];
            if (!hb2) return;
            var idMatch = /^hs_(\d+)$/.exec(hb2.id);
            var hId = idMatch ? parseInt(idMatch[1], 10) : NaN;
            if (isNaN(hId)) return;
            var root = hb2.querySelector("#sel_choices_root_" + hId);
            if (!root) return;
            var container = root;
            var card = null;
            for (var pi = 0; pi < path.length; pi++) {
                var cards = container.querySelectorAll(":scope > .sel-choice-card");
                card = cards[path[pi]];
                if (!card) return;
                if (pi < path.length - 1) {
                    var nestedList =
                        card.querySelector(".sel-nested-list") ||
                        card.querySelector(".sel-reward-nested-list");
                    if (!nestedList) return;
                    container = nestedList;
                }
            }
            if (!card) return;
            var cv = card.querySelector(".f-sfx-vol");
            if (cv) {
                cv.value = String(vol);
                cv.dispatchEvent(new Event("input", { bubbles: true }));
                cv.dispatchEvent(new Event("change", { bubbles: true }));
            }
            if (typeof syncSelectorChoicesToTextarea === "function") {
                syncSelectorChoicesToTextarea(hId);
            }
        }
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.applyMapResourceVolumeFromReactNode = applyMapResourceVolumeFromReactNode;

/** Path B: connect a scene to a media resource (ambiance audio / panorama image). */
function applyMapSceneMediaConnection(sceneIndex, resourceType, mediaUrl, mediaVolume) {
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var sceneEl = blocks[sceneIndex];
    if (!sceneEl) return;
    var url = mediaUrl != null ? String(mediaUrl).trim() : "";
    if (!url) return;
    if (resourceType === "sceneAmbiance") {
        var aud = sceneEl.querySelector(".sc-audio");
        if (aud) {
            aud.value = url;
            aud.dispatchEvent(new Event("input", { bubbles: true }));
            aud.dispatchEvent(new Event("change", { bubbles: true }));
        }
        var vol = sceneEl.querySelector(".sc-audio-vol");
        if (vol && mediaVolume !== undefined && mediaVolume !== null && mediaVolume !== "") {
            var n = Number(mediaVolume);
            if (!isNaN(n)) {
                vol.value = String(Math.max(0, Math.min(1, n)));
                vol.dispatchEvent(new Event("input", { bubbles: true }));
                vol.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
    } else if (resourceType === "sceneImage") {
        var img = sceneEl.querySelector(".sc-img");
        if (img) {
            img.value = url;
            img.dispatchEvent(new Event("input", { bubbles: true }));
            img.dispatchEvent(new Event("change", { bubbles: true }));
        }
    } else {
        return;
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.applyMapSceneMediaConnection = applyMapSceneMediaConnection;

/** Path B: connect a hotspot to an SFX resource (url + volume). */
function applyMapHotspotSfxConnection(sceneIndex, hotspotIndex, mediaUrl, mediaVolume) {
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var sceneEl = blocks[sceneIndex];
    if (!sceneEl) return;
    var wrap = sceneEl.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    var url = mediaUrl != null ? String(mediaUrl).trim() : "";
    if (!url) return;
    var sfxUrl = hb.querySelector(".f-sfx-url");
    if (sfxUrl) {
        sfxUrl.value = url;
        sfxUrl.dispatchEvent(new Event("input", { bubbles: true }));
        sfxUrl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    var sfxVol = hb.querySelector(".f-sfx-vol");
    if (sfxVol && mediaVolume !== undefined && mediaVolume !== null && mediaVolume !== "") {
        var n = Number(mediaVolume);
        if (!isNaN(n)) {
            sfxVol.value = String(Math.max(0, Math.min(1, n)));
            sfxVol.dispatchEvent(new Event("input", { bubbles: true }));
            sfxVol.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.applyMapHotspotSfxConnection = applyMapHotspotSfxConnection;

/** Path B (React map): apply SFX url/volume to a selector menu choice. */
function applyMapSelectorChoiceSfxConnection(
    sceneIndex,
    hotspotIndex,
    choicePath,
    mediaUrl,
    mediaVolume
) {
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    var path = Array.isArray(choicePath)
        ? choicePath
        : typeof choicePath === "number" && !isNaN(choicePath)
          ? [choicePath]
          : [];
    if (path.length === 0 || path.some(function (x) { return typeof x !== "number" || x < 0; })) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var sceneEl = blocks[sceneIndex];
    if (!sceneEl) return;
    var wrap = sceneEl.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    var url = mediaUrl != null ? String(mediaUrl).trim() : "";
    if (!url) return;
    var idMatch = /^hs_(\d+)$/.exec(hb.id);
    var hId = idMatch ? parseInt(idMatch[1], 10) : NaN;
    if (isNaN(hId)) return;
    var root = hb.querySelector("#sel_choices_root_" + hId);
    if (!root) return;
    var container = root;
    var card = null;
    for (var pi = 0; pi < path.length; pi++) {
        var cards = container.querySelectorAll(":scope > .sel-choice-card");
        card = cards[path[pi]];
        if (!card) return;
        if (pi < path.length - 1) {
            var nestedList =
                card.querySelector(".sel-nested-list") ||
                card.querySelector(".sel-reward-nested-list");
            if (!nestedList) return;
            container = nestedList;
        }
    }
    if (!card) return;
    var sfxUrl = card.querySelector(".f-sfx-url");
    if (sfxUrl) {
        sfxUrl.value = url;
        sfxUrl.dispatchEvent(new Event("input", { bubbles: true }));
        sfxUrl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    var sfxVol = card.querySelector(".f-sfx-vol");
    if (sfxVol && mediaVolume !== undefined && mediaVolume !== null && mediaVolume !== "") {
        var n = Number(mediaVolume);
        if (!isNaN(n)) {
            sfxVol.value = String(Math.max(0, Math.min(1, n)));
            sfxVol.dispatchEvent(new Event("input", { bubbles: true }));
            sfxVol.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }
    if (typeof syncSelectorChoicesToTextarea === "function") {
        syncSelectorChoicesToTextarea(hId);
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.applyMapSelectorChoiceSfxConnection = applyMapSelectorChoiceSfxConnection;

function mapSelectorChoiceNavigateCard(hb, choicePath) {
    var path = Array.isArray(choicePath)
        ? choicePath
        : typeof choicePath === "number" && !isNaN(choicePath)
          ? [choicePath]
          : [];
    if (path.length === 0 || path.some(function (x) { return typeof x !== "number" || x < 0; })) {
        return null;
    }
    var idMatch = /^hs_(\d+)$/.exec(hb.id);
    var hId = idMatch ? parseInt(idMatch[1], 10) : NaN;
    if (isNaN(hId)) return null;
    var root = hb.querySelector("#sel_choices_root_" + hId);
    if (!root) return null;
    var container = root;
    var card = null;
    for (var pi = 0; pi < path.length; pi++) {
        var cards = container.querySelectorAll(":scope > .sel-choice-card");
        card = cards[path[pi]];
        if (!card) return null;
        if (pi < path.length - 1) {
            var nestedList =
                card.querySelector(".sel-nested-list") ||
                card.querySelector(".sel-reward-nested-list");
            if (!nestedList) return null;
            container = nestedList;
        }
    }
    return { card: card, hId: hId };
}

/** Path B (React map): set selector choice action to « go to scene » (scene id = .sc-id value). */
function applyMapSelectorChoiceSceneTarget(sceneIndex, hotspotIndex, choicePath, targetDomSceneId) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    if (typeof hotspotIndex !== "number" || hotspotIndex < 0) return;
    var domTarget = targetDomSceneId != null ? String(targetDomSceneId).trim() : "";
    if (!domTarget) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var sceneEl = blocks[sceneIndex];
    if (!sceneEl) return;
    var wrap = sceneEl.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    var typeSel = hb.querySelector(".hs-type");
    if (!typeSel || typeSel.value !== "selector") return;
    var nav = mapSelectorChoiceNavigateCard(hb, choicePath);
    if (!nav) return;
    var card = nav.card;
    var hId = nav.hId;
    var selAct = card.querySelector(".sel-action-type");
    if (!selAct) return;
    if (selAct.value !== "scene") {
        selAct.value = "scene";
        selectorRebuildActionFields(card, { target: "", transTxt: "", transBtn: "" }, hId);
    }
    var tgt = card.querySelector(".sel-scene-target");
    if (!tgt) return;
    if (tgt.tagName === "SELECT" || tgt.tagName === "select") {
        tgt.value = domTarget;
    } else {
        tgt.value = domTarget;
    }
    tgt.dispatchEvent(new Event("input", { bubbles: true }));
    tgt.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof syncSelectorChoicesToTextarea === "function") {
        syncSelectorChoicesToTextarea(hId);
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}

function applyMapSelectorChoiceSceneConnection(
    sceneIndex,
    hotspotIndex,
    choicePath,
    targetSceneIndex
) {
    if (typeof targetSceneIndex !== "number" || targetSceneIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var tgtBlock = blocks[targetSceneIndex];
    if (!tgtBlock) return;
    if (tgtBlock.getAttribute("data-editor-map-staging") === "1") return;
    var scIdInp = tgtBlock.querySelector(".sc-id");
    var domTarget = scIdInp ? String(scIdInp.value || "").trim() : "";
    if (!domTarget) return;
    applyMapSelectorChoiceSceneTarget(sceneIndex, hotspotIndex, choicePath, domTarget);
}
window.applyMapSelectorChoiceSceneTarget = applyMapSelectorChoiceSceneTarget;
window.applyMapSelectorChoiceSceneConnection = applyMapSelectorChoiceSceneConnection;

/** Path B: set player start scene (`startSceneId` = `.sc-id` value). */
function setProjectStartSceneIdFromMap(sceneIndex) {
    if (typeof window.restoreProjectMapSidePanelDomOnly === "function") {
        window.restoreProjectMapSidePanelDomOnly();
    }
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    var el = blocks[sceneIndex];
    if (!el || el.getAttribute("data-editor-map-staging") === "1") return;
    var idInp = el.querySelector(".sc-id");
    var v = idInp ? String(idInp.value || "").trim() : "";
    if (!v) return;
    var hid = document.getElementById("project-start-scene-id");
    if (hid) hid.value = v;
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.setProjectStartSceneIdFromMap = setProjectStartSceneIdFromMap;

/** Path B (React map): add a message hotspot (legacy + panel). */
function addHotspotSkeletonFromMapSceneIndex(sceneIndex) {
    addHotspotFromMapWithKind(sceneIndex, "msg", { openPanel: true });
}
window.addHotspotSkeletonFromMapSceneIndex = addHotspotSkeletonFromMapSceneIndex;

/** Path B: delete the scene at DOM index (requires at least two scenes). */
function deleteSceneFromMapByIndex(sceneIndex) {
    if (typeof sceneIndex !== "number" || sceneIndex < 0) return;
    var blocks = document.querySelectorAll("#scenes-container > .scene-block");
    if (blocks.length <= 1) {
        alert("Cannot delete the only scene in the project.");
        return;
    }
    var el = blocks[sceneIndex];
    if (!el) return;
    if (el.getAttribute("data-editor-map-staging") === "1") {
        alert(
            "The map staging area (technical) cannot be deleted. Remove its hotspots or leave it as is."
        );
        return;
    }
    if (
        !confirm(
            "Delete this scene and all its hotspots? This cannot be undone."
        )
    ) {
        return;
    }
    el.remove();
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.deleteSceneFromMapByIndex = deleteSceneFromMapByIndex;

/** Path B: delete hotspot at (sceneIndex, hotspotIndex) in the DOM. */
function deleteHotspotFromMapIndices(sceneIndex, hotspotIndex) {
    if (typeof sceneIndex !== "number" || sceneIndex < 0 || typeof hotspotIndex !== "number" || hotspotIndex < 0) {
        return;
    }
    var sceneEl = document.querySelectorAll("#scenes-container > .scene-block")[sceneIndex];
    if (!sceneEl) return;
    var wrap = sceneEl.querySelector('[id^="hs-container-"]');
    if (!wrap) return;
    var hss = wrap.querySelectorAll(":scope > .hotspot-block");
    var hb = hss[hotspotIndex];
    if (!hb) return;
    if (!confirm("Delete this hotspot? This cannot be undone.")) return;
    hb.remove();
    if (typeof refreshAllSceneTargetSelects === "function") {
        refreshAllSceneTargetSelects();
    }
    if (typeof refreshProjectMapGraphInPlace === "function") {
        refreshProjectMapGraphInPlace();
    }
}
window.deleteHotspotFromMapIndices = deleteHotspotFromMapIndices;

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
                <div class="col col-wide"><label>360° image (https URL or local file):</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="sc-img" style="flex:1;min-width:0" value="${scImgVal}" oninput="updateScenePreview(this)"><button type="button" class="btn-icon" title="Pick a local image file" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'image/*,.jpg,.jpeg,.png,.webp')">📎</button></div></div>
            </div>
            <details class="scene-optional-details">
                <summary class="scene-optional-details-summary">Optional settings (ambiance, volume, scene pressure timer)</summary>
                <div class="scene-optional-details-inner">
            <div class="row">
                <div class="col col-wide"><label>🎵 Ambient audio (mp3 URL):</label><div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" class="sc-audio" style="flex:1;min-width:0" placeholder="Optional"><button type="button" class="btn-icon" title="Pick a local audio file" onclick="openBundleLocalMediaPicker(this.previousElementSibling, 'audio/*,.mp3,.ogg,.wav,.m4a')">📎</button><button type="button" class="btn-icon" title="Play at the volume set on the line below" onclick="editorAudioPreviewToggle(this.closest('.scene-block').querySelector('.sc-audio'), this.closest('.scene-block').querySelector('.sc-audio-vol'), this)">▶</button></div></div>
            </div>
            <div class="row">
                <div class="col col-wide"><label>Ambient volume (0–1):</label><input type="range" class="sc-audio-vol" min="0" max="1" step="0.05" value="1" style="width:100%;max-width:320px;" title="Relative volume of scene ambiance in the player mix"></div>
            </div>
            <h4 class="scene-block-heading" style="margin:14px 0 8px 0;">⏱ Scene pressure timer (optional)</h4>
            <div class="row">
                <div class="col col-wide">
                    <label style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" class="sc-timer-override-enabled" onchange="var b=this.closest('.scene-block').querySelector('.sc-timer-override-fields');if(b)b.style.display=this.checked?'block':'none'">
                        Enable a countdown while this scene is active
                    </label>
                </div>
            </div>
            <div class="sc-timer-override-fields" style="display:none">
                <div class="row">
                    <div class="col"><label>Duration (seconds):</label><input type="number" class="sc-timer-override-seconds" min="1" step="1" value="60"></div>
                    <div class="col"><label>When time runs out:</label>
                        <select class="sc-timer-override-on-expire" onchange="var r=this.closest('.scene-block');var t=r.querySelector('.sc-timer-override-row-target');var m=r.querySelector('.sc-timer-override-row-msg');var v=this.value;if(t)t.style.display=v==='gotoScene'?'flex':'none';if(m)m.style.display=v==='showMessage'?'flex':'none';">
                            <option value="gameOver">Game Over (global screen)</option>
                            <option value="gotoScene">Go to scene</option>
                            <option value="showMessage">Show message</option>
                        </select>
                    </div>
                </div>
                <div class="row sc-timer-override-row-target" style="display:none">
                    <div class="col col-wide"><label>Target scene ID:</label><input type="text" class="sc-timer-override-target-scene" placeholder="e.g. hallway"></div>
                </div>
                <div class="row sc-timer-override-row-msg" style="display:none">
                    <div class="col col-wide"><label>Message (HTML):</label><textarea class="sc-timer-override-message-html" rows="2" placeholder="<p>…</p>"></textarea></div>
                </div>
            </div>
                </div>
            </details>
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
        let fields = ['f-txt', 'f-target', 'f-trans-txt', 'f-trans-btn', 'f-enigme-txt', 'f-pwd', 'f-pwd-action', 'f-req-action', 'f-ok-msg', 'f-pick-id', 'f-pick-name', 'f-pick-msg', 'f-item-id', 'f-item-name', 'f-ok', 'f-ko', 'f-sel-title', 'f-sel-intro', 'f-sel-display', 'f-sel-choices', 'f-reward-sel-title', 'f-reward-sel-intro', 'f-reward-sel-display', 'f-reward-sel-choices', 'f-hs-req-item', 'f-hs-ghost-click', 'f-hs-hidden-if', 'f-sfx-url', 'f-sfx-vol'];
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
        if (hsData.type === "req" || hsData.type === "pwd") {
            initHotspotRewardSelectorForm(hId);
        }
    } else {
        var _tNewEn = hsDiv.querySelector(".hs-type").value;
        if (_tNewEn === "req" || _tNewEn === "pwd") {
            initHotspotRewardSelectorForm(hId);
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
    var Ex = typeof window !== "undefined" ? window.EditorSharedExportText : undefined;
    function rf(el) {
        return el && Ex && typeof Ex.readExportAwareFieldValue === "function"
            ? Ex.readExportAwareFieldValue(el)
            : el && el.value !== undefined
              ? el.value
              : "";
    }
    var typeEl = getOwnChoiceField(card, ".sel-action-type");
    var type = typeEl ? typeEl.value : "msg";
    var labelEl = getOwnChoiceField(card, ".sel-label");
    var label = ((labelEl && labelEl.value) || "").trim();
    var out = { label: label, actionType: type };
    if(type === "msg") {
        var t = getOwnChoiceField(card, ".sel-msg-txt");
        out.txt = rf(t);
    } else if(type === "scene") {
        var scTarget = getOwnChoiceField(card, ".sel-scene-target");
        var scTrans = getOwnChoiceField(card, ".sel-scene-trans");
        var scBtn = getOwnChoiceField(card, ".sel-scene-btn");
        out.target = scTarget ? scTarget.value : "";
        out.transTxt = rf(scTrans);
        out.transBtn = rf(scBtn);
    } else if(type === "pick") {
        var pkId = getOwnChoiceField(card, ".sel-pick-id");
        var pkName = getOwnChoiceField(card, ".sel-pick-name");
        var pkTxt = getOwnChoiceField(card, ".sel-pick-txt");
        out.itemId = pkId ? pkId.value : "";
        out.itemName = pkName ? pkName.value : "";
        out.txt = rf(pkTxt);
    } else if(type === "selector") {
        var nestedListEl = card.querySelector(".sel-action-fields .sel-nested-list");
        var nest = {
            title: rf(getOwnChoiceField(card, ".sel-nested-title")),
            introHtml: rf(getOwnChoiceField(card, ".sel-nested-intro")),
            choices: collectChoicesFromList(nestedListEl)
        };
        var dm = getOwnChoiceField(card, ".sel-nested-display");
        if(dm && dm.value === "dropdown") nest.displayMode = "dropdown";
        out.nested = nest;
    } else if(type === "req") {
        var ri = getOwnChoiceField(card, ".sel-req-item-id");
        var rk = getOwnChoiceField(card, ".sel-req-ko");
        out.itemId = ri ? ri.value.trim() : "";
        out.ko = rf(rk);
        var rts = getOwnChoiceField(card, ".sel-req-reward-type");
        var rknd = rts ? rts.value : "scene";
        out.f_req_action = rknd;
        if(rknd === "scene") {
            var rt = getOwnChoiceField(card, ".sel-reward-scene-target");
            var rtx = getOwnChoiceField(card, ".sel-reward-scene-trans");
            var rtb = getOwnChoiceField(card, ".sel-reward-scene-btn");
            out.target = rt ? rt.value : "";
            out.transTxt = rf(rtx);
            out.transBtn = rtb && rtb.value.trim() ? rtb.value : "";
        } else if(rknd === "msg") {
            var om = getOwnChoiceField(card, ".sel-reward-ok-msg");
            out.f_ok_msg = rf(om);
        } else if(rknd === "pick") {
            var pid = getOwnChoiceField(card, ".sel-reward-pick-id");
            var pnm = getOwnChoiceField(card, ".sel-reward-pick-name");
            var ptx = getOwnChoiceField(card, ".sel-reward-pick-msg");
            out.f_pick_id = pid ? pid.value : "";
            out.f_pick_name = pnm ? pnm.value : "";
            out.f_pick_msg = rf(ptx);
        } else if(rknd === "selector") {
            var rlist = card.querySelector(".sel-reward-nested-list");
            out.rewardNested = {
                title: rf(getOwnChoiceField(card, ".sel-reward-title")),
                introHtml: rf(getOwnChoiceField(card, ".sel-reward-intro")),
                choices: collectChoicesFromList(rlist)
            };
            var rdm = getOwnChoiceField(card, ".sel-reward-display");
            if(rdm && rdm.value === "dropdown") out.rewardNested.displayMode = "dropdown";
        }
    } else if(type === "pwd") {
        var pe = getOwnChoiceField(card, ".sel-pwd-enigme");
        var pp = getOwnChoiceField(card, ".sel-pwd-answer");
        out.enigmeTxt = rf(pe);
        out.pwd = pp ? pp.value.trim() : "";
        var pts = getOwnChoiceField(card, ".sel-pwd-reward-type");
        var pknd = pts ? pts.value : "scene";
        out.f_pwd_action = pknd;
        if(pknd === "scene") {
            var pt = getOwnChoiceField(card, ".sel-reward-scene-target");
            var ptx2 = getOwnChoiceField(card, ".sel-reward-scene-trans");
            var ptb2 = getOwnChoiceField(card, ".sel-reward-scene-btn");
            out.target = pt ? pt.value : "";
            out.transTxt = rf(ptx2);
            out.transBtn = ptb2 && ptb2.value.trim() ? ptb2.value : "";
        } else if(pknd === "msg") {
            var om2 = getOwnChoiceField(card, ".sel-reward-ok-msg");
            out.f_ok_msg = rf(om2);
        } else if(pknd === "pick") {
            var pid2 = getOwnChoiceField(card, ".sel-reward-pick-id");
            var pnm2 = getOwnChoiceField(card, ".sel-reward-pick-name");
            var ptx3 = getOwnChoiceField(card, ".sel-reward-pick-msg");
            out.f_pick_id = pid2 ? pid2.value : "";
            out.f_pick_name = pnm2 ? pnm2.value : "";
            out.f_pick_msg = rf(ptx3);
        } else if(pknd === "selector") {
            var rlist2 = card.querySelector(".sel-reward-nested-list");
            out.rewardNested = {
                title: rf(getOwnChoiceField(card, ".sel-reward-title")),
                introHtml: rf(getOwnChoiceField(card, ".sel-reward-intro")),
                choices: collectChoicesFromList(rlist2)
            };
            var rdm2 = getOwnChoiceField(card, ".sel-reward-display");
            if(rdm2 && rdm2.value === "dropdown") out.rewardNested.displayMode = "dropdown";
        }
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
    if(!list || !card) return;
    if(!list.classList.contains("sel-nested-list") && !list.classList.contains("sel-reward-nested-list")) return;
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

/** Reward scene/msg/pick/selector for a selector choice (required item or password). */
function appendSelectorChoiceRewardUI(container, ch, hsIdNum, depth, mode) {
    ch = ch || {};
    var canRewardSelector = depth < SELECTOR_MAX_DEPTH - 1;
    var rk = mode === "req" ? "f_req_action" : "f_pwd_action";
    var act = ch[rk] || "scene";
    if (ch.rewardNested && typeof ch.rewardNested === "object") act = "selector";

    var lbRw = document.createElement("label");
    lbRw.style.marginTop = "12px";
    lbRw.style.fontWeight = "600";
    lbRw.style.display = "block";
    lbRw.style.color = "#27ae60";
    lbRw.textContent =
        mode === "req" ? "If the required item is present — reward:" : "When the password is correct:";
    var selRw = document.createElement("select");
    selRw.className = mode === "req" ? "sel-req-reward-type" : "sel-pwd-reward-type";
    [["scene", "Change scene"], ["msg", "Show message"], ["pick", "Give item"]].forEach(function (o) {
        var oc = document.createElement("option");
        oc.value = o[0];
        oc.textContent = o[1];
        if (act === o[0]) oc.selected = true;
        selRw.appendChild(oc);
    });
    if (canRewardSelector) {
        var osel = document.createElement("option");
        osel.value = "selector";
        osel.textContent = "Open sub-menu (selector)";
        if (act === "selector") osel.selected = true;
        selRw.appendChild(osel);
    }
    container.appendChild(lbRw);
    container.appendChild(selRw);

    var pan = document.createElement("div");
    pan.className = "sel-reward-panel";
    pan.style.marginTop = "10px";

    var segScene = document.createElement("div");
    segScene.className = "sel-rew-seg";
    segScene.setAttribute("data-reward", "scene");
    segScene.style.display = act === "scene" ? "block" : "none";
    if (typeof buildSceneTargetSelect === "function") {
        segScene.innerHTML =
            "<label>Target scene:</label>" +
            buildSceneTargetSelect("sel-reward-scene-target", ch.target || "") +
            "<label>Transition text:</label><div class=\"wysiwyg-wrap\"><textarea class=\"sel-reward-scene-trans editor-rich-text\" rows=\"2\"></textarea></div><label>Button label:</label><input type=\"text\" class=\"sel-reward-scene-btn\" placeholder=\"Continue\">";
    } else {
        segScene.innerHTML =
            "<label>Target scene:</label><input type=\"text\" class=\"sel-reward-scene-target\" value=\"\">" +
            "<label>Transition text:</label><div class=\"wysiwyg-wrap\"><textarea class=\"sel-reward-scene-trans editor-rich-text\" rows=\"2\"></textarea></div><label>Button label:</label><input type=\"text\" class=\"sel-reward-scene-btn\" placeholder=\"Continue\">";
        segScene.querySelector(".sel-reward-scene-target").value = ch.target || "";
    }
    var tr = segScene.querySelector(".sel-reward-scene-trans");
    if (tr) tr.value = ch.transTxt || "";
    var tb = segScene.querySelector(".sel-reward-scene-btn");
    if (tb) tb.value = ch.transBtn != null && String(ch.transBtn).trim() !== "" ? ch.transBtn : "";
    pan.appendChild(segScene);

    var segMsg = document.createElement("div");
    segMsg.className = "sel-rew-seg";
    segMsg.setAttribute("data-reward", "msg");
    segMsg.style.display = act === "msg" ? "block" : "none";
    var lm = document.createElement("label");
    lm.textContent = "Message:";
    var wm = document.createElement("div");
    wm.className = "wysiwyg-wrap";
    var tm = document.createElement("textarea");
    tm.className = "sel-reward-ok-msg editor-rich-text";
    tm.rows = 2;
    tm.value = ch.f_ok_msg || ch.okMsg || "";
    wm.appendChild(tm);
    segMsg.appendChild(lm);
    segMsg.appendChild(wm);
    pan.appendChild(segMsg);

    var segPick = document.createElement("div");
    segPick.className = "sel-rew-seg";
    segPick.setAttribute("data-reward", "pick");
    segPick.style.display = act === "pick" ? "block" : "none";
    var rp = document.createElement("div");
    rp.className = "row";
    rp.innerHTML =
        "<div class=\"col\"><label>New item ID:</label><input type=\"text\" class=\"sel-reward-pick-id\" value=\"\"></div><div class=\"col\"><label>Name:</label><input type=\"text\" class=\"sel-reward-pick-name\" value=\"\"></div>";
    rp.querySelector(".sel-reward-pick-id").value = ch.f_pick_id || ch.pickId || "";
    rp.querySelector(".sel-reward-pick-name").value = ch.f_pick_name || ch.pickName || "";
    var lp = document.createElement("label");
    lp.textContent = "Pickup message:";
    var wp = document.createElement("div");
    wp.className = "wysiwyg-wrap";
    var tp = document.createElement("textarea");
    tp.className = "sel-reward-pick-msg editor-rich-text";
    tp.rows = 2;
    tp.value = ch.f_pick_msg || ch.pickMsg || "";
    wp.appendChild(tp);
    segPick.appendChild(rp);
    segPick.appendChild(lp);
    segPick.appendChild(wp);
    pan.appendChild(segPick);

    var segSel = document.createElement("div");
    segSel.className = "sel-rew-seg";
    segSel.setAttribute("data-reward", "selector");
    segSel.style.display = act === "selector" ? "block" : "none";
    var rn = ch.rewardNested || {};
    var lt = document.createElement("label");
    lt.textContent = "Sub-menu title:";
    var it = document.createElement("input");
    it.type = "text";
    it.className = "sel-reward-title";
    it.value = rn.title || "";
    var li = document.createElement("label");
    li.textContent = "Introduction (optional):";
    var wi = document.createElement("div");
    wi.className = "wysiwyg-wrap";
    var ti = document.createElement("textarea");
    ti.className = "sel-reward-intro editor-rich-text";
    ti.rows = 2;
    ti.value = rn.introHtml || (rn.copy && rn.copy.bodyHtml) || "";
    wi.appendChild(ti);
    var ld = document.createElement("label");
    ld.textContent = "Sub-choices layout:";
    var sd = document.createElement("select");
    sd.className = "sel-reward-display";
    sd.innerHTML =
        "<option value=\"buttons\">Buttons</option><option value=\"dropdown\">Dropdown + OK</option>";
    if (rn.displayMode === "dropdown") sd.value = "dropdown";
    var nestedList = document.createElement("div");
    nestedList.className = "sel-choices-list sel-reward-nested-list";
    var arr = Array.isArray(rn.choices) && rn.choices.length ? rn.choices : [getDefaultChoice()];
    if (!isNaN(hsIdNum)) {
        arr.forEach(function (nch) {
            nestedList.appendChild(renderChoiceCardElement(nch, hsIdNum, depth + 1));
        });
    }
    var btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn-add-hs";
    btnAdd.textContent = "+ Add choice to sub-menu";
    btnAdd.onclick = function () {
        selectorAddNestedChoice(btnAdd);
    };
    segSel.appendChild(lt);
    segSel.appendChild(it);
    segSel.appendChild(li);
    segSel.appendChild(wi);
    segSel.appendChild(ld);
    segSel.appendChild(sd);
    segSel.appendChild(nestedList);
    segSel.appendChild(btnAdd);
    pan.appendChild(segSel);

    container.appendChild(pan);

    function updRewardSeg() {
        var v = selRw.value;
        pan.querySelectorAll(".sel-rew-seg").forEach(function (seg) {
            seg.style.display = seg.getAttribute("data-reward") === v ? "block" : "none";
        });
    }
    selRw.addEventListener("change", updRewardSeg);
    updRewardSeg();
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
        i3.placeholder = "Continue";
        i3.value = ch.transBtn != null && String(ch.transBtn).trim() !== "" ? ch.transBtn : "";
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
    } else if(type === "req") {
        var lItem = document.createElement("label");
        lItem.textContent = "Required item ID:";
        var iItem = document.createElement("input");
        iItem.type = "text";
        iItem.className = "sel-req-item-id";
        iItem.style.width = "100%";
        iItem.style.maxWidth = "100%";
        iItem.style.boxSizing = "border-box";
        iItem.value = ch.itemId || "";
        container.appendChild(lItem);
        container.appendChild(iItem);
        var lKo = document.createElement("label");
        lKo.style.color = "#c0392b";
        lKo.style.marginTop = "8px";
        lKo.style.display = "block";
        lKo.textContent = "If the item is missing (message):";
        var wKo = document.createElement("div");
        wKo.className = "wysiwyg-wrap";
        var tKo = document.createElement("textarea");
        tKo.className = "sel-req-ko editor-rich-text";
        tKo.rows = 2;
        tKo.value = ch.ko || "";
        wKo.appendChild(tKo);
        container.appendChild(lKo);
        container.appendChild(wKo);
        appendSelectorChoiceRewardUI(container, ch, hsIdNum, depth, "req");
    } else if(type === "pwd") {
        var lPe = document.createElement("label");
        lPe.textContent = "Riddle / prompt:";
        var wPe = document.createElement("div");
        wPe.className = "wysiwyg-wrap";
        var tPe = document.createElement("textarea");
        tPe.className = "sel-pwd-enigme editor-rich-text";
        tPe.rows = 2;
        tPe.value = ch.enigmeTxt || "";
        wPe.appendChild(tPe);
        container.appendChild(lPe);
        container.appendChild(wPe);
        var lPa = document.createElement("label");
        lPa.textContent = "Expected answer:";
        var iPa = document.createElement("input");
        iPa.type = "text";
        iPa.className = "sel-pwd-answer";
        iPa.style.width = "100%";
        iPa.style.boxSizing = "border-box";
        iPa.value = ch.pwd || "";
        container.appendChild(lPa);
        container.appendChild(iPa);
        appendSelectorChoiceRewardUI(container, ch, hsIdNum, depth, "pwd");
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
    if (ch.label === "New choice") {
        inpL.value = "";
        inpL.placeholder = "New choice";
    } else {
        inpL.value = ch.label || "";
    }

    var lblA = document.createElement("label");
    lblA.textContent = "Action:";
    var selA = document.createElement("select");
    selA.className = "sel-action-type";
    var opts = [
        ["msg", "Show message"],
        ["scene", "Go to another scene"],
        ["pick", "Pick up an item"],
        ["req", "Required item"],
        ["pwd", "Password"]
    ];
    if (depth < SELECTOR_MAX_DEPTH - 1) {
        opts.push(["selector", "Sub-menu (nested)"]);
    }
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
    // Safety net: in form mode (readonly textarea), selector choice controls must stay clickable.
    var formUi = document.getElementById("selector_form_ui_" + hId);
    if (formUi && ta.hasAttribute("readonly")) {
        formUi.style.pointerEvents = "auto";
        if (formUi.style.opacity === "0.35") formUi.style.opacity = "1";
    }
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

function syncHotspotRewardSelectorJSON(hId) {
    var root = document.getElementById("reward_sel_root_" + hId);
    var ta = document.querySelector("#hs_" + hId + " .f-reward-sel-choices");
    if (!root || !ta) return;
    var arr = collectChoicesFromList(root);
    ta.value = JSON.stringify(arr, null, 2);
}

function initHotspotRewardSelectorForm(hId) {
    var hsDiv = document.getElementById("hs_" + hId);
    var root = document.getElementById("reward_sel_root_" + hId);
    var ta = hsDiv && hsDiv.querySelector(".f-reward-sel-choices");
    if (!hsDiv || !root || !ta) return;
    if (typeof destroyRichEditorsIn === "function") destroyRichEditorsIn(root);
    var arr;
    try {
        arr = JSON.parse(ta.value.trim());
    } catch (e) {
        arr = [];
    }
    if (!Array.isArray(arr) || arr.length === 0) arr = getDefaultSelectorChoices();
    root.innerHTML = "";
    arr.forEach(function (ch) {
        root.appendChild(renderChoiceCardElement(ch, hId, 0));
    });
    var wrap = document.getElementById("fields_" + hId);
    if (wrap) {
        var sync = function () {
            syncHotspotRewardSelectorJSON(hId);
        };
        wrap.removeEventListener("input", wrap._hsRwSync, true);
        wrap.removeEventListener("change", wrap._hsRwSync, true);
        wrap._hsRwSync = sync;
        wrap.addEventListener("input", sync, true);
        wrap.addEventListener("change", sync, true);
    }
    if (typeof initRichEditorsIn === "function") initRichEditorsIn(root);
    syncHotspotRewardSelectorJSON(hId);
}

function hotspotRewardSelectorAddChoice(hId) {
    var root = document.getElementById("reward_sel_root_" + hId);
    if (!root) return;
    root.appendChild(renderChoiceCardElement(getDefaultChoice(), hId, 0));
    syncHotspotRewardSelectorJSON(hId);
}

window.syncHotspotRewardSelectorJSON = syncHotspotRewardSelectorJSON;

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
        container.innerHTML = `<label>Displayed text:</label><div class="wysiwyg-wrap"><textarea class="f-txt editor-rich-text" rows="3" placeholder="Well done."></textarea></div>${hsAdvancedHtml}`;
    }
    else if(type === 'pick') {
        container.innerHTML = `<div class="row"><div class="col"><label>Item ID:</label><input type="text" class="f-item-id" value="key"></div><div class="col"><label>Name:</label><input type="text" class="f-item-name" value="Golden key"></div></div><label>Narration:</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2" placeholder="You find a key."></textarea></div>${hsAdvancedHtml}`;
    }
    else if(type === 'req') {
        container.innerHTML = `
        <label>Required item ID:</label><input type="text" class="f-item-id" value="key">
        <label style="color:red;">If missing:</label><div class="wysiwyg-wrap"><textarea class="f-ko editor-rich-text" rows="2" placeholder="Locked."></textarea></div>
        <label style="margin-top:10px; color:#27ae60;"><b>If player has item:</b></label>
        <select class="f-req-action" onchange="document.getElementById('req_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Change scene</option><option value="msg">Show message</option><option value="pick">Give new item</option>
            <option value="selector">Open choice menu (selector)</option>
        </select>
        <div id="req_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#req_res_${hId} .s-scene, #req_res_${hId} .s-msg, #req_res_${hId} .s-pick, #req_res_${hId} .s-reward-selector { display: none; } #req_res_${hId}.res-scene .s-scene { display: block; } #req_res_${hId}.res-msg .s-msg { display: block; } #req_res_${hId}.res-pick .s-pick { display: block; } #req_res_${hId}.res-selector .s-reward-selector { display: block; }</style>
            <div class="s-scene"><label>Go to scene:</label>${sceneSel}<label>Transition text:</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Button:</label><input type="text" class="f-trans-btn" value="" placeholder="Enter"></div>
            <div class="s-msg"><label>Message:</label><div class="wysiwyg-wrap"><textarea class="f-ok-msg editor-rich-text" rows="2" placeholder="Unlocked!"></textarea></div></div>
            <div class="s-pick"><div class="row"><div class="col"><label>New item ID:</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>New name:</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Find message:</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2" placeholder="Found!"></textarea></div></div>
            <div class="s-reward-selector">
                <label>Reward menu title:</label><input type="text" class="f-reward-sel-title" value="" placeholder="Menu">
                <label>Introduction (optional):</label><div class="wysiwyg-wrap"><textarea class="f-reward-sel-intro editor-rich-text" rows="2"></textarea></div>
                <label>Choice layout:</label>
                <select class="f-reward-sel-display"><option value="buttons" selected>Buttons</option><option value="dropdown">Dropdown + OK</option></select>
                <p style="margin:8px 0 4px 0;font-size:0.9em;color:#555;">Unlocked sub-menu choices:</p>
                <div id="reward_sel_root_${hId}" class="sel-choices-list sel-choices-reward-root"></div>
                <button type="button" class="btn-add-hs" onclick="hotspotRewardSelectorAddChoice(${hId})">+ Add choice</button>
                <textarea class="f-reward-sel-choices css-editor" rows="4" readonly style="display:none;font-family:Consolas,monospace;font-size:11px;"></textarea>
            </div>
        </div>${hsAdvancedHtml}`;
    }
    else if(type === 'scene') {
        container.innerHTML = `<label>Go to scene:</label>${sceneSel}<label style="color:#2980b9;">Transition text:</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Button:</label><input type="text" class="f-trans-btn" value="" placeholder="Continue">${hsAdvancedHtml}`;
    }
    else if(type === 'pwd') {
        container.innerHTML = `
        <label>Puzzle / question:</label><div class="wysiwyg-wrap"><textarea class="f-enigme-txt editor-rich-text" rows="2" placeholder="Code:"></textarea></div>
        <label>Expected answer:</label><input type="text" class="f-pwd" value="1234">
        <label style="margin-top:10px;"><b>When solved:</b></label>
        <select class="f-pwd-action" onchange="document.getElementById('pwd_res_${hId}').className = 'res-' + this.value">
            <option value="scene">Change scene</option><option value="msg">Show message</option><option value="pick">Give item</option>
            <option value="selector">Open choice menu (selector)</option>
        </select>
        <div id="pwd_res_${hId}" class="res-scene" style="margin-top:10px;">
            <style>#pwd_res_${hId} .s-scene, #pwd_res_${hId} .s-msg, #pwd_res_${hId} .s-pick, #pwd_res_${hId} .s-reward-selector { display: none; } #pwd_res_${hId}.res-scene .s-scene { display: block; } #pwd_res_${hId}.res-msg .s-msg { display: block; } #pwd_res_${hId}.res-pick .s-pick { display: block; } #pwd_res_${hId}.res-selector .s-reward-selector { display: block; }</style>
            <div class="s-scene"><label>Go to scene:</label>${sceneSel}<label>Transition text:</label><div class="wysiwyg-wrap"><textarea class="f-trans-txt editor-rich-text" rows="2"></textarea></div><label>Button:</label><input type="text" class="f-trans-btn" value="" placeholder="Enter"></div>
            <div class="s-msg"><label>Message:</label><div class="wysiwyg-wrap"><textarea class="f-ok-msg editor-rich-text" rows="2" placeholder="Unlocked!"></textarea></div></div>
            <div class="s-pick"><div class="row"><div class="col"><label>Item ID:</label><input type="text" class="f-pick-id" value="doc"></div><div class="col"><label>Name:</label><input type="text" class="f-pick-name" value="Document"></div></div><label>Find message:</label><div class="wysiwyg-wrap"><textarea class="f-pick-msg editor-rich-text" rows="2" placeholder="Found."></textarea></div></div>
            <div class="s-reward-selector">
                <label>Reward menu title:</label><input type="text" class="f-reward-sel-title" value="" placeholder="Menu">
                <label>Introduction (optional):</label><div class="wysiwyg-wrap"><textarea class="f-reward-sel-intro editor-rich-text" rows="2"></textarea></div>
                <label>Choice layout:</label>
                <select class="f-reward-sel-display"><option value="buttons" selected>Buttons</option><option value="dropdown">Dropdown + OK</option></select>
                <p style="margin:8px 0 4px 0;font-size:0.9em;color:#555;">Unlocked sub-menu choices:</p>
                <div id="reward_sel_root_${hId}" class="sel-choices-list sel-choices-reward-root"></div>
                <button type="button" class="btn-add-hs" onclick="hotspotRewardSelectorAddChoice(${hId})">+ Add choice</button>
                <textarea class="f-reward-sel-choices css-editor" rows="4" readonly style="display:none;font-family:Consolas,monospace;font-size:11px;"></textarea>
            </div>
        </div>${hsAdvancedHtml}`;
    }
    else if(type === 'selector') {
        var defaultSelJson = JSON.stringify(getDefaultSelectorChoices(), null, 2);
        container.innerHTML = `
        <label>Menu title:</label><input type="text" class="f-sel-title" value="" placeholder="Choose an action">
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
    localDraftManager
        .markSynchronizedAfterSave("json-save")
        .then(refreshLocalDraftStatusUi)
        .catch(function (e) {
            console.error("draft.error", e);
        });
}

function applyLoadedProject(project) {
    document.getElementById("scenes-container").innerHTML = "";
    sceneIdCounter = 0;
    hsIdCounter = 0;

    document.getElementById("gameTitle").value = project.title || "My awesome game";
    var pStartEl = document.getElementById("project-start-scene-id");
    if (pStartEl) {
        pStartEl.value = project.startSceneId != null ? String(project.startSceneId).trim() : "";
    }

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
    var psmEl = document.getElementById("playerSaveMode");
    if (psmEl) {
        var mode = project.playerSave && project.playerSave.mode ? String(project.playerSave.mode) : "manual";
        if (mode !== "none" && mode !== "auto") mode = "manual";
        psmEl.value = mode;
    }
    applyTimerSettingsToDom(document, project);

    var rawScenes = project.scenes || [];
    var gameScenes = [];
    var stagingHotspots = [];
    for (var sxi = 0; sxi < rawScenes.length; sxi++) {
        var rs = rawScenes[sxi];
        if (rs && rs.editorOnly) {
            (rs.hotspots || []).forEach(function (h) {
                stagingHotspots.push(h);
            });
        } else {
            gameScenes.push(rs);
        }
    }

    gameScenes.forEach(function (scene) {
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

        if (scDiv) {
            var tov =
                typeof EditorCore !== "undefined" && EditorCore.normalizeSceneTimerOverride
                    ? EditorCore.normalizeSceneTimerOverride(scene.timerOverride)
                    : scene.timerOverride || {};
            var tEn = scDiv.querySelector(".sc-timer-override-enabled");
            var tFld = scDiv.querySelector(".sc-timer-override-fields");
            var tSec = scDiv.querySelector(".sc-timer-override-seconds");
            var tExp = scDiv.querySelector(".sc-timer-override-on-expire");
            var tTgt = scDiv.querySelector(".sc-timer-override-target-scene");
            var tMsg = scDiv.querySelector(".sc-timer-override-message-html");
            if (tEn) tEn.checked = !!tov.enabled;
            if (tFld) tFld.style.display = tov.enabled ? "block" : "none";
            if (tSec) tSec.value = String(tov.seconds != null && !isNaN(Number(tov.seconds)) ? tov.seconds : 60);
            if (tExp) {
                tExp.value =
                    tov.onExpire === "gotoScene" || tov.onExpire === "showMessage" ? tov.onExpire : "gameOver";
            }
            if (tTgt) tTgt.value = tov.targetScene || "";
            if (tMsg) tMsg.value = tov.messageHtml || "";
            var rowT = scDiv.querySelector(".sc-timer-override-row-target");
            var rowM = scDiv.querySelector(".sc-timer-override-row-msg");
            var ev = tov.onExpire === "gotoScene" || tov.onExpire === "showMessage" ? tov.onExpire : "gameOver";
            if (rowT) rowT.style.display = ev === "gotoScene" ? "flex" : "none";
            if (rowM) rowM.style.display = ev === "showMessage" ? "flex" : "none";
            var optDetails = scDiv.querySelector(".scene-optional-details");
            if (optDetails && optDetails instanceof HTMLDetailsElement) {
                var ambIn =
                    scDiv.querySelector(".sc-audio") && String(scDiv.querySelector(".sc-audio").value || "").trim();
                var avOpt = scDiv.querySelector(".sc-audio-vol");
                var volTweak = avOpt && Math.abs(Number(avOpt.value) - 1) > 0.001;
                optDetails.open = !!(tov.enabled || ambIn || volTweak);
            }
        }

        (scene.hotspots || []).forEach(function (hs) {
            addHotspot(sId, actionV2ToLegacyHotspotData(hs));
        });
    });
    if (stagingHotspots.length > 0) {
        var stSid = ensureEditorMapStagingScene();
        if (stSid != null) {
            stagingHotspots.forEach(function (hs) {
                addHotspot(stSid, actionV2ToLegacyHotspotData(hs));
            });
        }
    }
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
                            localDraftManager.setSourceHint("bundle");
                            localDraftManager.captureSnapshot("force").catch(function (eCap) {
                                console.error("draft.error", eCap);
                            });
                            return refreshLocalDraftStatusUi();
                        }).then(function () {
                            inputEl.value = "";
                        });
                    })
                    .catch(fail);
            } else {
                var text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
                var project = EditorCore.parseProjectJSON(text);
                revokeEditorBundleSession();
                applyLoadedProject(project);
                localDraftManager.setSourceHint("file");
                localDraftManager
                    .captureSnapshot("force")
                    .then(refreshLocalDraftStatusUi)
                    .catch(function (eCap) {
                        console.error("draft.error", eCap);
                    });
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

(function initEndScreenRichEditors() {
    var root = document.getElementById("end-screens-form-container");
    if (root && typeof initRichEditorsIn === "function") {
        initRichEditorsIn(root);
    }
})();

window.addEventListener("load", function () {
    setTimeout(function () {
        initLocalDraftFeature();
    }, 80);
});
