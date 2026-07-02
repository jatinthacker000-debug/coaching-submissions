import { getSupabase } from "./_lib/supabase.js";
import { gradeSubmission } from "./_lib/gemini.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, "Method not allowed.", 405);
  }
  if (!isCoachAuthorized(req)) return coachUnauthorized(res);

  const id = req.query.id;
  if (!id) return sendError(res, "Missing submission id.");

  const supabase = getSupabase();
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("*, question_papers(*)")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return sendError(res, "Submission not found.", 404);
  }

  await supabase.from("submissions").update({ ai_status: "processing" }).eq("id", id);

  try {
    const grade = await gradeSubmission(submission.question_papers, submission.image_urls);
    const { data: graded, error: gradeError } = await supabase
      .from("submissions")
      .update({
        ai_status: "completed",
        ai_score: grade.score,
        ai_verdict: grade.verdict,
        ai_feedback: grade.feedback,
        ai_details: grade.details,
      })
      .eq("id", id)
      .select("*, question_papers(title)")
      .single();

    if (gradeError) throw gradeError;
    return sendJson(res, { submission: graded });
  } catch (err) {
    await supabase
      .from("submissions")
      .update({
        ai_status: "failed",
        ai_feedback: err.message || "AI grading failed.",
      })
      .eq("id", id);

    return sendError(res, err.message || "AI grading failed.", 500);
  }
}

export const config = {
  api: {
    maxDuration: 60,
  },
};
