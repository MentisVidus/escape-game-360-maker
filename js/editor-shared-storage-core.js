/**
 * Shared storage primitives (editor/player):
 * - IndexedDB open/upgrade
 * - request/transaction helpers
 * - storage estimate helper
 */
(function (global) {
    "use strict";

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

    function estimateStorage() {
        if (!global.navigator || !global.navigator.storage || !global.navigator.storage.estimate) {
            return Promise.resolve({ supported: false, used: 0, quota: 0, ratio: 0 });
        }
        return global.navigator.storage.estimate().then(function (est) {
            var used = Number(est && est.usage ? est.usage : 0);
            var quota = Number(est && est.quota ? est.quota : 0);
            return {
                supported: true,
                used: used,
                quota: quota,
                ratio: quota > 0 ? used / quota : 0
            };
        });
    }

    function createIndexedDbCore(opts) {
        opts = opts || {};
        var dbName = String(opts.dbName || "escape360-shared-db");
        var dbVersion = Number(opts.dbVersion || 1);
        var stores = Array.isArray(opts.stores) ? opts.stores.slice() : [];
        var onUpgrade = typeof opts.onUpgrade === "function" ? opts.onUpgrade : null;
        var dbPromise = null;

        function ensureStoreSchema(db, tx, def) {
            if (!def || !def.name) return;
            var store;
            if (db.objectStoreNames.contains(def.name)) {
                store = tx.objectStore(def.name);
            } else {
                store = db.createObjectStore(def.name, def.options || { keyPath: "id" });
            }
            var idx = Array.isArray(def.indexes) ? def.indexes : [];
            idx.forEach(function (idDef) {
                if (!idDef || !idDef.name || store.indexNames.contains(idDef.name)) return;
                store.createIndex(idDef.name, idDef.keyPath, idDef.options || { unique: false });
            });
        }

        function open() {
            if (dbPromise) return dbPromise;
            dbPromise = new Promise(function (resolve, reject) {
                if (!("indexedDB" in global)) {
                    reject(new Error("IndexedDB unsupported"));
                    return;
                }
                var req = global.indexedDB.open(dbName, dbVersion);
                req.onupgradeneeded = function (event) {
                    var db = event.target.result;
                    var tx = req.transaction;
                    stores.forEach(function (def) {
                        ensureStoreSchema(db, tx, def);
                    });
                    if (onUpgrade) onUpgrade(db, tx, event);
                };
                req.onsuccess = function () {
                    resolve(req.result);
                };
                req.onerror = function () {
                    reject(req.error || new Error("Failed to open IndexedDB"));
                };
            });
            return dbPromise;
        }

        async function withTransaction(storeNames, mode, worker) {
            var db = await open();
            var names = Array.isArray(storeNames) ? storeNames : [storeNames];
            var tx = db.transaction(names, mode || "readonly");
            var storesMap = {};
            names.forEach(function (name) {
                storesMap[name] = tx.objectStore(name);
            });
            var result = await worker(tx, storesMap);
            await txDone(tx);
            return result;
        }

        return {
            open: open,
            reqAsPromise: reqAsPromise,
            txDone: txDone,
            withTransaction: withTransaction,
            estimateStorage: estimateStorage
        };
    }

    global.EditorSharedStorageCore = {
        reqAsPromise: reqAsPromise,
        txDone: txDone,
        estimateStorage: estimateStorage,
        createIndexedDbCore: createIndexedDbCore
    };
})(typeof window !== "undefined" ? window : this);
