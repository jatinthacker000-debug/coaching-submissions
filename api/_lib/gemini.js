import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchImageAsBase64 } from "./supabase.js";

function parseJsonResponse(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned invalid JSON.");
  }
}

export async function gradeSubmission(questionPaper, imageUrls) {
  const apiKeySetting = process.env.GEMINI_API_KEY;
  if (!apiKeySetting) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  // Support comma-separated pool of keys for rotation/retries
  const keys = apiKeySetting.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error("No valid Gemini API keys found in GEMINI_API_KEY.");
  }

  const parts = [
    {
      text: `You are an expert teacher grading handwritten exam answers for a coaching center.

Evaluate the student's handwritten answer sheet images against the provided question paper and model answer key.

Return ONLY valid JSON in this exact shape:
{
  "score": <number from 0 to 100>,
  "verdict": "Pass" | "Fail" | "Needs Review",
  "summary": "<2-3 sentence overall summary>",
  "question_wise": [
    {
      "question": "<question number or title>",
      "status": "correct" | "incorrect" | "partial" | "unattempted",
      "feedback": "<short feedback>"
    }
  ]
}

Be fair to handwriting quality. If something is unclear, mention it in feedback and use "Needs Review" when appropriate.`,
    },
    { text: `\nQuestion paper title: ${questionPaper.title}\n` },
  ];

  if (questionPaper.answer_key_text?.trim()) {
    parts.push({
      text: `\nModel answer key (text):\n${questionPaper.answer_key_text.trim()}\n`,
    });
  }

  if (questionPaper.question_image_urls?.length) {
    parts.push({ text: "\nQuestion paper files:\n" });
    for (const url of questionPaper.question_image_urls) {
      parts.push(await fetchImageAsBase64(url));
    }
  }

  if (questionPaper.answer_key_image_urls?.length) {
    parts.push({ text: "\nModel answer key files:\n" });
    for (const url of questionPaper.answer_key_image_urls) {
      parts.push(await fetchImageAsBase64(url));
    }
  }

  parts.push({ text: "\nStudent handwritten answer sheet images:\n" });
  for (const url of imageUrls) {
    parts.push(await fetchImageAsBase64(url));
  }

  // Models to try in order of preference
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash"
  ];
  let lastError;

  // Shuffle keys to distribute traffic load
  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  const maxAttempts = Math.min(shuffledKeys.length, 3); // Try up to 3 keys

  for (const modelName of modelsToTry) {
    console.log(`Starting evaluation attempts using model: ${modelName}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const activeKey = shuffledKeys[attempt];
        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent(parts);
        const text = result.response.text();
        const parsed = parseJsonResponse(text);

        console.log(`Evaluation successfully completed using model: ${modelName}`);
        return {
          score: Number(parsed.score) || 0,
          verdict: parsed.verdict || "Needs Review",
          feedback: parsed.summary || "No summary provided.",
          details: {
            question_wise: parsed.question_wise || [],
            raw: text,
          },
        };
      } catch (err) {
        console.warn(`${modelName} evaluation attempt ${attempt + 1} failed:`, err.message);
        lastError = err;

        // Try the next key in the pool for this model if available
        if (attempt < maxAttempts - 1) {
          console.log("Error encountered. Trying next API key in pool...");
          continue;
        }
      }
    }
    console.log(`All keys failed or were rate-limited for model ${modelName}.`);
  }

  // If we reach here, all models and keys failed. Throw the last error.
  throw lastError;
}
