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
    if (res.setHeader) {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    }
    return sendJson(res, { links: data });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    
    // 1. Upsert Homework Status
    const { updates, homework_date, group_name, group_names, link } = req.body || {};
    
    if (updates && Array.isArray(updates)) {
      if (updates.length === 0) return sendJson(res, { success: true });
      const { error } = await supabase
        .from("homework_status")
        .upsert(updates, { onConflict: "homework_date, student_id" });
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    // 2. Upsert Homework Link(s)
    if (homework_date && (group_name || (Array.isArray(group_names) && group_names.length > 0)) && link) {
      let targetGroups = [];
      if (group_name === "ALL_GRADE_10") {
        targetGroups = ["Ignite", "Velocity", "Epsilon"];
      } else if (Array.isArray(group_names) && group_names.length > 0) {
        targetGroups = group_names;
      } else if (Array.isArray(group_name)) {
        targetGroups = group_name;
      } else {
        targetGroups = [group_name];
      }

      const rows = targetGroups.map(g => ({
        homework_date,
        group_name: g,
        link: link.trim()
      }));

      const { data, error } = await supabase
        .from("homework_links")
        .upsert(rows, { onConflict: 'homework_date,group_name' })
        .select();

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { links: data, link: data && data[0] }, 201);
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
