import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError, randomId } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, grade, subject, link, created_at")
      .order("created_at", { ascending: false });

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { notes: data });
  }

  if (req.method === "POST") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    if (!body.title?.trim() || !body.grade?.trim() || !body.subject?.trim() || !body.link?.trim()) {
      return sendError(res, "Title, grade, subject, and link are required.");
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        id: body.id || randomId(),
        title: body.title.trim(),
        grade: body.grade.trim(),
        subject: body.subject.trim(),
        link: body.link.trim(),
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { note: data }, 201);
  }

  if (req.method === "PUT") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const body = req.body || {};
    const { id, title, grade, subject, link } = body;
    if (!link?.trim()) {
      return sendError(res, "Link is required.");
    }

    if (id) {
      const updateData = { link: link.trim() };
      if (title?.trim()) updateData.title = title.trim();
      if (grade?.trim()) updateData.grade = grade.trim();
      if (subject?.trim()) updateData.subject = subject.trim();

      const { data, error } = await supabase
        .from("notes")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { note: data });
    }

    if (grade?.trim() && title?.trim()) {
      const g = grade.trim();
      const t = title.trim();
      const s = (subject || "General").trim();

      const { data: existing, error: findErr } = await supabase
        .from("notes")
        .select("id")
        .eq("grade", g)
        .eq("title", t)
        .limit(1);

      if (findErr) return sendError(res, findErr.message, 500);

      if (existing && existing.length > 0) {
        const { data, error } = await supabase
          .from("notes")
          .update({ link: link.trim(), subject: s })
          .eq("id", existing[0].id)
          .select()
          .single();

        if (error) return sendError(res, error.message, 500);
        return sendJson(res, { note: data });
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            id: body.id || randomId(),
            title: t,
            grade: g,
            subject: s,
            link: link.trim(),
          })
          .select()
          .single();

        if (error) return sendError(res, error.message, 500);
        return sendJson(res, { note: data }, 201);
      }
    }

    return sendError(res, "Either 'id' or both 'grade' and 'title' are required to update.");
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id, delete_all } = req.query;
    
    if (delete_all === "true") {
      const type = req.query.type;
      let error;
      if (type === "cbse") {
        const { error: cbseError } = await supabase.from("notes").delete().in("grade", ["CBSE", "CBSE-XII"]);
        error = cbseError;
      } else {
        const { error: allErr } = await supabase.from("notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        error = allErr;
      }
      if (error) return sendError(res, error.message, 500);
      return sendJson(res, { success: true });
    }

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



