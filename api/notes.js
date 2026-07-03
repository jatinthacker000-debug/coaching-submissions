import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError, randomId } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, grade, link, created_at")
      .order("created_at", { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { notes: data });
  }

  if (req.method === "POST") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    if (!body.title?.trim() || !body.grade?.trim() || !body.link?.trim()) {
      return sendError(res, "Title, grade, and link are required.");
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        id: body.id || randomId(),
        title: body.title.trim(),
        grade: body.grade.trim(),
        link: body.link.trim(),
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { note: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!isCoachAuthorized(req)) return coachUnauthorized(res);

    const id = req.query.id;
    if (!id) return sendError(res, "Missing note id.");

    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
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
