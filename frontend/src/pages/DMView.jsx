import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-hot-toast";
import AppShell from "../components/AppShell";
import NotificationBell from "../components/NotificationBell";
import { useSocket } from "../context/SocketContext";
import { getStoredUser } from "../utils/auth";

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const formatTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

export default function DMView() {
  const { recipientId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const navigate = useNavigate();

  const [recipient,    setRecipient]    = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [content,      setContent]      = useState("");
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [recipTyping,  setRecipTyping]  = useState(false);
  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const typingTout   = useRef(null);
  const user = getStoredUser();
  const { socket } = useSocket();

  useEffect(() => {
    if (recipientId && workspaceId) {
      fetchRecipient();
      fetchDMs();
    }
  }, [recipientId, workspaceId]);

  /* ── Socket: join DM room + real-time events ── */
  useEffect(() => {
    if (!socket || !user._id || !recipientId) return;

    socket.emit("join:dm", { myId: user._id, recipientId });

    const onNewMsg = (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = ({ userId }) => {
      if (userId === user._id) return;
      setRecipTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setRecipTyping(false), 3000);
    };

    const onStopTyping = ({ userId }) => {
      if (userId === user._id) return;
      setRecipTyping(false);
    };

    socket.on("dm:newMessage",    onNewMsg);
    socket.on("user:typing:dm",   onTyping);
    socket.on("user:stopTyping:dm", onStopTyping);

    return () => {
      socket.off("dm:newMessage",    onNewMsg);
      socket.off("user:typing:dm",   onTyping);
      socket.off("user:stopTyping:dm", onStopTyping);
    };
  }, [socket, recipientId, user._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRecipient = async () => {
    try {
      // Get members list and find recipient info
      const res = await API.get(`/workspaces/${workspaceId}/members`);
      const member = res.data.find(m => {
        const id = m.userId?._id || m.userId;
        return id?.toString() === recipientId;
      });
      if (member) setRecipient(member.userId);
    } catch { /* silent */ }
  };

  const fetchDMs = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/dm/${recipientId}?workspaceId=${workspaceId}`);
      setMessages(res.data);
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleTyping = (e) => {
    setContent(e.target.value);
    if (!socket) return;
    socket.emit("typing:start:dm", { recipientId });
    if (typingTout.current) clearTimeout(typingTout.current);
    typingTout.current = setTimeout(() => socket.emit("typing:stop:dm", { recipientId }), 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    if (socket) socket.emit("typing:stop:dm", { recipientId });
    try {
      const res = await API.post(`/dm/${recipientId}`, { content: content.trim(), workspaceId });
      setMessages(prev => prev.find(m => m._id === res.data._id) ? prev : [...prev, res.data]);
      setContent("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const recipientName = recipient?.name || "Member";

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-base, #07090f)" }}>
        {/* Header */}
        <div style={{ padding: "0 24px", height: 60, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, background: "rgba(10,13,22,0.8)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", padding: 6, borderRadius: 8, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
          ><IconBack/></button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }}/>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#BAE6FD" }}>
            {recipientName[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{recipientName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{recipient?.email || ""}</div>
          </div>
          <div style={{ marginLeft: "auto" }}><NotificationBell/></div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, width: 100, background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }}/>
                    <div style={{ height: 10, width: "50%", background: "rgba(255,255,255,0.04)", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.2s" }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#BAE6FD" }}>
                {recipientName[0].toUpperCase()}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Start a conversation with {recipientName}</div>
              <div style={{ fontSize: 13 }}>This is the beginning of your direct message history.</div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMe = msg.sender?._id === user._id || msg.sender === user._id;
                const showAvatar = i === 0 || messages[i-1]?.sender?._id !== msg.sender?._id;
                return (
                  <div key={msg._id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "4px 0" }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0 }}>
                      {showAvatar && (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: isMe ? "#312E81" : "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: isMe ? "#C7D2FE" : "#BAE6FD" }}>
                          {(msg.sender?.name || "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      {showAvatar && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: isMe ? "#818cf8" : "#e2e8f0" }}>{isMe ? "You" : msg.sender?.name || "Unknown"}</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, wordBreak: "break-word" }}>{msg.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </>
          )}
        </div>

        {/* Typing indicator */}
        {recipTyping && (
          <div style={{ padding: "4px 24px", fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#0ea5e9", display: "inline-block", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
              ))}
            </div>
            <span>{recipientName} is typing…</span>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "8px 24px 20px", background: "rgba(10,13,22,0.6)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
          <form onSubmit={sendMessage} style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 14px" }}>
            <input
              value={content}
              onChange={handleTyping}
              placeholder={`Message ${recipientName}`}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "var(--font-body, Inter)" }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
            />
            <button
              type="submit"
              disabled={!content.trim() || sending}
              style={{ background: content.trim() ? "#4F46E5" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: content.trim() ? "pointer" : "not-allowed", color: "#fff", transition: "all 0.2s", flexShrink: 0 }}
            >
              <IconSend/>
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
