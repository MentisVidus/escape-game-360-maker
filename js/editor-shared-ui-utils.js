/**
 * Shared FR/EN editor UI utilities with no localized strings.
 */
(function (global) {
    "use strict";

    function updateScenePreview() {
        /* hook réservé / reserved (e.g. URL validation); called by .sc-img oninput */
    }

    function toggleCollapse(bodyId, btn) {
        var body = document.getElementById(bodyId);
        if (!body) return;
        if (body.style.display === "none") {
            body.style.display = "";
            if (btn) btn.innerHTML = "▼";
        } else {
            body.style.display = "none";
            if (btn) btn.innerHTML = "▶";
        }
    }

    function toggleAllHotspotsInScene(sceneNumericId) {
        var scene = document.getElementById("scene_" + sceneNumericId);
        if (!scene) return;
        var hsBodies = Array.prototype.slice.call(scene.querySelectorAll("[id^='hs_body_']"));
        if (!hsBodies.length) return;

        var allCollapsed = hsBodies.every(function (b) {
            return b.style.display === "none";
        });
        hsBodies.forEach(function (b) {
            b.style.display = allCollapsed ? "" : "none";
            var btn = b.parentElement ? b.parentElement.querySelector(".hs-block-header .btn-icon") : null;
            if (btn) btn.innerHTML = allCollapsed ? "▼" : "▶";
        });
    }

    function moveUp(elemId) {
        var el = document.getElementById(elemId);
        if (el && el.previousElementSibling) {
            el.parentNode.insertBefore(el, el.previousElementSibling);
        }
    }

    function moveDown(elemId) {
        var el = document.getElementById(elemId);
        if (el && el.nextElementSibling) {
            el.parentNode.insertBefore(el.nextElementSibling, el);
        }
    }

    function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    }

    function buildCss(hId) {
        var hsDiv = document.querySelector("#hs_" + hId);
        if (!hsDiv) return;

        var w = hsDiv.querySelector(".ui-w").value;
        var h = hsDiv.querySelector(".ui-h").value;
        var shape = hsDiv.querySelector(".ui-shape").value;
        var bgc = hsDiv.querySelector(".ui-bgc").value;
        var bga = hsDiv.querySelector(".ui-bga").value;
        var brdStyle = hsDiv.querySelector(".ui-brd-style").value;
        var brdW = hsDiv.querySelector(".ui-brd-w").value;
        var brdC = hsDiv.querySelector(".ui-brd-c").value;
        var img = hsDiv.querySelector(".ui-img").value;

        var css =
            "width: " +
            w +
            "px; height: " +
            h +
            "px; background: " +
            hexToRgba(bgc, bga) +
            "; border-radius: " +
            shape +
            "; cursor: pointer; display: flex; align-items: center; justify-content: center;";
        if (brdStyle !== "none") css += " border: " + brdW + "px " + brdStyle + " " + brdC + ";";
        if (img !== "") {
            css += " background-image: url('" + img + "'); background-size: contain; background-repeat: no-repeat; background-position: center;";
        }

        hsDiv.querySelector(".hs-custom-css").value = css;
    }

    function applyPickHiddenIfAutoFillInitial(pickIdInput, hiddenIfInput) {
        if (!pickIdInput || !hiddenIfInput) return;
        if ((hiddenIfInput.value || "").trim() === "" && (pickIdInput.value || "").trim() !== "") {
            hiddenIfInput.value = pickIdInput.value.trim();
            hiddenIfInput.dataset.autoFilled = "1";
        }
    }

    function wirePickIdToHiddenIfAutoFill(pickIdInput, hiddenIfInput) {
        applyPickHiddenIfAutoFillInitial(pickIdInput, hiddenIfInput);
        if (!pickIdInput || !hiddenIfInput) return;
        hiddenIfInput.addEventListener("input", function () {
            hiddenIfInput.dataset.autoFilled = "0";
        });
        pickIdInput.addEventListener("input", function () {
            if (hiddenIfInput.dataset.autoFilled === "1" || (hiddenIfInput.value || "").trim() === "") {
                hiddenIfInput.value = pickIdInput.value.trim();
                hiddenIfInput.dataset.autoFilled = "1";
            }
        });
    }

    global.EditorSharedUi = {
        updateScenePreview: updateScenePreview,
        toggleCollapse: toggleCollapse,
        toggleAllHotspotsInScene: toggleAllHotspotsInScene,
        moveUp: moveUp,
        moveDown: moveDown,
        hexToRgba: hexToRgba,
        buildCss: buildCss,
        applyPickHiddenIfAutoFillInitial: applyPickHiddenIfAutoFillInitial,
        wirePickIdToHiddenIfAutoFill: wirePickIdToHiddenIfAutoFill
    };
})(typeof window !== "undefined" ? window : this);
