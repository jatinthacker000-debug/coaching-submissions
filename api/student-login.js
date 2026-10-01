import { getSupabase } from "./_lib/supabase.js";
import jwt from "jsonwebtoken";
import { sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", 405);
  }

  const { student_id_alias, password } = req.body || {};
  if (!student_id_alias || !password) {
    return sendError(res, "Student ID and Password are required", 400);
  }

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

  // Use the same secret mechanism as coach login
  const coachHash = process.env.COACH_PASSWORD_HASH;
  const legacyPassword = process.env.COACH_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET || coachHash || legacyPassword || "fallback_secret_for_dev";

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
