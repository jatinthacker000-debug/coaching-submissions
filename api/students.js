import { getSupabase } from "./_lib/supabase.js";
import { sendJson, sendError } from "./_lib/utils.js";

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

  return sendError(res, "Method not allowed.", 405);
}

