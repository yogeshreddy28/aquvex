// Public configuration only. Production should point at the Worker custom domain.
window.AQUVEX_API_ORIGIN = window.AQUVEX_API_ORIGIN || (location.hostname === "127.0.0.1" || location.hostname === "localhost" ? "http://localhost:3003" : "https://api.aquvex.in");
window.AQUVEX_WHATSAPP_NUMBER = window.AQUVEX_WHATSAPP_NUMBER || "919353193080";
