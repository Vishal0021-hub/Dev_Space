import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import API from "../services/api";
import { toast } from "react-hot-toast";

/* ─── Icons ──────────────────────────────────────────────────── */
const IconLogo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 6l7-3 7 3v8l-7 3-7-3V6z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 6l7 3m0 8V9m7-3l-7 3" stroke="#fff" strokeWidth="1.5" />
  </svg>
);
const IconHash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>;
const IconPlus = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconDM = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconFolder = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
const IconChevron = ({ open }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><polyline points="9 18 15 12 9 6" /></svg>;
const IconLogout = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
const IconBriefcase = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>;
const IconLock = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const IconDots = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

/* ─── Design tokens (mirrors CSS vars) ────────────────────────── */
const C = {
  bgBase:      "#0F172A",
  bgCard:      "#1E293B",
  bgElevated:  "#253448",
  border:      "#334155",
  borderSubtle:"#1E293B",
  textPrimary: "#F1F5F9",
  textSecondary:"#94A3B8",
  textMuted:   "#64748B",
  accent:      "#6366F1",
  accentBg:    "rgba(99,102,241,0.10)",
  accentText:  "#818cf8",
  danger:      "#EF4444",
  dangerBg:    "rgba(239,68,68,0.12)",
};

const ROLE_COLORS = {
  owner: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  admin: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  member: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
};

/* ─── Workspace avatar color hash (flat solid colors) ────────── */
const WS_AVATAR_COLORS = [
  { bg: "#312E81", text: "#C7D2FE" },  // indigo
  { bg: "#1E3A5F", text: "#BAE6FD" },  // sky
  { bg: "#14532D", text: "#BBF7D0" },  // green
  { bg: "#44403C", text: "#FDE68A" },  // amber
  { bg: "#4A1D96", text: "#E9D5FF" },  // purple
  { bg: "#7F1D1D", text: "#FECACA" },  // red
];
const wsAvatarColor = (id = "") => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return WS_AVATAR_COLORS[Math.abs(hash) % WS_AVATAR_COLORS.length];
};

/* ─── Shared nav item style helpers ─────────────────────────── */
const navItemBase = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "6px 10px", borderRadius: 8,
  textDecoration: "none", fontSize: 13,
  transition: "all 0.15s",
  cursor: "pointer",
};
const navItemActive = { ...navItemBase, background: C.accentBg, color: C.accentText, fontWeight: 600 };
const navItemIdle   = { ...navItemBase, background: "none",     color: C.textSecondary, fontWeight: 400 };

/* ─── Section label ──────────────────────────────────────────── */
const SectionLabel = ({ label, chevronOpen, onToggle, onAdd, addTitle }) => (
  <button
    onClick={onToggle}
    style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "none", border: "none", cursor: "pointer",
      padding: "4px 6px", borderRadius: 6,
      color: C.textMuted, fontSize: 10, fontWeight: 500,
      letterSpacing: "0.12em", textTransform: "uppercase",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <IconChevron open={chevronOpen} /> {label}
    </div>
    {onAdd && (
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 2, borderRadius: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
        title={addTitle}
        onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
        onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
      >
        <IconPlus size={11} />
      </button>
    )}
  </button>
);


