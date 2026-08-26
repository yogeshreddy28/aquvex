(() => {
  const API = window.AQUVEX_API_ORIGIN.replace(/\/$/, "");
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const esc = (value) => { const element = document.createElement("div"); element.textContent = value || ""; return element.innerHTML; };
  const errorMessage = (error, fallback = "Please try again shortly.") => {
    if (error.status === 401) return "";
    if (error.status === 429) return "Too many attempts. Please try again shortly.";
    if (error.status === 503) return "This service is temporarily unavailable. Please contact AQUVEX.";
    if (error.status === 409) return "Package locked after booking.";
    if (error.status === 404) return "This record is no longer available.";
    return fallback;
  };
  let phone = "";
  let resetToken = "";
  const forms = ["phone-form", "password-form", "create-password-form", "reset-code-form", "reset-password-form"];
  const message = (text) => { $("#message").textContent = text || ""; };
  const api = async (path, options = {}) => {
    let response;
    try { response = await fetch(API + path, { credentials: "include", headers: { "content-type": "application/json", ...(options.headers || {}) }, ...options }); }
    catch { throw { status: 0, message: "Network unavailable" }; }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw { status: response.status, message: body.error || "Request unavailable" };
    return body;
  };
  const show = (id) => { forms.forEach((form) => { $("#" + form).hidden = form !== id; }); message(""); };
  const masked = () => phone ? `+91 ${phone.replace(/\D/g, "").slice(-10).replace(/(\d{2})\d{6}(\d{2})/, "$1XXXXXX$2")}` : "";
  const resetLink = () => `https://wa.me/${window.AQUVEX_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi AQUVEX, I need a password reset code for my customer account. My registered mobile number is ${phone}.`)}`;

  $("#phone-form").onsubmit = async (event) => {
    event.preventDefault(); phone = $("#phone").value;
    try {
      const state = await api("/api/customer/auth/account-state", { method: "POST", body: JSON.stringify({ phone }) });
      if (state.next === "password") { $("#auth-title").textContent = "Welcome back"; $("#auth-copy").textContent = ""; $("#phone-display").textContent = masked(); show("password-form"); }
      else if (state.next === "create_password") { $("#auth-title").textContent = "Create your password"; $("#auth-copy").textContent = "Set a password to securely access your AQUVEX records."; $("#create-phone-display").textContent = masked(); show("create-password-form"); }
      else message(state.message || "We couldn't find an active AQUVEX customer account for this number. Please contact AQUVEX.");
    } catch (error) { message(errorMessage(error, "We couldn't continue with that mobile number.")); }
  };
  $("#password-form").onsubmit = async (event) => {
    event.preventDefault();
    try { await api("/api/customer/auth/login", { method: "POST", body: JSON.stringify({ phone, password: $("#password").value }) }); $("#password").value = ""; await load(); }
    catch (error) { message(error.status === 401 ? "Mobile number or password is incorrect." : errorMessage(error, "Mobile number or password is incorrect.")); }
  };
  $("#create-password-form").onsubmit = async (event) => {
    event.preventDefault(); const password = $("#create-password").value; const confirmPassword = $("#create-confirm").value;
    if (password.length < 8) return message("Password must be at least 8 characters.");
    if (password !== confirmPassword) return message("Passwords do not match.");
    try { await api("/api/customer/auth/create-password", { method: "POST", body: JSON.stringify({ phone, password, confirmPassword }) }); $("#create-password").value = ""; $("#create-confirm").value = ""; await load(); }
    catch (error) { message(errorMessage(error, "We couldn't create your password. Please try again.")); }
  };
  $("#forgot-link").onclick = () => { $("#auth-title").textContent = "Reset Password"; $("#auth-copy").textContent = "Contact AQUVEX to get a password reset code."; $("#whatsapp-reset").href = resetLink(); show("reset-code-form"); };
  $("#reset-code-form").onsubmit = async (event) => {
    event.preventDefault();
    try { const data = await api("/api/customer/auth/verify-reset-code", { method: "POST", body: JSON.stringify({ phone, code: $("#reset-code").value }) }); resetToken = data.resetToken; show("reset-password-form"); }
    catch (error) { message(error.status === 503 ? "Password recovery is temporarily unavailable. Please contact AQUVEX." : errorMessage(error, "That reset code could not be verified.")); }
  };
  $("#reset-password-form").onsubmit = async (event) => {
    event.preventDefault(); const password = $("#reset-password").value;
    if (password.length < 8) return message("Password must be at least 8 characters.");
    if (password !== $("#reset-confirm").value) return message("Passwords do not match.");
    try { await api("/api/customer/auth/reset-password", { method: "POST", body: JSON.stringify({ phone, password, resetToken }) }); resetToken = ""; $("#reset-password").value = ""; $("#reset-confirm").value = ""; await load(); }
    catch (error) { message(errorMessage(error, "We couldn't reset your password. Please try again.")); }
  };
  document.querySelectorAll(".change-number").forEach((button) => { button.onclick = () => { phone = ""; $("#phone").value = ""; $("#auth-title").textContent = "Customer Login"; $("#auth-copy").textContent = "Enter your registered mobile number to continue."; show("phone-form"); }; });
  $("#logout").onclick = async () => { try { await api("/api/customer/auth/logout", { method: "POST" }); } catch (_) {} $("#portal").hidden = true; $("#content").replaceChildren(); $("#login").hidden = false; show("phone-form"); };

  async function load() {
    let dashboard;
    try { dashboard = await api("/api/customer/me"); }
    catch (error) { if (error.status === 401) { $("#login").hidden = false; $("#portal").hidden = true; show("phone-form"); return; } message(errorMessage(error, "We couldn't load your AQUVEX records.")); return; }
    $("#login").hidden = true; $("#portal").hidden = false; $("#welcome").textContent = `Welcome, ${dashboard.customer.fullName}`;
    $("#content").innerHTML = `<section id="dashboard" class="journey-hero"><p class="eyebrow">Your AQUVEX journey</p><h2>Your property, clearly protected</h2><p>Registered mobile: ${esc(dashboard.customer.phone)}</p></section><section id="properties" class="detail"><h2>Your Property</h2><div class="grid">${(dashboard.properties || []).map((property) => `<article class="item"><h3>${esc(property.address)}</h3>${property.propertyType ? `<p class="muted">${esc(property.propertyType)}</p>` : ""}</article>`).join("") || "<p class=\"muted\">No properties have been linked yet.</p>"}</div></section><section id="inspection-overview" class="detail"><h2>Inspection Overview</h2><p class="muted">Loading your inspection report…</p></section>`;
    const details = await loadInspections(dashboard.inspections || []);
    const quotation = (dashboard.quotations || [])[0] || null;
    const journey = quotation ? await loadJourney(quotation, details) : null;
    renderInspectionJourney(details, journey);
    renderCommercialJourney(journey, quotation);
    renderServiceAndReceipts(dashboard.quotations || []);
  }
  async function loadInspections(inspections) {
    if (!inspections.length) return [];
    try { return await Promise.all(inspections.map((inspection) => api(`/api/customer/inspections/${encodeURIComponent(inspection.id)}`))); }
    catch (error) { $("#inspection-overview").innerHTML = `<h2>Inspection Overview</h2><p class="muted">${esc(errorMessage(error, "Inspection details are temporarily unavailable."))}</p>`; return []; }
  }
  async function loadJourney(quotation, inspections) {
    const inspection = inspections.find((item) => item.inspection?.id === quotation.inspectionId) || inspections[0];
    const query = `?quotationId=${encodeURIComponent(quotation.id)}`;
    const designQuery = `?inspectionId=${encodeURIComponent(quotation.inspectionId)}&quotationId=${encodeURIComponent(quotation.id)}`;
    const [packages, design, schedule, protection, summary] = await Promise.all([api("/api/customer/packages"), api(`/api/customer/design${designQuery}`), api(`/api/customer/payment-schedule${query}`), api(`/api/customer/protection${query}`), api(`/api/customer/booking-summary${query}`)].map((request) => request.catch((error) => ({ error }))));
    const failure = [packages, design, schedule, protection, summary].find((result) => result?.error)?.error;
    return failure ? { error: failure, quotation, inspection } : { quotation, inspection, packages: packages.packages || [], design, schedule, protection, summary };
  }
  function renderInspectionJourney(details, journey) {
    const overview = $("#inspection-overview");
    if (!details.length) { overview.innerHTML = "<h2>Inspection Overview</h2><p class=\"muted\">No inspection is available yet.</p>"; return; }
    overview.innerHTML = `<h2>Inspection Overview</h2>${details.map(renderOverview).join("")}`;
    $("#content").insertAdjacentHTML("beforeend", `<section id="inspection-photos" class="detail"><h2>Inspection Photos</h2>${details.map(renderPhotos).join("") || "<p class=\"muted\">No inspection photos are available.</p>"}</section><section id="design-preview" class="detail"><h2>3D Design Preview</h2>${details.map((data) => renderModel(data, journey)).join("")}</section>`);
    $("#content").querySelectorAll(".photos img").forEach((image) => { image.addEventListener("error", () => image.closest("figure")?.remove()); image.addEventListener("click", () => openPhoto(image.src, image.alt)); });
    bindDesignControls(journey);
  }
  function renderOverview(data) {
    const inspection = data.inspection || {}; const health = inspection.health || {}; const assessment = inspection.assessment || {};
    const findings = Object.entries(assessment.answers || {}).map(([name, value]) => `<li><strong>${esc(name.replaceAll("_", " "))}:</strong> ${esc(value)}</li>`).join("");
    const measurements = (data.measurements || []).map((area) => `<li>${esc(area.name)}: ${Number(area.sqft || 0).toLocaleString("en-IN")} sq ft</li>`).join("");
    return `<article class="item report-card"><div class="report-top"><div><h3>${esc(inspection.address || "Property inspection")}</h3><p class="muted">${esc(inspection.created_at || inspection.createdAt || "")}${inspection.inspector ? ` · ${esc(inspection.inspector)}` : ""}</p></div>${health.displayScore ? `<div class="health-score"><strong>${esc(health.displayScore)}</strong><span>/100</span><small>${esc(health.band?.label || "")}</small></div>` : ""}</div>${health.band?.recommendation ? `<p class="recommendation">${esc(health.band.recommendation)}</p>` : ""}${findings ? `<h4>Condition & major findings</h4><ul>${findings}</ul>` : ""}<h4>Measured area</h4>${measurements ? `<ul>${measurements}</ul>` : "<p class=\"muted\">No measurements are available.</p>"}</article>`;
  }
  function renderPhotos(data) { const photos = (data.photos || []).map((photo) => `<figure><img loading="lazy" src="${API + photo.url}" alt="${esc(photo.category || "Inspection photo")}"><figcaption>${esc(photo.category || "Inspection photo")}</figcaption></figure>`).join(""); return photos ? `<article class="photo-gallery">${photos}</article>` : ""; }
  function renderModel(data, journey) {
    const inspection = data.inspection || {}; const viewable = (data.modelAreas || []).some((area) => area.boundaryClosed && (area.segments || []).length >= 3);
    if (!viewable) return "<p class=\"muted\">3D view is not available for this inspection.</p>";
    const selected = journey?.design || { surfaceColour: null, finish: null };
    const controls = journey && !journey.error ? `<div class="design-controls"><div><label for="surface-colour">Choose Surface Colour</label><select id="surface-colour"><option value="white">White</option><option value="light_grey">Light Grey</option><option value="cool_grey">Cool Grey</option><option value="beige">Beige</option><option value="terracotta">Terracotta</option></select></div><div><label for="design-finish">Choose Finish / Design</label><select id="design-finish"><option value="standard">Standard</option><option value="clean_minimal">Clean Minimal</option><option value="two_tone">Two-Tone</option></select></div><button id="save-design" type="button">Save Design</button><p id="design-status" class="muted">${selected.surfaceColour || selected.finish ? "Saved AQUVEX cosmetic preferences." : "Choose a cosmetic surface preference. Geometry and measurements remain fixed."}</p></div>` : "<p class=\"muted\">Design preferences will be available when your quotation is ready.</p>";
    return `<article class="item design-card"><div class="model-frame"><iframe loading="lazy" title="Interactive measured property model" src="${API}/customer-model/${encodeURIComponent(inspection.id)}"></iframe></div><p class="muted">Rotate, zoom and pan the measured property model. Cosmetic preferences are saved separately and never alter the inspection geometry. Live model recolouring is not yet available.</p>${controls}</article>`;
  }
  function bindDesignControls(journey) {
    if (!journey || journey.error) return;
    const colour = $("#surface-colour"); const finish = $("#design-finish"); if (!colour || !finish) return;
    colour.value = journey.design.surfaceColour || "white"; finish.value = journey.design.finish || "standard";
    $("#save-design").onclick = async () => {
      const button = $("#save-design"); button.disabled = true; button.textContent = "Saving…";
      try { const saved = await api("/api/customer/design", { method: "PUT", body: JSON.stringify({ inspectionId: journey.quotation.inspectionId, quotationId: journey.quotation.id, surfaceColour: colour.value, finish: finish.value }) }); journey.design = saved; $("#design-status").textContent = "Your cosmetic design preferences have been saved."; const summaryDesign = $("[data-summary-design]"); if (summaryDesign) summaryDesign.textContent = `${saved.surfaceColour} · ${saved.finish}`; }
      catch (error) { $("#design-status").textContent = errorMessage(error, "We couldn't save your design preference."); }
      finally { button.disabled = false; button.textContent = "Save Design"; }
    };
  }
  function renderCommercialJourney(journey, quotation) {
    if (!quotation) { $("#content").insertAdjacentHTML("beforeend", "<section class=\"detail empty-journey\"><h2>Your Quotation</h2><p class=\"muted\">Your quotation is being prepared.</p></section>"); return; }
    if (!journey || journey.error) { $("#content").insertAdjacentHTML("beforeend", `<section class="detail empty-journey"><h2>Your Quotation</h2><p class="muted">${esc(errorMessage(journey?.error, "Your booking details are temporarily unavailable."))}</p></section>`); return; }
    const summary = journey.summary; const locked = Boolean(summary.booking?.reference || summary.booking?.status || journey.schedule.bookingStatus); const selectedPackage = summary.quotation.package;
    const packageCards = journey.packages.filter((item) => item.active).map((item) => `<article class="package-card ${item.id === selectedPackage.id ? "selected" : ""} ${item.recommended ? "recommended" : ""}"><p>${item.recommended ? "Recommended" : "Protection plan"}</p><h3>${esc(item.name)}</h3><strong>${item.warrantyYears} year warranty</strong><span>${money(item.ratePerSqft)} / sq ft</span>${item.id === selectedPackage.id ? "<b>Selected package</b>" : locked ? "" : `<button type="button" class="select-package" data-package-id="${esc(item.id)}">Choose this package</button>`}</article>`).join("");
    const offer = summary.quotation.offer ? `<section id="booking-offer" class="detail journey-section offer"><p class="eyebrow">Your Booking Offer</p><h2>Current quotation savings</h2><strong>${money(summary.quotation.offer.discountAmount)} saved</strong><p class="muted">Offer type: ${esc(summary.quotation.offer.type)}</p></section>` : "";
    const protection = journey.protection;
    $("#content").insertAdjacentHTML("beforeend", `<section id="package-selection" class="detail journey-section"><p class="eyebrow">Choose Your Package</p><h2>${locked ? "Your package is locked" : "Select your AQUVEX protection"}</h2>${locked ? "<p class=\"locked\">Package locked after booking</p>" : "<p class=\"muted\">Prices are calculated from your inspected area by AQUVEX.</p>"}<div class="package-grid">${packageCards}</div></section>${offer}<section id="payment-schedule" class="detail journey-section"><p class="eyebrow">Payment Schedule</p><h2>Clear, simple payment terms</h2><div class="schedule-grid"><article><span>Total Contract Amount</span><strong>${money(journey.schedule.totalAmount)}</strong></article><article><span>Booking Advance</span><strong>${money(journey.schedule.bookingAdvanceAmount)}</strong></article><article><span>Remaining Balance</span><strong>${money(journey.schedule.remainingBalance)}</strong></article></div>${journey.schedule.bookingStatus || journey.schedule.paymentStatus ? `<p class="status">${esc(journey.schedule.bookingStatus || journey.schedule.paymentStatus)}</p>` : ""}</section><section id="written-protection" class="detail journey-section protection"><p class="eyebrow">Your AQUVEX Written Protection</p><h2>${esc(protection.package.name)}</h2><p>${esc(protection.wording)}</p><div class="protection-facts"><span>Version <b>${esc(protection.version)}</b></span><span>Warranty <b>${protection.package.warrantyYears} years</b></span><span>Covered area <b>${Number(protection.areaSqFt || 0).toLocaleString("en-IN")} sq ft</b></span></div><button class="secondary" type="button" id="protection-toggle">View Protection Details</button><div id="protection-details" hidden><h3>Scope</h3><ul>${protection.scope.map((item) => `<li>${esc(item)}</li>`).join("")}</ul><h3>Exclusions</h3><ul>${protection.exclusions.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div></section><section id="final-booking-summary" class="detail journey-section final-summary"><p class="eyebrow">Final Booking Summary</p><h2>Everything in one place</h2><dl><div><dt>Property</dt><dd>${esc(summary.property.reference || "AQUVEX property")}</dd></div><div><dt>Selected package</dt><dd>${esc(selectedPackage.name)} · ${selectedPackage.warrantyYears} years</dd></div><div><dt>Inspected area</dt><dd>${Number(summary.inspection.areaSqFt || 0).toLocaleString("en-IN")} sq ft</dd></div><div><dt>Surface design</dt><dd data-summary-design>${esc(summary.design.surfaceColour || "Not selected")} · ${esc(summary.design.finish || "Not selected")}</dd></div><div><dt>Regular amount</dt><dd>${money(summary.quotation.regularAmount)}</dd></div><div><dt>Discount</dt><dd>${money(summary.quotation.discountAmount)}</dd></div><div><dt>Final amount</dt><dd>${money(summary.quotation.finalAmount)}</dd></div><div><dt>Booking advance</dt><dd>${money(summary.paymentSchedule.bookingAdvanceAmount)}</dd></div></dl>${locked ? `<p class="locked">Booking ${esc(summary.booking.reference || "confirmed")}. Your package and commercial terms are locked.</p>` : `<button type="button" class="pay-advance" data-quotation-id="${esc(quotation.id)}">Pay Booking Advance</button>`}</section>`);
    $("#content").querySelectorAll(".select-package").forEach((button) => button.addEventListener("click", () => selectPackage(button, quotation.id)));
    $("#content").querySelectorAll(".pay-advance").forEach((button) => button.addEventListener("click", () => startPayment(button)));
    $("#protection-toggle").onclick = () => { const details = $("#protection-details"); details.hidden = !details.hidden; $("#protection-toggle").textContent = details.hidden ? "View Protection Details" : "Hide Protection Details"; };
  }
  async function selectPackage(button, quotationId) {
    const original = button.textContent; button.disabled = true; button.textContent = "Updating…";
    try { await api("/api/customer/package-selection", { method: "POST", body: JSON.stringify({ quotationId, packageId: button.dataset.packageId }) }); message("Your package and authoritative quotation have been updated."); await load(); }
    catch (error) { if (error.status === 409) { message("Package locked after booking."); await load(); } else { button.disabled = false; button.textContent = original; message(errorMessage(error, "We couldn't update your package.")); } }
  }
  async function startPayment(button) {
    button.disabled = true; const original = button.textContent; button.textContent = "Starting payment…";
    try {
      const order = await api("/api/customer/bookings", { method: "POST", body: JSON.stringify({ quotationId: button.dataset.quotationId }) });
      if (!window.Razorpay) throw { status: 503 };
      const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId, name: "AQUVEX", handler: async (result) => { button.textContent = "Verifying payment…"; await api("/api/customer/payments/verify", { method: "POST", body: JSON.stringify(result) }); message("Payment is being confirmed. Your booking status will update shortly."); await load(); }, modal: { ondismiss: () => { button.disabled = false; button.textContent = original; message("Payment was cancelled. You can try again when you're ready."); } } });
      checkout.open();
    } catch (error) { button.disabled = false; button.textContent = original; message(error.status === 503 ? "Online payment is temporarily unavailable. Please contact AQUVEX to complete your booking." : errorMessage(error, "We could not start payment. Please try again shortly.")); }
  }
  function renderServiceAndReceipts(quotations) {
    const confirmed = quotations.filter((quote) => quote.bookingNumber); const receipts = quotations.filter((quote) => quote.receiptNumber);
    $("#content").insertAdjacentHTML("beforeend", `<section class="detail"><h2>Your Service</h2>${confirmed.length ? `<div class="grid">${confirmed.map((quote) => `<article class="item"><h3>Booking Confirmed</h3><p>${esc(quote.bookingNumber)}</p><p class="muted">${esc(quote.packageId || "AQUVEX service")}</p></article>`).join("")}</div>` : "<p class=\"muted\">Your service details will appear after booking is confirmed.</p>"}</section><section class="detail"><h2>Receipts</h2>${receipts.length ? `<div class="grid">${receipts.map((quote) => `<article class="item"><h3>${esc(quote.receiptNumber)}</h3><p>${money(quote.bookingAdvanceAmount)}</p><p class="muted">${esc(quote.bookingNumber || "")}</p></article>`).join("")}</div>` : "<p class=\"muted\">Receipts will appear after a booking payment is confirmed.</p>"}</section>`);
  }
  function openPhoto(src, alt) { const modal = document.createElement("dialog"); modal.className = "photo-modal"; modal.innerHTML = `<button type="button" aria-label="Close photo">Close</button><img src="${esc(src)}" alt="${esc(alt)}">`; modal.querySelector("button").onclick = () => modal.close(); modal.onclose = () => modal.remove(); document.body.append(modal); modal.showModal(); }
  // `load` performs the initial session check exactly once.
  load();
})();
