require("dotenv").config();
const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => console.error("Redis error", err));

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Connected to Redis");
  }
}

module.exports = { redisClient, initRedis };
