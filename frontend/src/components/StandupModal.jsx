import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import API from "../services/api";

const C = {
  bgBase: "rgb(var(--bg-canvas))",
  bgCard: "rgb(var(--bg-surface))",
  bgElevated: "rgb(var(--bg-surface-elevated))",
  border: "rgb(var(--border))",
  borderLight: "rgb(var(--border) / 0.5)",
  textPrimary: "rgb(var(--text-heading))",
  textSecondary: "rgb(var(--text-body))",
  textMuted: "rgb(var(--text-muted))",
  accent: "rgb(var(--accent))",
  accentHover: "rgb(var(--accent-hover))",
  danger: "#EF4444",
  dangerBg: "rgba(239, 68, 68, 0.12)",
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.12)",
  success: "#10B981",
};

const DEFAULT_QUESTIONS = [
  "What did you accomplish yesterday?",
  "What are you working on today?",
  "Any blockers or impediments?",
];

const STATUS_COLORS = {
  todo: "#94a3b8",
  inprogress: "#fbbf24",
  review: "#818cf8",
  done: "#34d399",
};

export default function StandupModal({ workspaceId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingEntry, setExistingEntry] = useState(null);
  const [workspaceTasks, setWorkspaceTasks] = useState([]);
  
  // Standup Questions & Answers
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [answer1, setAnswer1] = useState("");
  const [tasks1, setTasks1] = useState([]);
  const [answer2, setAnswer2] = useState("");
  const [tasks2, setTasks2] = useState([]);

  // Blocker Section
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blockerText, setBlockerText] = useState("");
  const [blockerTaskId, setBlockerTaskId] = useState("");

  // Search filter for task pickers
  const [pickerOpen, setPickerOpen] = useState(null); // "q1" | "q2" | null
  const [taskSearch, setTaskSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch standup config
        const configPromise = API.get(`/standup/config/${workspaceId}`).catch(() => null);
        // 2. Fetch my entry for today
        const myEntryPromise = API.get(`/standup/entries/${workspaceId}/me`).catch(() => null);
        // 3. Fetch workspace tasks
        const tasksPromise = API.get(`/tasks/workspace/${workspaceId}`).catch(() => null);

        const [configRes, entryRes, tasksRes] = await Promise.all([
          configPromise,
          myEntryPromise,
          tasksPromise,
        ]);

        if (!isMounted) return;

        if (configRes?.data?.questions?.length) {
          setQuestions(configRes.data.questions);
        }

        if (tasksRes?.data) {
          setWorkspaceTasks(tasksRes.data);
        }

        if (entryRes?.data) {
          const entry = entryRes.data;
          setExistingEntry(entry);
          
          if (entry.answers?.[0]) {
            setAnswer1(entry.answers[0].answer || "");
            setTasks1(entry.answers[0].linkedTasks || []);
          }
          if (entry.answers?.[1]) {
            setAnswer2(entry.answers[1].answer || "");
            setTasks2(entry.answers[1].linkedTasks || []);
          }
          if (entry.blockers?.length > 0) {
            setHasBlocker(true);
            setBlockerText(entry.blockers[0].description || "");
            setBlockerTaskId(
              entry.blockers[0].taskId?._id || entry.blockers[0].taskId || ""
            );
          }
        }
      } catch (err) {
        console.error("Failed to load standup data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (workspaceId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const toggleTaskForQ = (qIndex, task) => {
    if (qIndex === 1) {
      setTasks1((prev) =>
        prev.some((t) => (t._id || t) === task._id)
          ? prev.filter((t) => (t._id || t) !== task._id)
          : [...prev, task]
      );
    } else {
      setTasks2((prev) =>
        prev.some((t) => (t._id || t) === task._id)
          ? prev.filter((t) => (t._id || t) !== task._id)
          : [...prev, task]
      );
    }
  };

  const removeTaskFromQ = (qIndex, taskId) => {
    if (qIndex === 1) {
      setTasks1((prev) => prev.filter((t) => (t._id || t) !== taskId));
    } else {
      setTasks2((prev) => prev.filter((t) => (t._id || t) !== taskId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer1.trim() && !answer2.trim()) {
      toast.error("Please fill in at least yesterday or today's progress");
      return;
    }

    if (hasBlocker && !blockerText.trim()) {
      toast.error("Please describe your blocker");
      return;
    }

    try {
      setSubmitting(true);
      const answers = [
        {
          question: questions[0] || DEFAULT_QUESTIONS[0],
          answer: answer1.trim(),
          linkedTasks: tasks1.map((t) => t._id || t),
        },
        {
          question: questions[1] || DEFAULT_QUESTIONS[1],
          answer: answer2.trim(),
          linkedTasks: tasks2.map((t) => t._id || t),
        },
      ];

      const blockers =
        hasBlocker && blockerText.trim()
          ? [
              {
                description: blockerText.trim(),
                taskId: blockerTaskId || null,
              },
            ]
          : [];

      const res = await API.post("/standup/entries", {
        workspaceId,
        answers,
        blockers,
      });

      toast.success(
        existingEntry
          ? "Standup updated successfully!"
          : "Daily standup submitted! 🎉"
      );

      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit standup");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const filteredTasks = workspaceTasks.filter((t) =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase())
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "28px 32px",
          width: 640,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          position: "relative",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: C.textPrimary,
                  margin: 0,
                  fontFamily: "Figtree, sans-serif",
                }}
              >
                Daily Standup
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                {formattedDate}
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: C.textSecondary,
                margin: 0,
              }}
            >
              {existingEntry
                ? "You have already submitted for today. Editing will update your entry."
                : "Share what you've done, what's next, and any blockers with your team."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              fontSize: 20,
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "20px 0",
            }}
          >
            <div
              style={{
                height: 90,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
              }}
            />
            <div
              style={{
                height: 90,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Question 1: Yesterday */}
            <div style={{ marginBottom: 22 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textPrimary,
                  marginBottom: 6,
                }}
              >
                1. {questions[0] || DEFAULT_QUESTIONS[0]}
              </label>
              <textarea
                value={answer1}
                onChange={(e) => setAnswer1(e.target.value)}
                placeholder="What did you complete or make progress on?"
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: C.textPrimary,
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />

              {/* Task Chips for Q1 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {tasks1.map((t) => {
                  const id = t._id || t;
                  const fullTask =
                    workspaceTasks.find((wt) => wt._id === id) || t;
                  return (
                    <span
                      key={id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(99, 102, 241, 0.12)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        borderRadius: 8,
                        padding: "3px 8px",
                        fontSize: 11,
                        color: "#a5b4fc",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            STATUS_COLORS[fullTask.status] || "#94a3b8",
                        }}
                      />
                      {fullTask.title}
                      <button
                        type="button"
                        onClick={() => removeTaskFromQ(1, id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#a5b4fc",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 12,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(pickerOpen === "q1" ? null : "q1");
                    setTaskSearch("");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: `1px dashed ${C.border}`,
                    borderRadius: 8,
                    padding: "3px 10px",
                    color: C.textSecondary,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = C.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.04)";
                    e.currentTarget.style.color = C.textSecondary;
                  }}
                >
                  + Link Task
                </button>
              </div>

              {/* Task Picker Dropdown for Q1 */}
              {pickerOpen === "q1" && (
                <div
                  style={{
                    marginTop: 8,
                    background: C.bgElevated,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 8,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search tasks…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: C.bgBase,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.textPrimary,
                      fontSize: 12,
                      outline: "none",
                      marginBottom: 6,
                      boxSizing: "border-box",
                    }}
                  />
                  {filteredTasks.length === 0 ? (
                    <div
                      style={{
                        padding: 8,
                        color: C.textMuted,
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      No tasks found
                    </div>
                  ) : (
                    filteredTasks.slice(0, 15).map((t) => {
                      const isSelected = tasks1.some(
                        (x) => (x._id || x) === t._id
                      );
                      return (
                        <div
                          key={t._id}
                          onClick={() => toggleTaskForQ(1, t)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            color: isSelected ? "#818cf8" : C.textPrimary,
                            background: isSelected
                              ? "rgba(99,102,241,0.15)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.title}
                          </span>
                          {isSelected && <span>✓</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Question 2: Today */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textPrimary,
                  marginBottom: 6,
                }}
              >
                2. {questions[1] || DEFAULT_QUESTIONS[1]}
              </label>
              <textarea
                value={answer2}
                onChange={(e) => setAnswer2(e.target.value)}
                placeholder="What are your goals or planned tasks for today?"
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: C.textPrimary,
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />

              {/* Task Chips for Q2 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {tasks2.map((t) => {
                  const id = t._id || t;
                  const fullTask =
                    workspaceTasks.find((wt) => wt._id === id) || t;
                  return (
                    <span
                      key={id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(99, 102, 241, 0.12)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        borderRadius: 8,
                        padding: "3px 8px",
                        fontSize: 11,
                        color: "#a5b4fc",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            STATUS_COLORS[fullTask.status] || "#94a3b8",
                        }}
                      />
                      {fullTask.title}
                      <button
                        type="button"
                        onClick={() => removeTaskFromQ(2, id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#a5b4fc",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 12,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(pickerOpen === "q2" ? null : "q2");
                    setTaskSearch("");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: `1px dashed ${C.border}`,
                    borderRadius: 8,
                    padding: "3px 10px",
                    color: C.textSecondary,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = C.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.04)";
                    e.currentTarget.style.color = C.textSecondary;
                  }}
                >
                  + Link Task
                </button>
              </div>

              {/* Task Picker Dropdown for Q2 */}
              {pickerOpen === "q2" && (
                <div
                  style={{
                    marginTop: 8,
                    background: C.bgElevated,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 8,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search tasks…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      background: C.bgBase,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.textPrimary,
                      fontSize: 12,
                      outline: "none",
                      marginBottom: 6,
                      boxSizing: "border-box",
                    }}
                  />
                  {filteredTasks.length === 0 ? (
                    <div
                      style={{
                        padding: 8,
                        color: C.textMuted,
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      No tasks found
                    </div>
                  ) : (
                    filteredTasks.slice(0, 15).map((t) => {
                      const isSelected = tasks2.some(
                        (x) => (x._id || x) === t._id
                      );
                      return (
                        <div
                          key={t._id}
                          onClick={() => toggleTaskForQ(2, t)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            color: isSelected ? "#818cf8" : C.textPrimary,
                            background: isSelected
                              ? "rgba(99,102,241,0.15)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.title}
                          </span>
                          {isSelected && <span>✓</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Question 3: Blockers Section */}
            <div
              style={{
                marginBottom: 26,
                padding: "16px 18px",
                background: hasBlocker
                  ? "rgba(239, 68, 68, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${
                  hasBlocker ? "rgba(239, 68, 68, 0.25)" : C.borderLight
                }`,
                borderRadius: 14,
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: hasBlocker ? 14 : 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: hasBlocker ? "#f87171" : C.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{hasBlocker ? "🚩" : "🛡️"}</span>
                    <span>3. {questions[2] || DEFAULT_QUESTIONS[2]}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textMuted,
                      marginTop: 2,
                    }}
                  >
                    Any blockers, external dependencies, or issues slowing you down?
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => setHasBlocker(!hasBlocker)}
                  style={{
                    background: hasBlocker ? C.danger : "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    borderRadius: 20,
                    padding: "4px 12px",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  {hasBlocker ? "I have a blocker" : "No blockers"}
                </button>
              </div>

              {hasBlocker && (
                <div style={{ animation: "fadeIn 0.2s ease" }}>
                  <textarea
                    value={blockerText}
                    onChange={(e) => setBlockerText(e.target.value)}
                    placeholder="Describe what is blocking you and what help you need…"
                    rows={2}
                    required
                    style={{
                      width: "100%",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      color: C.textPrimary,
                      fontSize: 13,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                      marginBottom: 12,
                      fontFamily: "inherit",
                    }}
                  />

                  {/* Optional Task link for blocker */}
                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.textSecondary,
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Link Blocked Task (Optional)
                    </label>
                    <select
                      value={blockerTaskId}
                      onChange={(e) => setBlockerTaskId(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: C.textPrimary,
                        fontSize: 13,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">-- None --</option>
                      {workspaceTasks.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Warning banner */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "10px 12px",
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: 8,
                      fontSize: 11,
                      color: "#fde68a",
                      lineHeight: 1.4,
                    }}
                  >
                    <span>⚠️</span>
                    <span>
                      Flagging a task will mark it as blocked on the Kanban board and
                      alert your team in the standup feed.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "9px 18px",
                  color: C.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: C.accent,
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 24px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.background = C.accentHover;
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.currentTarget.style.background = C.accent;
                }}
              >
                {submitting
                  ? "Saving…"
                  : existingEntry
                  ? "Update Standup"
                  : "Submit Standup"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
