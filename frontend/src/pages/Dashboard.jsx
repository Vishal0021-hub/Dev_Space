import { useEffect, useState } from "react";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";
import AppShell from "../components/AppShell";
import NotificationBell from "../components/NotificationBell";
import { DashboardSkeleton } from "../components/Skeletons";
import StandupFeed from "../components/StandupFeed";
import StandupHeatmap from "../components/StandupHeatmap";
import "../utils/collab.css";

/* ─── Icons ─────────────────────────────────────────────────── */
const IconPlus       = ({ size=16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconBriefcase  = ({ size=22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const IconUsers      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconActivity   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconLogoSmall  = () => <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 6l7-3 7 3v8l-7 3-7-3V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;

const ROLE_COLORS = {
  owner:  { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24", label: "Owner"  },
  admin:  { bg: "rgba(99,102,241,0.15)",  color: "#818cf8", label: "Admin"  },
  member: { bg: "rgba(148,163,184,0.1)",  color: "#94a3b8", label: "Member" },
};

const STATUS_CONFIG = {
  todo:       { label: "To Do",       color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "○" },
  inprogress: { label: "In Progress", color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  icon: "◑" },
  review:     { label: "Review",      color: "#818cf8", bg: "rgba(99,102,241,0.1)",  icon: "◕" },
  done:       { label: "Done",        color: "#34d399", bg: "rgba(52,211,153,0.1)",  icon: "●" },
};

const ACTIVITY_ICONS = {
  task_created:        "📋",
  task_moved:          "🔀",
  task_assigned:       "👤",
  task_status_changed: "🔄",
  task_deleted:        "🗑️",
  member_invited:      "✉️",
  member_joined:       "🎉",
  role_changed:        "🛡️",
  project_created:     "📁",
  comment_added:       "💬",
};

const formatTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const activityText = (act) => {
  const n = act.user?.name || "Someone";
  const d = act.details || {};
  switch (act.type) {
    case "task_created":        return `${n} created task "${d.taskTitle || ""}"`;
    case "task_moved":          return `${n} moved "${d.taskTitle || ""}" → ${d.toBoard || ""}`;
    case "task_assigned":       return `${n} assigned "${d.taskTitle || ""}" to ${d.assignedToName || ""}`;
    case "task_status_changed": return `${n} changed "${d.taskTitle || ""}" from ${d.oldStatus || ""} → ${d.newStatus || ""}`;
    case "task_deleted":        return `${n} deleted task "${d.taskTitle || ""}"`;
    case "member_joined":       return `${n} joined the workspace`;
    case "member_invited":      return `${n} invited ${d.invitedEmail || ""}`;
    case "role_changed":        return `${n} changed ${d.assignedToName || ""}'s role to ${d.newRole || ""}`;
    case "project_created":     return `${n} created project "${d.projectName || ""}"`;
    case "comment_added":       return `${n} commented on a task`;
    default:                    return `${n} performed an action`;
  }
};

/* ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useWorkspace();

  const [dashboard,     setDashboard]     = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [newWsName,     setNewWsName]     = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser?._id;

  /* Load dashboard when active workspace changes */
  useEffect(() => {
    if (activeWorkspace?._id) fetchDashboard(activeWorkspace._id);
  }, [activeWorkspace?._id]);

  const fetchDashboard = async (wsId) => {
    setLoading(true);
    try {
      const res = await API.get(`/workspaces/${wsId}/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    const t = toast.loading("Creating workspace…");
    try {
      const res = await API.post("/workspaces", { name: newWsName });
      toast.success("Workspace created!", { id: t });
      setNewWsName("");
      setIsModalOpen(false);
      refreshWorkspaces();
      setActiveWorkspace(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create", { id: t });
    }
  };

  const tc = dashboard?.taskCounts || {};
  const total = tc.total || 0;
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;

  if (loading) return (
    <AppShell>
      <DashboardSkeleton />
    </AppShell>
  );

  return (
    <AppShell>
      <div style={{ background: "#0F172A", minHeight: "100vh" }}>

        {/* ── Top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #1E293B", background: "#0F172A", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {activeWorkspace?.name || "Select a workspace"}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", margin: 0, fontFamily: "var(--font-display, Inter)" }}>Dashboard</h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NotificationBell/>
            {activeWorkspace && (
              <Link to={`/projects/${activeWorkspace._id}`} style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: "8px 14px", color: "#818cf8", fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>
                View Projects →
              </Link>
            )}
            <button onClick={() => setIsModalOpen(true)} style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <IconPlus size={14}/> New Workspace
            </button>
          </div>
        </div>

        {/* ── No workspace selected ── */}
        {!activeWorkspace ? (
          <div style={{ padding: 64, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Select a workspace to view your dashboard</div>
            <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>Choose from the sidebar, or create a new one to get started.</div>
            <button onClick={() => setIsModalOpen(true)} style={{ background: "#4F46E5", border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Create Workspace
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding: 32, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 120, background: "#1E293B", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i*0.1}s` }}/>)}
          </div>
        ) : (
          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 28 }}>

            {/* ── Task status cards ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#64748B", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Task Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} style={{ background: "#1E293B", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 12, padding: "20px 20px", position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: cfg.color, opacity: 0.7 }}/>
                    <div style={{ fontSize: 28, fontWeight: 900, color: cfg.color, fontFamily: "var(--font-display, Figtree)", lineHeight: 1 }}>{tc[key] || 0}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cfg.label}</div>
                    {total > 0 && (
                      <div style={{ marginTop: 12, height: 4, background: "rgba(51,65,85,0.5)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct(tc[key] || 0)}%`, background: cfg.color, borderRadius: 4, transition: "width 0.6s ease" }}/>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{pct(tc[key] || 0)}% of total</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Daily Standup Feed ── */}
            <StandupFeed
              workspaceId={activeWorkspace._id}
              currentUserId={currentUserId}
            />

            {/* ── Standup Heatmap ── */}
            <StandupHeatmap
              workspaceId={activeWorkspace._id}
              members={dashboard?.members || []}
              currentUserId={currentUserId}
            />

            {/* ── Body: Activity + Members + Channels ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

              {/* Activity feed */}
              <div style={{ background: "#1E293B", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <IconActivity/>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9" }}>Recent Activity</span>
                </div>
                {!dashboard?.recentActivity?.length ? (
                  <div style={{ fontSize: 13, color: "#64748B", padding: "20px 0", textAlign: "center" }}>No activity yet. Create tasks to get started!</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {dashboard.recentActivity.map((act, i) => (
                      <div key={act._id || i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < dashboard.recentActivity.length - 1 ? "1px solid #1E293B" : "none" }}>
                        <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{ACTIVITY_ICONS[act.type] || "📌"}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.5 }}>{activityText(act)}</div>
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{formatTime(act.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right col: Members + Channels */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Members */}
                <div style={{ background: "#1E293B", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 12, padding: "20px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <IconUsers/>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9" }}>Team</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748B" }}>{dashboard?.members?.length || 0} members</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(dashboard?.members || []).map(m => {
                      const roleStyle = ROLE_COLORS[m.role] || ROLE_COLORS.member;
                      return (
                        <div key={m._id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#312E81", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#C7D2FE", flexShrink: 0 }}>
                            {(m.name || "U")[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: roleStyle.bg, color: roleStyle.color, flexShrink: 0, letterSpacing: "0.04em" }}>
                            {roleStyle.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Channels */}
                <div style={{ background: "#1E293B", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 12, padding: "20px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <IconLogoSmall/>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9" }}>Channels</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748B" }}>{dashboard?.channels?.length || 0}</span>
                  </div>
                  {(!dashboard?.channels || dashboard.channels.length === 0) ? (
                    <div style={{ fontSize: 12, color: "#64748B", textAlign: "center", padding: "8px 0" }}>No channels yet — create one from the sidebar</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {dashboard.channels.map(ch => (
                        <Link key={ch._id} to={`/channels/${ch._id}?workspaceId=${activeWorkspace._id}`}
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94A3B8", textDecoration: "none", padding: "6px 8px", borderRadius: 8, transition: "all 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#253448"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >
                          <span style={{ color: "#64748B", fontSize: 14 }}>#</span> {ch.name}
                          {ch.isPrivate && <span style={{ fontSize: 10, color: "#fbbf24", marginLeft: "auto" }}>private</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Create Workspace Modal ── */}
        {isModalOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setIsModalOpen(false)}>
            <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 20, padding: 32, width: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", marginBottom: 6, fontFamily: "var(--font-display, Inter)" }}>New Workspace</div>
              <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24 }}>Give your team environment a memorable name.</p>
              <form onSubmit={createWorkspace}>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Workspace name</label>
                <input
                  autoFocus value={newWsName} onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Acme Studio…"
                  style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
                />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "1px solid #334155", borderRadius: 10, padding: "8px 16px", color: "#94A3B8", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancel</button>
                  <button type="submit" style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "8px 20px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Create →</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    </AppShell>
  );
}