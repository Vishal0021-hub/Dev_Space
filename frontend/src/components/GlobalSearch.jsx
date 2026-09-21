import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useWorkspace } from "../context/WorkspaceContext";

/* ── Debounce hook ── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Status colors ── */
const STATUS_COLOR = {
  todo: "#94a3b8", inprogress: "#fbbf24", review: "#818cf8", done: "#34d399",
};
const PRIORITY_COLOR = {
  low: "#34d399", medium: "#fbbf24", high: "#f87171", critical: "#e11d48",
};

export default function GlobalSearch({ onClose }) {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState(null);  // { tasks, messages, members }
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState("all"); // all | tasks | messages | members
  const [focused, setFocused] = useState(0);     // keyboard nav index

  const inputRef  = useRef(null);
  const debouncedQ = useDebounce(query, 280);

  /* Auto-focus on open */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Keyboard close */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* Search when query changes */
  useEffect(() => {
    if (!debouncedQ || debouncedQ.trim().length < 2) { setResults(null); return; }
    if (!activeWorkspace?._id) return;
    doSearch(debouncedQ);
  }, [debouncedQ, activeWorkspace?._id, tab]);

  const doSearch = async (q) => {
    setLoading(true);
    try {
      const type = tab === "all" ? undefined : tab;
      const params = new URLSearchParams({ q, workspaceId: activeWorkspace._id });
      if (type) params.set("type", type);
      const res = await API.get(`/search?${params}`);
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  /* Navigation helpers */
  const goToTask    = (t) => { navigate(`/boards/${t.board}`, { state: { focusTask: t._id } }); onClose(); };
  const goToChannel = (m) => {
    // find the channel — navigate using channelId from message
    navigate(`/channels/${m.channel}?workspaceId=${activeWorkspace._id}`);
    onClose();
  };
  const goToMember  = (m) => { navigate(`/dm/${m._id}?workspaceId=${activeWorkspace._id}`); onClose(); };

  /* Flat list for keyboard nav */
  const allItems = [
    ...(results?.tasks   || []).map(t => ({ type: "task",    data: t,  go: () => goToTask(t)    })),
    ...(results?.messages || []).map(m => ({ type: "message", data: m,  go: () => goToChannel(m) })),
    ...(results?.members  || []).map(m => ({ type: "member",  data: m,  go: () => goToMember(m)  })),
  ];

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, allItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === "Enter" && allItems[focused]) { allItems[focused].go(); }
  };

  const totalCount = (results?.tasks?.length || 0) + (results?.messages?.length || 0) + (results?.members?.length || 0);

  /* ── Styles ── */
  const tabStyle = (active) => ({
    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    cursor: "pointer", border: "none",
    background: active ? "rgba(99,102,241,0.2)" : "transparent",
    color: active ? "#818cf8" : "rgba(255,255,255,0.4)",
    transition: "all 0.15s",
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 20px 20px", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 640, background: "#1E293B", border: "1px solid #334155", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setFocused(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, messages, members…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 15, fontFamily: "Figtree, Inter, sans-serif" }}
          />
          {loading && (
            <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
          )}
          <kbd style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>Esc</kbd>
        </div>

        {/* Tabs */}
        {results && (
          <div style={{ display: "flex", gap: 4, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["all", "tasks", "messages", "members"].map(t => (
              <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "all" && totalCount > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(99,102,241,0.3)", borderRadius: 10, padding: "1px 6px", color: "#818cf8" }}>
                    {totalCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div style={{ maxHeight: 440, overflowY: "auto" }}>
          {!query && (
            <div style={{ padding: "36px 20px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              Type to search across tasks, messages, and members
            </div>
          )}

          {query && query.length < 2 && (
            <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Keep typing…
            </div>
          )}

          {results && totalCount === 0 && !loading && (
            <div style={{ padding: "36px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🤷</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No results for "<strong style={{ color: "#fff" }}>{query}</strong>"</div>
            </div>
          )}

          {/* ── Tasks section ── */}
          {(tab === "all" || tab === "tasks") && results?.tasks?.length > 0 && (
            <Section label="Tasks" icon="📋">
              {results.tasks.map((t, i) => {
                const idx = i;
                return (
                  <ResultRow key={t._id} focused={focused === idx} onClick={() => goToTask(t)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${STATUS_COLOR[t.status] || "#94a3b8"}18`, color: STATUS_COLOR[t.status] || "#94a3b8", fontWeight: 700, flexShrink: 0 }}>
                        {t.status || "todo"}
                      </span>
                      <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {t.priority && (
                        <span style={{ fontSize: 10, color: PRIORITY_COLOR[t.priority] || "#94a3b8" }}>● {t.priority}</span>
                      )}
                      {t.boardName && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.boardName}</span>
                      )}
                    </div>
                  </ResultRow>
                );
              })}
            </Section>
          )}

          {/* ── Messages section ── */}
          {(tab === "all" || tab === "messages") && results?.messages?.length > 0 && (
            <Section label="Messages" icon="💬">
              {results.messages.map((m, i) => {
                const idx = (results?.tasks?.length || 0) + i;
                return (
                  <ResultRow key={m._id} focused={focused === idx} onClick={() => goToChannel(m)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>
                          #{m.channelName || "channel"}
                        </span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          from {m.sender?.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.content}
                      </div>
                    </div>
                  </ResultRow>
                );
              })}
            </Section>
          )}

          {/* ── Members section ── */}
          {(tab === "all" || tab === "members") && results?.members?.length > 0 && (
            <Section label="Members" icon="👥">
              {results.members.map((m, i) => {
                const idx = (results?.tasks?.length || 0) + (results?.messages?.length || 0) + i;
                return (
                  <ResultRow key={m._id} focused={focused === idx} onClick={() => goToMember(m)}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#312E81", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#C7D2FE", flexShrink: 0 }}>
                      {m.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{m.email}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(99,102,241,0.12)", color: "#818cf8", fontWeight: 700 }}>
                      {m.role}
                    </span>
                  </ResultRow>
                );
              })}
            </Section>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
          <span style={{ marginLeft: "auto" }}>
            Searching in <strong style={{ color: "rgba(255,255,255,0.4)" }}>{activeWorkspace?.name || "workspace"}</strong>
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Sub-components ── */
function Section({ label, icon, children }) {
  return (
    <div>
      <div style={{ padding: "10px 18px 4px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span> {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ children, focused, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 18px", cursor: "pointer",
        background: focused ? "rgba(99,102,241,0.1)" : "transparent",
        borderLeft: focused ? "2px solid #6366f1" : "2px solid transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background = focused ? "rgba(99,102,241,0.1)" : "transparent"}
    >
      {children}
    </div>
  );
}
