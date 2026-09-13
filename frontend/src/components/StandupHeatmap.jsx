import { useState, useEffect, useMemo } from "react";
import API from "../services/api";

const C = {
  bgBase: "#0F172A",
  bgCard: "#1E293B",
  border: "#334155",
  borderLight: "rgba(255, 255, 255, 0.08)",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accent: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StandupHeatmap({ workspaceId, members = [], currentUserId }) {
  const [selectedUserId, setSelectedUserId] = useState(currentUserId || "");
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!selectedUserId && currentUserId) {
      setSelectedUserId(currentUserId);
    }
  }, [currentUserId, selectedUserId]);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchHeatmap() {
      try {
        setLoading(true);
        const url = selectedUserId
          ? `/standup/entries/${workspaceId}/history?userId=${selectedUserId}&days=90`
          : `/standup/entries/${workspaceId}/history?days=90`;
        const res = await API.get(url);
        if (isMounted) {
          setHeatmapData(res.data?.heatmap || {});
        }
      } catch (err) {
        console.error("Failed to load standup heatmap:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHeatmap();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, selectedUserId]);

  // Generate 90 days grid grouped by weeks
  const { weeks, stats } = useMemo(() => {
    const today = new Date();
    const daysList = [];
    const numDays = 91; // ~13 weeks

    let totalSubmissions = 0;
    let totalBlockers = 0;

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = heatmapData[dateStr];

      if (entry?.submitted) {
        totalSubmissions++;
        if (entry.blockerCount > 0) totalBlockers++;
      }

      daysList.push({
        date: dateStr,
        dayOfWeek: d.getDay(),
        submitted: !!entry?.submitted,
        blockerCount: entry?.blockerCount || 0,
        displayDate: d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      });
    }

    // Group into columns of 7 days (weeks)
    const weekCols = [];
    let currentWeek = [];

    // Pad the first week if not Sunday
    const firstDayOfWeek = daysList[0]?.dayOfWeek || 0;
    for (let p = 0; p < firstDayOfWeek; p++) {
      currentWeek.push(null);
    }

    for (const day of daysList) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weekCols.push(currentWeek);
    }

    // Calculate current streak
    let streak = 0;
    for (let i = daysList.length - 1; i >= 0; i--) {
      const d = daysList[i];
      // Skip weekends from breaking streak if desired, or simple consecutive count
      if (d.submitted) {
        streak++;
      } else if (d.dayOfWeek !== 0 && d.dayOfWeek !== 6 && i < daysList.length - 1) {
        break;
      }
    }

    return {
      weeks: weekCols,
      stats: {
        totalSubmissions,
        totalBlockers,
        streak,
        rate: Math.round((totalSubmissions / numDays) * 100),
      },
    };
  }, [heatmapData]);

  const getCellColor = (day) => {
    if (!day) return "transparent";
    if (!day.submitted) return "rgba(255, 255, 255, 0.04)";
    if (day.blockerCount > 0) return C.warning;
    return C.success;
  };

  return (
    <div
      style={{
        background: C.bgCard,
        border: "1px solid rgba(51,65,85,0.5)",
        borderRadius: 14,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header with Member selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.textPrimary,
              margin: 0,
              fontFamily: "Figtree, sans-serif",
            }}
          >
            📊 Standup Consistency (Last 90 Days)
          </h3>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            Team member check-in frequency and impediment distribution
          </div>
        </div>

        {members.length > 0 && (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              color: C.textPrimary,
              fontSize: 12,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={currentUserId}>My History</option>
            {members
              .filter((m) => m._id !== currentUserId)
              .map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${C.borderLight}`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: C.textMuted }}>Total Check-ins</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, marginTop: 2 }}>
            {stats.totalSubmissions}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${C.borderLight}`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: C.textMuted }}>Current Streak</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.success, marginTop: 2 }}>
            {stats.streak} day{stats.streak === 1 ? "" : "s"} 🔥
          </div>
        </div>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${C.borderLight}`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: C.textMuted }}>Blockers Reported</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.warning, marginTop: 2 }}>
            {stats.totalBlockers}
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div
        style={{
          position: "relative",
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {loading ? (
          <div
            style={{
              height: 100,
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 8,
              animation: "pulse 1.5s infinite",
            }}
          />
        ) : (
          <div style={{ display: "flex", gap: 3, minWidth: "max-content" }}>
            {/* Day of week labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                marginRight: 6,
              }}
            >
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  style={{
                    height: 11,
                    fontSize: 9,
                    color: i % 2 === 1 ? C.textMuted : "transparent",
                    lineHeight: "11px",
                    width: 22,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wIdx) => (
              <div
                key={wIdx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {week.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    onMouseEnter={(e) => {
                      if (day) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          text: `${day.displayDate}: ${
                            day.submitted
                              ? day.blockerCount > 0
                                ? `Submitted (${day.blockerCount} blocker)`
                                : "Submitted"
                              : "No submission"
                          }`,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2.5,
                      background: getCellColor(day),
                      cursor: day ? "pointer" : "default",
                      transition: "transform 0.1s ease",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          fontSize: 11,
          color: C.textMuted,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.borderLight}`,
            }}
          />
          No Entry
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: C.success,
            }}
          />
          Submitted
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: C.warning,
            }}
          />
          With Blocker
        </span>
      </div>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "#020617",
            border: "1px solid #475569",
            color: "#f8fafc",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
