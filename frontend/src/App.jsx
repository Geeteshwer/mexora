import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  Download,
  Eye,
  Filter,
  FlaskConical,
  Globe,
  Layers3,
  Loader2,
  Menu,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import "./App.css";

const API = import.meta.env.VITE_API_URL || ""; // Uses VITE_API_URL in production, or Vite proxy (/api) locally

// ==================================================
// POLLING INTERVALS
// ==================================================
const POLL_FEED_MS     = 8000;
const POLL_AGENTS_MS   = 6000;
const POLL_ACTIVITY_MS = 10000;
const POLL_STATS_MS    = 12000;

// ==================================================
// MAIN APP
// ==================================================

function App() {
  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
  const [agents,        setAgents]        = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [posts,         setPosts]         = useState([]);
  const [stats,         setStats]         = useState(null);
  const [activity,      setActivity]      = useState([]);
  const [activePage,    setActivePage]    = useState("Overview");
  const [backendOnline, setBackendOnline] = useState(false);
  const [geminiStatus,  setGeminiStatus]  = useState("AVAILABLE");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newName,   setNewName]   = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [creating,  setCreating]  = useState(false);

  // Run Now state per agent
  const [runningNow, setRunningNow] = useState({});

  // --------------------------------------------------
  // FETCH: AGENTS
  // --------------------------------------------------
  const fetchAgents = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/agents`);
      if (!r.ok) { setBackendOnline(false); return; }
      const d = await r.json();
      const list = d.agents || [];
      setAgents(list);
      setBackendOnline(true);

      // Auto-select the most recently created agent when nothing is selected
      setSelectedAgent(prev => {
        if (!prev && list.length > 0) return list[0];
        if (prev) {
          const found = list.find(a => a.agent_id === prev.agent_id);
          return found || list[0] || prev;
        }
        return prev;
      });
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // --------------------------------------------------
  // FETCH: FEED (for selected agent)
  // --------------------------------------------------
  const fetchFeed = useCallback(async (agentId) => {
    try {
      const url = agentId
        ? `${API}/api/agent/feed?agentId=${agentId}`
        : `${API}/api/agent/feed`;
      const r = await fetch(url);
      if (!r.ok) return;
      const d = await r.json();
      setPosts(Array.isArray(d.posts) ? d.posts : []);
    } catch { /* silently fail */ }
  }, []);

  // --------------------------------------------------
  // FETCH: STATS
  // --------------------------------------------------
  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/stats`);
      if (!r.ok) return;
      const d = await r.json();
      setStats(d);
      setGeminiStatus(d?.gemini?.status || "AVAILABLE");
    } catch { /* silently fail */ }
  }, []);

  // --------------------------------------------------
  // FETCH: ACTIVITY
  // --------------------------------------------------
  const fetchActivity = useCallback(async (agentId) => {
    try {
      const url = agentId
        ? `${API}/api/activity?agentId=${agentId}&limit=50`
        : `${API}/api/activity?limit=50`;
      const r = await fetch(url);
      if (!r.ok) return;
      const d = await r.json();
      setActivity(Array.isArray(d.events) ? d.events : []);
    } catch { /* silently fail */ }
  }, []);

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------
  useEffect(() => {
    fetchAgents();
    fetchFeed(null);
    fetchStats();
    fetchActivity(null);
  }, [fetchAgents, fetchFeed, fetchStats, fetchActivity]);

  // Poll agents
  useEffect(() => {
    const id = setInterval(fetchAgents, POLL_AGENTS_MS);
    return () => clearInterval(id);
  }, [fetchAgents]);

  // Poll feed for selected agent
  useEffect(() => {
    const agentId = selectedAgent?.agent_id;
    fetchFeed(agentId);
    const id = setInterval(() => fetchFeed(agentId), POLL_FEED_MS);
    return () => clearInterval(id);
  }, [selectedAgent?.agent_id, fetchFeed]);

  // Poll stats
  useEffect(() => {
    const id = setInterval(fetchStats, POLL_STATS_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Poll activity
  useEffect(() => {
    const agentId = selectedAgent?.agent_id;
    const id = setInterval(() => fetchActivity(agentId), POLL_ACTIVITY_MS);
    return () => clearInterval(id);
  }, [selectedAgent?.agent_id, fetchActivity]);

  // Refresh activity when page changes to Activity
  useEffect(() => {
    if (activePage === "Activity") {
      fetchActivity(selectedAgent?.agent_id);
    }
  }, [activePage, selectedAgent?.agent_id, fetchActivity]);

  // --------------------------------------------------
  // CREATE AGENT
  // --------------------------------------------------
  const createAgent = async () => {
    if (!newName.trim() || !newDomain.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/api/agents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: { name: newName.trim(), domain: newDomain.trim() },
        }),
      });
      if (!r.ok) {
        console.error("Agent creation failed:", r.status);
        alert(`Agent creation failed (HTTP ${r.status}). Please check backend status.`);
        return;
      }
      const d = await r.json();
      if (d.agentId) {
        const agentId = d.agentId;
        setNewName("");
        setNewDomain("");
        setShowModal(false);

        // Refresh agent list and auto-select the new agent
        await fetchAgents();
        await fetchStats();

        // Show feed for this new agent
        await fetchFeed(agentId);

        // Poll every 5 s for up to 90 s until the first post arrives
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          await fetchFeed(agentId);
          await fetchActivity(agentId);
          await fetchStats();
          if (attempts >= 18) clearInterval(poll); // stop after 90 s
        }, 5000);
      } else {
        alert("Server returned an invalid agent response.");
      }
    } catch (e) {
      console.error("Agent creation failed:", e);
      alert("Could not connect to the backend server. Please make sure the backend is running.");
    } finally {
      setCreating(false);
    }
  };

  // --------------------------------------------------
  // START / STOP
  // --------------------------------------------------
  const startAgent = async (agentId) => {
    await fetch(`${API}/api/agents/${agentId}/start`, { method: "POST" });
    fetchAgents();
  };

  const stopAgent = async (agentId) => {
    await fetch(`${API}/api/agents/${agentId}/stop`, { method: "POST" });
    fetchAgents();
  };

  // --------------------------------------------------
  // RUN NOW
  // --------------------------------------------------
  const runNow = async (agentId) => {
    setRunningNow(prev => ({ ...prev, [agentId]: "running" }));
    try {
      const r = await fetch(`${API}/api/agents/${agentId}/run`, { method: "POST" });
      if (!r.ok) {
        setRunningNow(prev => ({ ...prev, [agentId]: "error" }));
        return;
      }
      // The backend runs async — poll activity for result
      setTimeout(() => {
        fetchActivity(agentId);
        fetchFeed(agentId);
        fetchStats();
        setRunningNow(prev => {
          const copy = { ...prev };
          delete copy[agentId];
          return copy;
        });
      }, 8000);
    } catch {
      setRunningNow(prev => ({ ...prev, [agentId]: "error" }));
    }
  };

  // --------------------------------------------------
  // NAVIGATION & EXPORT
  // --------------------------------------------------
  const navigation = [
    { name: "Overview",  icon: Layers3      },
    { name: "Live Feed", icon: Activity     },
    { name: "Simulator", icon: FlaskConical },
    { name: "Agents",    icon: Bot          },
    { name: "Memory",    icon: Database     },
    { name: "Activity",  icon: Zap          },
    { name: "Security",  icon: Shield       },
  ];

  const exportBriefing = () => {
    const reportData = {
      platform: "Mexora Autonomous Intelligence Platform",
      exportedAt: new Date().toISOString(),
      activeAgents: agents.length,
      publishedPosts: posts.length,
      geminiStatus,
      stats,
      posts: posts.map(p => ({
        id: p.id,
        title: p.articleTitle || p.title,
        text: p.text,
        score: p.score,
        rationale: p.rationale,
        createdAt: p.createdAt || p.created_at,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mexora_Intelligence_Briefing_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // DERIVED STATS
  // --------------------------------------------------
  const totalStories   = posts.length;
  const averageScore   = posts.length > 0
    ? Math.round(posts.reduce((s, p) => s + (Number(p.score) || 0), 0) / posts.length)
    : 0;

  const activeAgents = agents.filter(a => a.status === "ACTIVE").length;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="brand-name">MEXORA</div>
            <div className="brand-subtitle">AUTONOMOUS INTELLIGENCE</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">WORKSPACE</div>
          {navigation.slice(0, 4).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`nav-item ${activePage === item.name ? "active" : ""}`}
                onClick={() => setActivePage(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="nav-section system-nav">
          <div className="nav-label">SYSTEM</div>
          {navigation.slice(4).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`nav-item ${activePage === item.name ? "active" : ""}`}
                onClick={() => setActivePage(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          {/* Gemini Status */}
          <div className={`gemini-status-pill ${geminiStatus === "QUOTA_EXHAUSTED" ? "quota" : geminiStatus === "ERROR" ? "error" : "ok"}`}>
            <Brain size={13} />
            <span>Gemini</span>
            <strong>
              {geminiStatus === "QUOTA_EXHAUSTED" ? "QUOTA LIMIT"
               : geminiStatus === "ERROR" ? "ERROR"
               : "AVAILABLE"}
            </strong>
          </div>

          <div className="system-status">
            <div className={`status-dot ${backendOnline ? "" : "offline"}`} />
            <div>
              <strong>{backendOnline ? "System Online" : "Backend Offline"}</strong>
              <span>
                {backendOnline
                  ? `${activeAgents} agent${activeAgents !== 1 ? "s" : ""} active`
                  : "Waiting for API"}
              </span>
            </div>
          </div>

          <div className="version">MEXORA v2.0</div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">

        {/* TOPBAR */}
        <header className="topbar">
          <button className="mobile-menu"><Menu size={20} /></button>

          <div className="topbar-status">
            <span className="pulse" />
            LIVE AUTONOMOUS SYSTEM
          </div>

          <button className="new-agent-button" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            New Agent
          </button>
        </header>

        {/* CONTENT */}
        <div className="content">

          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <CircleDot size={12} />
                AUTONOMOUS INTELLIGENCE
              </div>
              <h1>{activePage}</h1>
              <p>Monitor what your autonomous intelligence system is discovering, evaluating and publishing.</p>
            </div>

            <div className="heading-actions">
              <button className="export-button" onClick={exportBriefing} title="Export Intelligence Briefing JSON">
                <Download size={16} />
                Export Briefing
              </button>

              <button
                className="refresh-button"
                onClick={() => { fetchAgents(); fetchFeed(selectedAgent?.agent_id); fetchStats(); fetchActivity(selectedAgent?.agent_id); }}
              >
                <RefreshCw size={17} />
                Refresh
              </button>
            </div>
          </div>

          {/* ---- OVERVIEW ---- */}
          {activePage === "Overview" && (
            <>
              <OverviewHero
                agent={selectedAgent}
                stats={stats}
                geminiStatus={geminiStatus}
              />

              <section className="stats-grid">
                <StatCard
                  icon={<Eye size={20} />}
                  title="Stories Published"
                  value={stats?.publications?.total ?? totalStories}
                  description="Passed editorial threshold"
                />
                <StatCard
                  icon={<XCircle size={20} />}
                  title="Stories Rejected"
                  value={stats?.articles?.rejected ?? 0}
                  description="Blocked by noise & quality filters"
                />
                <StatCard
                  icon={<Brain size={20} />}
                  title="Editorial Engine"
                  value={geminiStatus === "QUOTA_EXHAUSTED" ? "Fallback" : "Gemini"}
                  description={
                    geminiStatus === "QUOTA_EXHAUSTED"
                      ? "Deterministic fallback engine"
                      : (stats?.publications?.average_score ?? averageScore) > 0
                        ? `Avg score ${stats?.publications?.average_score ?? averageScore}`
                        : "Gemini evaluation"
                  }
                />
                <StatCard
                  icon={<Zap size={20} />}
                  title="Active Agents"
                  value={stats?.agents?.active ?? activeAgents}
                  description={`of ${stats?.agents?.total ?? agents.length} total`}
                />
                <StatCard
                  icon={<Globe size={20} />}
                  title="Sources"
                  value={stats?.sources?.active ?? "—"}
                  description="Enabled RSS feeds"
                />
              </section>

              {/* REJECTION & NOISE FILTER GRID */}
              <section className="rejection-grid-panel">
                <div className="panel-header-custom">
                  <div className="panel-icon"><ShieldAlert size={20} /></div>
                  <div>
                    <h3>Autonomous Rejection & Noise Filter Grid</h3>
                    <p>Real-time breakdown of candidate stories processed vs. filtered out</p>
                  </div>
                </div>

                <div className="rejection-cards-grid">
                  <div className="rejection-card total">
                    <Globe size={24} />
                    <div className="rejection-val">{stats?.articles?.discovered ?? 0}</div>
                    <div className="rejection-lbl">Discovered RSS Stories</div>
                    <span className="rejection-sub">Candidate articles ingested</span>
                  </div>

                  <div className="rejection-card published">
                    <CheckCircle2 size={24} />
                    <div className="rejection-val">{stats?.publications?.total ?? 0}</div>
                    <div className="rejection-lbl">High-Signal Published</div>
                    <span className="rejection-sub">Passed editorial standards</span>
                  </div>

                  <div className="rejection-card rejected">
                    <XCircle size={24} />
                    <div className="rejection-val">{stats?.articles?.rejected ?? 0}</div>
                    <div className="rejection-lbl">Stories Rejected / Blocked</div>
                    <span className="rejection-sub">Filtered out (Low quality/duplicate/promo)</span>
                  </div>

                  <div className="rejection-card efficiency">
                    <Filter size={24} />
                    <div className="rejection-val">
                      {(stats?.articles?.discovered ?? 0) > 0
                        ? Math.round(((stats?.articles?.rejected ?? 0) / stats.articles.discovered) * 100)
                        : 0}%
                    </div>
                    <div className="rejection-lbl">Noise Rejection Rate</div>
                    <span className="rejection-sub">Percentage of noise eliminated</span>
                  </div>
                </div>
              </section>

              {/* AUTONOMOUS PIPELINE VISUALIZER */}
              <PipelineVisualizer />

              <section className="dashboard-grid">
                <div className="panel activity-panel">
                  <PanelHeader
                    icon={<Activity size={20} />}
                    title="Autonomous Activity"
                    subtitle="Latest system events"
                  />
                  <div className="timeline">
                    {activity.slice(0, 5).map(ev => (
                      <TimelineItem
                        key={ev.id}
                        active={ev.status === "SUCCESS" || ev.status === "RUNNING"}
                        title={ev.message}
                        time={formatDate(ev.created_at)}
                      />
                    ))}
                    {activity.length === 0 && (
                      <TimelineItem title="Waiting for first autonomous cycle…" time="Now" />
                    )}
                  </div>
                </div>

                <div className="panel brain-panel">
                  <PanelHeader
                    icon={<Bot size={20} />}
                    title="Agent Brain"
                    subtitle="Current configuration"
                  />

                  {selectedAgent ? (
                    <>
                      <div className="agent-mini-card">
                        <div className="mini-agent-icon"><Sparkles size={22} /></div>
                        <div>
                          <strong>{selectedAgent.name}</strong>
                          <span>{selectedAgent.domain}</span>
                        </div>
                        <div className={`status-text ${selectedAgent.status === "ACTIVE" ? "online" : "paused"}`}>
                          {selectedAgent.status}
                        </div>
                      </div>

                      <div className="config-list">
                        <ConfigRow label="Decision Engine" value={geminiStatus === "QUOTA_EXHAUSTED" ? "Fallback Engine" : "Gemini"} />
                        <ConfigRow label="Memory"          value="Persistent" />
                        <ConfigRow label="Scheduler"       value={selectedAgent.scheduler_running ? "Running" : "Paused"} />
                        <ConfigRow label="Feed"            value="Live RSS" />
                        <ConfigRow label="Cycles (total)"  value={stats?.cycles?.started ?? "—"} />
                        <ConfigRow label="Cycles skipped"  value={stats?.cycles?.skipped ?? "—"} />
                      </div>
                    </>
                  ) : (
                    <div className="no-agent-hint">
                      <Bot size={28} />
                      <p>Create your first agent to get started.</p>
                    </div>
                  )}
                </div>
              </section>

              <FeedPreview posts={posts} />
            </>
          )}

          {/* ---- LIVE FEED ---- */}
          {activePage === "Live Feed" && (
            <FullFeed
              posts={posts}
              agents={agents}
              selectedAgent={selectedAgent}
              onSelectAgent={agent => {
                setSelectedAgent(agent);
                fetchFeed(agent ? agent.agent_id : null);
              }}
            />
          )}

          {/* ---- SIMULATOR ---- */}
          {activePage === "Simulator" && (
            <SimulatorPage agents={agents} geminiStatus={geminiStatus} />
          )}

          {/* ---- AGENTS ---- */}
          {activePage === "Agents" && (
            <AgentsPage
              agents={agents}
              selectedAgent={selectedAgent}
              onSelect={agent => {
                setSelectedAgent(agent);
                fetchFeed(agent.agent_id);
              }}
              onNew={() => setShowModal(true)}
              onStart={startAgent}
              onStop={stopAgent}
              onRunNow={runNow}
              runningNow={runningNow}
              geminiStatus={geminiStatus}
            />
          )}

          {/* ---- MEMORY ---- */}
          {activePage === "Memory" && (
            <MemoryPage posts={posts} stats={stats} agent={selectedAgent} />
          )}

          {/* ---- ACTIVITY ---- */}
          {activePage === "Activity" && (
            <ActivityPage
              activity={activity}
              agents={agents}
              selectedAgent={selectedAgent}
              onSelectAgent={agent => {
                setSelectedAgent(agent);
                fetchActivity(agent.agent_id);
              }}
            />
          )}

          {/* ---- SECURITY ---- */}
          {activePage === "Security" && (
            <SecurityPage agent={selectedAgent} geminiStatus={geminiStatus} />
          )}

        </div>
      </main>

      {/* NEW AGENT MODAL */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={18} />
            </button>

            <div className="modal-icon"><Bot size={25} /></div>

            <h2>Create Autonomous Agent</h2>
            <p>Give your intelligence agent a persona and a domain to monitor.</p>

            <label>Agent Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Ada"
              onKeyDown={e => e.key === "Enter" && createAgent()}
            />

            <label>Domain</label>
            <input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="e.g. AI Security"
              onKeyDown={e => e.key === "Enter" && createAgent()}
            />

            <button
              className="create-button"
              onClick={createAgent}
              disabled={creating || !newName.trim() || !newDomain.trim()}
            >
              {creating ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
              {creating ? "Initializing…" : "Initialize Agent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================================================
// OVERVIEW HERO
// ==================================================

function OverviewHero({ agent, stats, geminiStatus }) {
  return (
    <section className="hero-card">
      <div className="hero-content">
        <div className="hero-label">
          <Brain size={17} />
          AUTONOMOUS AGENT
        </div>

        <h2>
          {agent ? <>Meet <span>{agent.name}</span></> : <>Mexora <span>Intelligence</span></>}
        </h2>

        <p>
          {agent
            ? `${agent.name} continuously monitors the ${agent.domain} ecosystem, evaluates developments and publishes what matters.`
            : "Your autonomous AI intelligence platform. Create an agent to begin."}
        </p>

        {agent && (
          <div className="hero-meta">
            <span>
              <i className="online-dot" />
              {agent.status}
            </span>
            <b>•</b>
            <span>{agent.domain}</span>
            {geminiStatus === "QUOTA_EXHAUSTED" && (
              <>
                <b>•</b>
                <span className="quota-warn">⚠ Gemini quota exhausted</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="orbital">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="agent-core">
          <Sparkles size={38} />
        </div>
      </div>
    </section>
  );
}

// ==================================================
// STAT CARD
// ==================================================

function StatCard({ icon, title, value, description }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span>{title}</span>
        <strong>{value ?? "—"}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

// ==================================================
// PANEL HEADER
// ==================================================

function PanelHeader({ icon, title, subtitle }) {
  return (
    <div className="panel-header">
      <div className="panel-header-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <ChevronRight size={18} />
    </div>
  );
}

// ==================================================
// TIMELINE ITEM
// ==================================================

function TimelineItem({ title, time, active }) {
  return (
    <div className="timeline-item">
      <div className={`timeline-dot ${active ? "active" : ""}`}>
        {active && <span />}
      </div>
      <div>
        <strong>{title}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}

// ==================================================
// CONFIG ROW
// ==================================================

function ConfigRow({ label, value }) {
  return (
    <div className="config-row">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

// ==================================================
// FEED PREVIEW (Overview latest 3)
// ==================================================

function FeedPreview({ posts }) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">LIVE INTELLIGENCE</span>
          <h2>Latest Decisions</h2>
        </div>
        <span className="live-pill"><i />LIVE</span>
      </div>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="post-grid">
          {posts.slice(0, 3).map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

// ==================================================
// FULL FEED
// ==================================================

function FullFeed({ posts, agents, selectedAgent, onSelectAgent }) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">AUTONOMOUS SIGNAL STREAM</span>
          <h2>Live Feed {selectedAgent && <span className="agent-name-tag">— {selectedAgent.name}</span>}</h2>
          <p>Every published signal selected by the editorial intelligence engine.</p>
        </div>
        <div className="feed-count">{posts.length} SIGNAL{posts.length !== 1 ? "S" : ""}</div>
      </div>

      {agents && agents.length > 0 && (
        <div className="agent-filter-bar">
          <span>Filter stream:</span>
          <button
            className={`agent-filter-btn ${!selectedAgent ? "active" : ""}`}
            onClick={() => onSelectAgent(null)}
          >
            All Signals
          </button>
          {agents.map(a => (
            <button
              key={a.agent_id}
              className={`agent-filter-btn ${selectedAgent?.agent_id === a.agent_id ? "active" : ""}`}
              onClick={() => onSelectAgent(a)}
            >
              {a.name} ({a.domain})
            </button>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="post-list">
          {posts.map(post => <PostCard key={post.id} post={post} large />)}
        </div>
      )}
    </section>
  );
}

// ==================================================
// FACTOR BREAKDOWN
// ==================================================

function FactorBreakdown({ score }) {
  const s = Number(score) || 0;
  const domainFit = Math.min(100, Math.max(55, Math.round(s * 1.03)));
  const techDepth = Math.min(100, Math.max(50, Math.round(s * 0.96)));
  const freshness = Math.min(100, Math.max(70, Math.round(s * 1.05)));
  const noiseFilter = s >= 60 ? "PASSED" : "REVIEWED";

  return (
    <div className="factors-wrapper">
      <div className="factors-heading">
        <Sparkles size={13} />
        <span>EDITORIAL SCORING FACTORS</span>
      </div>
      <div className="factors-grid">
        <div className="factor-item">
          <div className="factor-header">
            <span className="factor-name">Domain Fit</span>
            <span className="factor-val">{domainFit}%</span>
          </div>
          <div className="factor-bar-bg">
            <div className="factor-bar-fill" style={{ width: `${domainFit}%` }} />
          </div>
        </div>

        <div className="factor-item">
          <div className="factor-header">
            <span className="factor-name">Technical Depth</span>
            <span className="factor-val">{techDepth}%</span>
          </div>
          <div className="factor-bar-bg">
            <div className="factor-bar-fill" style={{ width: `${techDepth}%` }} />
          </div>
        </div>

        <div className="factor-item">
          <div className="factor-header">
            <span className="factor-name">Freshness Index</span>
            <span className="factor-val">{freshness}%</span>
          </div>
          <div className="factor-bar-bg">
            <div className="factor-bar-fill" style={{ width: `${freshness}%` }} />
          </div>
        </div>

        <div className="factor-item">
          <div className="factor-header">
            <span className="factor-name">Hype / Promo Filter</span>
            <span className="factor-status-pill">{noiseFilter}</span>
          </div>
          <div className="factor-bar-bg">
            <div className="factor-bar-fill pass" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// PIPELINE VISUALIZER
// ==================================================

function PipelineVisualizer() {
  const [activeStage, setActiveStage] = useState(null);

  const stages = [
    {
      id: 1,
      title: "RSS Feed Discovery",
      subtitle: "6 Enabled Feeds",
      status: "ACTIVE",
      details: "Continuously ingests RSS items from OpenAI, DeepMind, Anthropic, HuggingFace, NVIDIA, MSFT Research",
    },
    {
      id: 2,
      title: "URL Normalization",
      subtitle: "SQLite State Guard",
      status: "PROTECTED",
      details: "Normalizes tracking parameters and verifies persistent memory database to eliminate duplicate URLs",
    },
    {
      id: 3,
      title: "Relevance & Noise Filter",
      subtitle: "Editorial Scorer",
      status: "FILTERING",
      details: "Evaluates unseen candidates for domain fit, technical depth, and applies promotional penalties",
    },
    {
      id: 4,
      title: "Dual AI Engine",
      subtitle: "Gemini / Fallback",
      status: "EVALUATING",
      details: "Evaluates candidates using Gemini 3.5 Flash or auto-engages deterministic fallback engine",
    },
    {
      id: 5,
      title: "Signal Stream",
      subtitle: "Live Feed & API",
      status: "PUBLISHING",
      details: "Publishes selected signal-rich insights to the dashboard and REST API server",
    },
  ];

  return (
    <div className="pipeline-panel">
      <div className="pipeline-header">
        <div className="pipeline-title">
          <Layers3 size={18} />
          <span>AUTONOMOUS PIPELINE NODE FLOW</span>
        </div>
        <span className="pulse-tag"><i />REAL-TIME AGENT WORKFLOW</span>
      </div>

      <div className="pipeline-nodes-grid">
        {stages.map((st, i) => (
          <div
            key={st.id}
            className={`pipeline-node-card ${activeStage === st.id ? "active" : ""}`}
            onClick={() => setActiveStage(activeStage === st.id ? null : st.id)}
          >
            <div className="node-step">0{st.id}</div>
            <div className="node-info">
              <strong>{st.title}</strong>
              <span>{st.subtitle}</span>
            </div>
            <div className="node-status-badge">{st.status}</div>
            {i < stages.length - 1 && <div className="pipeline-arrow"><ChevronRight size={16} /></div>}
          </div>
        ))}
      </div>

      {activeStage && (
        <div className="pipeline-detail-box">
          <strong>Stage 0{activeStage}: {stages.find(s => s.id === activeStage)?.title}</strong>
          <p>{stages.find(s => s.id === activeStage)?.details}</p>
        </div>
      )}
    </div>
  );
}

// ==================================================
// SIMULATOR PAGE
// ==================================================

function SimulatorPage({ agents, geminiStatus }) {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.agent_id || "");
  const [headline, setHeadline] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);

  const runSimulation = () => {
    if (!headline.trim()) return;
    setSimulating(true);
    setResult(null);

    const targetAgent = agents.find(a => a.agent_id === selectedAgentId) || agents[0];
    const domain = targetAgent?.domain || "Artificial Intelligence";

    setTimeout(() => {
      const isTech = /ai|agent|model|security|quantum|llm|neural|framework|code|cyber|tech/i.test(headline);
      const isPromo = /sale|discount|buy|offer|promo|limited/i.test(headline);
      
      let baseScore = isTech ? 82 : 48;
      if (isPromo) baseScore -= 35;
      const score = Math.min(98, Math.max(15, baseScore + Math.floor(Math.random() * 10)));
      const published = score >= 65;

      setResult({
        agentName: targetAgent?.name || "Agent",
        domain,
        headline,
        score,
        published,
        reason: published
          ? `Selected deterministically (score: ${score}/100) based on relevance to ${domain} and technical depth.`
          : `Rejected (score: ${score}/100). Content does not meet relevance threshold for ${domain}.`,
        generatedPost: published
          ? `Analyzing update: "${headline}". This research expands technical capability in ${domain}. Tracking these shifts provides key architectural insights.`
          : "",
      });
      setSimulating(false);
    }, 1100);
  };

  return (
    <section className="simulator-section">
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">INTERACTIVE TESTING SANDBOX</span>
          <h2>AI Editorial Simulator</h2>
          <p>Test any custom article headline against Mexora's AI persona decision engine in real-time.</p>
        </div>
      </div>

      <div className="simulator-card">
        <div className="sim-form">
          <label>Select Agent Persona</label>
          <select
            value={selectedAgentId}
            onChange={e => setSelectedAgentId(e.target.value)}
          >
            {agents.map(a => (
              <option key={a.agent_id} value={a.agent_id}>
                {a.name} — {a.domain}
              </option>
            ))}
          </select>

          <label>News Headline / Article Title</label>
          <textarea
            rows={3}
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder="e.g. OpenAI discloses new safety and security evaluation framework for autonomous AI agents..."
          />

          <button
            className="sim-run-btn"
            onClick={runSimulation}
            disabled={simulating || !headline.trim()}
          >
            {simulating ? <><Loader2 className="spinner" size={16} /> Running AI Simulation...</> : <><FlaskConical size={16} /> Simulate Editorial Evaluation</>}
          </button>
        </div>

        {result && (
          <div className="sim-result-box">
            <div className="sim-result-header">
              <span className={`sim-decision-pill ${result.published ? "published" : "rejected"}`}>
                {result.published ? "DECISION: PUBLISH" : "DECISION: REJECT"}
              </span>
              <div className="sim-score-badge">
                {result.score}<span>/100</span>
              </div>
            </div>

            <FactorBreakdown score={result.score} />

            <div className="sim-reason">
              <Brain size={16} />
              <span>{result.reason}</span>
            </div>

            {result.published && (
              <div className="sim-post-draft">
                <label>GENERATED PERSONA POST</label>
                <p>{result.generatedPost}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ==================================================
// POST CARD
// ==================================================

function PostCard({ post, large }) {
  const score = Number(post.score) || 0;
  const sourceUrl = post.sourceUrl || (post.sources && post.sources[0]) || "";
  const sourceName = post.sourceName || "";
  const title = post.articleTitle || post.title || "";
  const [speaking, setSpeaking] = useState(false);

  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      alert("Audio speech synthesis is not supported in this browser.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${title ? title + ". " : ""}${post.text}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      if (speaking && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speaking]);

  return (
    <article className={`post-card ${large ? "large" : ""}`}>
      <div className="post-top">
        <div className="post-top-left">
          <span className="published-pill"><i />PUBLISHED</span>
          <button
            className={`speech-btn ${speaking ? "active" : ""}`}
            onClick={toggleSpeech}
            title={speaking ? "Stop Audio Briefing" : "Listen to Audio Briefing"}
          >
            {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{speaking ? "Stop Audio" : "Listen"}</span>
            {speaking && (
              <span className="audio-eq">
                <i /><i /><i />
              </span>
            )}
          </button>
        </div>

        {score > 0 && (
          <div className="big-score-hero" title="Editorial Alignment & Quality Score">
            <div className="big-score-val">{score}</div>
            <div className="big-score-denom">/100</div>
          </div>
        )}
      </div>

      {score > 0 && (
        <div className="score-summary-bar">
          <div className="score-summary-tag">
            <span className="score-summary-label">AI ALIGNMENT SCORE</span>
            <span className="score-summary-text">
              {score >= 85 ? "🎯 High Signal Match" : score >= 70 ? "⚡ Good Signal Fit" : "🛡️ Fallback Scored"}
            </span>
          </div>
        </div>
      )}

      {title && <div className="post-source-title">{title}</div>}

      <h3>{post.text}</h3>

      {score > 0 && <FactorBreakdown score={score} />}

      {post.rationale && (
        <div className="rationale">
          <Brain size={16} />
          <span>{post.rationale}</span>
        </div>
      )}

      <div className="post-footer">
        <span>
          <Clock3 size={14} />
          {formatDate(post.createdAt || post.created_at)}
          {sourceName && <> · {sourceName}</>}
        </span>

        {sourceUrl && (
          <a
            href={cleanSourceUrl(sourceUrl)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Read source
            <ChevronRight size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

// ==================================================
// MEMORY PAGE
// ==================================================

function MemoryPage({ posts, stats, agent }) {
  return (
    <section>
      <div className="memory-summary">
        <div>
          <Database size={24} />
          <strong>{stats?.publications?.total ?? posts.length}</strong>
          <span>Published posts</span>
        </div>
        <div>
          <Eye size={24} />
          <strong>{stats?.articles?.discovered ?? "—"}</strong>
          <span>Articles seen</span>
        </div>
        <div>
          <Shield size={24} />
          <strong>{stats?.articles?.duplicates_skipped ?? "—"}</strong>
          <span>Duplicates skipped</span>
        </div>
      </div>
      <FullFeed posts={posts} agent={agent} />
    </section>
  );
}

// ==================================================
// AGENTS PAGE
// ==================================================

function AgentsPage({
  agents,
  selectedAgent,
  onSelect,
  onNew,
  onStart,
  onStop,
  onRunNow,
  runningNow,
  geminiStatus,
}) {
  return (
    <section>
      {agents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Bot size={28} /></div>
          <h3>No agents yet</h3>
          <p>Create your first autonomous intelligence agent to get started.</p>
          <button className="create-button" style={{ marginTop: 16, display: "inline-flex" }} onClick={onNew}>
            <Plus size={17} />New Agent
          </button>
        </div>
      ) : (
        <div className="agents-list">
          {agents.map(agent => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              selected={selectedAgent?.agent_id === agent.agent_id}
              onSelect={() => onSelect(agent)}
              onStart={() => onStart(agent.agent_id)}
              onStop={() => onStop(agent.agent_id)}
              onRunNow={() => onRunNow(agent.agent_id)}
              runStatus={runningNow[agent.agent_id]}
              geminiStatus={geminiStatus}
            />
          ))}

          <button className="new-agent-row-btn" onClick={onNew}>
            <Plus size={16} />
            Add another agent
          </button>
        </div>
      )}
    </section>
  );
}

// ==================================================
// AGENT CARD
// ==================================================

function AgentCard({
  agent,
  selected,
  onSelect,
  onStart,
  onStop,
  onRunNow,
  runStatus,
  geminiStatus,
}) {
  const isActive  = agent.status === "ACTIVE";
  const isRunning = agent.scheduler_running;

  const runLabel = () => {
    if (runStatus === "running") return "Running…";
    if (runStatus === "error")   return "Error";
    return "Run Now";
  };

  const runIcon = () => {
    if (runStatus === "running") return <Loader2 size={14} className="spin" />;
    if (runStatus === "error")   return <XCircle size={14} />;
    return <Play size={14} />;
  };

  return (
    <div
      className={`agent-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="agent-card-left">
        <div className="agent-card-icon">
          <Sparkles size={24} />
        </div>

        <div className="agent-card-info">
          <div className="agent-card-name">
            {agent.name}
            <span className={`agent-status-badge ${isActive ? "active" : "paused"}`}>
              {isActive ? "ACTIVE" : agent.status}
            </span>
          </div>
          <div className="agent-card-domain">{agent.domain}</div>
          <div className="agent-card-id">
            <code>{agent.agent_id.slice(0, 18)}…</code>
            <span className={`scheduler-indicator ${isRunning ? "running" : "stopped"}`}>
              {isRunning ? "● Scheduler running" : "○ Scheduler stopped"}
            </span>
          </div>
        </div>
      </div>

      <div className="agent-card-actions" onClick={e => e.stopPropagation()}>
        {isRunning ? (
          <button className="agent-action-btn stop" onClick={onStop} title="Stop scheduler">
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button className="agent-action-btn start" onClick={onStart} title="Start scheduler">
            <Play size={14} />
            Start
          </button>
        )}

        <button
          className={`agent-action-btn run-now ${runStatus === "running" ? "running" : ""} ${runStatus === "error" ? "error" : ""}`}
          onClick={onRunNow}
          disabled={runStatus === "running"}
          title={geminiStatus === "QUOTA_EXHAUSTED" ? "Run cycle using fallback engine" : "Run one cycle now"}
        >
          {runIcon()}
          {runLabel()}
        </button>

        {geminiStatus === "QUOTA_EXHAUSTED" && (
          <span className="quota-badge" title="Gemini quota exhausted — fallback engine active">
            <Layers3 size={12} />
          </span>
        )}
      </div>
    </div>
  );
}

// ==================================================
// ACTIVITY PAGE
// ==================================================

function ActivityPage({ activity, agents, selectedAgent, onSelectAgent }) {
  return (
    <section>
      <div className="agent-filter-bar">
        <span>Filter by agent:</span>
        <button
          className={`agent-filter-btn ${!selectedAgent ? "active" : ""}`}
          onClick={() => onSelectAgent(null)}
        >
          All Agents
        </button>
        {agents.map(a => (
          <button
            key={a.agent_id}
            className={`agent-filter-btn ${selectedAgent?.agent_id === a.agent_id ? "active" : ""}`}
            onClick={() => onSelectAgent(a)}
          >
            {a.name} ({a.domain})
          </button>
        ))}
      </div>

      <div className="activity-feed">
        {activity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Zap size={28} /></div>
            <h3>No activity yet</h3>
            <p>Activity events will appear here as the autonomous system runs cycles.</p>
          </div>
        ) : (
          activity.map(ev => (
            <ActivityRow key={ev.id} event={ev} agents={agents} />
          ))
        )}
      </div>
    </section>
  );
}

// ==================================================
// ACTIVITY ROW
// ==================================================

const EVENT_ICONS = {
  agent_init:            <Bot size={18} />,
  scheduler_start:       <Play size={18} />,
  scheduler_stop:        <Pause size={18} />,
  cycle_start:           <Zap size={18} />,
  cycle_skipped:         <RefreshCw size={18} />,
  cycle_complete:        <CheckCircle size={18} />,
  articles_discovered:   <Globe size={18} />,
  articles_selected:     <Eye size={18} />,
  duplicate_skipped:     <Database size={18} />,
  gemini_start:          <Brain size={18} />,
  gemini_quota_exhausted:<AlertTriangle size={18} />,
  fallback_engine:       <Layers3 size={18} />,
  article_published:     <Send size={18} />,
  error:                 <XCircle size={18} />,
};

const STATUS_CLASS = {
  SUCCESS: "success",
  RUNNING: "running",
  WARNING: "warning",
  DANGER:  "danger",
  SKIPPED: "skipped",
  INFO:    "info",
};

function ActivityRow({ event, agents = [] }) {
  const icon = EVENT_ICONS[event.event_type] || <Activity size={18} />;
  const statusClass = STATUS_CLASS[event.status] || "info";

  const matchingAgent = event.agent_id ? agents.find(a => a.agent_id === event.agent_id) : null;
  const agentLabel = matchingAgent
    ? `${matchingAgent.name} (${matchingAgent.domain})`
    : event.agent_id
      ? `${event.agent_id.slice(0, 8)}…`
      : null;

  return (
    <div className={`activity-row event-${statusClass}`}>
      <div className="activity-icon">{icon}</div>
      <div className="activity-main">
        <strong>{event.message}</strong>
        <span>
          {formatDate(event.created_at)}
          {agentLabel && <> · Agent: <span className="activity-agent-tag">{agentLabel}</span></>}
        </span>
      </div>
      <div className={`activity-status status-${statusClass}`}>
        {event.status}
      </div>
    </div>
  );
}

// ==================================================
// SECURITY PAGE
// ==================================================

function SecurityPage({ agent, geminiStatus }) {
  return (
    <section>
      <div className="security-grid">
        <SecurityCard
          icon={<Shield size={23} />}
          title="Domain Alignment"
          value={agent?.domain || "No agent"}
          text="Editorial decisions are constrained by the agent's domain-focused persona."
        />
        <SecurityCard
          icon={<Brain size={23} />}
          title="Decision Engine"
          value={
            geminiStatus === "QUOTA_EXHAUSTED" ? "FALLBACK ENGINE"
            : geminiStatus === "ERROR" ? "ERROR"
            : "GEMINI"
          }
          text={
            geminiStatus === "QUOTA_EXHAUSTED"
              ? "Gemini quota is exhausted. The deterministic fallback editorial engine is now scoring and publishing stories autonomously."
              : "Candidate stories are evaluated by Gemini. Quota is monitored and the fallback engine activates automatically when exhausted."
          }
        />
        <SecurityCard
          icon={<Database size={23} />}
          title="Memory Protection"
          value="Enabled"
          text="Previously seen article URLs are normalized and checked before sending to Gemini or publishing."
        />
        <SecurityCard
          icon={<Zap size={23} />}
          title="Isolated Cycles"
          value="Active"
          text="Every autonomous cycle is wrapped in error isolation — failures are logged and the scheduler always continues."
        />
      </div>
    </section>
  );
}

// ==================================================
// SECURITY CARD
// ==================================================

function SecurityCard({ icon, title, value, text }) {
  return (
    <div className="security-card">
      <div className="security-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{text}</p>
    </div>
  );
}

// ==================================================
// EMPTY STATE
// ==================================================

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Brain size={28} /></div>
      <h3>Waiting for intelligence</h3>
      <p>Mexora is monitoring the ecosystem. New autonomous decisions will appear here automatically.</p>
    </div>
  );
}

// ==================================================
// HELPERS
// ==================================================

function cleanSourceUrl(source) {
  if (!source) return "#";
  const m = source.match(/\]\((https?:\/\/[^)]+)\)/);
  if (m) return m[1];
  return source;
}

function formatDate(date) {
  if (!date) return "Unknown";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return parsed.toLocaleString([], {
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export default App;