import { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import StandupModal from "./StandupModal";

const C = {
  bgBase: "#0F172A",
  bgCard: "#1E293B",
  bgElevated: "#253448",
  border: "#334155",
  borderLight: "rgba(255, 255, 255, 0.08)",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accent: "#6366F1",
  accentHover: "#4F46E5",
  danger: "#EF4444",
  dangerBg: "rgba(239, 68, 68, 0.12)",
  warning: "#F59E0B",
  success: "#10B981",
  successBg: "rgba(16, 185, 129, 0.12)",
};

const TASK_STATUS_COLORS = {
  todo: "#94a3b8",
  inprogress: "#fbbf24",
  review: "#818cf8",
  done: "#34d399",
};

export default function StandupFeed({ workspaceId, currentUserId }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [activeTab, setActiveTab] = useState("submitted"); // "submitted" | "missing"
  const [entries, setEntries] = useState([]);
  const [missingData, setMissingData] = useState({ missing: [], total: 0, submitted: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [hasMyEntry, setHasMyEntry] = useState(false);

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const fetchFeedData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [entriesRes, missingRes] = await Promise.all([
        API.get(`/standup/entries/${workspaceId}?date=${selectedDate}`),
        API.get(`/standup/entries/${workspaceId}/missing?date=${selectedDate}`),
      ]);

      const fetchedEntries = entriesRes.data || [];
      setEntries(fetchedEntries);
      setMissingData(missingRes.data || { missing: [], total: 0, submitted: 0 });

      // Check if current user has an entry
      const myEntry = fetchedEntries.find(
        (e) => (e.userId?._id || e.userId) === currentUserId
      );
      setHasMyEntry(!!myEntry);
    } catch (err) {
      console.error("Failed to load standup feed:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedDate, currentUserId]);

  useEffect(() => {
    fetchFeedData();
  }, [fetchFeedData]);

  const changeDay = (delta) => {
    const d = new Date(selectedDate + "T12:00:00Z");
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const formattedDateTitle = (() => {
    const d = new Date(selectedDate + "T12:00:00Z");
    if (isToday) return `Today • ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  })();

  const completionPct = missingData.total
    ? Math.round((missingData.submitted / missingData.total) * 100)
    : 0;

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
      {/* Feed Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>☀️</span>
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
              Daily Standup Feed
            </h3>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Async team check-ins & blockers
            </div>
          </div>
        </div>

        {/* Date Selector & Action */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "3px 6px",
            }}
          >
            <button
              onClick={() => changeDay(-1)}
              style={{
                background: "none",
                border: "none",
                color: C.textSecondary,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 12,
              }}
              title="Previous Day"
            >
              ◀
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textPrimary,
                padding: "0 6px",
              }}
            >
              {formattedDateTitle}
            </span>
            <button
              onClick={() => changeDay(1)}
              disabled={isToday}
              style={{
                background: "none",
                border: "none",
                color: isToday ? "rgba(255,255,255,0.15)" : C.textSecondary,
                cursor: isToday ? "not-allowed" : "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 12,
              }}
              title="Next Day"
            >
              ▶
            </button>
          </div>

          {isToday && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: hasMyEntry ? "rgba(99, 102, 241, 0.15)" : C.accent,
                border: hasMyEntry ? "1px solid rgba(99, 102, 241, 0.3)" : "none",
                color: hasMyEntry ? "#a5b4fc" : "#fff",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {hasMyEntry ? "✏️ Edit My Standup" : "✨ Post Standup"}
            </button>
          )}
        </div>
      </div>

      {/* Progress overview */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${C.borderLight}`,
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Participation:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>
            {missingData.submitted} of {missingData.total} submitted ({completionPct}%)
          </span>
        </div>
        <div
          style={{
            width: 140,
            height: 6,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${completionPct}%`,
              background: completionPct === 100 ? C.success : C.accent,
              borderRadius: 6,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => setActiveTab("submitted")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "submitted" ? `2px solid ${C.accent}` : "2px solid transparent",
            color: activeTab === "submitted" ? C.accent : C.textSecondary,
            fontSize: 13,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Submitted ({entries.length})
        </button>
        <button
          onClick={() => setActiveTab("missing")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "missing" ? `2px solid ${C.warning}` : "2px solid transparent",
            color: activeTab === "missing" ? C.warning : C.textSecondary,
            fontSize: 13,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Missing ({missingData.missing?.length || 0})
        </button>
      </div>

      {/* Feed Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 80,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : activeTab === "submitted" ? (
        /* Submitted Entries List */
        entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: C.textMuted,
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>☕</div>
            No standup submissions yet for {isToday ? "today" : selectedDate}.
            {isToday && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    background: C.accent,
                    border: "none",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "6px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Be the first to post!
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {entries.map((entry) => {
              const u = entry.userId || {};
              const initial = (u.name || "U")[0].toUpperCase();
              const hasBlockers = entry.blockers && entry.blockers.length > 0;

              return (
                <div
                  key={entry._id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${hasBlockers ? "rgba(239,68,68,0.3)" : C.borderLight}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* User info & Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#312E81",
                          color: "#C7D2FE",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initial}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
                          {u.name || "Unknown Member"}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>
                          Submitted at {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    {hasBlockers && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#f87171",
                          borderRadius: 20,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        🚩 {entry.blockers.length} Blocker{entry.blockers.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Answers */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {entry.answers?.map((ans, idx) => (
                      <div key={idx}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: 2,
                          }}
                        >
                          {ans.question}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: C.textPrimary,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {ans.answer || <span style={{ color: C.textMuted }}>No response</span>}
                        </div>

                        {/* Linked Tasks */}
                        {ans.linkedTasks && ans.linkedTasks.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                            {ans.linkedTasks.map((t) => {
                              const tObj = typeof t === "object" ? t : { title: t };
                              return (
                                <span
                                  key={tObj._id || tObj.title}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    background: "rgba(99,102,241,0.1)",
                                    border: "1px solid rgba(99,102,241,0.2)",
                                    borderRadius: 6,
                                    padding: "2px 7px",
                                    fontSize: 11,
                                    color: "#a5b4fc",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: "50%",
                                      background: TASK_STATUS_COLORS[tObj.status] || "#94a3b8",
                                    }}
                                  />
                                  {tObj.title}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Blockers alert box */}
                    {hasBlockers && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: "10px 12px",
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#f87171",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: 4,
                          }}
                        >
                          Active Impediment
                        </div>
                        {entry.blockers.map((b, bIdx) => (
                          <div key={bIdx} style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.4 }}>
                            • {b.description}
                            {b.taskId && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  background: "rgba(0,0,0,0.3)",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  color: "#cbd5e1",
                                }}
                              >
                                Linked: {b.taskId.title || "Task"}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Missing Members List */
        !missingData.missing?.length ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: C.success,
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
            Everyone on the team has submitted their standup for {isToday ? "today" : selectedDate}!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missingData.missing.map((m) => (
              <div
                key={m._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                      color: C.textSecondary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {(m.name || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{m.email}</div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    color: C.warning,
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  Pending
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Standup Modal */}
      {showModal && (
        <StandupModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchFeedData();
          }}
        />
      )}
    </div>
  );
}
