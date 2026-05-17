/**
 * C23.2 — Chemins typés bundle + collecte médias (project.json + map-layout).
 * Miroir `xflow/react/src/model/bundleAssetPath.ts`.
 */
(function (global) {
    "use strict";

    function sanitizeBundleFileName(name, fallback) {
        var base = String(name || fallback || "asset")
            .split(/[/\\]/)
            .pop();
        base = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
        if (!base || base === "." || base === "..") base = fallback || "asset.bin";
        return base.slice(0, 120);
    }

  /**
   * @param {{ kind: string, mediaNodeId?: string, fileName: string }} ctx
   * @returns {string}
   */
    function getAssetPath(ctx) {
        var file = sanitizeBundleFileName(ctx.fileName, "asset.bin");
        switch (ctx.kind) {
            case "audio-global":
                return "./assets/audio/global/" + file;
            case "audio-ambiance":
                return "./assets/audio/ambiance/" + file;
            case "audio-sfx":
                return "./assets/audio/sfx/" + file;
            case "image360":
                return "./assets/image360/" + file;
            case "icone-inventaire":
                return "./assets/icone/inventaire/" + file;
            case "icone-objet":
                return "./assets/icone/objet/" + file;
            case "icone-hotspot":
                return "./assets/icone/hotspot/" + file;
            case "orphelin": {
                var id = sanitizeBundleFileName(ctx.mediaNodeId || "media", "media");
                return "./assets/orphelin/" + id + "/" + file;
            }
            default:
                return "./assets/orphelin/unknown/" + file;
        }
    }

    function fileNameFromPortableUrl(url, blob) {
        if (blob && blob.name) return sanitizeBundleFileName(blob.name, "asset.bin");
        var t = String(url || "").trim();
        if (t.indexOf("./assets/") === 0 || t.indexOf("assets/") === 0) {
            var norm = t.indexOf("./assets/") === 0 ? t : "./" + t;
            var seg = norm.replace(/^\.\/assets\//, "").split("/");
            return sanitizeBundleFileName(seg[seg.length - 1] || "asset.bin", "asset.bin");
        }
        return sanitizeBundleFileName("media.bin", "asset.bin");
    }

    function uniquePathInSet(desiredRel, usedSet) {
        var rel = desiredRel;
        var n = 0;
        var dot = rel.lastIndexOf(".");
        var slash = rel.lastIndexOf("/");
        var stem = dot > slash ? rel.slice(0, dot) : rel;
        var ext = dot > slash ? rel.slice(dot) : "";
        while (usedSet[rel]) {
            n++;
            rel = stem + "_" + n + ext;
        }
        usedSet[rel] = true;
        return rel;
    }

    /** zip inner path sans préfixe `./assets/` */
    function zipInnerFromAssetPath(assetPath) {
        return String(assetPath || "").replace(/^\.\/assets\//, "");
    }

    /** Premier media-audio lié à la scène (edge meta) — miroir sceneAmbianceProjection.ts. */
    function linkedMediaAudioAmbianceForScene(state, sceneNodeId) {
        var edges = state.edges || [];
        var media = state.media || {};
        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            if (!e || e.family !== "meta" || e.sourceId !== sceneNodeId) continue;
            var m = media[e.targetId];
            if (!m || m.mediaType !== "media-audio" || !m.data) continue;
            var url = String(m.data.url != null ? m.data.url : "").trim();
            if (!url) continue;
            var rawVol = m.data.volume;
            return {
                url: url,
                volume:
                    typeof rawVol === "number" && !isNaN(rawVol) ? Math.max(0, Math.min(1, rawVol)) : 1
            };
        }
        return null;
    }

    /** Premier media-image lié à la scène (edge meta) — miroir scenePanoramaProjection.ts. */
    function linkedMediaImagePanoramaForScene(state, sceneNodeId) {
        var edges = state.edges || [];
        var media = state.media || {};
        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            if (!e || e.family !== "meta" || e.sourceId !== sceneNodeId) continue;
            var m = media[e.targetId];
            if (!m || m.mediaType !== "media-image" || !m.data) continue;
            var url = String(m.data.url != null ? m.data.url : "").trim();
            if (url) return url;
        }
        return "";
    }

    /**
     * Complète les champs media du projet DOM (ambiance / panorama) depuis le store nodal,
     * sans remplacer hotspots (pitch/yaw/customCss).
     */
    function overlayNodalMediaFieldsOnDomProject(project) {
        if (!project || typeof project !== "object") return project;
        var st = global.__ESCAPE360_NODAL_STORE__;
        if (!st || typeof st.getState !== "function") return project;
        var state = st.getState();
        if (state.meta && state.meta.settings) {
            project.meta = project.meta || {};
            project.meta.settings = JSON.parse(JSON.stringify(state.meta.settings));
        }
        var internalByExternal = {};
        var nodalScenes = state.scenes || {};
        for (var ik in nodalScenes) {
            if (!Object.prototype.hasOwnProperty.call(nodalScenes, ik)) continue;
            var ns = nodalScenes[ik];
            if (ns && ns.sceneId) internalByExternal[String(ns.sceneId).trim()] = ns;
        }
        (project.scenes || []).forEach(function (domSc) {
            if (!domSc || typeof domSc !== "object") return;
            var ext = domSc.id != null ? String(domSc.id).trim() : "";
            if (!ext) return;
            var nodalSc = internalByExternal[ext];
            if (!nodalSc || !nodalSc.id) return;
            domSc.media = domSc.media || {};
            var curAmb = domSc.media.ambiance;
            var curAmbUrl =
                typeof curAmb === "string" ? String(curAmb).trim() : curAmb && curAmb.url != null ? String(curAmb.url).trim() : "";
            if (!curAmbUrl) {
                var amb = linkedMediaAudioAmbianceForScene(state, nodalSc.id);
                if (amb && amb.url) domSc.media.ambiance = { url: amb.url, volume: amb.volume };
            }
            var curPan = String(domSc.media.panoramaUrl || domSc.panoramaUrl || "").trim();
            if (!curPan) {
                var pan = linkedMediaImagePanoramaForScene(state, nodalSc.id);
                if (pan) {
                    domSc.media.panoramaUrl = pan;
                    domSc.panoramaUrl = pan;
                }
            }
        });
        return project;
    }

    function enrichNodalProjectForBundleWalker(project) {
        if (!project || typeof project !== "object") return project;
        var settings = project.meta && project.meta.settings;
        if (settings && settings.audio) {
            var av = settings.audio.volume;
            project.globalMusic = {
                url: String(settings.audio.url != null ? settings.audio.url : ""),
                volume: typeof av === "number" && !isNaN(av) ? Math.max(0, Math.min(1, av)) : 0.5
            };
            if (settings.audio.enabled === false && !String(settings.audio.url || "").trim()) {
                project.useGlobalAudio = false;
            } else if (settings.audio.enabled) {
                project.useGlobalAudio = true;
            }
        }
        if (settings && settings.inventoryGlobal && settings.inventoryGlobal.icon != null) {
            project.invIcon = String(settings.inventoryGlobal.icon);
        }
        (project.scenes || []).forEach(function (scene) {
            if (!scene || typeof scene !== "object") return;
            var media = scene.media || {};
            var pan =
                media.panoramaUrl != null && String(media.panoramaUrl).trim()
                    ? String(media.panoramaUrl).trim()
                    : String(scene.panoramaUrl != null ? scene.panoramaUrl : "").trim();
            scene.panoramaUrl = pan;
            var amb = media.ambiance;
            if (!amb || typeof amb !== "object") amb = { url: "", volume: 1 };
            scene.media = {
                panoramaUrl: pan,
                ambiance: {
                    url: String(amb.url != null ? amb.url : ""),
                    volume: typeof amb.volume === "number" && !isNaN(amb.volume) ? amb.volume : 1
                }
            };
        });
        return project;
    }

    function visitUrlLike(u, visit) {
        if (u == null) return;
        var s = String(u).trim();
        if (!s) return;
        if (/^(https?:|blob:|data:|\.\/)/i.test(s)) visit(s);
    }

    function walkActionMediaUrls(action, visit) {
        if (!action) return;
        if (action.sfx && action.sfx.url) visit(action.sfx.url);
        var p = action.payload;
        if (!p) return;
        if (p.nested && Array.isArray(p.nested.choices)) {
            p.nested.choices.forEach(function (ch) {
                walkActionMediaUrls(ch.action, visit);
            });
        }
        if (p.rewardAction) walkActionMediaUrls(p.rewardAction, visit);
    }

    /**
     * Entrées à embarquer : { url, kind, mediaNodeId?, fileName }
     * @param {object} project
     * @param {object|null} layout
     * @returns {Array<{url:string,kind:string,mediaNodeId?:string,fileName:string}>}
     */
    function collectBundleMediaEntries(project, layout) {
        var entries = [];
        var seen = {};
        function add(url, kind, extra) {
            if (!url || seen[url]) return;
            var s = String(url).trim();
            if (!s) return;
            if (!s.startsWith("blob:") && !s.startsWith("./assets/") && !s.startsWith("assets/")) return;
            seen[url] = true;
            entries.push({
                url: s,
                kind: kind,
                mediaNodeId: extra && extra.mediaNodeId ? String(extra.mediaNodeId) : undefined,
                fileName: extra && extra.fileName ? extra.fileName : fileNameFromPortableUrl(s, null)
            });
        }

        var settings = project.meta && project.meta.settings;
        if (settings && settings.audio && settings.audio.url) {
            add(settings.audio.url, "audio-global", {});
        }
        if (project.globalMusic && project.globalMusic.url) {
            add(project.globalMusic.url, "audio-global", {});
        }
        if (settings && settings.inventoryGlobal && settings.inventoryGlobal.icon) {
            visitUrlLike(settings.inventoryGlobal.icon, function (u) {
                add(u, "icone-inventaire", {});
            });
        }
        if (project.invIcon != null) {
            visitUrlLike(project.invIcon, function (u) {
                add(u, "icone-inventaire", {});
            });
        }

        (project.scenes || []).forEach(function (scene) {
            var media = scene.media || {};
            if (scene.panoramaUrl != null) visitUrlLike(scene.panoramaUrl, function (u) { add(u, "image360", {}); });
            if (media.panoramaUrl != null) visitUrlLike(media.panoramaUrl, function (u) { add(u, "image360", {}); });
            var amb = media.ambiance;
            if (typeof amb === "string") visitUrlLike(amb, function (u) { add(u, "audio-ambiance", {}); });
            else if (amb && amb.url) add(amb.url, "audio-ambiance", {});
            (scene.hotspots || []).forEach(function (hs) {
                var app = hs.appearance || {};
                if (app.ui_img) visitUrlLike(app.ui_img, function (u) { add(u, "icone-hotspot", {}); });
                walkActionMediaUrls(hs.action, function (u) {
                    add(u, "audio-sfx", {});
                });
            });
        });

        if (layout && typeof layout === "object") {
            var inv = layout.inventoryObjects || {};
            Object.keys(inv).forEach(function (oid) {
                var o = inv[oid];
                if (!o) return;
                if (o.iconUrl) visitUrlLike(o.iconUrl, function (u) { add(u, "icone-objet", {}); });
            });
            var satData = layout.nodalAutoSatelliteData || {};
            Object.keys(satData).forEach(function (pk) {
                var snap = satData[pk];
                if (!snap || !snap.coords || !snap.coords.appearance) return;
                var ui = snap.coords.appearance.ui_img;
                if (ui) visitUrlLike(ui, function (u) { add(u, "icone-hotspot", {}); });
            });
            var linked = {};
            (layout.nodalMetaMediaLinks || []).forEach(function (l) {
                if (l && l.mediaId) linked[l.mediaId] = true;
            });
            (layout.nodalSceneMetaMediaLinks || []).forEach(function (l) {
                if (l && l.mediaId) linked[l.mediaId] = true;
            });
            Object.keys(inv).forEach(function (oid) {
                var o = inv[oid];
                if (o && o.iconMediaId) linked[o.iconMediaId] = true;
            });
            var nodalMedia = layout.nodalMedia || {};
            Object.keys(nodalMedia).forEach(function (mid) {
                if (linked[mid]) return;
                var m = nodalMedia[mid];
                if (!m || !m.data) return;
                var url = m.data.url;
                if (!url) return;
                add(url, "orphelin", { mediaNodeId: mid });
            });
        }

        return entries;
    }

    function rewritePortableUrlsInProjectCloneExtended(project, rewriteStr) {
        var Ex = global.EditorSharedBundle;
        if (Ex && typeof Ex.rewritePortableUrlsInProjectClone === "function") {
            Ex.rewritePortableUrlsInProjectClone(project, rewriteStr);
        }
        var settings = project.meta && project.meta.settings;
        function Rw(x) {
            if (x == null) return x;
            return rewriteStr(String(x));
        }
        if (settings && settings.audio && settings.audio.url != null) {
            settings.audio.url = Rw(settings.audio.url);
        }
        if (settings && settings.inventoryGlobal && settings.inventoryGlobal.icon != null) {
            var ic = String(settings.inventoryGlobal.icon).trim();
            if (/^(https?:|blob:|data:|\.\/)/i.test(ic)) {
                settings.inventoryGlobal.icon = Rw(settings.inventoryGlobal.icon);
            }
        }
    }

    function rewritePortableUrlsInLayoutClone(layout, rewriteStr) {
        if (!layout || typeof layout !== "object") return;
        var inv = layout.inventoryObjects;
        if (inv) {
            Object.keys(inv).forEach(function (oid) {
                var o = inv[oid];
                if (!o || o.iconUrl == null) return;
                var t = String(o.iconUrl).trim();
                if (/^(https?:|blob:|data:|\.\/)/i.test(t)) o.iconUrl = rewriteStr(o.iconUrl);
            });
        }
        var satData = layout.nodalAutoSatelliteData;
        if (satData) {
            Object.keys(satData).forEach(function (pk) {
                var snap = satData[pk];
                if (!snap || !snap.coords || !snap.coords.appearance) return;
                var app = snap.coords.appearance;
                if (app.ui_img != null) {
                    var u = String(app.ui_img).trim();
                    if (/^(https?:|blob:|data:|\.\/)/i.test(u)) app.ui_img = rewriteStr(app.ui_img);
                }
            });
        }
        var nodalMedia = layout.nodalMedia;
        if (nodalMedia) {
            Object.keys(nodalMedia).forEach(function (mid) {
                var m = nodalMedia[mid];
                if (!m || !m.data || m.data.url == null) return;
                var u = String(m.data.url).trim();
                if (/^(https?:|blob:|data:|\.\/)/i.test(u)) m.data.url = rewriteStr(m.data.url);
            });
        }
    }

    /**
     * Construit url → `./assets/...` typé + liste fichiers ZIP.
     * @param {Array} entries from collectBundleMediaEntries
     * @param {function} getBlob (url) => Blob|File|null
     * @param {function} deriveName (url, blob) => string
     */
    function buildTypedBundlePathMap(entries, getBlob, deriveName) {
        var usedPaths = {};
        var urlToRelPath = {};
        var zipFiles = [];
        entries.forEach(function (ent) {
            var blob = getBlob(ent.url);
            if (!blob) return;
            var fname = deriveName
                ? deriveName(ent.url, blob)
                : fileNameFromPortableUrl(ent.url, blob);
            var desired = getAssetPath({
                kind: ent.kind,
                mediaNodeId: ent.mediaNodeId,
                fileName: fname
            });
            var rel = uniquePathInSet(desired, usedPaths);
            var tr = ent.url.trim();
            urlToRelPath[tr] = rel;
            if (ent.url !== tr) urlToRelPath[ent.url] = rel;
            zipFiles.push({
                sourceUrl: ent.url,
                assetPath: rel,
                zipInner: zipInnerFromAssetPath(rel),
                blob: blob
            });
        });
        return { urlToRelPath: urlToRelPath, zipFiles: zipFiles };
    }

    /**
     * Projet JSON pour export joueur / médias portables : DOM legacy (format runtime
     * complet : pitch/yaw/customCss) + surimpression media nodal + enrich.
     * @param {function} getDomProject — typiquement `getCurrentProjectData`
     */
    /**
     * Dictionnaire ambiance par scène pour le runtime joueur (HTML autoportant).
     * @param {object} project — projet enrichi (`getProjectJsonForPortableMediaExport`)
     * @param {function(string): string} [pathFn] — ex. `playerRelMediaPathIfLocal`
     */
    function computeSceneAmbianceClipsForPlayer(project, pathFn) {
        var normalize =
            typeof pathFn === "function"
                ? pathFn
                : function (u) {
                      return u;
                  };
        var clips = {};
        (project.scenes || []).forEach(function (scene, index) {
            if (!scene || typeof scene !== "object") return;
            var scId = scene.id || "scene_" + (index + 1);
            var amb = scene.media && scene.media.ambiance;
            var scAudioRaw =
                typeof amb === "string"
                    ? String(amb).trim()
                    : amb && amb.url != null
                      ? String(amb.url).trim()
                      : "";
            if (!scAudioRaw) return;
            var ambVol =
                amb && typeof amb === "object" && amb.volume !== undefined && !isNaN(Number(amb.volume))
                    ? Math.max(0, Math.min(1, Number(amb.volume)))
                    : 1;
            clips[scId] = { url: normalize(scAudioRaw), volume: ambVol };
        });
        return clips;
    }

    function getProjectJsonForPortableMediaExport(getDomProject) {
        var Ex = global.EditorSharedBundle;
        if (Ex && typeof Ex.flushNodalStoreToEditorDom === "function") {
            Ex.flushNodalStoreToEditorDom();
        }
        var project =
            typeof getDomProject === "function"
                ? JSON.parse(JSON.stringify(getDomProject()))
                : { schemaVersion: 2, title: "", scenes: [] };
        overlayNodalMediaFieldsOnDomProject(project);
        enrichNodalProjectForBundleWalker(project);
        return project;
    }

    global.EditorSharedBundlePaths = {
        sanitizeBundleFileName: sanitizeBundleFileName,
        getAssetPath: getAssetPath,
        fileNameFromPortableUrl: fileNameFromPortableUrl,
        uniquePathInSet: uniquePathInSet,
        zipInnerFromAssetPath: zipInnerFromAssetPath,
        enrichNodalProjectForBundleWalker: enrichNodalProjectForBundleWalker,
        overlayNodalMediaFieldsOnDomProject: overlayNodalMediaFieldsOnDomProject,
        collectBundleMediaEntries: collectBundleMediaEntries,
        rewritePortableUrlsInProjectCloneExtended: rewritePortableUrlsInProjectCloneExtended,
        rewritePortableUrlsInLayoutClone: rewritePortableUrlsInLayoutClone,
        buildTypedBundlePathMap: buildTypedBundlePathMap,
        getProjectJsonForPortableMediaExport: getProjectJsonForPortableMediaExport,
        computeSceneAmbianceClipsForPlayer: computeSceneAmbianceClipsForPlayer
    };
})(typeof window !== "undefined" ? window : this);
