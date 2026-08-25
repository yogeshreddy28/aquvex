(() => {
  const api = window.AQUVEX_API_ORIGIN.replace(/\/$/, "");
  let inspectionId = sessionStorage.getItem("aquvex-current-inspection") || "";
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-inspection]");
    if (target?.dataset.inspection) { inspectionId = target.dataset.inspection; sessionStorage.setItem("aquvex-current-inspection", inspectionId); }
  }, true);
  const addViewer = () => {
    const content = document.querySelector("#content");
    if (!inspectionId || !content || content.querySelector(".shared-model")) return;
    const measurements = [...content.querySelectorAll("h3")].find(node => node.textContent === "Measurements");
    if (!measurements) return;
    const section = document.createElement("section"); section.className = "shared-model";
    section.innerHTML = `<h3>Interactive 3D Property View</h3><div class="model-frame"><iframe title="Interactive measured property model" src="${api}/customer-model/${encodeURIComponent(inspectionId)}" loading="lazy"></iframe></div><p class="muted">Rotate, zoom and pan. Switch between Existing Property and AQUVEX Proposed Design inside the viewer.</p>`;
    measurements.before(section);
  };
  new MutationObserver(addViewer).observe(document.documentElement, { childList: true, subtree: true });
  const token = new URLSearchParams(location.search).get("report");
  if (token) {
    const timer = window.setInterval(async () => {
      if (document.querySelector("#portal").hidden) return;
      window.clearInterval(timer);
      try {
        const response = await fetch(`${api}/api/customer/reports/${encodeURIComponent(token)}`, { credentials: "include" });
        if (!response.ok) return;
        const data = await response.json(); const score = data.inspection.health;
        inspectionId = data.inspection.id; sessionStorage.setItem("aquvex-current-inspection", inspectionId);
        document.querySelector("#content").innerHTML = `<section><p class="eyebrow">Private inspection report</p><h2>${data.inspection.address}</h2><div class="item"><div class="score">${score.displayScore} / 100</div><strong>${score.band.label}</strong><p>${score.band.recommendation}</p></div><h3>Interactive 3D Property View</h3><div class="model-frame"><iframe title="Interactive measured property model" src="${api}/customer-model/${encodeURIComponent(inspectionId)}"></iframe></div><h3>Measurements</h3><p>${data.measurements.map(area => `${area.name}: ${Math.round(area.sqft)} sq ft`).join(" · ") || "Not recorded"}</p><h3>Inspection photos</h3><div class="photos">${data.photos.map(photo => `<img src="${api + photo.url}" alt="Inspection evidence">`).join("") || "No photos available"}</div></section>`;
      } catch { /* The normal dashboard remains available if the private link is invalid. */ }
    }, 250);
  }
})();
