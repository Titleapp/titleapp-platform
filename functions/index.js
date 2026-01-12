const functions = require("firebase-functions");

exports.api = functions.https.onRequest((req, res) => {
  res.status(200).json({
    ok: true,
    message: "API executor is live",
    path: req.path,
    method: req.method
  });
});
