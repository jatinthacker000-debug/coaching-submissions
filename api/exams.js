import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("exams")
      .select("id, name, total_marks, target_groups, subject, created_at")
      .order("created_at", { ascending: true });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { exams: data });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    if (!body.name?.trim() || body.total_marks === undefined) {
      return sendError(res, "Exam name and total marks are required.");
    }

    const subject = body.subject?.trim() || "";
    let target_groups = Array.isArray(body.target_groups) ? body.target_groups : [];

    // Business Studies exams are strictly for Nerd Tutors and Nerd Tutors Nalanda
    const isBst = subject.toLowerCase() === "business studies" || subject.toLowerCase() === "bst" || body.name?.trim().toLowerCase().includes("business studies");
    if (isBst) {
      target_groups = target_groups.filter(g => g === "Nerd Tutors" || g === "Nerd Tutors Nalanda");
      if (target_groups.length === 0) {
        target_groups = ["Nerd Tutors", "Nerd Tutors Nalanda"];
      }
    }

    const { data, error } = await supabase
      .from("exams")
      .insert({
        name: body.name.trim(),
        total_marks: Number(body.total_marks),
        target_groups: target_groups,
        subject: subject
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { exam: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

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

  if (req.method === "PUT") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    const { id } = body;
    if (!id) return sendError(res, "Missing exam id.", 400);

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.total_marks !== undefined) updates.total_marks = Number(body.total_marks);
    if (body.target_groups !== undefined) updates.target_groups = Array.isArray(body.target_groups) ? body.target_groups : [];
    if (body.subject !== undefined) updates.subject = body.subject.trim();

    const isBst = (updates.subject !== undefined && (updates.subject.toLowerCase() === "business studies" || updates.subject.toLowerCase() === "bst")) ||
                  (updates.name !== undefined && updates.name.toLowerCase().includes("business studies"));
    if (isBst) {
      let tg = updates.target_groups !== undefined ? updates.target_groups : [];
      tg = tg.filter(g => g === "Nerd Tutors" || g === "Nerd Tutors Nalanda");
      if (tg.length === 0) {
        tg = ["Nerd Tutors", "Nerd Tutors Nalanda"];
      }
      updates.target_groups = tg;
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("exams")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { exam: data });
    }
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}



