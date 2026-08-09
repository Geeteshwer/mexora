# Mexora

An autonomous AI intelligence system that discovers current AI and technology stories, evaluates them using an editorial intelligence layer, maintains publication memory, and publishes selected signals through an autonomous scheduled pipeline.

---

## 🌟 Project Overview

**Mexora** is a real-time autonomous intelligence platform designed to eliminate signal noise in artificial intelligence and technology news. Autonomous agents continuously monitor RSS feeds from leading tech institutions (such as OpenAI, Anthropic, DeepMind, Hugging Face, Microsoft Research, and NVIDIA), evaluate candidate stories against domain-specific editorial criteria, filter out duplicate or low-value content, and publish curated technical insights.

If the primary AI decision engine (Google Gemini) becomes unavailable or exhausts API rate limits, Mexora automatically engages a **deterministic fallback editorial engine** to ensure uninterrupted, autonomous operation without stalling the schedule.

---

## ✨ Key Features

- **Autonomous Agent Lifecycle**: Agents run on recurring background schedules (`APScheduler`), discovering and scoring news autonomously.
- **Dual Editorial Engine**:
  - **Primary**: Google Gemini 3.5 Flash for nuanced narrative evaluation and post generation.
  - **Fallback**: Deterministic scoring engine evaluating domain relevance, technical keywords, marketing penalties, and freshness without inventing facts.
- **Duplicate & Memory Protection**: SQLite-backed normalization system tracks processed and published URLs, preventing repeat coverage.
- **Resilient Background Processing**: APScheduler cycles run in isolated threads to prevent thread deadlock or worker failure.
- **Real-Time Intelligence Dashboard**: React/Vite interface featuring live feed updates, agent management, activity logging, and system security state.
- **Deterministic Quota Guard**: Seamlessly handles Gemini API `RESOURCE_EXHAUSTED` (429) errors without dropping agent schedules.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                      RSS Feeds                          │
│   (OpenAI, DeepMind, Anthropic, HuggingFace, NVIDIA...)  │
└──────────────────────────┬──────────────────────────────┘
                           │ discover_topics()
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Autonomous Service                      │
│             (APScheduler Background Job)                │
└────────────┬──────────────────────────────┬─────────────┘
             │                              │
             ▼ (Seen URL Check)             ▼ (Filter Top 10)
┌──────────────────────────┐   ┌──────────────────────────┐
│   SQLite Memory System   │   │     Editorial Engine     │
│   (Normalized URLs, DB)  │   │  (Gemini or Fallback)    │
└──────────────────────────┘   └────────────┬─────────────┘
                                            │
                                            ▼
                               ┌──────────────────────────┐
                               │   Post & Activity Log    │
                               │   (REST API Server)      │
                               └────────────┬─────────────┘
                                            │
                                            ▼
                               ┌──────────────────────────┐
                               │    React/Vite Frontend   │
                               │    (Live Intelligence)   │
                               └──────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn
- **Task Scheduler**: APScheduler (`BackgroundScheduler`)
- **Database**: SQLite3
- **AI Integration**: Google GenAI SDK (`google-genai`) / Gemini 3.5 Flash
- **RSS Parsing**: `feedparser`

### Frontend
- **Framework**: React 19 + Vite 8
- **UI Components**: Lucide React Icons, Vanilla CSS with CSS Custom Properties
- **State & Communication**: React Hooks + REST API (Vite proxy in dev)

---

## 📂 Project Structure

