import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSupabase } from "./_lib/supabase.js";
import { sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { student_id } = req.query || {};
    if (student_id) {
      const supabase = getSupabase();
      const { data: student, error } = await supabase
        .from("students")
        .select("id, is_active")
        .eq("id", student_id)
        .maybeSingle();

      if (error) return sendError(res, "Database error", 500);
      if (!student) return sendError(res, "Student not found", 404);
      return sendJson(res, { is_active: student.is_active !== false });
    }
    return sendError(res, "Missing student_id", 400);
  }

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
      .select("id, name, group_name, password, is_active")
      .eq("student_id_alias", student_id_alias)
      .maybeSingle();

    if (error) {
      return sendError(res, "Database error", 500);
    }

    if (!student || student.password !== password) {
      return sendError(res, "Invalid Student ID or Password", 401);
    }

    if (student.is_active === false) {
      return sendError(res, "Your account has been temporarily suspended. You cannot enter your ID.", 403);
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
