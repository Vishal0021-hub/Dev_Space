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
  bgBase: "rgb(var(--bg-canvas))",
  bgCard: "rgb(var(--bg-surface))",
  bgElevated: "rgb(var(--bg-surface-elevated))",
  border: "rgb(var(--border))",
  borderSubtle: "rgb(var(--border))",
  textPrimary: "rgb(var(--text-heading))",
  textSecondary: "rgb(var(--text-body))",
  textMuted: "rgb(var(--text-muted))",
  accent: "rgb(var(--accent))",
  accentHover: "rgb(var(--accent-hover))",
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
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-canvas">
        {/* ── Top bar ── */}
        <div className="px-7 py-4 flex items-center justify-between border-b border-border bg-bg-surface/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <h1 className="text-lg font-bold text-text-heading tracking-tight">Meeting Notes</h1>
            <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
              {meetings.length}
            </span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
          >
            <IconPlus size={14} /> New Meeting
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* ── Meeting list (left panel) ── */}
          <div className={`${selectedMeeting ? "w-80 min-w-[320px] border-r border-border" : "w-full"} overflow-y-auto p-4 transition-all`}>
            {loading ? (
              <div className="text-center py-12 text-sm text-text-muted">Loading meetings…</div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-16 px-6 max-w-sm mx-auto">
                <div className="text-4xl mb-3">📝</div>
                <div className="text-base font-bold text-text-heading mb-1.5">No meeting notes yet</div>
                <p className="text-xs text-text-muted mb-6 leading-relaxed">
                  Record decisions, action items, and link tasks with real-time collaboration.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
                >
                  Create Meeting Note
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {meetings.map((m) => {
                  const isSelected = selectedMeeting?._id === m._id;
                  return (
                    <button
                      key={m._id}
                      onClick={() => setSelectedMeeting(m)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-bg-surface-elevated border-accent shadow-sm"
                          : "bg-bg-surface border-border hover:border-accent/40 hover:bg-bg-surface-elevated/50"
                      }`}
                    >
                      <div className="text-sm font-semibold text-text-heading mb-2 line-clamp-1">
                        {m.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <IconCalendar /> {formatDate(m.date)}
                        </span>
                        {m.attendees?.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <IconUsers /> {m.attendees.length}
                          </span>
                        )}
                        {m.linkedTasks?.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <IconLink /> {m.linkedTasks.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Meeting detail (right panel) ── */}
          {selectedMeeting && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-text-heading mb-1.5 tracking-tight">
                    {selectedMeeting.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <IconCalendar /> {formatDate(selectedMeeting.date)}
                    </span>
                    <span>•</span>
                    <span>by {selectedMeeting.createdBy?.name || "Unknown"}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selectedMeeting._id)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                >
                  <IconTrash /> Delete
                </button>
              </div>

              {/* Attendees */}
              {selectedMeeting.attendees?.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    Attendees
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedMeeting.attendees.map((a) => (
                      <span
                        key={a._id}
                        className="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-lg text-xs font-medium"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Tasks */}
              {selectedMeeting.linkedTasks?.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    Linked Tasks
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedMeeting.linkedTasks.map((t) => {
                      const statusColors = {
                        todo: "bg-slate-400",
                        inprogress: "bg-amber-400",
                        review: "bg-indigo-400",
                        done: "bg-emerald-400",
                      };
                      return (
                        <span
                          key={t._id}
                          className="bg-bg-surface border border-border px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 text-text-heading shadow-xs"
                        >
                          <span className={`w-2 h-2 rounded-full ${statusColors[t.status] || "bg-slate-400"}`} />
                          {t.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content preview */}
              <div className="bg-bg-surface border border-border rounded-2xl p-6 min-h-[220px] text-text-body text-sm leading-relaxed shadow-xs">
                {selectedMeeting.contentJson ? (
                  <div className="text-text-body leading-relaxed whitespace-pre-line">
                    {extractTextFromJson(selectedMeeting.contentJson)}
                  </div>
                ) : (
                  <div className="text-text-muted italic">No written notes recorded for this meeting.</div>
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-bg-surface border border-border rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <h2 className="text-xl font-bold text-text-heading mb-1 tracking-tight">
              New Meeting Note
            </h2>
            <p className="text-xs text-text-muted mb-6">
              Record decisions, action items, and link tasks with @mentions.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                  Title
                </label>
                <input
                  autoFocus
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Sprint Planning, Architecture Review, 1-on-1…"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg-canvas text-text-heading text-sm outline-none focus:border-accent transition"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg-canvas text-text-heading text-sm outline-none focus:border-accent transition"
                />
              </div>

              {/* Attendees */}
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                  Attendees
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(members || []).map((m) => {
                    const userId = m.userId?._id || m._id;
                    const name = m.userId?.name || m.name || "?";
                    const selected = createAttendees.includes(userId);
                    return (
                      <button
                        type="button"
                        key={userId}
                        onClick={() => toggleAttendee(userId)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                          selected
                            ? "bg-accent/15 border-accent text-accent"
                            : "bg-bg-canvas border-border text-text-muted hover:text-text-heading hover:border-border/80"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tiptap Editor */}
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                  Notes
                </label>
                <MeetingEditor
                  ref={editorRef}
                  workspaceId={workspaceId}
                  placeholder="Start writing… Type @ to mention a task"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-bg-canvas text-text-muted hover:text-text-heading text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
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