export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    workspaces, activeWorkspace, setActiveWorkspace,
    channels, members, userRole, loadingChannels,
    refreshWorkspaces, refreshChannels
  } = useWorkspace();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [sectionsOpen, setSectionsOpen] = useState({ channels: true, dms: true, projects: true });
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [activeMenuWsId, setActiveMenuWsId] = useState(null);
  const [renamingWs, setRenamingWs] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [renamingLoading, setRenamingLoading] = useState(false);

  const [deletingWs, setDeletingWs] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const toggle = (key) => setSectionsOpen(p => ({ ...p, [key]: !p[key] }));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeWorkspace) return;
    setCreatingChannel(true);
    try {
      const res = await API.post("/channels", { name: newChannelName.trim(), workspaceId: activeWorkspace._id });
      toast.success(`#${res.data.name} created`);
      setNewChannelName("");
      setShowNewChannel(false);
      refreshChannels();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create channel");
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleRenameWorkspace = async (e) => {
    e.preventDefault();
    if (!renamingWs || !renameInput.trim()) return;
    setRenamingLoading(true);
    const loadingToast = toast.loading("Updating workspace name...");
    try {
      const res = await API.put(`/workspaces/${renamingWs._id}`, { name: renameInput.trim() });
      toast.success("Workspace renamed successfully!", { id: loadingToast });
      setRenamingWs(null);
      refreshWorkspaces();
      if (activeWorkspace?._id === renamingWs._id) setActiveWorkspace(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rename workspace", { id: loadingToast });
    } finally {
      setRenamingLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deletingWs) return;
    setDeletingLoading(true);
    const loadingToast = toast.loading("Deleting workspace...");
    try {
      await API.delete(`/workspaces/${deletingWs._id}`);
      toast.success("Workspace deleted successfully!", { id: loadingToast });
      const deletedId = deletingWs._id;
      setDeletingWs(null);
      refreshWorkspaces();
      if (activeWorkspace?._id === deletedId) {
        const remaining = workspaces.filter(w => w._id !== deletedId);
        if (remaining.length > 0) { setActiveWorkspace(remaining[0]); navigate(`/projects/${remaining[0]._id}`); }
        else { setActiveWorkspace(null); navigate("/dashboard"); }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete workspace", { id: loadingToast });
    } finally {
      setDeletingLoading(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bgBase }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 260,
        minWidth: collapsed ? 60 : 260,
        height: "100vh",
        background: C.bgBase,
        borderRight: `1px solid ${C.borderSubtle}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden",
        zIndex: 50,
      }}>

        {/* Logo + Collapse */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 16px 12px",
          borderBottom: `1px solid ${C.borderSubtle}`,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "#4338CA",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconLogo />
              </div>
              <span style={{
                fontFamily: "var(--font-display, Inter)",
                fontWeight: 800, fontSize: 16,
                color: C.textPrimary, letterSpacing: "-0.02em",
              }}>DevSpace</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(p => !p)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.textMuted, padding: 6, borderRadius: 8,
              transition: "color 0.2s", marginLeft: collapsed ? "auto" : 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* Workspace Switcher */}
        {!collapsed && (
          <div style={{ padding: "12px 12px 8px" }}>
            <div style={{
              fontSize: 10, fontWeight: 500, color: C.textMuted,
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: 6, paddingLeft: 4,
            }}>Workspace</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {workspaces.map(ws => (
                <div key={ws._id} style={{ position: "relative" }}>
                  <div style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: activeWorkspace?._id === ws._id ? C.accentBg : "none",
                    border: activeWorkspace?._id === ws._id ? `1px solid rgba(99,102,241,0.25)` : "1px solid transparent",
                    borderRadius: 10, padding: "4px 6px 4px 10px", transition: "all 0.15s",
                  }}>
                    <button
                      onClick={() => { setActiveWorkspace(ws); navigate(`/projects/${ws._id}`); }}
                      style={{
                        flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer",
                        color: activeWorkspace?._id === ws._id ? C.accentText : C.textSecondary,
                        fontSize: 13, fontWeight: activeWorkspace?._id === ws._id ? 600 : 400,
                        display: "flex", alignItems: "center", gap: 8, overflow: "hidden", padding: 0,
                      }}
                    >
                      {(() => {
                        const { bg, text } = wsAvatarColor(ws._id);
                        return (
                          <div style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, color: text, fontWeight: 700, flexShrink: 0,
                          }}>
                            {ws.name ? ws.name[0].toUpperCase() : "W"}
                          </div>
                        );
                      })()}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenuWsId(activeMenuWsId === ws._id ? null : ws._id); }}
                      style={{
                        background: activeMenuWsId === ws._id ? "rgba(255,255,255,0.08)" : "none",
                        border: "none", borderRadius: 6, padding: "5px 6px", cursor: "pointer",
                        color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s", marginLeft: 4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
                      onMouseLeave={e => { if (activeMenuWsId !== ws._id) e.currentTarget.style.color = C.textMuted; }}
                      title="Workspace options"
                    >
                      <IconDots />
                    </button>
                  </div>

                  {activeMenuWsId === ws._id && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setActiveMenuWsId(null)} />
                      <div style={{
                        position: "absolute", top: "100%", right: 0, marginTop: 4,
                        background: C.bgCard, border: `1px solid ${C.border}`,
                        borderRadius: 12, padding: "6px", width: 160,
                        boxShadow: "0 16px 40px rgba(0,0,0,0.5)", zIndex: 100,
                        display: "flex", flexDirection: "column", gap: 2,
                      }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenuWsId(null); setRenamingWs(ws); setRenameInput(ws.name); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "8px 10px", background: "none", border: "none", borderRadius: 8,
                            color: C.textPrimary, fontSize: 12, fontWeight: 500,
                            cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = C.accentBg}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Rename
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenuWsId(null); setDeletingWs(ws); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "8px 10px", background: "none", border: "none", borderRadius: 8,
                            color: "#f87171", fontSize: 12, fontWeight: 500,
                            cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = C.dangerBg}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  width: "100%", textAlign: "left", background: "none",
                  border: `1.5px dashed ${C.border}`, borderRadius: 10,
                  padding: "7px 10px", cursor: "pointer",
                  color: C.textMuted, fontSize: 12,
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.borderColor = "#475569"; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
              >
                <IconPlus size={12} /> New Workspace
              </button>
            </div>
          </div>
        )}

        {/* Scrollable nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>

          {!collapsed && activeWorkspace && (
            <>
              {/* ── Channels ── */}
              <div style={{ marginTop: 10 }}>
                <SectionLabel
                  label="Channels"
                  chevronOpen={sectionsOpen.channels}
                  onToggle={() => toggle("channels")}
                  onAdd={() => setShowNewChannel(p => !p)}
                  addTitle="New channel"
                />

                {showNewChannel && (
                  <form onSubmit={handleCreateChannel} style={{ padding: "6px 4px", display: "flex", gap: 6 }}>
                    <input
                      autoFocus placeholder="channel-name" value={newChannelName}
                      onChange={e => setNewChannelName(e.target.value)}
                      style={{
                        flex: 1, background: C.bgCard, border: `1px solid ${C.border}`,
                        borderRadius: 7, padding: "5px 8px", color: C.textPrimary, fontSize: 12, outline: "none",
                      }}
                    />
                    <button type="submit" disabled={creatingChannel} style={{
                      background: C.accent, border: "none", borderRadius: 7, padding: "5px 10px",
                      color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}>
                      {creatingChannel ? "…" : "Add"}
                    </button>
                  </form>
                )}

                {sectionsOpen.channels && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
                    {loadingChannels ? (
                      <div style={{ padding: "4px 8px", fontSize: 12, color: C.textMuted }}>Loading…</div>
                    ) : channels.length === 0 ? (
                      <div style={{ padding: "4px 8px", fontSize: 12, color: C.textMuted }}>No channels yet</div>
                    ) : channels.map(ch => {
                      const active = isActive(`/channels/${ch._id}`);
                      return (
                        <Link
                          key={ch._id}
                          to={`/channels/${ch._id}?workspaceId=${activeWorkspace._id}`}
                          style={active ? navItemActive : navItemIdle}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgCard; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
                        >
                          {ch.isPrivate ? <IconLock /> : <IconHash />}
                          {ch.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── DMs ── */}
              <div style={{ marginTop: 12 }}>
                <SectionLabel
                  label="Direct Messages"
                  chevronOpen={sectionsOpen.dms}
                  onToggle={() => toggle("dms")}
                />
                {sectionsOpen.dms && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
                    {members.filter(m => {
                      const memberId = m.userId?._id || m.userId;
                      const myId = JSON.parse(localStorage.getItem("user") || "{}")._id;
                      return memberId?.toString() !== myId?.toString();
                    }).length === 0 ? (
                      <div style={{ padding: "4px 8px", fontSize: 12, color: C.textMuted }}>No other members to DM</div>
                    ) : (
                      members.filter(m => {
                        const memberId = m.userId?._id || m.userId;
                        const myId = JSON.parse(localStorage.getItem("user") || "{}")._id;
                        return memberId?.toString() !== myId?.toString();
                      }).map(m => {
                        const memberId = m.userId?._id || m.userId;
                        const memberName = m.userId?.name || "Unknown";
                        const roleStyle = ROLE_COLORS[m.role] || ROLE_COLORS.member;
                        return (
                          <Link
                            key={memberId}
                            to={`/dm/${memberId}?workspaceId=${activeWorkspace._id}`}
                            style={{ ...navItemIdle }}
                            onMouseEnter={e => e.currentTarget.style.background = C.bgCard}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <div style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: wsAvatarColor(memberId?.toString() || memberName),
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0,
                            }}>
                              {memberName[0].toUpperCase()}
                            </div>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memberName}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 20,
                              background: roleStyle.bg, color: roleStyle.color,
                            }}>{m.role}</span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ── Projects ── */}
              <div style={{ marginTop: 12 }}>
                <SectionLabel
                  label="Projects"
                  chevronOpen={sectionsOpen.projects}
                  onToggle={() => toggle("projects")}
                />
                {sectionsOpen.projects && (
                  <div style={{ marginTop: 2 }}>
                    {[
                      {
                        to: `/projects/${activeWorkspace._id}`,
                        icon: <IconFolder />,
                        label: "View Projects",
                      },
                      {
                        to: `/analytics/${activeWorkspace._id}`,
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                        ),
                        label: "Analytics",
                      },
                      {
                        to: `/meetings/${activeWorkspace._id}`,
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                          </svg>
                        ),
                        label: "Meetings",
                      },
                    ].map(({ to, icon, label }) => {
                      const active = isActive(to);
                      return (
                        <Link
                          key={to}
                          to={to}
                          style={active ? navItemActive : navItemIdle}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgCard; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
                        >
                          {icon}{label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── User footer ── */}
        <div style={{
          padding: "10px 12px",
          borderTop: `1px solid ${C.borderSubtle}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#312E81",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#C7D2FE", fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {(user.name || "U")[0].toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || "User"}</div>
                <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email || ""}</div>
              </div>
              <Link
                to="/settings"
                title="Settings"
                style={{
                  background: isActive("/settings") ? C.accentBg : "none",
                  border: "none", cursor: "pointer",
                  color: isActive("/settings") ? C.accentText : C.textMuted,
                  padding: 6, borderRadius: 8,
                  display: "flex", alignItems: "center", transition: "all 0.2s",
                }}
                onMouseEnter={e => { if (!isActive("/settings")) e.currentTarget.style.color = C.textPrimary; }}
                onMouseLeave={e => { if (!isActive("/settings")) e.currentTarget.style.color = C.textMuted; }}
              >
                <IconSettings />
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.textMuted, padding: 6, borderRadius: 8,
                  display: "flex", alignItems: "center", transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
              >
                <IconLogout />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", background: C.bgBase }}>
        {children}
      </div>

      {/* ── Rename Workspace Modal ── */}
      {renamingWs && (
        <div
          onClick={() => setRenamingWs(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420,
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 20, padding: "32px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Rename Workspace</h2>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Enter a new name for this workspace.</p>
            <form onSubmit={handleRenameWorkspace}>
              <input
                autoFocus type="text" value={renameInput}
                onChange={e => setRenameInput(e.target.value)}
                placeholder="Workspace name" required
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.bgBase,
                  color: C.textPrimary, fontSize: 14, outline: "none",
                  marginBottom: 24, boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = C.accent}
                onBlur={e => e.currentTarget.style.borderColor = C.border}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setRenamingWs(null)} style={{
                  padding: "10px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}>Cancel</button>
                <button type="submit" disabled={renamingLoading} style={{
                  padding: "10px 18px", borderRadius: 10,
                  background: "#4F46E5",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  {renamingLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Workspace Confirmation Modal ── */}
      {deletingWs && (
        <div
          onClick={() => setDeletingWs(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440,
              background: C.bgCard, border: `1px solid rgba(239,68,68,0.25)`,
              borderRadius: 20, padding: "32px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, color: "#f87171",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>Delete Workspace?</h2>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: C.textPrimary }}>"{deletingWs.name}"</strong>? All associated projects, boards, channels, and tasks will be permanently removed. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setDeletingWs(null)} style={{
                padding: "10px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>Cancel</button>
              <button type="button" onClick={handleDeleteWorkspace} disabled={deletingLoading} style={{
                padding: "10px 18px", borderRadius: 10,
                background: "#DC2626",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {deletingLoading ? "Deleting…" : "Delete Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
