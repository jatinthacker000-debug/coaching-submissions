import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSupabase } from "./_lib/supabase.js";
import { sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", 405);
  }

  const { password, student_id_alias } = req.body || {};

  if (!password) {
    return sendError(res, "Password is required");
  }

  const coachHash = process.env.COACH_PASSWORD_HASH;
  const legacyPassword = process.env.COACH_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET || coachHash || legacyPassword || "fallback_secret_for_dev";

  // STUDENT LOGIN
  if (student_id_alias) {
    const supabase = getSupabase();

    const { data: student, error } = await supabase
      .from("students")
      .select("id, name, group_name, password")
      .eq("student_id_alias", student_id_alias)
      .maybeSingle();

    if (error) {
      return sendError(res, "Database error", 500);
    }

    if (!student || student.password !== password) {
      return sendError(res, "Invalid Student ID or Password", 401);
    }

    const token = jwt.sign(
      { 
        role: "student", 
        student_id: student.id,
        name: student.name,
        group_name: student.group_name
      }, 
      jwtSecret, 
      { expiresIn: "7d" }
    );

    return sendJson(res, { 
      token,
      student: {
        id: student.id,
        name: student.name,
        group_name: student.group_name
      }
    });
  }

  // COACH LOGIN
  if (!coachHash && !legacyPassword) {
    return sendError(res, "Server configuration error: COACH_PASSWORD_HASH or COACH_PASSWORD not set", 500);
  }

  try {
    let isMatch = false;
    if (coachHash) {
      isMatch = await bcrypt.compare(password, coachHash);
    } else if (legacyPassword) {
      // Fallback for seamless migration: if they haven't set the hash yet, check the plain text password.
      isMatch = (password === legacyPassword);
    }

    if (!isMatch) {
      return sendError(res, "Invalid password", 401);
    }

    const token = jwt.sign({ role: "coach" }, jwtSecret, { expiresIn: "8h" });
    return sendJson(res, { token });
  } catch (error) {
    return sendError(res, "Login failed", 500);
  }
}
