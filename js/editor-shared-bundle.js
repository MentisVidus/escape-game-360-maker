/**
 * Shared bundle/media helpers for both editor locales (FR/EN).
 * Keeps .escapegame ZIP logic and blob URL session handling in one place.
 */
(function (global) {
    "use strict";

    global.bundleAssets = global.bundleAssets || new Map();
    global.bundleAssetPathBlobs = global.bundleAssetPathBlobs || new Map();

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
        global.bundleAssets.clear();
        global.bundleAssetPathBlobs.clear();
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
            if (!global.bundleAssets) return null;
            return global.bundleAssets.get(t) || global.bundleAssets.get(url) || null;
        }
        var c = canonicalAssetRef(t);
        if (c && global.bundleAssetPathBlobs && global.bundleAssetPathBlobs.has(c)) {
            return global.bundleAssetPathBlobs.get(c);
        }
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
            if (global.bundleAssets && global.bundleAssets.has(old)) global.bundleAssets.delete(old);
            try {
                URL.revokeObjectURL(old);
            } catch (e) {}
            var ix = bundleTrackedObjectUrls.indexOf(old);
            if (ix >= 0) bundleTrackedObjectUrls.splice(ix, 1);
        }
        var url = URL.createObjectURL(file);
        registerBundleBlobUrl(url);
        global.bundleAssets.set(url, file);
        target.value = url;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        inp.value = "";
    }

    function collectPortableBundleEmbeds(project) {
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
    }

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
                    global.bundleAssetPathBlobs.set(relKey, blob);
                    var baseName = inner.split("/").pop() || "asset.bin";
                    var f = new File([blob], baseName, { type: blob.type || "application/octet-stream" });
                    var blobUrl = URL.createObjectURL(blob);
                    registerBundleBlobUrl(blobUrl);
                    global.bundleAssets.set(blobUrl, f);
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

    global.EditorSharedBundle = {
        registerBundleBlobUrl: registerBundleBlobUrl,
        revokeEditorBundleSession: revokeEditorBundleSession,
        canonicalAssetRef: canonicalAssetRef,
        getBlobOrFileForPortableUrl: getBlobOrFileForPortableUrl,
        eachPortableMediaUrlInProject: eachPortableMediaUrlInProject,
        walkActionMediaUrls: walkActionMediaUrls,
        rewritePortableUrlsInProjectClone: rewritePortableUrlsInProjectClone,
        rewriteActionMediaUrls: rewriteActionMediaUrls,
        sanitizeBundleFileName: sanitizeBundleFileName,
        uniqueNameInSet: uniqueNameInSet,
        deriveBundleNameHint: deriveBundleNameHint,
        isZipArrayBuffer: isZipArrayBuffer,
        openBundleLocalMediaPicker: openBundleLocalMediaPicker,
        onBundleLocalMediaSelected: onBundleLocalMediaSelected,
        collectPortableBundleEmbeds: collectPortableBundleEmbeds,
        mapZipAssetsToEditorSession: mapZipAssetsToEditorSession,
        rewriteLoadedProjectPathsToBlobUrls: rewriteLoadedProjectPathsToBlobUrls
    };
})(typeof window !== "undefined" ? window : this);
