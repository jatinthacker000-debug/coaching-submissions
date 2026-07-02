export function isCoachAuthorized(req) {
  const password = process.env.COACH_PASSWORD;
  if (!password) return false;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === password;
}

export function sendJson(res, data, status = 200) {
  res.status(status).json(data);
}

export function sendError(res, message, status = 400) {
  sendJson(res, { error: message }, status);
}

export function coachUnauthorized(res) {
  sendError(res, "Unauthorized. Invalid coach password.", 401);
}

export function sanitizeFileName(name) {
  return (name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export function randomId() {
  return crypto.randomUUID();
}
