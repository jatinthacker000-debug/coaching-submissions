import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    // Only coach should view all marks to prevent cheating/snooping
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    // Fetch marks with student and exam details
    const { data, error } = await supabase
      .from("marks")
      .select(`
        id, marks_obtained, created_at,
        student_id, students (name),
        exam_id, exams (name, total_marks)
      `);

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { marks: data });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { student_id, submissions } = body;
    // submissions = [{exam_id: "...", marks_obtained: 10}, ...]

    if (!student_id || !Array.isArray(submissions)) {
      return sendError(res, "Missing student_id or submissions array.");
    }

    if (submissions.length === 0) {
      return sendJson(res, { success: true });
    }

    const payload = submissions.map(sub => ({
      student_id,
      exam_id: sub.exam_id,
      marks_obtained: Number(sub.marks_obtained)
    }));

    // Upsert to handle updates if they resubmit
    const { data, error } = await supabase
      .from("marks")
      .upsert(payload, { onConflict: "student_id,exam_id" });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  if (req.method === "DELETE") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);
    
    const { id } = req.query;
    if (!id) return sendError(res, "Missing mark ID.", 400);
    
    const { error } = await supabase
      .from("marks")
      .delete()
      .eq("id", id);
      
    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}

