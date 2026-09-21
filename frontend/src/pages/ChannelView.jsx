import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-hot-toast";
import AppShell from "../components/AppShell";
import { MessageSkeleton } from "../components/Skeletons";
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
const IconHash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
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

export default function ChannelView() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const navigate = useNavigate();

  const [channel,     setChannel]     = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [content,     setContent]     = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: name }
  const bottomRef = useRef(null);
  const typingTimers = useRef({});
  const user = getStoredUser();
  const { socket } = useSocket();

  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchMessages();
    }
  }, [channelId]);

  /* ── Socket: join/leave room + real-time events ── */
  useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("join:channel", channelId);

    const onNewMsg = (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev; // deduplicate
        return [...prev, msg];
      });
    };

    const onTyping = ({ userId, name }) => {
      if (userId === user._id) return;
      setTypingUsers(prev => ({ ...prev, [userId]: name }));
      // Clear typing after 3s of no update
      if (typingTimers.current[userId]) clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n; });
      }, 3000);
    };

    const onStopTyping = ({ userId }) => {
      setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n; });
    };

    socket.on("channel:newMessage", onNewMsg);
    socket.on("user:typing",        onTyping);
    socket.on("user:stopTyping",    onStopTyping);

    return () => {
      socket.emit("leave:channel", channelId);
      socket.off("channel:newMessage", onNewMsg);
      socket.off("user:typing",        onTyping);
      socket.off("user:stopTyping",    onStopTyping);
    };
  }, [socket, channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChannel = async () => {
    try {
      const res = await API.get(`/channels?workspaceId=${workspaceId}`);
      const found = res.data.find(c => c._id === channelId);
      setChannel(found || null);
    } catch { /* silent */ }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/channels/${channelId}/messages`);
      setMessages(res.data);
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const typingTimeout = useRef(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    // Stop typing indicator
    if (socket) socket.emit("typing:stop", { channelId });
    try {
      const res = await API.post(`/channels/${channelId}/messages`, { content: content.trim() });
      // Deduplicate: socket broadcast also delivers this message to us
      setMessages(prev => prev.find(m => m._id === res.data._id) ? prev : [...prev, res.data]);
      setContent("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setContent(e.target.value);
    if (!socket) return;
    socket.emit("typing:start", { channelId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("typing:stop", { channelId }), 2000);
  };

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
          <IconHash/>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{channel?.name || "Channel"}</span>
          {channel?.description && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>{channel.description}</span>}
          <div style={{ marginLeft: "auto" }}><NotificationBell/></div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {loading ? (
            <MessageSkeleton count={6} />
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", gap: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconHash/></div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>This is the beginning of #{channel?.name}</div>
              <div style={{ fontSize: 13 }}>Send your first message to get the conversation started!</div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMe = msg.sender?._id === user._id || msg.sender === user._id;
                const showAvatar = i === 0 || messages[i-1]?.sender?._id !== msg.sender?._id;
                return (
                  <div key={msg._id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "4px 0", borderRadius: 8, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
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
                          <span style={{ fontSize: 14, fontWeight: 700, color: isMe ? "#818cf8" : "#e2e8f0" }}>{msg.sender?.name || "Unknown"}</span>
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
        {Object.values(typingUsers).length > 0 && (
          <div style={{ padding: "4px 24px", fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
              ))}
            </div>
            <span>
              {Object.values(typingUsers).join(", ")} {Object.values(typingUsers).length === 1 ? "is" : "are"} typing…
            </span>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "8px 24px 20px", background: "rgba(10,13,22,0.6)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
          <form onSubmit={sendMessage} style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 14px", transition: "border-color 0.2s" }}>
            <input
              value={content}
              onChange={handleTyping}
              placeholder={`Message #${channel?.name || "channel"}`}
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
        <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }`}</style>
      </div>
    </AppShell>
  );
}
