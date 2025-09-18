📝 Code Walkthrough

This document explains the end-to-end flow of the RAG-powered chatbot, covering embeddings, vector indexing, Redis session management, frontend–backend communication, and design considerations.

🔄 End-to-End Flow

User sends a message in the frontend chat box.

Frontend sends the message and sessionId to the backend via a streaming API (SSE).

Backend:

Saves the user message into Redis (session history).

Generates an embedding for the query using Jina Embeddings API.

Queries Qdrant vector database to find top-k similar passages.

Builds a prompt containing the retrieved passages + session history + new user message.

Calls Google Gemini API in streaming mode to generate the assistant’s reply.

Streams the response back to frontend token-by-token via SSE.

Saves the assistant’s reply in Redis under the same session.

Frontend:

Appends the streaming tokens live into the assistant’s message bubble.

Updates the chat view as the response arrives.

Allows history reset → calls backend reset API to clear Redis session.

🧩 Embeddings: Creation, Indexing & Storage

Creation:
Implemented in services/embeddings.js using Jina API.
Example:

const { embedText } = require('../services/embeddings');
const vector = await embedText(userMessage);


Indexing:
Each embedding vector is indexed in Qdrant, associated with metadata (e.g., passage text, source).

Storage:
Qdrant stores vectors + payloads. Example schema:

{
  "id": "uuid",
  "vector": [0.123, -0.456, ...],
  "payload": {
    "text": "original passage text",
    "source": "news_article_42"
  }
}


Querying:
The backend sends the embedding of the user’s query to Qdrant, retrieves the top-k most similar passages, and uses them as context.

🗄️ Redis: Caching & Session History

Purpose: Store short-term conversation history for each sessionId.

Implementation: In cache/redisClient.js, Redis is initialized and used to save JSON-serialized chat history.

Flow:

On each new message, the backend appends {role: "user", content: "..."}

After generating a response, it appends {role: "assistant", content: "..."}

TTL: Session keys expire automatically after SESSION_TTL_SECONDS (e.g., 24h).

Endpoints:

GET /api/chat/session/:id/history → fetch stored messages

POST /api/chat/session/:id/reset → delete session key in Redis

This avoids storing heavy transcripts in MySQL while still keeping conversations coherent.

💻 Frontend: API Calls & Streaming

Chat Flow:

On user input, frontend adds a local bubble (role: "user").

Opens an EventSource connection:

const eventSource = new EventSource(
  `${API_URL}/api/chat/stream?sessionId=${id}&message=${msg}`
);


Listens for streaming tokens:

eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.done) eventSource.close();
  else setAssistantReply((prev) => prev + data.delta);
};


Session Handling:

Session ID is generated once and stored in localStorage.

On reload, frontend re-fetches history from Redis.

Reset Button:

Calls POST /api/chat/session/:id/reset

Clears chat window and Redis session.

⚙️ Design Decisions

SSE vs WebSockets: SSE chosen because responses are one-way (server → client). Easier than WebSockets for streaming.

Redis for History: Fast, lightweight, supports TTL expiry - ideal for ephemeral chat history.

Qdrant as Vector Store: Handles high-dimensional search efficiently, with payload support for metadata.

Loose Coupling: Embeddings, vector DB, and LLM are modular (services/ layer). Any of them can be swapped.

Frontend Simplicity: Kept minimal with React hooks and EventSource to emphasize backend logic.

🚀 Potential Improvements

Error Handling:
Add retries for embedding/vector queries, fallback prompts for Gemini failures.

Scalability:

Use message queues for heavy workloads.

Deploy Redis & Qdrant as managed services.

Persistence:
Store conversation history in MySQL for analytics / long-term reference.

Frontend:
Improve UX with typing indicators, mobile responsiveness, better error messages.

RAG Enhancements:
Summarize old history when exceeding token limits.
Fine-tune prompt building.

