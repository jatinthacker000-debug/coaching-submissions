import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSupabase } from "./_lib/supabase.js";
import { sendJson, sendError, isCoachAuthorized, coachUnauthorized } from "./_lib/utils.js";

function resolveDefaultClass(className, groupName) {
  if (className && String(className).trim()) return String(className).trim();
  const g = (groupName || "").trim().toLowerCase();
  if (["lakshya", "prayas", "sankalp"].includes(g)) return "Velocity";
  if (g === "nalanda") return "IGNITE coaching class";
  if (g.startsWith("nerd tutors")) return groupName.trim();
  return "";
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { student_id, type, record_session } = req.query || {};

    // 1. Fetch Student Logins (for Coach Dashboard)
    if (type === "logins") {
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from("student_logins")
          .select("id, student_id, student_name, student_id_alias, group_name, logged_in_at")
          .order("logged_in_at", { ascending: false })
          .limit(500);

        if (error) {
          return sendJson(res, { logins: [], warning: error.message });
        }
        return sendJson(res, { logins: data || [] });
      } catch (err) {
        return sendJson(res, { logins: [] });
      }
    }

    // 2. Fetch Student Status & Record Daily Session (if returning student)
    if (student_id) {
      const supabase = getSupabase();
      const { data: student, error } = await supabase
        .from("students")
        .select("id, name, group_name, class_name, student_id_alias, is_active")
        .eq("id", student_id)
        .maybeSingle();

      if (error) return sendError(res, "Database error", 500);
      if (!student) return sendError(res, "Student not found", 404);

      if (record_session === "true" && student.is_active !== false) {
        try {
          const { error: insertErr } = await supabase.from("student_logins").insert({
            student_id: student.id,
            student_name: student.name,
            student_id_alias: student.student_id_alias || null,
            group_name: student.group_name || "",
            logged_in_at: new Date().toISOString()
          });
          if (insertErr) {
            console.error("Failed to record student visit in student_logins:", insertErr);
          }
        } catch (err) {
          console.error("Exception recording student visit:", err);
        }
      }

      const effectiveClass = student.class_name || resolveDefaultClass(student.class_name, student.group_name);

      return sendJson(res, { 
        is_active: student.is_active !== false,
        student: {
          id: student.id,
          name: student.name,
          group_name: student.group_name,
          class_name: effectiveClass
        }
      });
    }
    return sendError(res, "Missing student_id or valid type", 400);
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const { login_id, delete_all_logins } = req.query || {};
    const supabase = getSupabase();

    if (delete_all_logins === "true") {
      const { error } = await supabase
        .from("student_logins")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    if (login_id) {
      const { error } = await supabase
        .from("student_logins")
        .delete()
        .eq("id", login_id);

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    return sendError(res, "Missing login_id or delete_all_logins query parameter", 400);
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
      .select("id, name, group_name, class_name, student_id_alias, password, is_active")
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

    const effectiveClass = student.class_name || resolveDefaultClass(student.class_name, student.group_name);

    // Record login event in student_logins table (non-blocking)
    try {
      await supabase.from("student_logins").insert({
        student_id: student.id,
        student_name: student.name,
        student_id_alias: student.student_id_alias || student_id_alias,
        group_name: student.group_name || "",
        logged_in_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.error("Failed to log student login:", logErr);
    }

    const token = jwt.sign(
      { 
        role: "student", 
        student_id: student.id,
        name: student.name,
        group_name: student.group_name,
        class_name: effectiveClass
      }, 
      jwtSecret, 
      { expiresIn: "7d" }
    );

    return sendJson(res, { 
      token,
      student: {
        id: student.id,
        name: student.name,
        group_name: student.group_name,
        class_name: effectiveClass,
        student_id_alias: student.student_id_alias || student_id_alias
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
