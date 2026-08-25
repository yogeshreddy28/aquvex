(() => {
  const API = window.AQUVEX_API_ORIGIN.replace(/\/$/, ""),
    $ = (s) => document.querySelector(s);
  let phone = "",
    resetToken = "";
  const forms = [
      "phone-form",
      "password-form",
      "create-password-form",
      "reset-code-form",
      "reset-password-form",
    ],
    message = (t) => ($("#message").textContent = t || ""),
    api = async (path, options = {}) => {
      const r = await fetch(API + path, {
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...(options.headers || {}),
          },
          ...options,
        }),
        b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "Please try again.");
      return b;
    },
    show = (id) => {
      forms.forEach((x) => ($("#" + x).hidden = x !== id));
      message("");
    },
    masked = () =>
      phone
        ? `+91 ${phone
            .replace(/\D/g, "")
            .slice(-10)
            .replace(/(\d{2})\d{6}(\d{2})/, "$1XXXXXX$2")}`
        : "",
    resetLink = () =>
      `https://wa.me/${window.AQUVEX_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi AQUVEX, I need a password reset code for my customer account. My registered mobile number is ${phone}.`)}`;
  $("#phone-form").onsubmit = async (e) => {
    e.preventDefault();
    phone = $("#phone").value;
    try {
      const s = await api("/api/customer/auth/account-state", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      if (s.next === "password") {
        $("#auth-title").textContent = "Welcome back";
        $("#auth-copy").textContent = "";
        $("#phone-display").textContent = masked();
        show("password-form");
      } else if (s.next === "create_password") {
        $("#auth-title").textContent = "Create your password";
        $("#auth-copy").textContent =
          "Set a password to securely access your AQUVEX records.";
        $("#create-phone-display").textContent = masked();
        show("create-password-form");
      } else message(s.message || "Please contact AQUVEX.");
    } catch (e) {
      message(e.message);
    }
  };
  $("#password-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/customer/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password: $("#password").value }),
      });
      await load();
    } catch (e) {
      message(e.message);
    }
  };
  $("#create-password-form").onsubmit = async (e) => {
    e.preventDefault();
    const password = $("#create-password").value,
      confirmPassword = $("#create-confirm").value;
    if (password !== confirmPassword) return message("Passwords do not match.");
    try {
      await api("/api/customer/auth/create-password", {
        method: "POST",
        body: JSON.stringify({ phone, password, confirmPassword }),
      });
      await load();
    } catch (e) {
      message(e.message);
    }
  };
  $("#forgot-link").onclick = () => {
    $("#auth-title").textContent = "Reset Password";
    $("#auth-copy").textContent = "";
    $("#whatsapp-reset").href = resetLink();
    show("reset-code-form");
  };
  $("#reset-code-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const d = await api("/api/customer/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ phone, code: $("#reset-code").value }),
      });
      resetToken = d.resetToken;
      show("reset-password-form");
    } catch (e) {
      message(e.message);
    }
  };
  $("#reset-password-form").onsubmit = async (e) => {
    e.preventDefault();
    const password = $("#reset-password").value;
    if (password !== $("#reset-confirm").value)
      return message("Passwords do not match.");
    try {
      await api("/api/customer/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ phone, password, resetToken }),
      });
      await load();
    } catch (e) {
      message(e.message);
    }
  };
  document.querySelectorAll(".change-number").forEach(
    (b) =>
      (b.onclick = () => {
        phone = "";
        $("#phone").value = "";
        $("#auth-title").textContent = "Customer Login";
        $("#auth-copy").textContent =
          "Enter your registered mobile number to continue.";
        show("phone-form");
      }),
  );
  $("#logout").onclick = async () => {
    await api("/api/customer/auth/logout", { method: "POST" });
    location.reload();
  };
  async function load() {
    const d = await api("/api/customer/me");
    $("#login").hidden = true;
    $("#portal").hidden = false;
    $("#welcome").textContent = `Welcome, ${d.customer.fullName}`;
    $("#content").innerHTML =
      `<section id="dashboard"><h2>Property overview</h2><p class="muted">Registered mobile: ${esc(d.customer.phone)}</p></section><section id="properties" class="detail"><h2>My Properties</h2><div class="grid">${d.properties.map((p) => `<article class="item"><h3>${esc(p.address)}</h3></article>`).join("") || "<p>No properties have been linked yet.</p>"}</div></section><section id="inspections" class="detail"><h2>Inspections</h2><div class="grid">${d.inspections.map((i) => `<article class="item"><h3>${esc(d.properties.find((p) => p.id === i.propertyId)?.address || "Property")}</h3><strong>${i.health.displayScore}/100 ${i.health.band.label}</strong></article>`).join("") || "<p>No inspections yet.</p>"}</div></section><section id="quotations" class="detail"><h2>Quotations</h2><div class="grid">${d.quotations.map((q) => `<article class="item"><h3>${esc(q.packageId)}</h3><p>₹${Number(q.finalAmount).toLocaleString("en-IN")} · Advance ₹${Number(q.bookingAdvanceAmount).toLocaleString("en-IN")}</p></article>`).join("") || "<p>No active quotation yet.</p>"}</div></section>`;
    await renderInspections(d.inspections || []);
  }
  async function renderInspections(inspections) {
    const section = $("#inspections");
    if (!section || !inspections.length) return;
    section.innerHTML = "<h2>Inspections</h2><p class=\"muted\">Loading inspection details...</p>";
    try {
      const details = await Promise.all(inspections.map((item) => api(`/api/customer/inspections/${encodeURIComponent(item.id)}`)));
      section.innerHTML = `<h2>Inspections</h2>${details.map(renderInspection).join("")}`;
      section.querySelectorAll("img").forEach((image) => image.addEventListener("error", () => image.closest("figure")?.remove()));
    } catch (error) {
      section.innerHTML = "<h2>Inspections</h2><p class=\"muted\">Inspection details are temporarily unavailable.</p>";
    }
  }
  function renderInspection(data) {
    const inspection = data.inspection || {}, health = inspection.health || {}, assessment = inspection.assessment || {};
    const answers = Object.entries(assessment.answers || {}).map(([name, value]) => `<li><strong>${esc(name.replaceAll("_", " "))}:</strong> ${esc(value)}</li>`).join("");
    const measurements = (data.measurements || []).map((area) => `<li>${esc(area.name)}: ${Number(area.sqft || 0).toLocaleString("en-IN")} sq ft</li>`).join("");
    const photos = (data.photos || []).map((photo) => `<figure><img loading="lazy" src="${API + photo.url}" alt="${esc(photo.category || "Inspection photo")}"><figcaption>${esc(photo.category || "Inspection photo")}</figcaption></figure>`).join("");
    const viewable = (data.modelAreas || []).some((area) => area.boundaryClosed && (area.segments || []).length >= 3);
    const viewer = viewable ? `<h4>3D Terrace View</h4><div class="model-frame"><iframe loading="lazy" title="Interactive measured property model" src="${API}/customer-model/${encodeURIComponent(inspection.id)}"></iframe></div><p class="muted">One finger: rotate · Two fingers: pan · Pinch: zoom</p>` : "<h4>3D Terrace View</h4><p class=\"muted\">3D view is not available for this inspection.</p>";
    return `<article class="item detail"><h3>${esc(inspection.address || "Property inspection")}</h3><p class="muted">${esc(inspection.created_at || inspection.createdAt || "")}${inspection.inspector ? ` · ${esc(inspection.inspector)}` : ""}</p>${health.displayScore ? `<p class="score">${esc(health.displayScore)}/100</p><p>${esc(health.band?.label || "")}</p>` : ""}${answers ? `<h4>Condition assessment</h4><ul>${answers}</ul>` : ""}<h4>Measurements</h4>${measurements ? `<ul>${measurements}</ul>` : "<p class=\"muted\">No measurements are available.</p>"}${viewer}${photos ? `<h4>Inspection photos</h4><div class="photos">${photos}</div>` : ""}</article>`;
  }
  function esc(v) {
    const e = document.createElement("div");
    e.textContent = v || "";
    return e.innerHTML;
  }
  // `load` owns the one-time session check and leaves normal 401s on the login form.
  load().catch(() => {});
})();
