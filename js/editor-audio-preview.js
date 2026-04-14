/**
 * Préécoute audio dans l’éditeur (URL ou blob:).
 *
 * Modèle volume (aligné avec l’intention produit) :
 * - Dans l’éditeur, chaque curseur / champ est le réglage **par source** pour équilibrer
 *   musique, ambiances et SFX entre eux. La préécoute applique **uniquement** cette valeur
 *   sur l’élément Audio (0–1), sans autre facteur.
 * - Dans le **joueur**, le volume final sera du type : réglage_éditeur × réglage_joueur_par_type
 *   (ex. musique globale 0,75 × curseur joueur « musique » 1 ou 0,33). Ces réglages joueur
 *   ne sont pas encore exposés en UI ; les constantes du template généré restent des
 *   placeholders côté runtime — elles ne doivent **pas** influencer la préécoute, sinon on
 *   mélange deux niveaux de réglage avant même que le jeu soit testé comme le joueur le fera.
 */
(function (global) {
    "use strict";

    var active = null;

    function isEn() {
        return document.documentElement.lang === "en";
    }

    function msgEmpty() {
        return isEn()
            ? "Enter an audio URL or pick a local file first."
            : "Indiquez d’abord une URL ou un fichier audio.";
    }

    function msgFail(detail) {
        var p = isEn() ? "Playback failed: " : "Lecture impossible : ";
        return p + (detail || "");
    }

    function parseVol(el) {
        if (!el) return 1;
        var v = parseFloat(el.value);
        if (isNaN(v)) return 1;
        return Math.max(0, Math.min(1, v));
    }

    function resetButton(btn) {
        if (btn && btn.parentNode) btn.textContent = "▶";
    }

    function cleanup() {
        if (!active) return;
        if (active.volEl && active.onVolInput) {
            active.volEl.removeEventListener("input", active.onVolInput);
            active.volEl.removeEventListener("change", active.onVolInput);
        }
        if (active.audio) {
            active.audio.onended = null;
            active.audio.onerror = null;
            active.audio.pause();
            try {
                active.audio.removeAttribute("src");
                active.audio.load();
            } catch (e) {}
        }
        resetButton(active.button);
        active = null;
    }

    /**
     * @param {HTMLInputElement} urlInput - champ URL (texte)
     * @param {HTMLInputElement|null} volEl - range ou number (volume 0–1)
     * @param {HTMLButtonElement|null} button - bouton ▶ / ■
     */
    global.editorAudioPreviewToggle = function (urlInput, volEl, button) {
        if (!urlInput) return;
        var url = (urlInput.value || "").trim();
        if (!url) {
            alert(msgEmpty());
            return;
        }

        if (
            active &&
            active.urlInput === urlInput &&
            active.audio &&
            !active.audio.paused &&
            !active.audio.ended
        ) {
            cleanup();
            return;
        }

        cleanup();

        var audio = new Audio();
        audio.volume = parseVol(volEl);
        audio.preload = "auto";

        var onVol = function () {
            if (active && active.audio === audio) {
                audio.volume = parseVol(volEl);
            }
        };
        if (volEl) {
            volEl.addEventListener("input", onVol);
            volEl.addEventListener("change", onVol);
        }

        var onEnded = function () {
            if (active && active.audio === audio) cleanup();
        };

        var onError = function () {
            var err = (audio.error && audio.error.code) || "";
            cleanup();
            alert(msgFail(String(err)));
        };

        audio.onended = onEnded;
        audio.onerror = onError;

        active = {
            audio: audio,
            urlInput: urlInput,
            volEl: volEl,
            button: button,
            onVolInput: onVol,
        };

        if (button) button.textContent = "■";

        audio.src = url;
        audio.play().catch(function (err) {
            cleanup();
            alert(msgFail(err && err.message ? err.message : String(err)));
        });
    };
})(typeof window !== "undefined" ? window : this);
