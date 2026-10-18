import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const isCoach = await isCoachAuthorized(req);
    // If coach, fetch credentials too
    const selectFields = isCoach ? "id, name, group_name, subjects, student_id_alias, password, is_active" : "id, name, group_name, subjects, is_active";
    
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
    const subjects = Array.isArray(body.subjects) ? body.subjects : [];
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;

    // Check if name already exists
    const { data: existing } = await supabase
      .from("students")
      .select("id, name")
      .ilike("name", cleanName)
      .maybeSingle();

    if (existing) {
      return sendError(res, "name already taken", 400);
    }

    // Create new
    const { data, error } = await supabase
      .from("students")
      .insert({ 
        name: cleanName, 
        group_name: body.group_name || null,
        subjects: subjects,
        student_id_alias: studentIdAlias,
        password: password,
        is_active: isActive
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
    if (body.name !== undefined) {
      const cleanName = body.name.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const { data: existingWithName } = await supabase
        .from("students")
        .select("id")
        .ilike("name", cleanName)
        .neq("id", body.id)
        .maybeSingle();

      if (existingWithName) {
        return sendError(res, "name already taken", 400);
      }
      updates.name = cleanName;
    }
    if (body.student_id_alias !== undefined) updates.student_id_alias = body.student_id_alias.trim() || null;
    if (body.password !== undefined) updates.password = body.password.trim() || null;
    if (body.group_name !== undefined) updates.group_name = body.group_name.trim() || null;
    if (body.subjects !== undefined) updates.subjects = Array.isArray(body.subjects) ? body.subjects : [];
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

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
