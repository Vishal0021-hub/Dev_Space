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
import StandupModal from "../components/StandupModal";
import { getStoredUser } from "../utils/auth";
import { Mail, TrendingUp, CheckCircle, Flame, Plus, Briefcase, Users, Activity } from "lucide-react";

/* ─── Role & Status Color Configs ────────────────────────────── */
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
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [newWsName,     setNewWsName]     = useState("");

  const currentUser = getStoredUser();
  const currentUserId = currentUser?._id;

  /* Load dashboard when active workspace changes */
  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchDashboard(activeWorkspace._id);
    } else if (workspaces?.length > 0) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [activeWorkspace?._id, workspaces]);

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
      const res = await API.post("/workspaces", { name: newWsName.trim() });
      toast.success("Workspace created!", { id: t });
      setNewWsName("");
      setIsModalOpen(false);
      await refreshWorkspaces();
      setActiveWorkspace(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create", { id: t });
    }
  };

  const tc = dashboard?.taskCounts || {};
  const total = tc.total || 0;
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

  if (loading && !dashboard) return (
    <AppShell>
      <DashboardSkeleton />
    </AppShell>
  );

  return (
    <AppShell>
      <div className="bg-bg-canvas min-h-screen text-text-heading transition-colors select-none">

        {/* ── Sub-header matching prototype ── */}
        <div className="px-6 py-2.5 border-b border-border bg-black/5 dark:bg-black/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-sm tracking-tight text-text-heading">
              Workspace Telemetry & Standups
            </span>
            <span className="opacity-30">|</span>
            <span className="text-text-muted text-xs">
              {activeWorkspace?.name || "Workspace"} • Live Metrics
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-brand-accent px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={13} />
              <span>New Workspace</span>
            </button>
          </div>
        </div>

        {/* ── BENTO TELEMETRY HUB ── */}
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* 1. Velocity Engine Card (Dynamic Real Database Stats) */}
            <div className="saas-card md:col-span-2 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider brand-accent-text">
                    Sprint Velocity & Execution
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-border">
                    {pct(tc.done || 0)}% Completed
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-1 text-text-heading">
                  {total > 0
                    ? `${tc.done || 0} of ${total} Tasks Shipped`
                    : "No Tasks Created Yet"}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {total > 0
                    ? `${tc.inprogress || 0} in progress, ${tc.review || 0} in review, ${tc.todo || 0} remaining in backlog.`
                    : "Create project boards and tasks to generate live sprint velocity telemetry."}
                </p>
              </div>

              {/* Dynamic Proportional Bars */}
              <div className="h-28 flex items-end gap-3 pt-4">
                <div
                  className="flex-1 bg-slate-500/20 rounded-xl transition-all duration-500 flex flex-col justify-end p-2"
                  style={{ height: total > 0 ? `${Math.max(16, pct(tc.todo || 0))}%` : "30%" }}
                  title={`To Do: ${tc.todo || 0} tasks (${pct(tc.todo || 0)}%)`}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400">{tc.todo || 0}</span>
                </div>
                <div
                  className="flex-1 bg-amber-500/20 rounded-xl transition-all duration-500 flex flex-col justify-end p-2"
                  style={{ height: total > 0 ? `${Math.max(16, pct(tc.inprogress || 0))}%` : "45%" }}
                  title={`In Progress: ${tc.inprogress || 0} tasks (${pct(tc.inprogress || 0)}%)`}
                >
                  <span className="text-[10px] font-mono font-bold text-amber-500">{tc.inprogress || 0}</span>
                </div>
                <div
                  className="flex-1 bg-indigo-500/20 rounded-xl transition-all duration-500 flex flex-col justify-end p-2"
                  style={{ height: total > 0 ? `${Math.max(16, pct(tc.review || 0))}%` : "35%" }}
                  title={`Review: ${tc.review || 0} tasks (${pct(tc.review || 0)}%)`}
                >
                  <span className="text-[10px] font-mono font-bold text-indigo-400">{tc.review || 0}</span>
                </div>
                <div
                  className="flex-1 brand-accent-bg rounded-xl shadow-lg transition-all duration-500 flex flex-col justify-end p-2"
                  style={{ height: total > 0 ? `${Math.max(16, pct(tc.done || 0))}%` : "60%" }}
                  title={`Done: ${tc.done || 0} tasks (${pct(tc.done || 0)}%)`}
                >
                  <span className="text-[10px] font-mono font-bold" style={{ color: "var(--accent-contrast)" }}>{tc.done || 0}</span>
                </div>
              </div>

              <div className="flex justify-between text-xs text-text-muted mt-3 font-mono">
                <span>To Do</span>
                <span>In Progress</span>
                <span>Review</span>
                <span className="brand-accent-text font-bold">Done (Shipped)</span>
              </div>
            </div>

            {/* 2. Standup Streak & Action Card */}
            <div className="saas-card p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Daily Team Standup
                </span>
                <h3 className="text-xl font-bold mt-1 text-text-heading">
                  Async Standup
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Post what you accomplished, today's focus, and report blockers for sprint tracking.
                </p>
              </div>

              <div className="my-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-border">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>Workspace Standup</span>
                  <span className="text-emerald-500 font-mono text-[10px]">Active</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Keep teammates aligned asynchronously without scheduling disruptive meetings.
                </p>
              </div>

              <button
                onClick={() => setIsStandupOpen(true)}
                className="w-full py-2.5 rounded-xl btn-brand-accent text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Post Daily Standup</span>
              </button>
            </div>

          </div>

          {/* ── Status Breakdown Grid (Dynamic Real Counts) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div
                key={key}
                className="saas-card p-4 flex flex-col justify-between transition relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-[10px] font-mono text-text-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md border border-border">
                    {total > 0 ? `${pct(tc[key] || 0)}%` : "0%"}
                  </span>
                </div>
                <div>
                  <div
                    className="text-2xl font-extrabold group-hover:brand-accent-text transition text-text-heading"
                  >
                    {tc[key] || 0}
                  </div>
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-0.5">
                    {cfg.label}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${total > 0 ? pct(tc[key] || 0) : 0}%`,
                      backgroundColor: cfg.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── Standup Feed & Heatmap (Real Dynamic Components) ── */}
          {activeWorkspace?._id && (
            <>
              <StandupFeed
                workspaceId={activeWorkspace._id}
                currentUserId={currentUserId}
              />
              <StandupHeatmap
                workspaceId={activeWorkspace._id}
                members={dashboard?.members || []}
                currentUserId={currentUserId}
              />
            </>
          )}

          {/* ── Body: Activity Stream + Members + Channels ── */}
          {activeWorkspace?._id && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Activity feed (Span 8) */}
              <div className="lg:col-span-8 saas-card p-6 shadow-xs">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-bold text-text-heading">Activity Stream</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">Live Workspace Events</span>
                </div>
                {!dashboard?.recentActivity?.length ? (
                  <div className="text-xs text-text-muted py-10 text-center border border-dashed border-border rounded-2xl">
                    No activity yet. Create tasks, projects, or invite teammates to get started!
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {dashboard.recentActivity.map((act, i) => (
                      <div
                        key={act._id || i}
                        className={`flex items-start gap-3 py-3 ${
                          i < dashboard.recentActivity.length - 1 ? "border-b border-border/50" : ""
                        }`}
                      >
                        <span className="text-xl shrink-0 p-1.5 bg-bg-canvas border border-border rounded-xl">
                          {ACTIVITY_ICONS[act.type] || "📌"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-heading leading-relaxed">
                            {activityText(act)}
                          </div>
                          <div className="text-[10px] font-mono text-text-muted mt-1">
                            {formatTime(act.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar stats (Span 4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">

                {/* Team members */}
                <div className="saas-card p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-text-muted" />
                      <span className="text-sm font-bold text-text-heading">Team</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">
                      {dashboard?.members?.length || 0} members
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {(dashboard?.members || []).slice(0, 5).map(m => {
                      const role = ROLE_COLORS[m.role] || ROLE_COLORS.member;
                      return (
                        <div key={m._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-bg-canvas transition">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent/20 border border-border text-accent font-bold text-xs flex items-center justify-center ring-2 ring-bg-surface">
                              {(m.name || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-heading">{m.name || "Unknown"}</div>
                              <div className="text-[10px] text-text-muted">{m.email || ""}</div>
                            </div>
                          </div>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: role.bg, color: role.color }}
                          >
                            {role.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Channels quick list */}
                <div className="saas-card p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-text-heading">Channels</span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {dashboard?.channels?.length || 0} total
                    </span>
                  </div>
                  {!dashboard?.channels?.length ? (
                    <div className="text-xs text-text-muted py-4 text-center">No channels yet</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {dashboard.channels.map(c => (
                        <Link
                          key={c._id}
                          to={`/channels/${c._id}?workspaceId=${activeWorkspace._id}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-text-heading hover:bg-bg-canvas no-underline transition"
                        >
                          <span className="text-text-muted font-bold">#</span>
                          <span className="font-semibold truncate">{c.name}</span>
                          {c.isPrivate && (
                            <span className="text-[10px] text-amber-500 ml-auto bg-amber-500/10 px-1.5 py-0.5 rounded">
                              private
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

        {/* ── Create Workspace Modal ── */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="saas-card p-7 w-full max-w-sm shadow-2xl text-text-heading animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-lg font-bold text-text-heading mb-1">New Workspace</div>
              <p className="text-xs text-text-muted mb-5">Give your team environment a memorable name.</p>
              <form onSubmit={createWorkspace}>
                <label className="text-[11px] font-bold text-text-muted block mb-1.5 uppercase tracking-wider">
                  Workspace name
                </label>
                <input
                  autoFocus
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Engineering Space…"
                  className="w-full bg-bg-canvas border border-border rounded-xl px-3.5 py-2.5 text-text-heading placeholder-text-muted/50 text-sm outline-none mb-5 focus:border-accent transition"
                />
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-transparent border border-border rounded-xl px-4 py-2 text-text-muted hover:text-text-heading cursor-pointer text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-brand-accent rounded-xl px-5 py-2 cursor-pointer text-xs font-bold transition shadow-sm"
                  >
                    Create →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Standup Modal ── */}
        {isStandupOpen && activeWorkspace?._id && (
          <StandupModal
            workspaceId={activeWorkspace._id}
            onClose={() => setIsStandupOpen(false)}
            onSuccess={() => {
              setIsStandupOpen(false);
              fetchDashboard(activeWorkspace._id);
            }}
          />
        )}

      </div>
    </AppShell>
  );
}