import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../services/api";
import { useWorkspace } from "../context/WorkspaceContext";
import AppShell from "../components/AppShell";
import MeetingEditor from "../components/MeetingEditor";
import "../utils/collab.css";

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase: "#0F172A", bgCard: "#1E293B", bgElevated: "#253448",
  border: "#334155", borderSubtle: "#1E293B",
  textPrimary: "#F1F5F9", textSecondary: "#94A3B8", textMuted: "#64748B",
  accent: "#6366F1", accentHover: "#4F46E5",
};

/* ── Icons ─────────────────────────────────────────────────── */
const IconPlus = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconCalendar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconUsers = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconLink = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function MeetingNotes() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, members } = useWorkspace();
  const editorRef = useRef(null);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Create form state
  const [createTitle, setCreateTitle] = useState("");
  const [createDate, setCreateDate] = useState(new Date().toISOString().slice(0, 10));
  const [createAttendees, setCreateAttendees] = useState([]);
  const [creating, setCreating] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await API.get(`/meetings/workspace/${workspaceId}`);
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) fetchMeetings();
  }, [workspaceId, fetchMeetings]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      const contentJson = editorRef.current?.getJSON() || null;
      await API.post("/meetings", {
        workspaceId,
        title: createTitle.trim(),
        date: createDate,
        attendees: createAttendees,
        contentJson,
      });
      toast.success("Meeting notes created!");
      setShowCreate(false);
      setCreateTitle("");
      setCreateAttendees([]);
      fetchMeetings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this meeting note?")) return;
    try {
      await API.delete(`/meetings/${id}`);
      toast.success("Meeting deleted");
      if (selectedMeeting?._id === id) setSelectedMeeting(null);
      fetchMeetings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const toggleAttendee = (userId) => {
    setCreateAttendees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <AppShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* ── Top bar ── */}
        <div style={{
          padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${C.borderSubtle}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Meeting Notes</h1>
            <span style={{ fontSize: 12, color: C.textMuted, background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 8 }}>
              {meetings.length}
            </span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: C.accent, border: "none", borderRadius: 10,
              padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <IconPlus size={14} /> New Meeting
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ── Meeting list (left panel) ── */}
          <div style={{
            width: selectedMeeting ? 340 : "100%", minWidth: 340,
            borderRight: selectedMeeting ? `1px solid ${C.borderSubtle}` : "none",
            overflowY: "auto", padding: "16px",
            transition: "width 0.2s",
          }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>Loading…</div>
            ) : meetings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>No meeting notes yet</div>
                <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 300, margin: "0 auto 20px" }}>
                  Create your first meeting note to start tracking decisions and action items.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  style={{ background: C.accent, border: "none", borderRadius: 10, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Create Meeting Note
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {meetings.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => setSelectedMeeting(m)}
                    style={{
                      background: selectedMeeting?._id === m._id ? C.bgElevated : C.bgCard,
                      border: `1px solid ${selectedMeeting?._id === m._id ? C.accent : C.border}`,
                      borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                      textAlign: "left", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (selectedMeeting?._id !== m._id) e.currentTarget.style.borderColor = "#475569"; }}
                    onMouseLeave={(e) => { if (selectedMeeting?._id !== m._id) e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>
                      {m.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: C.textMuted }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <IconCalendar /> {formatDate(m.date)}
                      </span>
                      {m.attendees?.length > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <IconUsers /> {m.attendees.length}
                        </span>
                      )}
                      {m.linkedTasks?.length > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <IconLink /> {m.linkedTasks.length} tasks
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Meeting detail (right panel) ── */}
          {selectedMeeting && (
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
                    {selectedMeeting.title}
                  </h2>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.textMuted }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <IconCalendar /> {formatDate(selectedMeeting.date)}
                    </span>
                    <span>by {selectedMeeting.createdBy?.name || "Unknown"}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selectedMeeting._id)}
                  style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8, padding: "6px 12px", color: "#f87171", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <IconTrash /> Delete
                </button>
              </div>

              {/* Attendees */}
              {selectedMeeting.attendees?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Attendees
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedMeeting.attendees.map((a) => (
                      <span key={a._id} style={{
                        background: "rgba(99,102,241,0.1)", color: "#818cf8",
                        padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                      }}>
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Tasks */}
              {selectedMeeting.linkedTasks?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Linked Tasks
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedMeeting.linkedTasks.map((t) => {
                      const statusColors = { todo: "#94a3b8", inprogress: "#fbbf24", review: "#818cf8", done: "#34d399" };
                      return (
                        <span key={t._id} style={{
                          background: C.bgCard, border: `1px solid ${C.border}`,
                          padding: "4px 10px", borderRadius: 8, fontSize: 12,
                          display: "flex", alignItems: "center", gap: 6, color: C.textPrimary,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColors[t.status] || "#94a3b8" }} />
                          {t.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content preview */}
              <div style={{
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: "20px 24px", minHeight: 200,
                color: C.textPrimary, fontSize: 14, lineHeight: 1.7,
              }}>
                {selectedMeeting.contentJson ? (
                  <div style={{ color: C.textSecondary, fontSize: 13 }}>
                    {/* Render a simple text preview from JSON content */}
                    {extractTextFromJson(selectedMeeting.contentJson)}
                  </div>
                ) : (
                  <div style={{ color: C.textMuted, fontStyle: "italic" }}>No content</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Meeting Modal ── */}
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 680,
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 20, padding: 32, maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              New Meeting Note
            </h2>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 24 }}>
              Record decisions, action items, and link tasks with @mentions.
            </p>

            <form onSubmit={handleCreate}>
              {/* Title */}
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Title
              </label>
              <input
                autoFocus
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Sprint Review, Planning, Retro…"
                required
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.bgBase,
                  color: C.textPrimary, fontSize: 14, outline: "none",
                  marginTop: 6, marginBottom: 16, boxSizing: "border-box",
                }}
              />

              {/* Date */}
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Date
              </label>
              <input
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.bgBase,
                  color: C.textPrimary, fontSize: 14, outline: "none",
                  marginTop: 6, marginBottom: 16, boxSizing: "border-box",
                  colorScheme: "dark",
                }}
              />

              {/* Attendees */}
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Attendees
              </label>
              <div style={{
                display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, marginBottom: 16,
              }}>
                {(members || []).map((m) => {
                  const userId = m.userId?._id || m._id;
                  const name = m.userId?.name || m.name || "?";
                  const selected = createAttendees.includes(userId);
                  return (
                    <button
                      type="button"
                      key={userId}
                      onClick={() => toggleAttendee(userId)}
                      style={{
                        background: selected ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selected ? "rgba(99,102,241,0.3)" : C.border}`,
                        color: selected ? "#818cf8" : C.textSecondary,
                        borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 500,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Tiptap Editor */}
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                Notes
              </label>
              <div style={{ marginBottom: 24 }}>
                <MeetingEditor
                  ref={editorRef}
                  workspaceId={workspaceId}
                  placeholder="Start writing… Type @ to mention a task"
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{
                    padding: "10px 18px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                    color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: "10px 22px", borderRadius: 10,
                    background: C.accent, border: "none",
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer",
                  }}
                >
                  {creating ? "Saving…" : "Save Notes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ── Helper: extract plain text from Tiptap JSON for preview ── */
function extractTextFromJson(doc) {
  if (!doc) return "";
  const parts = [];
  function walk(node) {
    if (node.text) parts.push(node.text);
    if (node.type === "mention" && node.attrs?.label) parts.push(`@${node.attrs.label}`);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  }
  walk(doc);
  return parts.join(" ").slice(0, 500) || "No content";
}
