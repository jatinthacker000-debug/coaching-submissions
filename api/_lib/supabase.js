import { createClient } from "@supabase/supabase-js";

let supabase;

export function getSupabase() {
  if (!supabase) {
    let url = (process.env.SUPABASE_URL || "").trim();
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    if (url.endsWith("/rest/v1")) {
      url = url.slice(0, -8);
    }
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !key) {
      throw new Error("Missing Supabase environment variables.");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export function getPublicUrl(path) {
  const supabase = getSupabase();
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: contentType.split(";")[0],
    },
  };
}
