import { getSupabase } from "./_lib/supabase.js";
import { gradeSubmission } from "./_lib/gemini.js";
import {
  isCoachAuthorized,
  coachUnauthorized,
  sendJson,
  sendError,
  randomId,
} from "./_lib/utils.js";

async function listSubmissions(req, res) {
  const supabase = getSupabase();
  const questionPaperId = req.query.questionPaperId;

  let query = supabase
    .from("submissions")
    .select("*, question_papers(title)")
    .order("submitted_at", { ascending: false });

  if (questionPaperId) {
    query = query.eq("question_paper_id", questionPaperId);
  }

  const { data, error } = await query;
  if (error) return sendError(res, error.message, 500);
  return sendJson(res, { submissions: data });
}

async function createSubmission(req, res) {
  const supabase = getSupabase();
  const body = req.body || {};

  if (!body.studentName?.trim()) {
    return sendError(res, "Student name is required.");
  }
  if (!body.questionPaperId) {
    return sendError(res, "Please select a question paper.");
  }
  if (!body.imageUrls?.length) {
    return sendError(res, "Please upload at least one answer sheet photo.");
  }
  if (body.imageUrls.length > 10) {
    return sendError(res, "You can upload up to 10 photos only.");
  }

  const { data: questionPaper, error: paperError } = await supabase
    .from("question_papers")
    .select("*")
    .eq("id", body.questionPaperId)
    .single();

  if (paperError || !questionPaper) {
    return sendError(res, "Selected question paper was not found.", 404);
  }

  const submissionId = randomId();

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      id: submissionId,
      question_paper_id: body.questionPaperId,
      student_name: body.studentName.trim(),
      image_urls: body.imageUrls,
      ai_status: "processing",
    })
    .select("*, question_papers(title)")
    .single();

  if (error) return sendError(res, error.message, 500);

  try {
    const grade = await gradeSubmission(questionPaper, body.imageUrls);
    const { data: graded, error: gradeError } = await supabase
      .from("submissions")
      .update({
        ai_status: "completed",
        ai_score: grade.score,
        ai_verdict: grade.verdict,
        ai_feedback: grade.feedback,
        ai_details: grade.details,
      })
      .eq("id", submissionId)
      .select("*, question_papers(title)")
      .single();

    if (gradeError) throw gradeError;
    return sendJson(res, { submission: graded }, 201);
  } catch (gradeErr) {
    await supabase
      .from("submissions")
      .update({
        ai_status: "failed",
        ai_feedback: gradeErr.message || "AI grading failed.",
      })
      .eq("id", submissionId);

    return sendJson(
      res,
      {
        submission: {
          ...submission,
          ai_status: "failed",
          ai_feedback: gradeErr.message || "AI grading failed.",
        },
        warning: "Submission saved but AI grading failed. Coach can retry from dashboard.",
      },
      201
    );
  }
}

async function deleteSubmission(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;
  if (!id) return sendError(res, "Missing submission id.");

  const { error } = await supabase.from("submissions").delete().eq("id", id);
  if (error) return sendError(res, error.message, 500);
  return sendJson(res, { success: true });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);
    return listSubmissions(req, res);
  }

  if (req.method === "POST") {
    return createSubmission(req, res);
  }

  if (req.method === "DELETE") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);
    return deleteSubmission(req, res);
  }

  return sendError(res, "Method not allowed.", 405);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
