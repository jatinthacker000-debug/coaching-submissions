import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { student_id, homework_date, group_name, type } = req.query;

    // 1. Fetch Student Status (for Student Dashboard)
    if (student_id) {
      const { data, error } = await supabase
        .from("homework_status")
        .select("*")
        .eq("student_id", student_id)
        .order("homework_date", { ascending: false });

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { statuses: data });
    }

    // 2. Fetch Status Grid (for Coach Dashboard)
    if (homework_date && group_name) {
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

      const { data: students, error: studErr } = await supabase
        .from("students")
        .select("id, name")
        .eq("group_name", group_name)
        .order("name", { ascending: true });

      if (studErr) return sendError(res, studErr.message, 500);

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

    // 3. Fetch Homework Links
    let query = supabase.from("homework_links").select("id, homework_date, group_name, link");
    if (group_name) {
      query = query.eq("group_name", group_name);
    }
    const { data, error } = await query;
    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { links: data });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    
    // 1. Upsert Homework Status
    const { updates, homework_date, group_name, link } = req.body || {};
    
    if (updates && Array.isArray(updates)) {
      if (updates.length === 0) return sendJson(res, { success: true });
      const { error } = await supabase
        .from("homework_status")
        .upsert(updates, { onConflict: "homework_date, student_id" });
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    // 2. Upsert Homework Link
    if (homework_date && group_name && link) {
      const { data, error } = await supabase
        .from("homework_links")
        .upsert(
          { homework_date, group_name, link },
          { onConflict: 'homework_date,group_name' }
        )
        .select()
        .single();

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { link: data }, 201);
    }

    return sendError(res, "Invalid body parameters.", 400);
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id } = req.query;
    if (!id) return sendError(res, "Missing ID.", 400);

    const { error } = await supabase
      .from("homework_links")
      .delete()
      .eq("id", id);

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}
