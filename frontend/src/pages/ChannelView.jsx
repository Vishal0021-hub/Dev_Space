import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-hot-toast";
import {
  Hash,
  Send,
  ArrowLeft,
  Users,
  Sparkles,
  Lock,
  Plus,
} from "lucide-react";
import AppShell from "../components/AppShell";
import NotificationBell from "../components/NotificationBell";
import { MessageSkeleton } from "../components/Skeletons";
import { useSocket } from "../context/SocketContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { getStoredUser } from "../utils/auth";

const formatTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return dt.toLocaleDateString([], { day: "2-digit", month: "short" });
};

export default function ChannelView() {
  const { channelId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeWorkspace, refreshChannels } = useWorkspace();
  const workspaceId = searchParams.get("workspaceId") || activeWorkspace?._id;

  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const bottomRef = useRef(null);
  const typingTimers = useRef({});
  const user = getStoredUser();
  const { socket } = useSocket();

  // Load channel & message history
  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchMessages();
    } else if (workspaceId) {
      fetchFirstChannel();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, workspaceId]);

  const fetchFirstChannel = async () => {
    try {
      const res = await API.get(`/channels?workspaceId=${workspaceId}`);
      if (res.data && res.data.length > 0) {
        navigate(`/channels/${res.data[0]._id}?workspaceId=${workspaceId}`, { replace: true });
      } else {
        setChannel(null);
        setMessages([]);
        setLoading(false);
      }
    } catch {
      setChannel(null);
      setMessages([]);
      setLoading(false);
    }
  };

  const fetchChannel = async () => {
    if (!workspaceId && !channelId) return;
    try {
      const wsParam = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const res = await API.get(`/channels${wsParam}`);
      const found = res.data?.find((c) => c._id === channelId);
      if (found) {
        setChannel(found);
      } else if (res.data?.length > 0) {
        setChannel(res.data[0]);
      }
    } catch {
      // Keep existing channel state
    }
  };

  const fetchMessages = async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const res = await API.get(`/channels/${channelId}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchMessages error:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Socket: join/leave room + real-time events ── */
  useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("join:channel", channelId);

    const onNewMsg = (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = ({ userId, name }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: name }));
      if (typingTimers.current[userId]) clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
      }, 3000);
    };

    const onStopTyping = ({ userId }) => {
      setTypingUsers((prev) => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    };

    socket.on("message:created", onNewMsg);
    socket.on("user:typing", onTyping);
    socket.on("user:stopTyping", onStopTyping);

    return () => {
      socket.emit("leave:channel", channelId);
      socket.off("message:created", onNewMsg);
      socket.off("user:typing", onTyping);
      socket.off("user:stopTyping", onStopTyping);
    };
  }, [socket, channelId, user?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typingTimeout = useRef(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending || !channelId) return;
    const textToSend = content.trim();
    setContent("");
    setSending(true);

    if (socket && channelId) socket.emit("typing:stop", { channelId });

    try {
      const res = await API.post(`/channels/${channelId}/messages`, { content: textToSend });
      setMessages((prev) => (prev.find((m) => m._id === res.data._id) ? prev : [...prev, res.data]));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setContent(e.target.value);
    if (!socket || !channelId) return;
    socket.emit("typing:start", { channelId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("typing:stop", { channelId }), 2000);
  };

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 overflow-hidden bg-bg-canvas text-text-heading select-none">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          {/* ============================================================= */}
          {/* TEAM CHAT STREAM                                              */}
          {/* ============================================================= */}
          <div className="flex-1 saas-card p-4 sm:p-6 flex flex-col overflow-hidden shadow-xl">
            {/* Header: Channel Name + Socket Pulse */}
            <div className="pb-3 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="sm:hidden p-1 rounded-lg opacity-60 hover:opacity-100 mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {channel?.isPrivate ? (
                  <Lock className="w-4 h-4 text-accent" />
                ) : (
                  <Hash className="w-4 h-4 text-accent" />
                )}
                <span className="font-bold text-sm sm:text-base tracking-tight text-text-heading">
                  #{channel?.name || "engineering"}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-text-muted ml-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline font-medium">Real-Time Socket.IO</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {channel?.description && (
                  <span className="hidden md:inline text-xs text-text-muted max-w-xs truncate">
                    {channel.description}
                  </span>
                )}
                <NotificationBell />
              </div>
            </div>

            {/* Message Stream Viewport */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {loading ? (
                <MessageSkeleton count={5} />
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-3 shadow-xs">
                    <Hash className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-text-heading">Welcome to #{channel?.name || "channel"}!</h4>
                  <p className="text-xs text-text-muted max-w-sm mt-1 leading-relaxed">
                    This is the start of the #{channel?.name || "channel"} channel. Send a message below to start collaborating in real-time.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                  const senderName = msg.sender?.name || (isMe ? "You" : "Teammate");
                  const senderAvatar = msg.sender?.avatar;

                  return (
                    <div key={msg._id || i} className="flex gap-3 items-start group">
                      {senderAvatar ? (
                        <img
                          src={senderAvatar}
                          alt={senderName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-border">
                          {(senderName || "U")[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-xs text-text-heading">
                            {senderName}
                          </span>
                          <span className="font-mono text-[10px] text-text-muted">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-text-body bg-bg-surface-elevated/50 p-3 rounded-2xl rounded-tl-sm border border-border leading-relaxed inline-block max-w-2xl">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Typing Indicator */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="text-[11px] text-text-muted italic px-2 py-1 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                <span>{Object.values(typingUsers).join(", ")} is typing...</span>
              </div>
            )}

            {/* Message Composer */}
            <form onSubmit={sendMessage} className="pt-3 border-t border-border flex gap-2 shrink-0">
              <input
                type="text"
                value={content}
                onChange={handleTyping}
                placeholder={`Message #${channel?.name || "engineering"}...`}
                className="flex-1 bg-bg-canvas border border-border rounded-xl px-4 py-2.5 text-xs text-text-heading placeholder-text-muted/60 outline-none focus:border-accent transition font-medium"
              />
              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="btn-brand-accent px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
