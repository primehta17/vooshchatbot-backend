# RAG-Chat Backend

> Node.js + Express backend for RAG-powered chatbot: embeddings, vector store, stream responses, session history & cache.

---

## Table of Contents

- [Description](#description)  
- [Tech Stack](#tech-stack)  
- [Features](#features)  
- [Setup & Installation](#setup--installation)  
- [Configuration / Environment Variables](#configuration--environment-variables)  
- [Running Locally](#running-locally)  
- [API Endpoints](#api-endpoints)  
- [Architecture & Flow](#architecture--flow)  
- [Known Issues & Future Improvements](#known-issues--future-improvements)  
- [License](#license)

---

## Description

This backend powers a Retrieval-Augmented Generation (RAG) chatbot. It accepts user messages, embeds them (via Jina), searches relevant passages in a vector store (Qdrant), uses Google Gemini / GenAI to generate answers, streams back the replies in real time, and maintains session history in Redis. Supports resetting session history.

---

## Tech Stack

- **Node.js** with **Express**  
- **Redis** for session history & caching  
- **Qdrant** as vector store  
- **Jina Embeddings API** for embedding text  
- **Google Gemini / Google GenAI** for LLM generation (streaming mode)  
- Dotenv for managing environment variables  

---

## Features

- Embed user messages and perform vector search over top-k passages  
- Build prompt context from retrieved passages + user query  
- Stream replies token by token via SSE (Server-Sent Events)  
- Maintain session history in Redis (with TTL)  
- Reset or fetch session history via API endpoints  

---

## Setup & Installation

### Prerequisites

- Node.js (v16+ recommended)  
- Redis (local installation or managed/Upstash etc.)  
- Qdrant instance (local or managed)  
- Credentials/API keys for Jina & Google Gemini (GenAI)  

### Installation

```bash
git clone https://github.com/primehta17/vooshchatbot-backend.git
cd vooshchatbot-backend
npm install
cp .env.example .env

Running Locally
npm run dev   # with nodemon
# OR
npm start


Backend runs at: http://localhost:3001

Ensure Redis & Qdrant are running before starting.
