import { sendJson, sendError } from "./_lib/utils.js";

export default async function handler(req, res) {
  const apiKeySetting = process.env.GEMINI_API_KEY;
  if (!apiKeySetting) {
    return sendError(res, "Missing GEMINI_API_KEY environment variable.", 400);
  }

  const keys = apiKeySetting.split(",").map(k => k.trim()).filter(Boolean);
  const results = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyMasked = key.substring(0, 6) + "..." + key.substring(key.length - 4);
    const keyResult = { keyIndex: i, keyMasked, v1beta: null, v1: null };

    // Test v1beta models endpoint
    try {
      const resV1Beta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const dataV1Beta = await resV1Beta.json().catch(() => ({}));
      if (resV1Beta.ok) {
        keyResult.v1beta = {
          success: true,
          models: (dataV1Beta.models || []).map(m => m.name.replace("models/", ""))
        };
      } else {
        keyResult.v1beta = {
          success: false,
          status: resV1Beta.status,
          error: dataV1Beta.error?.message || "Unknown Error"
        };
      }
    } catch (err) {
      keyResult.v1beta = { success: false, error: err.message };
    }

    // Test v1 models endpoint
    try {
      const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
      const dataV1 = await resV1.json().catch(() => ({}));
      if (resV1.ok) {
        keyResult.v1 = {
          success: true,
          models: (dataV1.models || []).map(m => m.name.replace("models/", ""))
        };
      } else {
        keyResult.v1 = {
          success: false,
          status: resV1.status,
          error: dataV1.error?.message || "Unknown Error"
        };
      }
    } catch (err) {
      keyResult.v1 = { success: false, error: err.message };
    }

    results.push(keyResult);
  }

  return sendJson(res, { keysCount: keys.length, results });
}

