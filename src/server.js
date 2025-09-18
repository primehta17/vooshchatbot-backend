require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { initRedis } = require("./cache/redisClient");
const chatRouter = require("./routes/chat");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || "https://vooshchatbot-backend.onrender.com";
app.use(
  cors({
    origin: ["http://localhost:3000", "https://vooshchatbot-ul1d.onrender.com"], // frontend origin
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.get("/", (req, res) => {
  res.send("RAG Chat Backend is running!");
});
(async () => {
  try {
    await initRedis(); // connect redis (or Upstash)
    app.use("/api/chat", chatRouter);

    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