```text
Mexora/
├── backend/
│   ├── app/
│   │   ├── database/
│   │   │   ├── database.py       # SQLite connection helper
│   │   │   └── memory.py         # Schema initialization & migrations
│   │   ├── models/
│   │   │   ├── agent.py          # Agent Pydantic schemas
│   │   │   └── persona.py        # Persona configuration models
│   │   ├── routes/
│   │   │   ├── activity.py       # Activity event log endpoints (/api/activity)
│   │   │   ├── agent.py          # Agent CRUD & scheduler controls (/api/agents)
│   │   │   ├── feed.py           # Published intelligence feed endpoint (/api/agent/feed)
│   │   │   ├── stats.py          # Dashboard analytics endpoint (/api/stats)
│   │   │   └── test_ai.py        # Manual evaluation test route (/api/test-ai)
│   │   ├── services/
│   │   │   ├── activity_service.py   # System activity event logging
│   │   │   ├── agent_service.py      # Agent CRUD & DB persistence
│   │   │   ├── autonomous_service.py # Core autonomous execution pipeline
│   │   │   ├── editorial_service.py  # Article filtering & fallback engine
│   │   │   ├── gemini_service.py     # Gemini AI evaluation integration
│   │   │   ├── memory_service.py     # URL normalization & duplicate prevention
│   │   │   ├── news_service.py       # RSS discovery & timestamp extraction
│   │   │   ├── post_service.py       # Post persistence & publication tracking
│   │   │   ├── scheduler_service.py  # APScheduler job management
│   │   │   └── stats_service.py      # Analytics computation
│   │   └── main.py              # FastAPI application entry point
│   ├── .env.example              # Environment variables template
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.css               # Styling & design system tokens
│   │   ├── App.jsx               # Main React dashboard component
│   │   ├── index.css             # Base CSS reset & typography
│   │   └── main.jsx              # React app mount
│   ├── index.html                # Entry HTML page
│   ├── package.json              # Node dependencies & npm scripts
│   ├── vite.config.js            # Vite configuration & dev proxy
│   └── .env.example              # Frontend environment variables template
├── .gitignore                    # Global git ignore configuration
└── README.md                     # Documentation
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+ and `npm`

### 1. Backend Setup

```bash
cd ~/Mexora/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env
```

Edit `backend/.env` to add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SCHEDULER_INTERVAL_MINUTES=2
```

Run the FastAPI backend server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000) and documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Setup

In a new terminal:

```bash
cd ~/Mexora/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run at [http://localhost:5173](http://localhost:5173) (or `http://localhost:5174` if port 5173 is occupied) and proxy `/api` requests to the backend server.

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API health notice |
| `GET` | `/health` | System status, Gemini state, & active scheduler jobs |
| `GET` | `/api/agents` | List all agents & scheduler states |
| `POST` | `/api/agents` | Create a new autonomous agent & start its scheduler |
| `GET` | `/api/agents/{id}` | Get single agent configuration |
| `DELETE`| `/api/agents/{id}` | Pause an agent & stop its scheduler job |
| `POST` | `/api/agents/{id}/start` | Resume an agent scheduler |
| `POST` | `/api/agents/{id}/stop` | Pause an agent scheduler |
| `POST` | `/api/agents/{id}/run` | Trigger an immediate manual evaluation cycle |
| `GET` | `/api/agent/feed` | Retrieve published intelligence posts |
| `GET` | `/api/activity` | Fetch recent system activity events |
| `GET` | `/api/stats` | Return real-time system & publication analytics |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `SCHEDULER_INTERVAL_MINUTES` | No | `2` | Minutes between autonomous cycles |
| `MAX_ARTICLES_PER_CYCLE` | No | `10` | Candidate stories selected per cycle |
| `MAX_GEMINI_ARTICLES` | No | `3` | Maximum stories sent to Gemini per run |
| `FORCE_FALLBACK` | No | `false` | Force fallback engine (useful for testing) |
| `ALLOWED_ORIGINS` | No | Local ports | Comma-separated CORS origins for production |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `""` (Vite proxy) | Full API backend URL for production deployment |

---

## 🚀 Deployment Instructions

### Backend (e.g. Render, Railway, or VPS)
1. **Build Command**: `pip install -r requirements.txt`
2. **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. **Environment Variables**: Set `GEMINI_API_KEY`, `ALLOWED_ORIGINS` (your frontend deployment URL), and any optional overrides.
4. **Persistence Note**: The APScheduler background task runs within the Uvicorn worker thread; ensure the host service does not sleep or use serverless ephemeral functions without persistent worker execution.

### Frontend (e.g. Vercel or Netlify)
1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Environment Variables**:
   ```env
   VITE_API_URL=https://your-mexora-backend.onrender.com
   ```

---

## ⚠️ Known Limitations & Future Improvements

- **SQLite Deployment**: Default persistent memory relies on a local SQLite file (`mexora.db`). For multi-region serverless deployments, transition to PostgreSQL or Managed Cloud SQL.
- **Worker Persistence**: APScheduler executes in-process. High-scale deployments can migrate to Celery or Redis Queue for distributed worker isolation.
- **Multi-Source Expansion**: Currently ingests structured RSS feeds; future versions can incorporate arXiv preprints and direct API webhooks.
