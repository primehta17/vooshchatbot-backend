const express = require("express");
const router = express.Router();
const { redisClient } = require("../cache/redisClient");
const { embedText } = require("../services/embeddings");
const { queryVectors } = require("../services/vectorStore");
const { callGeminiStream } = require("../services/geminiClient");

const SESSION_TTL = parseInt(process.env.SESSION_TTL_SECONDS || "86400"); // seconds

// SSE endpoint using GET so EventSource can be used from browser
router.get("/stream", async (req, res) => {
  const sessionId = req.query.sessionId;
  const message = req.query.message
    ? decodeURIComponent(req.query.message)
    : null;

  if (!sessionId || !message) {
    return res.status(400).send("sessionId and message query params required");
  }

  // SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  try {
    // 0) Save user message into Redis session history
    const key = `session:${sessionId}:history`;
    // push as JSON string
    await redisClient.rPush(
      key,
      JSON.stringify({ role: "user", text: message, ts: Date.now() })
    );
    await redisClient.expire(key, SESSION_TTL);

    // 1) embed the user's message
    const embedding = await embedText(message);

    // 2) query vector store
    // let passages = [];
    try {
      passages = await queryVectors(embedding, 5);
    } catch (err) {
      console.warn(
        "Vector query failed - continuing with empty context",
        err.message
      );
    }

    // 3) build prompt with top passages
    // const contextText = passages
    //   .map((p, i) => `Passage ${i + 1}:\n${p.text}`)
    //   .join("\n\n");

    const passages = await queryVectors(embedding, 5);

    let prompt;
    if (passages.length === 0) {
      // Fallback to Gemini's own knowledge
      prompt = `The user asked: "${message}". Please answer from your own knowledge.`;
    } else {
      // Build context text from passages
      const contextText = passages
        .map((p, idx) => `Passage ${idx + 1}:\n${p.text}`)
        .join("\n\n");

      prompt = `You are a helpful assistant. Use the following context passages to answer the user. Be factual, cite only from passages.\n\n${contextText}\n\nUser: ${message}\nAssistant:`;
    }

    // 3) stream Gemini output
    await callGeminiStream(prompt, (chunk) => {
      // const prompt = `Use the following context to answer the user. Cite passages where helpful.\n\n${contextText}\n\nUser: ${message}\nAssistant:`;

      // // 4) stream Gemini tokens and forward as SSE 'message' events
      // await callGeminiStream(prompt, async (chunk) => {
      // send chunk
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    });

    // on completion save assistant message to redis (retrieve last assistant text from client is easier)
    // For simplicity, append a marker; client will have the assembled assistant text
    await redisClient.rPush(
      key,
      JSON.stringify({
        role: "assistant",
        text: "[streamed - check client]",
        ts: Date.now(),
      })
    );
    await redisClient.expire(key, SESSION_TTL);

    // send done event
    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (err) {
    console.error("Error in /stream:", err);
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
    );
    res.end();
  }
});

// get session history
router.get("/session/:id/history", async (req, res) => {
  const id = req.params.id;
  const key = `session:${id}:history`;
  try {
    const arr = await redisClient.lRange(key, 0, -1);
    const parsed = arr.map((x) => JSON.parse(x));
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// reset session
router.post("/session/:id/reset", async (req, res) => {
  const id = req.params.id;
  const key = `session:${id}:history`;
  try {
    await redisClient.del(key);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
