import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import API from "../services/api";
import AppShell from "../components/AppShell";
import { useWorkspace } from "../context/WorkspaceContext";
import { toast } from "react-hot-toast";

/* ── Small stat card ───────────────────────────────────────────── */
function StatCard({ label, value, color = "var(--accent)", sub }) {
  return (
    <div className="bg-bg-surface border border-border rounded-3xl p-6 flex-1 min-w-[160px] shadow-xs flex flex-col justify-between">
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-extrabold tracking-tight" style={{ color }}>{value ?? "—"}</div>
      {sub && <div className="text-xs text-text-muted mt-2 font-mono">{sub}</div>}
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="bg-bg-surface border border-border rounded-3xl p-6 mb-5 shadow-xs">
      <div className="text-sm font-bold text-text-heading mb-5">{title}</div>
      {children}
    </div>
  );
}

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];
const RANGE_OPTIONS = ["7d", "30d", "90d"];

const tooltipStyle = {
  contentStyle: { background: "rgb(var(--bg-surface))", border: "1px solid rgb(var(--border))", borderRadius: 12, fontSize: 12, color: "rgb(var(--text-heading))", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" },
  labelStyle: { color: "rgb(var(--text-muted))" },
  itemStyle: { color: "rgb(var(--text-heading))" },
};

export default function Analytics() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, setActiveWorkspace, workspaces } = useWorkspace();

  const [range,   setRange]   = useState("30d");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Resolve active workspace from URL param
  useEffect(() => {
    if (!workspaceId) return;
    const ws = workspaces.find(w => w._id === workspaceId);
    if (ws && activeWorkspace?._id !== workspaceId) setActiveWorkspace(ws);
  }, [workspaceId, workspaces]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchAnalytics();
  }, [workspaceId, range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/analytics/workspace/${workspaceId}?range=${range}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const pct = data
    ? data.tasksByStatus.total > 0
      ? Math.round((data.tasksByStatus.done / data.tasksByStatus.total) * 100)
      : 0
    : 0;

  return (
    <AppShell>
      <div className="min-h-screen bg-bg-canvas text-text-heading transition-colors py-8 px-8">
        <div className="max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-2xl font-extrabold text-text-heading m-0 tracking-tight">📊 Telemetry & Analytics</h1>
              <div className="text-xs text-text-muted mt-1 font-mono">
                {activeWorkspace?.name || "Workspace"} • Last {range} window
              </div>
            </div>
            {/* Range selector */}
            <div className="flex gap-1 bg-bg-surface p-1 rounded-2xl border border-border">
              {RANGE_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer transition ${
                    range === r
                      ? "bg-accent text-white border-accent shadow-xs"
                      : "bg-transparent border-transparent text-text-muted hover:text-text-heading"
                  }`}
                >{r}</button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center h-72 text-text-muted text-sm">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-border border-t-accent rounded-full animate-spin mx-auto mb-3" />
                Loading analytics…
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* ── Stat Cards ── */}
              <div className="flex gap-4 flex-wrap mb-5">
                <StatCard label="Total Tasks"   value={data.tasksByStatus.total}  color="rgb(var(--accent))" />
                <StatCard label="Completed"     value={data.tasksByStatus.done}   color="#10b981" sub={`${pct}% completion rate`} />
                <StatCard label="In Progress"   value={data.tasksByStatus.inprogress} color="#f59e0b" />
                <StatCard label="Overdue"       value={data.overdueCount}         color="#ef4444" sub="Past due date" />
                <StatCard label="Standup Rate"  value={`${data.standup?.averageRate || 0}%`} color="#0ea5e9" sub={`${data.standup?.totalSubmissions || 0} check-ins`} />
              </div>

              {/* ── Standup Participation & Blockers Chart ── */}
              <Section title="☀️ Daily Standup Participation & Impediments">
                {!data.standup?.stats?.length ? (
                  <div className="text-center text-text-muted py-6 text-xs border border-dashed border-border rounded-2xl">
                    No standup entries submitted in this time range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.standup.stats}>
                      <CartesianGrid stroke="rgb(var(--border) / 0.5)" />
                      <XAxis dataKey="date" tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="rate" domain={[0, 100]} unit="%" tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "rgb(var(--text-muted))" }} />
                      <Line yAxisId="rate" type="monotone" dataKey="participationRate" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: "#0ea5e9", r: 3 }} name="Participation Rate (%)" />
                      <Line yAxisId="count" type="monotone" dataKey="blockers" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={{ fill: "#ef4444", r: 3 }} name="Blockers Reported" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* ── Completed Over Time ── */}
                <Section title="✅ Tasks Completed Over Time">
                  {data.completedOverTime.length === 0 ? (
                    <div className="text-center text-text-muted py-6 text-xs border border-dashed border-border rounded-2xl">No completed tasks in this range</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={data.completedOverTime}>
                        <CartesianGrid stroke="rgb(var(--border) / 0.5)" />
                        <XAxis dataKey="date" tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Completed" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Section>

                {/* ── Velocity by Member ── */}
                <Section title="⚡ Velocity by Member">
                  {data.velocityByMember.length === 0 ? (
                    <div className="text-center text-text-muted py-6 text-xs border border-dashed border-border rounded-2xl">No completed tasks assigned in this range</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.velocityByMember} layout="vertical">
                        <CartesianGrid stroke="rgb(var(--border) / 0.5)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "rgb(var(--text-body))", fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="count" name="Tasks Done" fill="rgb(var(--accent))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Section>
              </div>

              {/* ── Burndown Chart ── */}
              <Section title="🔥 Burndown — Tasks Created vs Completed">
                {data.burndown.length === 0 ? (
                  <div className="text-center text-text-muted py-6 text-xs border border-dashed border-border rounded-2xl">No data in this range</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.burndown}>
                      <CartesianGrid stroke="rgb(var(--border) / 0.5)" />
                      <XAxis dataKey="date" tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "rgb(var(--text-muted))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "rgb(var(--text-muted))" }} />
                      <Line type="monotone" dataKey="created"   stroke="#f59e0b" strokeWidth={2} dot={false} name="Created" />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* ── Top Contributors ── */}
                <Section title="🏆 Top Contributors">
                  {data.topContributors.length === 0 ? (
                    <div className="text-center text-text-muted py-6 text-xs border border-dashed border-border rounded-2xl">No activity yet</div>
                  ) : data.topContributors.map((c, i) => (
                    <div
                      key={c.userId}
                      className={`flex items-center gap-3 py-2.5 ${
                        i < data.topContributors.length - 1 ? "border-b border-border/50" : ""
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text-heading">{c.name}</div>
                        <div className="text-[10px] text-text-muted">
                          {c.tasksCompleted} tasks · {c.messages} msgs · {c.snippets} snippets
                        </div>
                      </div>
                      <div
                        className="text-xs font-bold font-mono"
                        style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#a855f7" }}
                      >
                        {c.score} pts
                      </div>
                    </div>
                  ))}
                </Section>

                {/* ── Overdue Tasks ── */}
                <Section title="⚠️ Overdue Tasks">
                  {data.overdueList.length === 0 ? (
                    <div className="text-center text-emerald-500 py-6 text-xs border border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                      🎉 No overdue tasks! All sprints are on schedule.
                    </div>
                  ) : data.overdueList.map((t, i) => (
                    <div
                      key={t._id}
                      className={`flex items-center gap-2.5 py-2.5 ${
                        i < data.overdueList.length - 1 ? "border-b border-border/50" : ""
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#10b981" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-heading truncate">{t.title}</div>
                        <div className="text-[10px] text-rose-500 font-mono">
                          Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                          {t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </Section>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
