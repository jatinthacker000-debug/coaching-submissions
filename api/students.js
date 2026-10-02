import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const isCoach = await isCoachAuthorized(req);
    // If coach, fetch credentials too
    const selectFields = isCoach ? "id, name, group_name, student_id_alias, password" : "id, name, group_name";
    
    const { data, error } = await supabase
      .from("students")
      .select(selectFields)
      .order("name", { ascending: true });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { students: data });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    const body = req.body || {};
    if (!body.name?.trim()) return sendError(res, "Student name is required.");

    const cleanName = body.name.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const studentIdAlias = body.student_id_alias?.trim() || null;
    const password = body.password?.trim() || null;

    // Check if exists
    const { data: existing } = await supabase
      .from("students")
      .select("id, name, group_name, student_id_alias, password")
      .ilike("name", cleanName)
      .maybeSingle();

    if (existing) {
      const updates = {};
      if (body.group_name !== undefined && body.group_name !== existing.group_name) {
        updates.group_name = body.group_name || null;
      }
      if (studentIdAlias !== null && studentIdAlias !== existing.student_id_alias) {
        updates.student_id_alias = studentIdAlias;
      }
      if (password !== null && password !== existing.password) {
        updates.password = password;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from("students")
          .update(updates)
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
      .insert({ 
        name: cleanName, 
        group_name: body.group_name || null,
        student_id_alias: studentIdAlias,
        password: password
      })
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

  if (req.method === "PUT") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    const body = req.body || {};
    if (!body.id) return sendError(res, "Student ID is required.", 400);

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (body.student_id_alias !== undefined) updates.student_id_alias = body.student_id_alias.trim() || null;
    if (body.password !== undefined) updates.password = body.password.trim() || null;
    if (body.group_name !== undefined) updates.group_name = body.group_name.trim() || null;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", body.id)
        .select()
        .single();
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { student: data });
    }
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}
