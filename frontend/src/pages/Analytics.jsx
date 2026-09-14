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
function StatCard({ label, value, color = "#818cf8", sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "20px 24px",
      flex: "1 1 180px", minWidth: 160,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: 24, marginBottom: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

const CHART_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#a78bfa"];
const RANGE_OPTIONS = ["7d", "30d", "90d"];

const tooltipStyle = {
  contentStyle: { background: "#0d0f18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "rgba(255,255,255,0.5)" },
  itemStyle: { color: "#e2e8f0" },
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
      <div style={{
        padding: "28px 32px",
        maxWidth: 1200, margin: "0 auto", width: "100%",
        fontFamily: "Figtree, Inter, sans-serif",
        color: "#e2e8f0",
        minHeight: "100vh",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>📊 Analytics</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              {activeWorkspace?.name || "Workspace"} · Last {range}
            </div>
          </div>
          {/* Range selector */}
          <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            {RANGE_OPTIONS.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                background: range === r ? "rgba(99,102,241,0.25)" : "transparent",
                color: range === r ? "#818cf8" : "rgba(255,255,255,0.45)",
                fontWeight: 700, fontSize: 12, transition: "all 0.15s",
              }}>{r}</button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #818cf8", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }}/>
              Loading analytics…
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── Stat Cards ── */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard label="Total Tasks"   value={data.tasksByStatus.total}  color="#818cf8" />
              <StatCard label="Completed"     value={data.tasksByStatus.done}   color="#34d399" sub={`${pct}% completion rate`} />
              <StatCard label="In Progress"   value={data.tasksByStatus.inprogress} color="#fbbf24" />
              <StatCard label="Overdue"       value={data.overdueCount}         color="#f87171" sub="Past due date" />
              <StatCard label="Standup Rate"  value={`${data.standup?.averageRate || 0}%`} color="#38bdf8" sub={`${data.standup?.totalSubmissions || 0} check-ins`} />
            </div>

            {/* ── Standup Participation & Blockers Chart ── */}
            <Section title="☀️ Daily Standup Participation & Impediments">
              {!data.standup?.stats?.length ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: "24px 0", fontSize: 13 }}>
                  No standup entries submitted in this time range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.standup.stats}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="rate" domain={[0, 100]} unit="%" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />
                    <Line yAxisId="rate" type="monotone" dataKey="participationRate" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: "#38bdf8", r: 3 }} name="Participation Rate (%)" />
                    <Line yAxisId="count" type="monotone" dataKey="blockers" stroke="#f87171" strokeWidth={2} strokeDasharray="3 3" dot={{ fill: "#f87171", r: 3 }} name="Blockers Reported" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Section>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* ── Completed Over Time ── */}
              <Section title="✅ Tasks Completed Over Time">
                {data.completedOverTime.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: "20px 0", fontSize: 13 }}>No completed tasks in this range</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.completedOverTime}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 3 }} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>

              {/* ── Velocity by Member ── */}
              <Section title="⚡ Velocity by Member">
                {data.velocityByMember.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: "20px 0", fontSize: 13 }}>No completed tasks assigned in this range</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.velocityByMember} layout="vertical">
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="count" name="Tasks Done" fill="#818cf8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>

            {/* ── Burndown Chart ── */}
            <Section title="🔥 Burndown — Tasks Created vs Completed">
              {data.burndown.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: "20px 0", fontSize: 13 }}>No data in this range</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.burndown}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />
                    <Line type="monotone" dataKey="created"   stroke="#fbbf24" strokeWidth={2} dot={false} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="#34d399" strokeWidth={2} dot={false} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Section>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* ── Top Contributors ── */}
              <Section title="🏆 Top Contributors">
                {data.topContributors.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: "20px 0", fontSize: 13 }}>No activity yet</div>
                ) : data.topContributors.map((c, i) => (
                  <div key={c.userId} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: i < data.topContributors.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: CHART_COLORS[i % CHART_COLORS.length],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {c.tasksCompleted} tasks · {c.messages} msgs · {c.snippets} snippets
                      </div>
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 800,
                      color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#a78bfa",
                    }}>
                      {c.score} pts
                    </div>
                  </div>
                ))}
              </Section>

              {/* ── Overdue Tasks ── */}
              <Section title="⚠️ Overdue Tasks">
                {data.overdueList.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(52,211,153,0.7)", padding: "20px 0", fontSize: 13 }}>🎉 No overdue tasks!</div>
                ) : data.overdueList.map(t => (
                  <div key={t._id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#10b981",
                    }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "#f87171" }}>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
