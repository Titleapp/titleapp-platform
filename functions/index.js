const { onRequest } = require("firebase-functions/v2/https");

exports.api = onRequest((req, res) => {
  res.status(200).json({
    ok: true,
    message: "API executor is live",
    path: req.path,
    method: req.method
  });
});
