import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    // If coach, can fetch by date and group. 
    // If student, can fetch by student_id
    const { student_id, homework_date, group_name } = req.query;

    if (student_id) {
      // Student viewing their own report
      const { data, error } = await supabase
        .from("homework_status")
        .select("*")
        .eq("student_id", student_id)
        .order("homework_date", { ascending: false });

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { statuses: data });
    }

    if (homework_date && group_name) {
      // Coach fetching grid
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

      // First get all students in the group
      const { data: students, error: studErr } = await supabase
        .from("students")
        .select("id, name")
        .eq("group_name", group_name)
        .order("name", { ascending: true });

      if (studErr) return sendError(res, studErr.message, 500);

      // Then get existing statuses for this date and these students
      if (students.length === 0) {
         return sendJson(res, { students: [], statuses: [] });
      }

      const studentIds = students.map(s => s.id);
      const { data: statuses, error: statErr } = await supabase
        .from("homework_status")
        .select("*")
        .eq("homework_date", homework_date)
        .in("student_id", studentIds);

      if (statErr) return sendError(res, statErr.message, 500);
      return sendJson(res, { students, statuses });
    }

    return sendError(res, "Missing parameters.", 400);
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    
    // Expecting an array of statuses: { student_id, homework_date, status }
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
      return sendError(res, "Invalid body.", 400);
    }

    if (updates.length === 0) return sendJson(res, { success: true });

    // Supabase upsert
    const { error } = await supabase
      .from("homework_status")
      .upsert(updates, { onConflict: "homework_date, student_id" });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}
