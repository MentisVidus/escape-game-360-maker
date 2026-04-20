/**
 * Player save skeleton (Phase A):
 * - single local slot (IndexedDB)
 * - manual file envelope helpers
 * - validation/migration entry points
 */
(function (global) {
    "use strict";

    var SAVE_KIND = "escape360-player-save";
    var SAVE_SCHEMA_VERSION = 1;
    var DEFAULT_DB_NAME = "escape360-player-saves";
    var DEFAULT_DB_VERSION = 1;
    var SAVES_STORE = "saves";
    var SINGLE_SLOT_ID = "latest";
    var DEFAULT_FILE_EXTENSION = ".escapegame";

    function nowIso() {
        return new Date().toISOString();
    }

    function safeCloneJson(x) {
        return JSON.parse(JSON.stringify(x));
    }

    function createDefaultStorageCore() {
        if (!global.EditorSharedStorageCore || !global.EditorSharedStorageCore.createIndexedDbCore) {
            throw new Error("EditorSharedStorageCore unavailable");
        }
        return global.EditorSharedStorageCore.createIndexedDbCore({
            dbName: DEFAULT_DB_NAME,
            dbVersion: DEFAULT_DB_VERSION,
            stores: [
                {
                    name: SAVES_STORE,
                    options: { keyPath: "id" },
                    indexes: [
                        { name: "bySavedAt", keyPath: "savedAt", options: { unique: false } },
                        {
                            name: "byFingerprintSavedAt",
                            keyPath: ["gameFingerprint", "savedAt"],
                            options: { unique: false }
                        }
                    ]
                }
            ]
        });
    }

    function createSaveManager(opts) {
        opts = opts || {};
        var gameFingerprint = String(opts.gameFingerprint || "").trim();
        var gameTitle = String(opts.gameTitle || "").trim();
        if (!gameFingerprint) {
            throw new Error("PlayerSaveManager requires gameFingerprint");
        }
        var storageCore = opts.storageCore || createDefaultStorageCore();

        function buildEnvelope(state, extraMeta) {
            var payloadState = state == null ? {} : safeCloneJson(state);
            var meta = extraMeta && typeof extraMeta === "object" ? safeCloneJson(extraMeta) : {};
            return {
                meta: {
                    kind: SAVE_KIND,
                    saveSchemaVersion: SAVE_SCHEMA_VERSION,
                    gameFingerprint: gameFingerprint,
                    gameTitle: gameTitle,
                    savedAt: nowIso(),
                    slotId: SINGLE_SLOT_ID,
                    label: String(meta.label || "").trim()
                },
                state: payloadState
            };
        }

        function migratePlayerSave(raw) {
            // Phase A: pass-through. Future versions can transform older schemas here.
            return raw;
        }

        function validateEnvelope(raw) {
            if (!raw || typeof raw !== "object") {
                return { ok: false, reason: "invalid-object" };
            }
            var meta = raw.meta || {};
            if (meta.kind !== SAVE_KIND) {
                return { ok: false, reason: "wrong-kind" };
            }
            if (Number(meta.saveSchemaVersion || 0) !== SAVE_SCHEMA_VERSION) {
                return { ok: false, reason: "unsupported-schema" };
            }
            if (String(meta.gameFingerprint || "").trim() !== gameFingerprint) {
                return { ok: false, reason: "wrong-game" };
            }
            return { ok: true };
        }

        async function saveLocal(state, extraMeta) {
            var envelope = buildEnvelope(state, extraMeta);
            var rec = {
                id: SINGLE_SLOT_ID,
                gameFingerprint: gameFingerprint,
                savedAt: envelope.meta.savedAt,
                envelope: envelope
            };
            await storageCore.withTransaction(SAVES_STORE, "readwrite", function (tx, stores) {
                stores[SAVES_STORE].put(rec);
            });
            return envelope;
        }

        async function loadLocal() {
            var rec = await storageCore.withTransaction(SAVES_STORE, "readonly", function (tx, stores) {
                return storageCore.reqAsPromise(stores[SAVES_STORE].get(SINGLE_SLOT_ID));
            });
            if (!rec || !rec.envelope) return null;
            var migrated = migratePlayerSave(rec.envelope);
            var check = validateEnvelope(migrated);
            if (!check.ok) {
                return { error: check.reason, envelope: migrated };
            }
            return { envelope: migrated };
        }

        async function clearLocal() {
            await storageCore.withTransaction(SAVES_STORE, "readwrite", function (tx, stores) {
                stores[SAVES_STORE].delete(SINGLE_SLOT_ID);
            });
        }

        function serializeManualSave(envelope) {
            return JSON.stringify(envelope, null, 2);
        }

        function parseManualSaveText(text) {
            var raw = JSON.parse(String(text || ""));
            var migrated = migratePlayerSave(raw);
            var check = validateEnvelope(migrated);
            if (!check.ok) {
                return { ok: false, reason: check.reason, envelope: migrated };
            }
            return { ok: true, envelope: migrated };
        }

        async function getStorageEstimate() {
            if (!storageCore.estimateStorage) return { supported: false, used: 0, quota: 0, ratio: 0 };
            return storageCore.estimateStorage();
        }

        return {
            constants: {
                SAVE_KIND: SAVE_KIND,
                SAVE_SCHEMA_VERSION: SAVE_SCHEMA_VERSION,
                SINGLE_SLOT_ID: SINGLE_SLOT_ID,
                DEFAULT_FILE_EXTENSION: DEFAULT_FILE_EXTENSION
            },
            buildEnvelope: buildEnvelope,
            validateEnvelope: validateEnvelope,
            migratePlayerSave: migratePlayerSave,
            saveLocal: saveLocal,
            loadLocal: loadLocal,
            clearLocal: clearLocal,
            serializeManualSave: serializeManualSave,
            parseManualSaveText: parseManualSaveText,
            getStorageEstimate: getStorageEstimate
        };
    }

    global.PlayerSharedSave = {
        SAVE_KIND: SAVE_KIND,
        SAVE_SCHEMA_VERSION: SAVE_SCHEMA_VERSION,
        DEFAULT_FILE_EXTENSION: DEFAULT_FILE_EXTENSION,
        createSaveManager: createSaveManager
    };
})(typeof window !== "undefined" ? window : this);
