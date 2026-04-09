/**
 * PoC Drawflow — nœuds factices Scène / Hotspot + lien vers panneau détail.
 * Ouvrir poc.html dans le navigateur.
 */
(function () {
  "use strict";

  var container = document.getElementById("drawflow");
  if (!container || typeof Drawflow === "undefined") {
    console.error("Drawflow ou conteneur manquant.");
    return;
  }

  var editor = new Drawflow(container);
  editor.reroute = true;
  editor.start();

  function sceneHtml(label) {
    return (
      '<div class="xflow-node-scene">' +
      '<div class="xflow-node-title">Scène</div>' +
      '<div class="xflow-node-body">' +
      escapeHtml(label) +
      "</div></div>"
    );
  }

  function hotspotHtml(label) {
    return (
      '<div class="xflow-node-hotspot">' +
      '<div class="xflow-node-title">Hotspot</div>' +
      '<div class="xflow-node-body">' +
      escapeHtml(label) +
      "</div></div>"
    );
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // Données métier : plus tard = scId, hId réels alignés sur le projet JSON
  var dataSceneA = { kind: "scene", ref: "scene_entree", label: "Entrée (factice)" };
  var dataSceneB = { kind: "scene", ref: "scene_couloir", label: "Couloir (factice)" };
  var dataHs1 = { kind: "hotspot", ref: "hs_1", label: "Porte vers couloir" };
  var dataHs2 = { kind: "hotspot", ref: "hs_2", label: "Tableau (message)" };

  // addNode(name, inputs, outputs, pos_x, pos_y, class, data, html)
  var idSceneA = editor.addNode("scene", 0, 1, 80, 120, "xflow-node-scene", dataSceneA, sceneHtml(dataSceneA.label));
  var idSceneB = editor.addNode("scene", 0, 1, 80, 320, "xflow-node-scene", dataSceneB, sceneHtml(dataSceneB.label));
  var idHs1 = editor.addNode("hotspot", 1, 1, 380, 100, "xflow-node-hotspot", dataHs1, hotspotHtml(dataHs1.label));
  var idHs2 = editor.addNode("hotspot", 1, 1, 380, 300, "xflow-node-hotspot", dataHs2, hotspotHtml(dataHs2.label));

  // Scène → Hotspot (sortie scène vers entrée hotspot)
  editor.addConnection(idSceneA, idHs1, "output_1", "input_1");
  editor.addConnection(idSceneB, idHs2, "output_1", "input_1");

  var panelEmpty = document.getElementById("panel-empty");
  var panelDetail = document.getElementById("panel-detail");
  var detailKind = document.getElementById("detail-kind");
  var detailRef = document.getElementById("detail-ref");
  var detailLabel = document.getElementById("detail-label");
  var detailHint = document.getElementById("detail-hint");

  function showPanelEmpty() {
    panelEmpty.style.display = "block";
    panelDetail.style.display = "none";
  }

  function showPanelFromNode(id) {
    var info = editor.getNodeFromId(id);
    if (!info) {
      showPanelEmpty();
      return;
    }
    var d = info.data || {};
    panelEmpty.style.display = "none";
    panelDetail.style.display = "block";
    detailKind.textContent = d.kind || "—";
    detailRef.textContent = d.ref || "—";
    detailLabel.textContent = d.label || "—";
    detailHint.textContent =
      "Plus tard : ouvrir le formulaire réel pour " +
      (d.kind === "scene" ? "cette scène" : "ce hotspot") +
      " (scroll vers le bloc ou panneau commun).";
  }

  editor.on("nodeSelected", function (id) {
    showPanelFromNode(id);
  });

  editor.on("nodeUnselected", function () {
    showPanelEmpty();
  });

  showPanelEmpty();
})();
