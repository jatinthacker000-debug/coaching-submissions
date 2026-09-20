import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("students")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { students: data });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.name?.trim()) return sendError(res, "Student name is required.");

    // Check if exists
    const { data: existing } = await supabase
      .from("students")
      .select("id, name")
      .ilike("name", body.name.trim())
      .maybeSingle();

    if (existing) return sendJson(res, { student: existing });

    // Create new
    const { data, error } = await supabase
      .from("students")
      .insert({ name: body.name.trim() })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { student: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id } = req.query;
    if (!id) return sendError(res, "Missing student ID.", 400);

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}

