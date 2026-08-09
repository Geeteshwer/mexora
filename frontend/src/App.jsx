import { useEffect, useState } from "react";

import {
  Activity,
  Bot,
  Brain,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  Eye,
  Globe,
  Layers3,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [agentId, setAgentId] = useState(
    localStorage.getItem("mexoraAgentId") || ""
  );

  const [agent, setAgent] = useState({
    name: "Ada",
    domain: "AI Security",
  });

  const [posts, setPosts] = useState([]);
  const [activePage, setActivePage] = useState("Overview");

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [backendOnline, setBackendOnline] = useState(false);

  // --------------------------------------------------
  // LOAD FEED
  // --------------------------------------------------

  const loadFeed = async () => {
    if (!agentId) {
      console.log("No agent ID found.");
      return;
    }

    try {
      const url = `${API}/api/agent/feed?agentId=${agentId}`;

      console.log("Fetching feed:", url);

      const response = await fetch(url);

      if (!response.ok) {
        console.error("Feed HTTP error:", response.status);
        setBackendOnline(false);
        return;
      }

      const data = await response.json();

      console.log("FEED DATA:", data);

      const receivedPosts = Array.isArray(data.posts)
        ? data.posts
        : [];

      console.log("POST COUNT:", receivedPosts.length);

      setPosts(receivedPosts);
      setLastUpdated(new Date());
      setBackendOnline(true);
    } catch (error) {
      console.error("Feed error:", error);
      setBackendOnline(false);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD + AUTO REFRESH
  // --------------------------------------------------

  useEffect(() => {
    loadFeed();

    const interval = setInterval(() => {
      loadFeed();
    }, 5000);

    return () => clearInterval(interval);
  }, [agentId]);

  // --------------------------------------------------
  // CREATE AGENT
  // --------------------------------------------------

  const createAgent = async () => {
    if (!newName.trim() || !newDomain.trim()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/api/agent/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          persona: {
            name: newName.trim(),
            domain: newDomain.trim(),
          },
        }),
      });

      if (!response.ok) {
        console.error("Agent creation failed:", response.status);
        return;
      }

      const data = await response.json();

      console.log("AGENT CREATED:", data);

      if (data.agentId) {
        localStorage.setItem(
          "mexoraAgentId",
          data.agentId
        );

        setAgentId(data.agentId);

        setAgent({
          name: newName.trim(),
          domain: newDomain.trim(),
        });

        setNewName("");
        setNewDomain("");

        setShowModal(false);
      }
    } catch (error) {
      console.error("Agent creation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const navigation = [
    {
      name: "Overview",
      icon: Layers3,
    },
    {
      name: "Live Feed",
      icon: Activity,
    },
    {
      name: "Agents",
      icon: Bot,
    },
    {
      name: "Memory",
      icon: Database,
    },
    {
      name: "Activity",
      icon: Zap,
    },
    {
      name: "Security",
      icon: Shield,
    },
  ];

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const totalStories = posts.length;

  const averageScore =
    posts.length > 0
      ? Math.round(
          posts.reduce((sum, post) => {
            const score =
              post.score ??
              post.editorialScore ??
              extractScore(post.rationale);

            return sum + (Number(score) || 0);
          }, 0) / posts.length
        )
      : 0;

  // --------------------------------------------------
  // UI
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
            <div className="brand-name">
              MEXORA
            </div>

            <div className="brand-subtitle">
              AUTONOMOUS INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="nav-section">

          <div className="nav-label">
            WORKSPACE
          </div>

          {navigation.slice(0, 4).map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActivePage(item.name)
                }
              >
                <Icon size={19} />

                <span>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="nav-section system-nav">

          <div className="nav-label">
            SYSTEM
          </div>

          {navigation.slice(4).map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActivePage(item.name)
                }
              >
                <Icon size={19} />

                <span>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-bottom">

          <div className="system-status">

            <div
              className={`status-dot ${
                backendOnline
                  ? ""
                  : "offline"
              }`}
            />

            <div>
              <strong>
                {backendOnline
                  ? "System Online"
                  : "Backend Offline"}
              </strong>

              <span>
                {backendOnline
                  ? "Autonomous loop active"
                  : "Waiting for API"}
              </span>
            </div>

          </div>

          <div className="version">
            MEXORA v1.0
          </div>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main-content">

        {/* TOPBAR */}

        <header className="topbar">

          <button className="mobile-menu">
            <Menu size={20} />
          </button>

          <div className="topbar-status">

            <span className="pulse" />

            LIVE AUTONOMOUS SYSTEM

          </div>

          <button
            className="new-agent-button"
            onClick={() =>
              setShowModal(true)
            }
          >
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

              <h1>
                {activePage}
              </h1>

              <p>
                Monitor what your autonomous
                intelligence system is discovering,
                evaluating and publishing.
              </p>

            </div>

            <button
              className="refresh-button"
              onClick={loadFeed}
              disabled={loading}
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "spin"
                    : ""
                }
              />

              Refresh
            </button>

          </div>

          {/* OVERVIEW */}

          {activePage === "Overview" && (
            <>
              <section className="hero-card">

                <div className="hero-content">

                  <div className="hero-label">

                    <Brain size={17} />

                    AUTONOMOUS AGENT

                  </div>

                  <h2>
                    Meet{" "}
                    <span>
                      {agent.name}
                    </span>
                  </h2>

                  <p>
                    Your autonomous AI security
                    intelligence agent continuously
                    monitors the information ecosystem,
                    evaluates developments and
                    publishes what matters.
                  </p>

                  <div className="hero-meta">

                    <span>

                      <i className="online-dot" />

                      ACTIVE

                    </span>

                    <b>•</b>

                    <span>
                      {agent.domain}
                    </span>

                  </div>

                </div>

                <div className="orbital">

                  <div className="orbit orbit-one" />

                  <div className="orbit orbit-two" />

                  <div className="agent-core">

                    <Sparkles size={38} />

                  </div>

                </div>

              </section>

              {/* STATS */}

              <section className="stats-grid">

                <StatCard
                  icon={<Eye size={20} />}
                  title="Stories Published"
                  value={totalStories}
                  description="From autonomous decisions"
                />

                <StatCard
                  icon={<Brain size={20} />}
                  title="Editorial Engine"
                  value="AI"
                  description={
                    averageScore > 0
                      ? `Average score ${averageScore}`
                      : "Gemini evaluation"
                  }
                />

                <StatCard
                  icon={<Zap size={20} />}
                  title="Autonomous Mode"
                  value="ON"
                  description="Continuous monitoring"
                />

                <StatCard
                  icon={<Globe size={20} />}
                  title="Sources"
                  value="50+"
                  description="Signals scanned per cycle"
                />

              </section>

              {/* DASHBOARD */}

              <section className="dashboard-grid">

                <div className="panel activity-panel">

                  <PanelHeader
                    icon={<Activity size={20} />}
                    title="Autonomous Activity"
                    subtitle="What Mexora is doing right now"
                  />

                  <div className="timeline">

                    <TimelineItem
                      active
                      title="Autonomous intelligence initialized"
                      time="Now"
                    />

                    {posts.length > 0 ? (
                      <TimelineItem
                        active
                        title={`Published ${posts.length} ${
                          posts.length === 1
                            ? "story"
                            : "stories"
                        }`}
                        time="Latest cycle"
                      />
                    ) : (
                      <TimelineItem
                        title="Waiting for next autonomous cycle"
                        time="Monitoring..."
                      />
                    )}

                    <TimelineItem
                      title="Monitoring AI security ecosystem"
                      time="Continuous"
                    />

                  </div>

                </div>

                <div className="panel brain-panel">

                  <PanelHeader
                    icon={<Bot size={20} />}
                    title="Agent Brain"
                    subtitle="Current configuration"
                  />

                  <div className="agent-mini-card">

                    <div className="mini-agent-icon">

                      <Sparkles size={22} />

                    </div>

                    <div>

                      <strong>
                        {agent.name}
                      </strong>

                      <span>
                        {agent.domain}
                      </span>

                    </div>

                    <div className="online-text">
                      ONLINE
                    </div>

                  </div>

                  <div className="config-list">

                    <ConfigRow
                      label="Decision Engine"
                      value="Gemini"
                    />

                    <ConfigRow
                      label="Memory"
                      value="Persistent"
                    />

                    <ConfigRow
                      label="Scheduler"
                      value="Every 2 min"
                    />

                    <ConfigRow
                      label="Feed"
                      value="Live RSS"
                    />

                  </div>

                </div>

              </section>

              <FeedPreview posts={posts} />

            </>
          )}

          {/* LIVE FEED */}

          {activePage === "Live Feed" && (
            <FullFeed posts={posts} />
          )}

          {/* MEMORY */}

          {activePage === "Memory" && (
            <MemoryPage posts={posts} />
          )}

          {/* AGENTS */}

          {activePage === "Agents" && (
            <AgentsPage
              agent={agent}
              agentId={agentId}
              onNew={() =>
                setShowModal(true)
              }
            />
          )}

          {/* ACTIVITY */}

          {activePage === "Activity" && (
            <ActivityPage
              posts={posts}
              lastUpdated={lastUpdated}
            />
          )}

          {/* SECURITY */}

          {activePage === "Security" && (
            <SecurityPage
              agent={agent}
            />
          )}

        </div>

      </main>

      {/* NEW AGENT MODAL */}

      {showModal && (

        <div
          className="modal-backdrop"
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="modal-close"
              onClick={() =>
                setShowModal(false)
              }
            >
              <X size={18} />
            </button>

            <div className="modal-icon">

              <Bot size={25} />

            </div>

            <h2>
              Create Autonomous Agent
            </h2>

            <p>
              Give your intelligence agent a
              persona and a domain to monitor.
            </p>

            <label>
              Agent Name
            </label>

            <input
              value={newName}
              onChange={(e) =>
                setNewName(e.target.value)
              }
              placeholder="e.g. Ada"
            />

            <label>
              Domain
            </label>

            <input
              value={newDomain}
              onChange={(e) =>
                setNewDomain(e.target.value)
              }
              placeholder="e.g. AI Security"
            />

            <button
              className="create-button"
              onClick={createAgent}
              disabled={loading}
            >

              {loading
                ? "Initializing..."
                : "Initialize Agent"}

              {!loading && (
                <Send size={17} />
              )}

            </button>

          </div>

        </div>

      )}

    </div>
  );
}


