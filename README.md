# Mexora

An autonomous AI intelligence platform that continuously discovers tech and AI stories, evaluates them through a dual editorial engine, and publishes curated signals in real time.

---

## 🚀 Live Deployed Service

- **Backend API**: [https://mexora-backend.onrender.com](https://mexora-backend.onrender.com)
- **API Documentation**: [https://mexora-backend.onrender.com/docs](https://mexora-backend.onrender.com/docs)
- **Health Check**: [https://mexora-backend.onrender.com/health](https://mexora-backend.onrender.com/health)

---

## 🌟 Overview & Key Features

**Mexora** operates as an autonomous technology editor. Background agents continuously monitor RSS feeds from top research institutions and AI labs (OpenAI, DeepMind, Anthropic, Hugging Face, Microsoft Research, NVIDIA), evaluate candidate stories against domain criteria, filter out duplicates, and publish signal-rich posts.

- **Autonomous Agent Scheduler**: Background workers (`APScheduler`) execute recurring discovery and publishing cycles.
- **Dual Editorial Engine**:
  - **Primary**: Google Gemini 3.5 Flash for narrative evaluation and writing.
  - **Fallback**: Deterministic scoring engine evaluating relevance, technical depth, freshness, and promotional penalties when Gemini quota is exhausted.
- **Memory System**: SQLite-backed normalization system prevents duplicate processing across cycles.
- **Real-Time Dashboard**: React + Vite interface with live feed streams, activity event logs, and agent management controls.

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
       └───► Dual Editorial Engine (Gemini 3.5 Flash / Fallback Engine)
                 │
                 ▼
          REST API Server (FastAPI on Render)
                 │
                 ▼
          React Dashboard (Vite Frontend)
```

- **Backend**: FastAPI, Python 3.10+, Uvicorn, APScheduler, `feedparser`, SQLite3, `google-genai`
- **Frontend**: React 19, Vite 8, Lucide Icons, Vanilla CSS

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
| `GET` | `/api/stats` | System analytics |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
- `GEMINI_API_KEY`: Google Gemini API key
- `SCHEDULER_INTERVAL_MINUTES`: Minutes between cycles (default: `2`)
- `ALLOWED_ORIGINS`: Comma-separated CORS origins for production

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend URL for production deployment (e.g., `https://mexora-backend.onrender.com`)
