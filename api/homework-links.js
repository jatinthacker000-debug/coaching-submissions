import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === "GET") {
    // Both students and coaches can read homework links
    const { group_name } = req.query;
    
    let query = supabase.from("homework_links").select("id, homework_date, group_name, link");
    if (group_name) {
      query = query.eq("group_name", group_name);
    }

    const { data, error } = await query;

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { links: data });
  }

  if (req.method === "POST") {
    // Only coaches can set homework links
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);
    
    const { homework_date, group_name, link } = req.body || {};
    if (!homework_date || !group_name || !link) {
      return sendError(res, "Date, group name, and link are required.", 400);
    }

    // Upsert the link
    const { data, error } = await supabase
      .from("homework_links")
      .upsert(
        { homework_date, group_name, link },
        { onConflict: 'homework_date,group_name' }
      )
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { link: data }, 201);
  }

  if (req.method === "DELETE") {
    if (!await isCoachAuthorized(req)) return coachUnauthorized(res);

    const { id } = req.query;
    if (!id) return sendError(res, "Missing link ID.", 400);

    const { error } = await supabase
      .from("homework_links")
      .delete()
      .eq("id", id);

    if (error) return sendError(res, error.message, 500);
    return sendJson(res, { success: true });
  }

  return sendError(res, "Method not allowed.", 405);
}
