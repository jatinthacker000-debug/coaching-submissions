import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();
  const type = req.query.type || req.body?.type;

  // ==========================================
  // 1. HELP DESK & QUERIES
  // ==========================================
  if (type === "queries") {
    if (req.method === "GET") {
      const isCoach = await isCoachAuthorized(req);
      const { student_id, status, group_name } = req.query;

      try {
        let query = supabase
          .from("student_queries")
          .select("*")
          .order("created_at", { ascending: false });

        if (isCoach) {
          if (status) query = query.eq("status", status);
          if (group_name) query = query.eq("group_name", group_name);
        } else if (student_id) {
          query = query.eq("student_id", student_id);
        } else {
          return sendError(res, "Missing student_id or coach authorization", 401);
        }

        const { data, error } = await query;
        if (error) {
          // Table might not exist yet if user hasn't run the SQL
          return sendJson(res, { queries: [], warning: error.message });
        }
        return sendJson(res, { queries: data || [] });
      } catch (err) {
        return sendJson(res, { queries: [] });
      }
    }

    if (req.method === "POST") {
      const body = req.body || {};
      if (!body.student_name?.trim() || !body.title?.trim() || !body.message?.trim()) {
        return sendError(res, "Student name, question title, and message are required.");
      }

      try {
        const { data, error } = await supabase
          .from("student_queries")
          .insert({
            student_id: body.student_id || null,
            student_name: body.student_name.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;"),
            student_id_alias: body.student_id_alias?.trim() || null,
            group_name: body.group_name?.trim() || "",
            subject: body.subject?.trim() || "General",
            title: body.title.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;"),
            message: body.message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;"),
            status: "pending"
          })
          .select()
          .single();

        if (error) return sendError(res, error.message, 500);
        return sendJson(res, { query: data }, 201);
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    }

    if (req.method === "PUT") {
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
      const body = req.body || {};
      const queryId = body.query_id || body.id;
      if (!queryId) return sendError(res, "Query ID is required.");

      const updates = {};
      if (body.coach_reply !== undefined) {
        updates.coach_reply = body.coach_reply.trim();
        updates.replied_at = new Date().toISOString();
      }
      if (body.status !== undefined) {
        updates.status = body.status.trim();
      } else if (body.coach_reply) {
        updates.status = "resolved";
      }

      try {
        const { data, error } = await supabase
          .from("student_queries")
          .update(updates)
          .eq("id", queryId)
          .select()
          .single();

        if (error) return sendError(res, error.message, 500);
        return sendJson(res, { query: data });
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    }

    if (req.method === "DELETE") {
      if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
      const queryId = req.query.query_id || req.query.id;
      if (!queryId) return sendError(res, "Missing Query ID.");

      try {
        const { error } = await supabase
          .from("student_queries")
          .delete()
          .eq("id", queryId);

        if (error) return sendError(res, error.message, 500);
        return sendJson(res, { success: true });
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    }

    return sendError(res, "Method not allowed for queries.", 405);
  }

  // ==========================================
  // 2. STUDENT MANAGEMENT & CREDENTIALS
  // ==========================================
  function resolveDefaultClass(className, groupName) {
    if (className && String(className).trim()) return String(className).trim();
    const g = (groupName || "").trim().toLowerCase();
    if (["lakshya", "prayas", "sankalp"].includes(g)) return "Velocity";
    if (g === "nalanda") return "IGNITE coaching class";
    if (g.startsWith("nerd tutors")) return groupName.trim();
    return "";
  }

  if (req.method === "GET") {
    const isCoach = await isCoachAuthorized(req);
    // If coach, fetch credentials too
    const selectFields = isCoach 
      ? "id, name, group_name, class_name, subjects, student_id_alias, password, is_active" 
      : "id, name, group_name, class_name, subjects, is_active";
    
    const { data, error } = await supabase
      .from("students")
      .select(selectFields)
      .order("name", { ascending: true });

    if (error) return sendError(res, error.message, 500);

    // Apply default class mappings dynamically if class_name is currently empty
    const studentsWithDefaults = (data || []).map(st => ({
      ...st,
      class_name: st.class_name || resolveDefaultClass(st.class_name, st.group_name)
    }));

    return sendJson(res, { students: studentsWithDefaults });
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
    const groupName = body.group_name || null;
    const className = resolveDefaultClass(body.class_name, groupName);

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
        group_name: groupName,
        class_name: className,
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

    // Support Bulk updates for spreadsheet table
    if (Array.isArray(body.students)) {
      try {
        const updatePromises = body.students.map(async (s) => {
          if (!s || !s.id) return null;
          const sUpdates = {};

          if (s.name !== undefined && s.name !== null) {
            const trimmedName = String(s.name).trim();
            if (trimmedName) {
              sUpdates.name = trimmedName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
          }

          if (s.student_id_alias !== undefined) {
            const aliasStr = s.student_id_alias ? String(s.student_id_alias).trim() : "";
            sUpdates.student_id_alias = aliasStr || null;
          }

          if (s.password !== undefined) {
            const passStr = s.password ? String(s.password).trim() : "";
            sUpdates.password = passStr || null;
          }

          if (s.group_name !== undefined) {
            const grpStr = s.group_name ? String(s.group_name).trim() : "";
            sUpdates.group_name = grpStr || null;
          }

          if (s.class_name !== undefined) {
            const clsStr = s.class_name ? String(s.class_name).trim() : "";
            sUpdates.class_name = clsStr;
          }

          if (s.subjects !== undefined) {
            sUpdates.subjects = Array.isArray(s.subjects) ? s.subjects : [];
          }

          if (s.is_active !== undefined) {
            sUpdates.is_active = Boolean(s.is_active);
          }

          if (Object.keys(sUpdates).length === 0) return null;

          const { data, error } = await supabase
            .from("students")
            .update(sUpdates)
            .eq("id", s.id)
            .select()
            .single();

          if (error) {
            console.error(`Error updating student ${s.id}:`, error);
            return null;
          }
          return data;
        });

        const results = await Promise.all(updatePromises);
        const updatedList = results.filter(Boolean);

        return sendJson(res, { success: true, count: updatedList.length, students: updatedList });
      } catch (err) {
        console.error("Bulk update exception:", err);
        return sendError(res, "Bulk update failed: " + err.message, 500);
      }
    }

    // Single student update
    if (!body.id) return sendError(res, "Student ID is required.", 400);

    const updates = {};
    if (body.name !== undefined && body.name !== null) {
      const cleanName = String(body.name).trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (cleanName) {
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
    }

    if (body.student_id_alias !== undefined) {
      const aliasStr = body.student_id_alias ? String(body.student_id_alias).trim() : "";
      updates.student_id_alias = aliasStr || null;
    }
    if (body.password !== undefined) {
      const passStr = body.password ? String(body.password).trim() : "";
      updates.password = passStr || null;
    }
    if (body.group_name !== undefined) {
      const grpStr = body.group_name ? String(body.group_name).trim() : "";
      updates.group_name = grpStr || null;
    }
    if (body.class_name !== undefined) {
      const clsStr = body.class_name ? String(body.class_name).trim() : "";
      updates.class_name = clsStr;
    }
    if (body.subjects !== undefined) {
      updates.subjects = Array.isArray(body.subjects) ? body.subjects : [];
    }
    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active);
    }

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
