# Mexora — AI Prompts Log (PROMPTS.md)

This document contains the chronological record of prompts and prompt engineering templates used to vibe-code, architect, debug, and deploy **Mexora**.

---

## 📜 Table of Contents
1. [In-App System Prompt (Gemini 3.5 Flash Editorial Engine)](#1-in-app-system-prompt-gemini-35-flash-editorial-engine)
2. [Chronological Vibe-Coding Prompts](#2-chronological-vibe-coding-prompts)
   - [Prompt 1: Initial Architecture & FastAPI Setup](#prompt-1-initial-architecture--fastapi-setup)
   - [Prompt 2: Persistent Memory & SQLite Schema](#prompt-2-persistent-memory--sqlite-schema)
   - [Prompt 3: Quota Resiliency & Fallback Engine](#prompt-3-quota-resiliency--fallback-engine)
   - [Prompt 4: Continuous Multi-Cycle Publishing Fix](#prompt-4-continuous-multi-cycle-publishing-fix)
   - [Prompt 5: Real-Time Intelligence Dashboard & Filtering](#prompt-5-real-time-intelligence-dashboard--filtering)
   - [Prompt 6: Production Deployment (Render & Vercel)](#prompt-6-production-deployment-render--vercel)

---

## 1. In-App System Prompt (Gemini 3.5 Flash Editorial Engine)

Executed by `evaluate_and_write()` in `backend/app/services/gemini_service.py`:

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

## 2. Chronological Vibe-Coding Prompts

### Prompt 1: Initial Architecture & FastAPI Setup
> *"Build an autonomous AI intelligence system named Mexora. Set up a FastAPI backend with structured routes for feed ingestion, agent management, and analytics. Use APScheduler for background job execution and feedparser to aggregate RSS feeds from OpenAI, DeepMind, Anthropic, Hugging Face, Microsoft Research, and NVIDIA."*

### Prompt 2: Persistent Memory & SQLite Schema
> *"Implement SQLite memory protection to prevent duplicate coverage. Normalize incoming article URLs and maintain a memory database (`mexora.db`) tracking processed URLs and published signals per agent."*

### Prompt 3: Quota Resiliency & Fallback Engine
> *"When the Gemini API quota is exhausted (429 RESOURCE_EXHAUSTED), the pipeline must NOT crash or stall. Implement a deterministic fallback editorial engine that evaluates candidate stories using keyword relevance, technical depth, marketing penalties, and freshness rules without inventing facts."*

### Prompt 4: Continuous Multi-Cycle Publishing Fix
> *"The agent publishes once and then skips subsequent cycles because top candidates get marked as seen in cycle 1. Re-architect the candidate selection pipeline so seen articles are filtered BEFORE selecting top candidates, ensuring every cycle evaluates a new batch of unseen RSS stories continuously."*

### Prompt 5: Real-Time Intelligence Dashboard & Filtering
> *"Build a sleek React + Vite frontend dashboard featuring Live Feed, Autonomous Activity timeline, Agent Brain configuration, and System Security cards. Add an agent filter bar (`All Agents`, `Ada`, `JET`) supporting unfiltered global events and agent-specific streams."*

### Prompt 6: Production Deployment (Render & Vercel)
> *"Prepare Mexora for production deployment. Make `GEMINI_API_KEY` optional at startup so the Uvicorn process never exits with Status 1. Add `render.yaml` for Render backend web service and `frontend/vercel.json` for Vercel deployment. Configure dynamic CORS origins."*
