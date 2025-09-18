require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function callGemini(prompt) {
  if (!prompt) throw new Error("callGemini: no prompt");
  // Non-streaming: return full text
  const resp = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  // adapt depending on SDK response
  return resp?.text ?? JSON.stringify(resp);
}

async function callGeminiStream(prompt, onChunk) {
  if (!prompt) throw new Error("callGeminiStream: no prompt");

  const stream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  for await (const part of stream) {
    // part shapes vary; pick text chunk
    const chunk = part?.text ?? (part?.candidates && part.candidates[0]?.text);
    if (chunk) onChunk(chunk);
  }
}

module.exports = { callGemini, callGeminiStream };
