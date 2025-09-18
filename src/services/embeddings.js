// returns an embedding array for given text; falls back to a mock vector if no JINA_API_URL set
require("dotenv").config();
const fetch = require("node-fetch");

const JINA_API_URL = process.env.JINA_EMBEDDINGS_API_URL;
const JINA_API_KEY = process.env.JINA_API_KEY;
const MODEL = process.env.JINA_MODEL || "jina-embeddings-v3";

async function embedText(text) {
  if (!text) throw new Error("No text provided for embedding");

  if (!JINA_API_URL) {
    console.warn("JINA_API_URL not set - returning mock embedding");
    return Array(768).fill(0);
  }

  const body = {
    model: process.env.JINA_MODEL || "jina-embeddings-v2-base-en",
    input: [text], // <-- send as array
    // optionally you can add "task" or "dimensions" etc if required
  };

  const resp = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Jina embedding error: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  // Optional: console.log("Jina embed response:", JSON.stringify(data, null, 2));

  // Check format
  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error(
      "Unexpected embedding API response format: no data array or empty"
    );
  }

  const first = data.data[0];
  if (!first.embedding || !Array.isArray(first.embedding)) {
    throw new Error(
      "Unexpected embedding API response format: missing embedding field"
    );
  }

  // Return the embedding vector
  return first.embedding;
}

module.exports = { embedText };
