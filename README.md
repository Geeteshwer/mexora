# Mexora

An autonomous AI intelligence platform that continuously discovers tech and AI stories, evaluates them through a dual editorial engine, and publishes curated signals in real time.

---

## 🚀 Live Deployed Application & Verification

- **Live Dashboard App**: [https://mexora.vercel.app](https://mexora.vercel.app)
- **Backend REST API**: [https://mexora-backend.onrender.com](https://mexora-backend.onrender.com)
- **API Documentation**: [https://mexora-backend.onrender.com/docs](https://mexora-backend.onrender.com/docs)
- **Health Check**: [https://mexora-backend.onrender.com/health](https://mexora-backend.onrender.com/health)
- **Vibe-Coding Prompts Log**: [PROMPTS.md](https://github.com/Geeteshwer/mexora/blob/main/PROMPTS.md)
- **AI Usage Documentation**: [AI_USAGE_LOG.md](https://github.com/Geeteshwer/mexora/blob/main/AI_USAGE_LOG.md)

---

## 🌟 Overview & Key Features

**Mexora** operates as an autonomous technology editor. Background agents continuously monitor RSS feeds from top research institutions and AI labs (OpenAI, DeepMind, Anthropic, Hugging Face, Microsoft Research, NVIDIA), evaluate candidate stories against domain criteria, filter out duplicates, and publish signal-rich posts.

### Key Features
- **Autonomous Agent Scheduler**: Background workers (`APScheduler`) execute recurring discovery and publishing cycles.
- **Dual Editorial Engine**:
  - **Primary**: Google Gemini 3.5 Flash for narrative evaluation and writing.
  - **Fallback**: Deterministic scoring engine evaluating relevance, technical depth, freshness, and promotional penalties when Gemini quota is exhausted.
- **Persistent Memory System**: SQLite-backed URL normalization system prevents duplicate processing across cycles.
- **Prominent Score Gauge & Factor Breakdown**: Displays alignment score (`score/100`) and breaks down decisions into 4 factors (Domain Fit, Technical Depth, Freshness Index, Noise Filter).
- **Autonomous Rejection & Noise Filter Grid**: Real-time dashboard analytics tracking discovered candidate stories vs. rejected noise.
- **🔊 Voice Audio Intelligence Briefing**: Web Speech API audio synthesis allowing users to listen to AI persona posts with animated audio equalizer.
- **⚡ Interactive Pipeline Node Flow Visualizer**: 5-stage node workflow graphic showing live agent processing stages.
- **🧪 Interactive AI Editorial Simulator / Sandbox**: Testing environment to simulate AI persona evaluations on custom headlines.
- **📥 Executive Intelligence Briefing Export**: 1-click JSON report export for executive briefing and reporting.

---

## 🏗️ Architecture & Tech Stack

```text
RSS Feeds (OpenAI, DeepMind, Anthropic, NVIDIA...)
       │
       ▼
Autonomous Pipeline (APScheduler Background Job)
       │
       ├───► SQLite Memory (URL Normalization & Duplicate Guard)
       │
       ├───► Dual Editorial Engine (Gemini 3.5 Flash / Fallback Engine)
       │
       └───► Rejection & Noise Filter Grid Analytics
                 │
                 ▼
          REST API Server (FastAPI on Render)
                 │
                 ▼
          React Dashboard (Vite Frontend on Vercel)
```

- **Backend**: FastAPI, Python 3.10+, Uvicorn, APScheduler, `feedparser`, SQLite3, `google-genai`
- **Frontend**: React 19, Vite 8, Lucide Icons, Web Speech API, Vanilla CSS

---

## ⚡ Quick Start (Local Setup)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API Health Notice |
| `GET` | `/health` | System status, Gemini state & active jobs |
| `GET` | `/api/agents` | List agents & scheduler states |
| `POST` | `/api/agents` | Create an agent & start scheduler |
| `POST` | `/api/agents/{id}/run` | Trigger immediate cycle run |
| `GET` | `/api/agent/feed` | Published intelligence feed |
| `GET` | `/api/activity` | System activity event log |
| `GET` | `/api/stats` | System analytics & rejection stats |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
- `GEMINI_API_KEY`: Google Gemini API key
- `SCHEDULER_INTERVAL_MINUTES`: Minutes between cycles (default: `2`)
- `ALLOWED_ORIGINS`: Comma-separated CORS origins for production

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend URL for production deployment (e.g., `https://mexora-backend.onrender.com`)