// ==================================================
// STAT CARD
// ==================================================

function StatCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-info">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </div>
  );
}


// ==================================================
// PANEL HEADER
// ==================================================

function PanelHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="panel-header">

      <div className="panel-header-icon">
        {icon}
      </div>

      <div>
        <h3>
          {title}
        </h3>

        <p>
          {subtitle}
        </p>
      </div>

      <ChevronRight size={18} />

    </div>
  );
}


// ==================================================
// TIMELINE
// ==================================================

function TimelineItem({
  title,
  time,
  active,
}) {
  return (
    <div className="timeline-item">

      <div
        className={`timeline-dot ${
          active
            ? "active"
            : ""
        }`}
      >
        {active && (
          <span />
        )}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {time}
        </span>

      </div>

    </div>
  );
}


// ==================================================
// CONFIG ROW
// ==================================================

function ConfigRow({
  label,
  value,
}) {
  return (
    <div className="config-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// ==================================================
// FEED PREVIEW
// ==================================================

function FeedPreview({
  posts,
}) {
  return (
    <section className="feed-preview">

      <div className="section-heading">

        <div>

          <span className="section-eyebrow">
            LIVE INTELLIGENCE
          </span>

          <h2>
            Latest Decisions
          </h2>

        </div>

        <span className="live-pill">
          <i />
          LIVE
        </span>

      </div>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="post-grid">

          {posts
            .slice(0, 3)
            .map((post) => (
              <PostCard
                key={post.id}
                post={post}
              />
            ))}

        </div>
      )}

    </section>
  );
}


