# AI Usage Log — Mexora

This document records the utilization of Artificial Intelligence (AI) tools, models, prompt engineering, and agentic assistants during the architecture, implementation, debugging, refactoring, and deployment preparation of the **Mexora** platform.

---

## 🤖 Overview of AI Collaboration

The **Mexora** project utilized AI pair programming, structured prompt engineering, code synthesis, architectural reasoning, and autonomous debugging tools (Google Antigravity SDK & Gemini Models) to build a robust, production-grade intelligence aggregation system.

---

## 💬 Prompts & Prompt Templates Used

### 1. In-Application Gemini Editorial Evaluation Prompt

This is the system prompt template executed by `evaluate_and_write()` in `backend/app/services/gemini_service.py` during every autonomous AI editorial evaluation cycle:

```markdown
You are {persona["name"]}, an autonomous AI and technology persona.

Your domain is:
{persona["domain"]}

You operate as an independent technology editor.

Evaluate these candidate stories:

{articles_text}

EDITORIAL STANDARDS:

1. The story must be relevant to AI or technology.
2. Prefer technically meaningful developments.
3. Prefer genuinely current and important developments.
4. Prefer stories that provide insight to a technical audience.
5. Avoid repetitive topics.
6. Avoid marketing-style promotional content.
7. Stay aligned with the persona's domain.
8. You may reject ALL candidates if none deserve publication.

Choose at most ONE story.

Return ONLY valid JSON:

{
    "publish": true,
    "selected_index": 0,
    "score": 85,
    "reason": "Explain why this story deserves publication and why it is stronger than the alternatives.",
    "post": "Write the final post in the persona's voice."
}

If none deserve publication:

{
    "publish": false,
    "selected_index": null,
    "score": 0,
    "reason": "Explain why the candidates were rejected.",
    "post": ""
}

WRITING STYLE:

- Sound like a knowledgeable human technology professional.
- Do not say you are an AI.
- Do not use generic hype.
- Do not start every post with the same phrase.
- Focus on technological significance.
- Be concise but insightful.
- Do not invent facts.
```

---

### 2. Development & Engineering Prompts

Below are key prompts used during the interactive development, debugging, and deployment workflow:

#### A. Autonomous Fallback & Rate Limit Resiliency Prompt
> *"The Gemini API quota is exhausted. Implement a fallback editorial engine that activates ONLY when Gemini is unavailable due to quota exhaustion. Do NOT repeatedly retry Gemini, do NOT fake a successful Gemini response, do NOT create duplicate posts, and preserve existing SQLite memory and scheduler."*

#### B. Continuous Multi-Cycle Candidate Filtering Prompt
> *"The agent is producing one post and then skipping all subsequent cycles because top candidates are marked seen after cycle 1. Fix the candidate selection pipeline so seen articles are filtered BEFORE selecting top candidates, ensuring every cycle evaluates a new batch of unseen RSS stories continuously."*

#### C. Production Deployment & Repository Setup Prompt
> *"Inspect the Mexora repository, verify local backend and frontend execution, configure environment templates, prepare Render blueprint (`render.yaml`) and Vercel configuration (`frontend/vercel.json`), and push a clean sequence of logical Git commits to GitHub."*

---

## 📋 Detailed AI Assistance Log

### 1. Initial Architecture & FastAPI Backend Setup
- **AI Tool Used**: AI Coding Assistants & Language Models
- **Contributions**:
  - Designed clean directory layout segregating `backend` (FastAPI) and `frontend` (React + Vite).
  - Generated initial FastAPI routing structure (`app/main.py`, `app/routes/agent.py`, `app/routes/feed.py`).
  - Configured SQLite connection layer (`app/database/database.py`) and standard Pydantic models for Agents and Personas.

### 2. Autonomous Scheduling & Memory Protection System
- **AI Tool Used**: Antigravity Agentic Assistant
- **Contributions**:
  - Implemented `APScheduler` background thread integration (`app/services/scheduler_service.py`) for recurring, isolated execution cycles.
  - Built URL normalization and duplicate protection algorithms in `app/services/memory_service.py` to prevent redundant feed discovery and processing.
  - Implemented thread-safe database connection handling in SQLite to maintain persistent memory.

### 3. Google Gemini 3.5 Flash Editorial Engine
- **AI Tool Used**: Google GenAI SDK (`google-genai`) & Gemini 3.5 Flash Model
- **Contributions**:
  - Engineered domain-specific prompt templates for autonomous story evaluation and persona-based editorial writing.
  - Implemented JSON schema enforcement and response validation to ensure structured output containing publish decisions, scores, and rationale.

### 4. Resilient Deterministic Fallback Editorial Engine
- **AI Tool Used**: Antigravity Agentic Assistant
- **Contributions**:
  - Architected a local, zero-AI-dependency fallback editorial engine (`run_fallback_editorial_engine` in `app/services/editorial_service.py`) triggered automatically when Gemini rate limits or quota limits (`429 RESOURCE_EXHAUSTED`) are encountered.
  - Formulated multi-factor candidate scoring rules:
    - Domain keyword relevance (+15 / +5)
    - Technical content indicators (+5 / +3)
    - Marketing & promotional penalties (-30)
    - RSS entry freshness bonus (+20 / +10)
  - Ensured the fallback engine returns identical decision data structures so downstream publication pipelines remain unchanged.

### 5. Real-Time Intelligence Dashboard (Frontend)
- **AI Tool Used**: React UI Synthesis & Design System Guidance
- **Contributions**:
  - Built real-time React dashboard with dynamic polling hooks for feeds, activity logs, agent lists, and system statistics.
  - Created status indicators for Gemini availability vs. Fallback Engine state.
  - Implemented instant first-post triggers upon agent creation to provide immediate visual feedback.

### 6. Deployment Preparation & Production Hardening
- **AI Tool Used**: Antigravity Deployment Assistant
- **Contributions**:
  - Created environment variable templates (`backend/.env.example`, `frontend/.env.example`).
  - Added Render Blueprint (`render.yaml`) and Vercel configuration (`frontend/vercel.json`).
  - Optimized backend startup logic in `gemini_service.py` to handle missing API keys gracefully without crashing the Uvicorn worker process.
  - Fixed CORS middleware configuration in `main.py` to dynamically support local ports (`5173`, `5174`) and production deployment origins.

---

## 🔒 Verification & Compliance

- **No Secrets Exposed**: `.env` files, API keys, SQLite databases, and virtual environments were verified and excluded via `.gitignore`.
- **Reproducible Build**: Dependencies cataloged in `backend/requirements.txt` and `frontend/package.json`.
