import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("exams")
      .select("id, name, total_marks, target_groups, created_at")
      .order("created_at", { ascending: true });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { exams: data });
  }

  if (req.method === "POST") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    if (!body.name?.trim() || body.total_marks === undefined) {
      return sendError(res, "Exam name and total marks are required.");
    }

    const { data, error } = await supabase
      .from("exams")
      .insert({
        name: body.name.trim(),
        total_marks: Number(body.total_marks),
        target_groups: Array.isArray(body.target_groups) ? body.target_groups : []
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { exam: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id, delete_all } = req.query;
    
    if (delete_all === "true") {
      const { error } = await supabase.from("exams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

    if (!id) return sendError(res, "Missing exam id.");

    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}


