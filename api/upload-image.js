import { getSupabase } from "./_lib/supabase.js";
import { isCoachAuthorized, coachUnauthorized, sendJson, sendError, sanitizeFileName, randomId } from "./_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, "Method not allowed.", 405);
  }

  const body = req.body || {};
  const folder = body.folder || "misc";
  const isCoachUpload = folder.startsWith("question-papers");

  if (isCoachUpload && !isCoachAuthorized(req)) {
    return sendError(res, "Unauthorized.", 401);
  }

  if (!body.data || !body.name) {
    return sendError(res, "Image data and name are required.");
  }

  const supabase = getSupabase();
  const path = `${folder}/${randomId()}-${sanitizeFileName(body.name)}`;
  const buffer = Buffer.from(body.data, "base64");

  if (buffer.length > 8 * 1024 * 1024) {
    return sendError(res, "Each image must be under 8 MB.");
  }

  const { error } = await supabase.storage.from("uploads").upload(path, buffer, {
    contentType: body.type || "image/jpeg",
    upsert: true,
  });

  if (error) return sendError(res, error.message, 500);

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return sendJson(res, { url: data.publicUrl, path });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
