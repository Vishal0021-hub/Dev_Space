import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-hot-toast";
import {
  Send,
  ArrowLeft,
  MessageSquare,
  User,
} from "lucide-react";
import AppShell from "../components/AppShell";
import NotificationBell from "../components/NotificationBell";
import { useSocket } from "../context/SocketContext";
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

export default function DMView() {
  const { recipientId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const navigate = useNavigate();

  const [recipient, setRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipTyping, setRecipTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const typingTout = useRef(null);
  const user = getStoredUser();
  const { socket } = useSocket();

  useEffect(() => {
    if (recipientId && workspaceId) {
      fetchRecipient();
      fetchDMs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId, workspaceId]);

  /* ── Socket: join DM room + real-time events ── */
  useEffect(() => {
    if (!socket || !user?._id || !recipientId) return;

    socket.emit("join:dm", { myId: user._id, recipientId });

    const onNewMsg = (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
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

    socket.on("dm:newMessage", onNewMsg);
    socket.on("user:typing:dm", onTyping);
    socket.on("user:stopTyping:dm", onStopTyping);

    return () => {
      socket.off("dm:newMessage", onNewMsg);
      socket.off("user:typing:dm", onTyping);
      socket.off("user:stopTyping:dm", onStopTyping);
    };
  }, [socket, recipientId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRecipient = async () => {
    try {
      const res = await API.get(`/workspaces/${workspaceId}/members`);
      const member = res.data.find((m) => {
        const id = m.userId?._id || m.userId;
        return id?.toString() === recipientId;
      });
      if (member) setRecipient(member.userId);
    } catch {
      /* silent */
    }
  };

  const fetchDMs = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/dm/${recipientId}?workspaceId=${workspaceId}`);
      setMessages(res.data || []);
    } catch {
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
      setMessages((prev) => (prev.find((m) => m._id === res.data._id) ? prev : [...prev, res.data]));
      setContent("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const recipientName = recipient?.name || "Teammate";

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 overflow-hidden bg-bg-canvas text-text-heading select-none">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 saas-card p-4 sm:p-6 flex flex-col overflow-hidden shadow-xl border border-inherit">
            {/* Header: Recipient Name + Status */}
            <div className="pb-3 border-b border-inherit flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center ring-1 ring-inherit">
                  {recipientName[0]?.toUpperCase() || "T"}
                </div>
                <div>
                  <div className="font-bold text-sm leading-none">{recipientName}</div>
                  <div className="flex items-center gap-1.5 text-[10px] opacity-60 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Direct Encrypted Stream</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 items-start animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-black/10 dark:bg-white/10 rounded" />
                        <div className="h-4 w-1/2 bg-black/10 dark:bg-white/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-60 gap-3 py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center brand-accent-text">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Start a conversation with {recipientName}</div>
                    <div className="text-xs opacity-75 mt-0.5">Send a message to begin direct collaboration.</div>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                  const senderName = isMe ? "You" : msg.sender?.name || recipientName;

                  return (
                    <div key={msg._id || i} className="flex gap-3 items-start group">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-inherit">
                        {senderName[0]?.toUpperCase() || "T"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-bold text-xs ${isMe ? "brand-accent-text" : ""}`}>
                            {senderName}
                          </span>
                          <span className="text-[10px] font-mono opacity-50">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <p
                          className={`text-xs sm:text-sm mt-1 p-3 rounded-2xl border border-inherit max-w-xl leading-relaxed break-words ${
                            isMe
                              ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 font-medium"
                              : "bg-black/5 dark:bg-white/5"
                          }`}
                        >
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Typing indicator */}
            {recipTyping && (
              <div className="px-1 py-1 text-xs opacity-60 flex items-center gap-2 font-mono">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full brand-accent-bg inline-block animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span>{recipientName} is typing…</span>
              </div>
            )}

            {/* Composer Input Bar */}
            <form onSubmit={sendMessage} className="pt-2 shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={content}
                  onChange={handleTyping}
                  placeholder={`Message ${recipientName}...`}
                  className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none focus:border-amber-500 transition"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!content.trim() || sending}
                  className="absolute right-2 p-1.5 rounded-lg btn-brand-accent cursor-pointer disabled:opacity-30 transition"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
