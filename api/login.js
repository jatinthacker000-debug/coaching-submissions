import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", 405);
  }

  const { password } = req.body || {};
  if (!password) {
    return sendError(res, "Password is required");
  }

  const coachHash = process.env.COACH_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET || process.env.COACH_PASSWORD_HASH || "fallback_secret_for_dev";

  if (!coachHash) {
    return sendError(res, "Server configuration error: COACH_PASSWORD_HASH not set", 500);
  }

  try {
    const isMatch = await bcrypt.compare(password, coachHash);
    if (!isMatch) {
      return sendError(res, "Invalid password", 401);
    }

    const token = jwt.sign({ role: "coach" }, jwtSecret, { expiresIn: "8h" });
    return sendJson(res, { token });
  } catch (error) {
    return sendError(res, "Login failed", 500);
  }
}
