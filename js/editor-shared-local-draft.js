/**
 * Shared local draft manager (FR/EN):
 * - IndexedDB snapshots
 * - blob media dedup
 * - per-tab retention
 */
(function (global) {
    "use strict";

    var DB_NAME = "escape360-editor-local-drafts";
    var DB_VERSION = 1;
    var DRAFTS_STORE = "drafts";
    var ASSETS_STORE = "assets";
    var DRAFT_SCHEMA_VERSION = 1;
    var DEFAULT_ENABLED_KEY = "escape360:draft:enabled";
    var DEFAULT_LIGHT_KEY = "escape360:draft:light-mode";
    var DEFAULT_TAB_KEY = "escape360:draft:tab-id";

    function reqAsPromise(req) {
        return new Promise(function (resolve, reject) {
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error || new Error("IndexedDB request error"));
            };
        });
    }

    function txDone(tx) {
        return new Promise(function (resolve, reject) {
            tx.oncomplete = function () {
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error || new Error("IndexedDB transaction error"));
            };
            tx.onabort = function () {
                reject(tx.error || new Error("IndexedDB transaction aborted"));
            };
        });
    }

    function openDraftDb() {
        return new Promise(function (resolve, reject) {
            if (!("indexedDB" in global)) {
                reject(new Error("IndexedDB unsupported"));
                return;
            }
            var req = global.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (event) {
                var db = event.target.result;
                var drafts = db.objectStoreNames.contains(DRAFTS_STORE)
                    ? req.transaction.objectStore(DRAFTS_STORE)
                    : db.createObjectStore(DRAFTS_STORE, { keyPath: "id" });
                if (!drafts.indexNames.contains("byTabSavedAt")) {
                    drafts.createIndex("byTabSavedAt", ["tabId", "savedAt"], { unique: false });
                }
                if (!drafts.indexNames.contains("bySavedAt")) {
                    drafts.createIndex("bySavedAt", "savedAt", { unique: false });
                }

                if (!db.objectStoreNames.contains(ASSETS_STORE)) {
                    db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
                }
            };
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error || new Error("Failed to open IndexedDB"));
            };
        });
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function randomId() {
        return Math.random().toString(36).slice(2, 10);
    }

    function makeTabId(tabStorageKey) {
        try {
            var cur = global.sessionStorage.getItem(tabStorageKey);
            if (cur) return cur;
            var next = "tab_" + Date.now().toString(36) + "_" + randomId();
            global.sessionStorage.setItem(tabStorageKey, next);
            return next;
        } catch (e) {
            return "tab_" + Date.now().toString(36) + "_" + randomId();
        }
    }

    function safeJsonClone(x) {
        return JSON.parse(JSON.stringify(x));
    }

    function bytesToMo(v) {
        return Number(v || 0) / (1024 * 1024);
    }

    function toAssetToken(assetId, nameHint) {
        var n = encodeURIComponent(String(nameHint || "asset.bin"));
        return "./draftasset/" + encodeURIComponent(assetId) + "/" + n;
    }

    function parseAssetToken(url) {
        var s = String(url || "").trim();
        var m = s.match(/^\.\/draftasset\/([^/]+)\/(.+)$/);
        if (!m) return null;
        try {
            return {
                id: decodeURIComponent(m[1]),
                nameHint: decodeURIComponent(m[2] || "asset.bin")
            };
        } catch (e) {
            return null;
        }
    }

    function toMissingToken(nameHint) {
        return "./draftmissing/" + encodeURIComponent(String(nameHint || "asset.bin"));
    }

    function isMissingToken(url) {
        return /^\.\/draftmissing\//.test(String(url || "").trim());
    }

    function deriveNameHint(url, blob) {
        if (blob && blob.name) return blob.name;
        var t = String(url || "").trim();
        var parts = t.split(/[\\/]/);
        var last = parts[parts.length - 1] || "asset.bin";
        return last.length > 0 ? last : "asset.bin";
    }

    async function digestBlobId(blob) {
        if (!blob) return "asset_" + randomId();
        if (global.crypto && global.crypto.subtle && typeof blob.arrayBuffer === "function") {
            try {
                var ab = await blob.arrayBuffer();
                var dig = await global.crypto.subtle.digest("SHA-256", ab);
                var arr = Array.from(new Uint8Array(dig));
                var hex = arr
                    .map(function (b) {
                        return b.toString(16).padStart(2, "0");
                    })
                    .join("");
                return "sha256:" + hex + ":" + String(blob.size || 0);
            } catch (e) {}
        }
        return (
            "fallback:" +
            String(blob.size || 0) +
            ":" +
            String(blob.type || "") +
            ":" +
            String(blob.name || "") +
            ":" +
            String(blob.lastModified || 0)
        );
    }

    async function estimateStorage() {
        if (!global.navigator || !global.navigator.storage || !global.navigator.storage.estimate) {
            return { supported: false, used: 0, quota: 0, ratio: 0 };
        }
        var est = await global.navigator.storage.estimate();
        var used = Number(est && est.usage ? est.usage : 0);
        var quota = Number(est && est.quota ? est.quota : 0);
        var ratio = quota > 0 ? used / quota : 0;
        return {
            supported: true,
            used: used,
            quota: quota,
            ratio: ratio,
            usedMo: bytesToMo(used),
            quotaMo: bytesToMo(quota)
        };
    }

    function createManager(opts) {
        opts = opts || {};
        if (typeof opts.getCurrentProjectData !== "function") {
            throw new Error("LocalDraftManager requires getCurrentProjectData()");
        }
        if (typeof opts.eachPortableMediaUrlInProject !== "function") {
            throw new Error("LocalDraftManager requires eachPortableMediaUrlInProject()");
        }
        if (typeof opts.rewritePortableUrlsInProjectClone !== "function") {
            throw new Error("LocalDraftManager requires rewritePortableUrlsInProjectClone()");
        }
        if (typeof opts.getBlobOrFileForPortableUrl !== "function") {
            throw new Error("LocalDraftManager requires getBlobOrFileForPortableUrl()");
        }

        var enabledKey = opts.enabledKey || DEFAULT_ENABLED_KEY;
        var lightModeKey = opts.lightModeKey || DEFAULT_LIGHT_KEY;
        var tabStorageKey = opts.tabStorageKey || DEFAULT_TAB_KEY;
        var tabId = makeTabId(tabStorageKey);
        var dbPromise = openDraftDb();
        var lastContentFingerprint = "";
        var activeDraftId = null;
        var sourceHint = "none";

        function log(kind, payload) {
            try {
                if (payload !== undefined) console.info(kind, payload);
                else console.info(kind);
            } catch (e) {}
        }

        function setOptOutDisabled(disabled) {
            try {
                global.localStorage.setItem(enabledKey, disabled ? "0" : "1");
            } catch (e) {}
        }

        function isEnabled() {
            try {
                return global.localStorage.getItem(enabledKey) !== "0";
            } catch (e) {
                return true;
            }
        }

        function setLightMode(enabled) {
            try {
                global.localStorage.setItem(lightModeKey, enabled ? "1" : "0");
            } catch (e) {}
        }

        function isLightMode() {
            try {
                return global.localStorage.getItem(lightModeKey) === "1";
            } catch (e) {
                return false;
            }
        }

        function setSourceHint(next) {
            sourceHint = String(next || "none").trim() || "none";
        }

        async function getAllDrafts() {
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readonly");
            var store = tx.objectStore(DRAFTS_STORE);
            var all = await reqAsPromise(store.getAll());
            await txDone(tx);
            all.sort(function (a, b) {
                return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
            });
            return all;
        }

        async function getDraftById(id) {
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readonly");
            var rec = await reqAsPromise(tx.objectStore(DRAFTS_STORE).get(id));
            await txDone(tx);
            return rec || null;
        }

        async function saveAssetBlob(blob, nameHint) {
            var assetId = await digestBlobId(blob);
            var db = await dbPromise;
            var tx = db.transaction([ASSETS_STORE], "readwrite");
            var store = tx.objectStore(ASSETS_STORE);
            var existing = await reqAsPromise(store.get(assetId));
            if (!existing) {
                await reqAsPromise(
                    store.put({
                        id: assetId,
                        blob: blob,
                        size: Number(blob.size || 0),
                        type: String(blob.type || ""),
                        nameHint: String(nameHint || "asset.bin"),
                        updatedAt: nowIso()
                    })
                );
            } else {
                existing.updatedAt = nowIso();
                if (!existing.nameHint && nameHint) existing.nameHint = String(nameHint);
                await reqAsPromise(store.put(existing));
            }
            await txDone(tx);
            return assetId;
        }

        async function cleanupUnreferencedAssets() {
            var db = await dbPromise;
            var txR = db.transaction([DRAFTS_STORE], "readonly");
            var drafts = await reqAsPromise(txR.objectStore(DRAFTS_STORE).getAll());
            await txDone(txR);
            var used = {};
            (drafts || []).forEach(function (d) {
                (d.assetIds || []).forEach(function (aid) {
                    used[String(aid)] = true;
                });
            });
            var txW = db.transaction([ASSETS_STORE], "readwrite");
            var store = txW.objectStore(ASSETS_STORE);
            var assets = await reqAsPromise(store.getAll());
            for (var i = 0; i < assets.length; i++) {
                var a = assets[i];
                if (!used[String(a.id)]) {
                    await reqAsPromise(store.delete(a.id));
                }
            }
            await txDone(txW);
        }

        async function retainPerTabMax2(tab) {
            var all = await getAllDrafts();
            var same = all.filter(function (d) {
                return d.tabId === tab;
            });
            var keepActive = same.find(function (d) {
                return d.status === "active";
            });
            var keepSynced = same.find(function (d) {
                return d.status === "synchronized";
            });
            var keep = {};
            if (keepActive) keep[keepActive.id] = true;
            if (keepSynced) keep[keepSynced.id] = true;
            var toDelete = same.filter(function (d) {
                return !keep[d.id];
            });
            if (toDelete.length === 0) return;
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readwrite");
            var store = tx.objectStore(DRAFTS_STORE);
            for (var i = 0; i < toDelete.length; i++) {
                await reqAsPromise(store.delete(toDelete[i].id));
            }
            await txDone(tx);
            await cleanupUnreferencedAssets();
        }

        async function putDraftRecord(record) {
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readwrite");
            await reqAsPromise(tx.objectStore(DRAFTS_STORE).put(record));
            await txDone(tx);
        }

        async function captureSnapshot(reason) {
            if (!isEnabled()) return null;
            var project = opts.getCurrentProjectData();
            var clone = safeJsonClone(project);
            var mediaMap = {};
            var assetSet = {};
            var lightMode = isLightMode();
            var seenUrls = {};
            var urls = [];
            opts.eachPortableMediaUrlInProject(clone, function (u) {
                var t = String(u || "").trim();
                if (!t || seenUrls[t]) return;
                seenUrls[t] = true;
                urls.push(t);
            });
            for (var i = 0; i < urls.length; i++) {
                var src = urls[i];
                var blob = opts.getBlobOrFileForPortableUrl(src);
                if (!blob) continue;
                var nameHint = deriveNameHint(src, blob);
                if (lightMode) {
                    mediaMap[src] = toMissingToken(nameHint);
                    continue;
                }
                var aid = await saveAssetBlob(blob, nameHint);
                assetSet[aid] = true;
                mediaMap[src] = toAssetToken(aid, nameHint);
            }

            opts.rewritePortableUrlsInProjectClone(clone, function (value) {
                var t = String(value || "").trim();
                return mediaMap[t] || value;
            });

            var fp = JSON.stringify({
                t: clone && clone.title ? clone.title : "",
                n: clone && clone.scenes ? clone.scenes.length : 0,
                s: JSON.stringify(clone).length
            });
            if (fp === lastContentFingerprint && reason !== "force") {
                return null;
            }
            lastContentFingerprint = fp;

            var savedAt = nowIso();
            var all = await getAllDrafts();
            var previousActive = all.find(function (d) {
                return d.tabId === tabId && d.status === "active";
            });
            var draft = {
                id: "draft_" + Date.now().toString(36) + "_" + randomId(),
                tabId: tabId,
                savedAt: savedAt,
                status: "active",
                retainUntilSuccess: false,
                reason: String(reason || "autosave"),
                sourceHint: sourceHint,
                projectTitleSnapshot: String(clone.title || ""),
                sceneCount: Array.isArray(clone.scenes) ? clone.scenes.length : 0,
                draftSchemaVersion: DRAFT_SCHEMA_VERSION,
                lightMode: !!lightMode,
                assetIds: Object.keys(assetSet),
                projectData: clone
            };
            await putDraftRecord(draft);
            activeDraftId = draft.id;
            if (previousActive && previousActive.id !== draft.id) {
                var db = await dbPromise;
                var txDel = db.transaction([DRAFTS_STORE], "readwrite");
                await reqAsPromise(txDel.objectStore(DRAFTS_STORE).delete(previousActive.id));
                await txDone(txDel);
            }
            await retainPerTabMax2(tabId);
            await cleanupUnreferencedAssets();
            log("draft.save", {
                id: draft.id,
                tabId: tabId,
                assets: draft.assetIds.length,
                lightMode: draft.lightMode,
                reason: draft.reason
            });
            return draft;
        }

        async function markSynchronizedAfterSave(kind) {
            if (!isEnabled()) return;
            var all = await getAllDrafts();
            var draft = null;
            if (activeDraftId) {
                draft = all.find(function (d) {
                    return d.id === activeDraftId;
                });
            }
            if (!draft) {
                draft = all.find(function (d) {
                    return d.tabId === tabId && d.status === "active";
                });
            }
            if (!draft) return;
            draft.status = "synchronized";
            draft.retainUntilSuccess = true;
            draft.syncedBy = String(kind || "manual-save");
            draft.syncedAt = nowIso();
            await putDraftRecord(draft);
            activeDraftId = null;
            await retainPerTabMax2(tabId);
            log("draft.save_sync", { id: draft.id, kind: draft.syncedBy });
        }

        async function listRestorableDrafts() {
            var all = await getAllDrafts();
            return all.filter(function (d) {
                return Number(d.draftSchemaVersion || 0) === DRAFT_SCHEMA_VERSION;
            });
        }

        async function listIncompatibleDrafts() {
            var all = await getAllDrafts();
            return all.filter(function (d) {
                return Number(d.draftSchemaVersion || 0) !== DRAFT_SCHEMA_VERSION;
            });
        }

        async function clearIncompatibleDrafts() {
            var all = await listIncompatibleDrafts();
            if (!all.length) return;
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readwrite");
            var store = tx.objectStore(DRAFTS_STORE);
            for (var i = 0; i < all.length; i++) {
                await reqAsPromise(store.delete(all[i].id));
            }
            await txDone(tx);
            await cleanupUnreferencedAssets();
        }

        async function restoreDraftById(draftId) {
            var rec = await getDraftById(draftId);
            if (!rec) throw new Error("Draft not found.");
            if (Number(rec.draftSchemaVersion || 0) !== DRAFT_SCHEMA_VERSION) {
                throw new Error("Incompatible draft schema.");
            }
            var project = safeJsonClone(rec.projectData || {});
            var tokenMap = {};
            var needed = {};
            opts.eachPortableMediaUrlInProject(project, function (u) {
                var t = String(u || "").trim();
                if (!t) return;
                needed[t] = true;
            });

            var db = await dbPromise;
            var tx = db.transaction([ASSETS_STORE], "readonly");
            var store = tx.objectStore(ASSETS_STORE);
            var warnings = [];
            var keys = Object.keys(needed);
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (isMissingToken(k)) {
                    tokenMap[k] = "";
                    continue;
                }
                var parsed = parseAssetToken(k);
                if (!parsed) continue;
                var asset = await reqAsPromise(store.get(parsed.id));
                if (!asset || !asset.blob) {
                    tokenMap[k] = "";
                    warnings.push(parsed.nameHint || parsed.id);
                    continue;
                }
                var blobUrl = URL.createObjectURL(asset.blob);
                if (typeof opts.registerBundleBlobUrl === "function") {
                    opts.registerBundleBlobUrl(blobUrl);
                }
                if (opts.bundleAssetsMap && typeof opts.bundleAssetsMap.set === "function") {
                    try {
                        var fileObj =
                            asset.blob instanceof File
                                ? asset.blob
                                : new File([asset.blob], parsed.nameHint || asset.nameHint || "asset.bin", {
                                      type: asset.blob.type || asset.type || "application/octet-stream"
                                  });
                        opts.bundleAssetsMap.set(blobUrl, fileObj);
                    } catch (e) {
                        opts.bundleAssetsMap.set(blobUrl, asset.blob);
                    }
                }
                tokenMap[k] = blobUrl;
            }
            await txDone(tx);
            opts.rewritePortableUrlsInProjectClone(project, function (value) {
                var t = String(value || "").trim();
                return Object.prototype.hasOwnProperty.call(tokenMap, t) ? tokenMap[t] : value;
            });
            activeDraftId = rec.id;
            lastContentFingerprint = "";
            log("draft.restore", { id: rec.id, warnings: warnings.length });
            return { project: project, draft: rec, missingMedia: warnings };
        }

        async function purgeCurrentTabDrafts() {
            var all = await getAllDrafts();
            var targets = all.filter(function (d) {
                return d.tabId === tabId;
            });
            if (!targets.length) return;
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readwrite");
            var store = tx.objectStore(DRAFTS_STORE);
            for (var i = 0; i < targets.length; i++) {
                await reqAsPromise(store.delete(targets[i].id));
            }
            await txDone(tx);
            await cleanupUnreferencedAssets();
            activeDraftId = null;
            log("draft.purge", { tabId: tabId, count: targets.length });
        }

        async function markOpeningSuccessfulAndPurgeSynced() {
            var all = await getAllDrafts();
            var purge = all.filter(function (d) {
                return d.tabId === tabId && d.status === "synchronized" && d.retainUntilSuccess;
            });
            if (!purge.length) return;
            var db = await dbPromise;
            var tx = db.transaction([DRAFTS_STORE], "readwrite");
            var store = tx.objectStore(DRAFTS_STORE);
            for (var i = 0; i < purge.length; i++) {
                await reqAsPromise(store.delete(purge[i].id));
            }
            await txDone(tx);
            await cleanupUnreferencedAssets();
            log("draft.purge_after_open", { tabId: tabId, count: purge.length });
        }

        async function getUiStorageState() {
            var estimate = await estimateStorage();
            var warnLevel = "none";
            if (estimate.supported) {
                if (estimate.ratio >= 0.9) warnLevel = "high";
                else if (estimate.ratio >= 0.8) warnLevel = "low";
            }
            if (warnLevel !== "none") {
                log("draft.quota_warn", {
                    level: warnLevel,
                    ratio: estimate.ratio
                });
            }
            return {
                estimate: estimate,
                warnLevel: warnLevel,
                enabled: isEnabled(),
                lightMode: isLightMode(),
                tabId: tabId
            };
        }

        return {
            tabId: tabId,
            isEnabled: isEnabled,
            setEnabled: function (enabled) {
                setOptOutDisabled(!enabled);
            },
            isLightMode: isLightMode,
            setLightMode: setLightMode,
            setSourceHint: setSourceHint,
            captureSnapshot: captureSnapshot,
            markSynchronizedAfterSave: markSynchronizedAfterSave,
            listRestorableDrafts: listRestorableDrafts,
            listIncompatibleDrafts: listIncompatibleDrafts,
            clearIncompatibleDrafts: clearIncompatibleDrafts,
            restoreDraftById: restoreDraftById,
            purgeCurrentTabDrafts: purgeCurrentTabDrafts,
            markOpeningSuccessfulAndPurgeSynced: markOpeningSuccessfulAndPurgeSynced,
            getUiStorageState: getUiStorageState
        };
    }

    global.EditorSharedLocalDraft = {
        createManager: createManager
    };
})(typeof window !== "undefined" ? window : this);
