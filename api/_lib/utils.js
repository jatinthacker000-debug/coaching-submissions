import jwt from "jsonwebtoken";

export async function isCoachAuthorized(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  
  if (!token) return false;

  const jwtSecret = process.env.JWT_SECRET || process.env.COACH_PASSWORD_HASH || process.env.COACH_PASSWORD || "fallback_secret_for_dev";
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    return decoded && decoded.role === "coach";
  } catch (err) {
    return false;
  }
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
