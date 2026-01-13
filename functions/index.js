const { onRequest } = require("firebase-functions/v2/https");

exports.api = onRequest((req, res) => {
  const { path, method } = req;

  // Health check
  if (path === "/" && method === "GET") {
    return res.json({
      ok: true,
      service: "title-app-core",
      version: "alpha",
      message: "API executor is live",
    });
  }

  // Title App: preview report (stub)
  if (path === "/report/preview" && method === "POST") {
    const { address, userIntent } = req.body || {};

    return res.json({
      ok: true,
      previewId: "preview_" + Date.now(),
      address,
      userIntent,
      message: "Preview generated (stub)",
    });
  }

  // Fallback
  res.status(404).json({
    ok: false,
    error: "Unknown endpoint",
    path,
    method,
  });
});
