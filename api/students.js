import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("students")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { students: data });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    const body = req.body || {};
    if (!body.name?.trim()) return sendError(res, "Student name is required.");

    const cleanName = body.name.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Check if exists
    const { data: existing } = await supabase
      .from("students")
      .select("id, name, group_name")
      .ilike("name", cleanName)
      .maybeSingle();

    if (existing) {
      if (body.group_name !== undefined && body.group_name !== existing.group_name) {
        const { data: updated, error: updateError } = await supabase
          .from("students")
          .update({ group_name: body.group_name || null })
          .eq("id", existing.id)
          .select()
          .single();
        if (updateError) return sendError(res, updateError.message, 500);
        return sendJson(res, { student: updated });
      }
      return sendJson(res, { student: existing });
    }

    // Create new
    const { data, error } = await supabase
      .from("students")
      .insert({ name: cleanName, group_name: body.group_name || null })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { student: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id, delete_all } = req.query;
    
    if (delete_all === "true") {
      const { error } = await supabase
        .from("students")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all
      
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

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


