import { useState } from "react";
import API from "../services/api";
import { toast } from "react-hot-toast";

const ROLE_COLORS = {
  owner:  { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24", border: "rgba(245,158,11,0.25)",  dot: "#f59e0b" },
  admin:  { bg: "rgba(129,140,248,0.12)", color: "#818cf8", border: "rgba(129,140,248,0.25)", dot: "#6366f1" },
  member: { bg: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "rgba(148,163,184,0.18)", dot: "#64748b" },
};

const AVATAR_PALETTES = [
  ["#6366f1","#4f46e5"], ["#8b5cf6","#7c3aed"], ["#06b6d4","#0891b2"],
  ["#10b981","#059669"], ["#f59e0b","#d97706"], ["#f43f5e","#e11d48"],
];

const MemberAvatar = ({ name, index, size = 40, fontSize = 15 }) => {
  const [a, b] = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: a,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 700, color: "#fff",
      boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
    }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_COLORS[role] || ROLE_COLORS.member;
  const icons = { owner: "👑", admin: "🛡️", member: "👤" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
      boxShadow: `0 2px 8px ${cfg.bg}`,
    }}>
      <span style={{ fontSize: 9 }}>{icons[role]}</span>
      {role}
    </span>
  );
};

const MembersSidebar = ({ workspaceId, members = [], userRole = "member", onUpdate = () => {}, onClose, onInviteOpen, isOpen = false }) => {
  const [updating, setUpdating] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  if (!isOpen) return null;

  const handleChangeRole = async (userId, newRole) => {
    const loadingToast = toast.loading("Updating role...");
    try {
      setUpdating(userId);
      await API.put(`/workspaces/${workspaceId}/role/${userId}`, { role: newRole });
      toast.success("Role updated successfully", { id: loadingToast });
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change role", { id: loadingToast });
    } finally {
      setUpdating(null);
    }
  };

  const isOwner = userRole === "owner";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-sm h-full bg-bg-surface border-l border-inherit p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <h3 className="font-bold text-lg text-text-heading m-0 leading-none">
            Workspace Members
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-bg-canvas border border-border text-text-muted hover:text-text-heading flex items-center justify-center text-lg cursor-pointer transition"
        >
          ×
        </button>
      </div>

      <div className="w-full h-px bg-border my-4" />

      {/* Members list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)", fontSize: 13 }}>
            No members yet
          </div>
        ) : (
          members.map((m, idx) => {
            const user = m.userId || m.user;
            const userId = user?._id || user;
            const isHovered = hoveredId === userId;
            return (
              <div
                key={userId}
                onMouseEnter={() => setHoveredId(userId)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  background: isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                  borderRadius: 16,
                  border: `1px solid ${isHovered ? "rgba(255,255,255,0.1)" : "var(--border)"}`,
                  transition: "all 0.2s",
                }}
              >
                <MemberAvatar name={user?.name} index={idx} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-xs font-semibold text-text-heading truncate">
                    {user?.name}
                  </div>
                  <div className="text-[11px] text-text-muted truncate mt-0.5">
                    {user?.email}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <RoleBadge role={m.role} />

                  {/* Role change dropdown — owners only, cannot change other owners */}
                  {isOwner && m.role !== "owner" && (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={m.role}
                        disabled={updating === userId}
                        onChange={e => handleChangeRole(userId, e.target.value)}
                        className="dc-role-select text-[10px] py-1 px-2 bg-bg-canvas border border-border rounded-lg text-text-heading cursor-pointer outline-none appearance-none pr-5"
                        style={{
                          opacity: updating === userId ? 0.5 : 1,
                        }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  )}

                  {updating === userId && (
                    <span className="text-[10px] text-accent animate-pulse">Updating…</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite button — bottom */}
      {(isOwner || userRole === "admin") && (
        <div className="pt-5">
          <button
            onClick={onInviteOpen}
            className="w-full py-3 px-5 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 transition shadow-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            Invite Member
          </button>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default MembersSidebar;
