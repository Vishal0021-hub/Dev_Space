import { useState, useEffect, useRef } from "react";
import API from "../services/api";

const IconBell = ({ hasUnread }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={hasUnread ? "rgba(99,102,241,0.4)" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const TYPE_ICONS = {
  task_assigned:   "📋",
  task_completed:  "✅",
  task_comment:    "💬",
  channel_mention: "📢",
  dm_received:     "✉️",
  workspace_invite:"🔗",
  member_joined:   "👤",
  role_changed:    "🛡️",
  project_created: "📁",
  board_created:   "📝",
};

const formatTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

export default function NotificationBell() {
  const [open,         setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [loading,      setLoading]      = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Delay notification polling slightly so initial page data (workspaces/projects) has full priority
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => { setOpen(p => !p); if (!open) fetchNotifications(); }}
        style={{
          position: "relative", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.7)", transition: "all 0.2s"
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        title="Notifications"
      >
        <IconBell hasUnread={unreadCount > 0}/>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#4F46E5",
            color: "#fff", borderRadius: "50%",
            width: unreadCount > 9 ? 20 : 16, height: 16,
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #07090f"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 360, maxHeight: 480,
          background: "rgba(10,13,22,0.98)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)", zIndex: 1000,
          display: "flex", flexDirection: "column",
          animation: "fadeInDown 0.15s ease"
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Notifications</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", color: "#818cf8", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <IconCheck/> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 56, background: "rgba(255,255,255,0.04)", borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i*0.1}s` }}/>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>All caught up!</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  style={{
                    display: "flex", gap: 12, padding: "12px 16px",
                    background: n.read ? "none" : "rgba(99,102,241,0.06)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: n.read ? "default" : "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                  onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}
                >
                  <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{TYPE_ICONS[n.type] || "🔔"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: n.read ? "rgba(255,255,255,0.6)" : "#e2e8f0", lineHeight: 1.4, marginBottom: 4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{formatTime(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 4 }}/>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