// ==================================================
// FULL FEED
// ==================================================

function FullFeed({
  posts,
}) {
  return (
    <section className="full-feed">

      <div className="section-heading">

        <div>

          <span className="section-eyebrow">
            AUTONOMOUS SIGNAL STREAM
          </span>

          <h2>
            Live Feed
          </h2>

          <p>
            Every published signal selected by
            the editorial intelligence engine.
          </p>

        </div>

        <div className="feed-count">
          {posts.length} SIGNAL
          {posts.length === 1
            ? ""
            : "S"}
        </div>

      </div>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="post-list">

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              large
            />
          ))}

        </div>
      )}

    </section>
  );
}


// ==================================================
// POST CARD
// ==================================================

function PostCard({
  post,
  large,
}) {
  const score =
    post.score ??
    post.editorialScore ??
    extractScore(post.rationale);

  return (
    <article
      className={`post-card ${
        large
          ? "large"
          : ""
      }`}
    >

      <div className="post-top">

        <span className="published-pill">
          <i />
          PUBLISHED
        </span>

        {score !== null &&
          score !== undefined &&
          Number(score) > 0 && (
            <span className="score-badge">
              {score}
              <small>
                /100
              </small>
            </span>
          )}

      </div>

      <h3>
        {post.text}
      </h3>

      {post.rationale && (
        <div className="rationale">

          <Brain size={16} />

          <span>
            {post.rationale}
          </span>

        </div>
      )}

      <div className="post-footer">

        <span>

          <Clock3 size={14} />

          {formatDate(
            post.createdAt ||
            post.created_at
          )}

        </span>

        {post.sources?.[0] && (
          <a
            href={cleanSourceUrl(
              post.sources[0]
            )}
            target="_blank"
            rel="noreferrer"
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

function MemoryPage({
  posts,
}) {
  return (
    <section className="memory-page">

      <div className="memory-summary">

        <div>

          <Database size={24} />

          <strong>
            {posts.length}
          </strong>

          <span>
            Stored publications
          </span>

        </div>

        <div>

          <Brain size={24} />

          <strong>
            Persistent
          </strong>

          <span>
            Memory layer
          </span>

        </div>

        <div>

          <Shield size={24} />

          <strong>
            Duplicate
          </strong>

          <span>
            Protection enabled
          </span>

        </div>

      </div>

      <FullFeed posts={posts} />

    </section>
  );
}


// ==================================================
// AGENTS PAGE
// ==================================================

function AgentsPage({
  agent,
  agentId,
  onNew,
}) {
  return (
    <section className="agents-page">

      <div className="agent-detail">

        <div className="agent-large-icon">

          <Sparkles size={34} />

        </div>

        <div className="agent-detail-main">

          <div className="online-text">
            ● ONLINE
          </div>

          <h2>
            {agent.name}
          </h2>

          <p>
            {agent.domain}
          </p>

          <div className="agent-id">

            Agent ID:{" "}

            <code>
              {agentId ||
                "Not initialized"}
            </code>

          </div>

        </div>

        <button
          className="create-button compact"
          onClick={onNew}
        >

          <Plus size={17} />

          New Agent

        </button>

      </div>

    </section>
  );
}


// ==================================================
// ACTIVITY PAGE
// ==================================================

function ActivityPage({
  posts,
  lastUpdated,
}) {
  return (
    <section className="activity-page">

      <div className="activity-feed">

        <ActivityRow
          icon={
            <Activity size={18} />
          }
          title="RSS intelligence sources scanned"
          description="OpenAI and Hugging Face feeds monitored"
          status="COMPLETED"
        />

        <ActivityRow
          icon={
            <Brain size={18} />
          }
          title="Editorial evaluation"
          description="Candidate stories evaluated by Gemini"
          status="ACTIVE"
        />

        <ActivityRow
          icon={
            <Database size={18} />
          }
          title={`${posts.length} publications stored in memory`}
          description="Persistent SQLite memory layer"
          status="SYNCED"
        />

        <ActivityRow
          icon={
            <Clock3 size={18} />
          }
          title="Autonomous scheduler"
          description={`Last frontend sync: ${formatDate(
            lastUpdated
          )}`}
          status="RUNNING"
        />

      </div>

    </section>
  );
}


// ==================================================
// ACTIVITY ROW
// ==================================================

function ActivityRow({
  icon,
  title,
  description,
  status,
}) {
  return (
    <div className="activity-row">

      <div className="activity-icon">
        {icon}
      </div>

      <div className="activity-main">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <div className="activity-status">
        {status}
      </div>

    </div>
  );
}


// ==================================================
// SECURITY PAGE
// ==================================================

function SecurityPage({
  agent,
}) {
  return (
    <section className="security-page">

      <div className="security-grid">

        <SecurityCard
          icon={
            <Shield size={23} />
          }
          title="Domain Alignment"
          value={agent.domain}
          text="Editorial decisions are constrained by the agent's security-focused persona."
        />

        <SecurityCard
          icon={
            <Brain size={23} />
          }
          title="Editorial Reasoning"
          value="Gemini"
          text="Candidate stories are evaluated for technical significance, relevance and freshness."
        />

        <SecurityCard
          icon={
            <Database size={23} />
          }
          title="Memory Protection"
          value="Enabled"
          text="Previously published links are checked before a new post is generated."
        />

        <SecurityCard
          icon={
            <Zap size={23} />
          }
          title="Autonomous Loop"
          value="2 min"
          text="The scheduler continuously runs the discovery and editorial pipeline."
        />

      </div>

    </section>
  );
}


// ==================================================
// SECURITY CARD
// ==================================================

function SecurityCard({
  icon,
  title,
  value,
  text,
}) {
  return (
    <div className="security-card">

      <div className="security-icon">
        {icon}
      </div>

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

      <p>
        {text}
      </p>

    </div>
  );
}


// ==================================================
// EMPTY STATE
// ==================================================

function EmptyState() {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        <Brain size={28} />
      </div>

      <h3>
        Waiting for intelligence
      </h3>

      <p>
        Mexora is monitoring the ecosystem.
        New autonomous decisions will appear
        here automatically.
      </p>

    </div>
  );
}


// ==================================================
// HELPERS
// ==================================================

function extractScore(rationale) {
  if (!rationale) {
    return 0;
  }

  const patterns = [
    /score of (\d+)/i,
    /score[:\s]+(\d+)/i,
    /(\d+)\/100/,
  ];

  for (const pattern of patterns) {
    const match =
      rationale.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return 0;
}


function cleanSourceUrl(source) {
  if (!source) {
    return "#";
  }

  // Handles accidental markdown links:
  // [https://example.com](https://example.com)

  const markdownMatch =
    source.match(
      /\]\((https?:\/\/[^)]+)\)/
    );

  if (markdownMatch) {
    return markdownMatch[1];
  }

  return source;
}


function formatDate(date) {
  if (!date) {
    return "Unknown";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleString(
    [],
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


export default App;