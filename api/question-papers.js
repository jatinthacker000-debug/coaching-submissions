import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError, randomId } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("question_papers")
      .select("id, title, subject, answer_key_text, question_image_urls, answer_key_image_urls, created_at")
      .order("created_at", { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { questionPapers: data });
  }

  if (req.method === "POST") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    if (!body.title?.trim()) {
      return sendError(res, "Question paper title is required.");
    }

    const { data, error } = await supabase
      .from("question_papers")
      .insert({
        id: body.id || randomId(),
        title: body.title.trim(),
        subject: body.subject?.trim() || "General",
        answer_key_text: body.answerKeyText?.trim() || "",
        question_image_urls: body.questionImageUrls || [],
        answer_key_image_urls: body.answerKeyImageUrls || [],
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { questionPaper: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const id = req.query.id;
    if (!id) return sendError(res, "Missing question paper id.");

    const { error } = await supabase.from("question_papers").delete().eq("id", id);
    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
