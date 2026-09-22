import { useState } from "react";
import { toast } from "react-hot-toast";
import API from "../services/api";

const InviteModal = ({ workspaceId, onClose, onInviteSent, isOpen = false }) => {
  const [email,     setEmail]     = useState("");
  const [role,      setRole]      = useState("member");
  const [loading,   setLoading]   = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [emailSent, setEmailSent]   = useState(false);

  if (!isOpen) return null;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    const loadingToast = toast.loading("Sending invitation…");
    try {
      setLoading(true);
      const res = await API.post(`/workspaces/${workspaceId}/invite`, {
        email: email.trim(),
        role,
      });

      const data = res.data;
      setInviteLink(data.inviteLink || null);
      setEmailSent(data.emailSent || false);

      if (data.emailSent) {
        toast.success(`Invite emailed to ${email} ✓`, { id: loadingToast });
      } else {
        toast.success("Invite link generated — copy it below", { id: loadingToast });
      }

      onInviteSent?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send invitation", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => toast.success("Link copied!"));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.15s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg-surface border border-border rounded-3xl p-8 shadow-2xl animate-[modalIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)] text-text-heading"
      >
        <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-5 text-accent shadow-sm">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-text-heading mb-1 tracking-tight">
          Invite a Member
        </h2>
        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          They must already have a DevCollab account. Enter their registered email address.
        </p>

        <form onSubmit={handleInvite}>
          <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-canvas text-text-heading text-sm outline-none mb-5 focus:border-accent transition placeholder-text-muted/50"
          />

          <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
            Assign Role
          </label>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setRole("member")}
              className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2 ${
                role === "member"
                  ? "bg-accent/15 border-accent text-accent font-bold"
                  : "bg-bg-canvas border-border text-text-muted hover:text-text-heading"
              }`}
            >
              <span className="text-sm">👤</span> Member
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2 ${
                role === "admin"
                  ? "bg-accent/15 border-accent text-accent font-bold"
                  : "bg-bg-canvas border-border text-text-muted hover:text-text-heading"
              }`}
            >
              <span className="text-sm">🛡️</span> Admin
            </button>
          </div>

          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-text-muted mb-6 flex items-start gap-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="mt-0.5 shrink-0 text-accent"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="leading-relaxed">
              {role === "admin"
                ? "Admins can invite others, create projects, and manage tasks."
                : "Members can view projects and manage tasks assigned to them."}
            </span>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-border text-text-muted hover:text-text-heading text-xs font-semibold cursor-pointer transition bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 px-5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? "Sending…" : "Send Invite"}
            </button>
          </div>

          {/* ── Invite link panel (after invite created) ── */}
          {inviteLink && (
            <div className={`mt-5 p-3.5 rounded-xl border ${emailSent ? "bg-emerald-500/10 border-emerald-500/25" : "bg-amber-500/10 border-amber-500/25"}`}>
              <div className={`text-xs font-bold mb-2 ${emailSent ? "text-emerald-500" : "text-amber-500"}`}>
                {emailSent ? "✓ Email sent! Share this link too:" : "⚠ Email not sent — share this link manually:"}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 text-[11px] text-text-muted bg-bg-canvas border border-border rounded-lg p-2 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {inviteLink}
                </div>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 bg-accent/20 border border-accent/30 rounded-lg px-3 py-2 text-accent text-xs font-bold cursor-pointer hover:bg-accent/30 transition"
                >
                  Copy
                </button>
              </div>
              {emailSent && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full mt-3 bg-accent hover:bg-accent-hover border-none rounded-xl py-2 text-white text-xs font-bold cursor-pointer transition"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.92) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default InviteModal;
