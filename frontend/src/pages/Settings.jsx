import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { useWorkspace } from "../context/WorkspaceContext";
import AppShell from "../components/AppShell";
import { toast } from "react-hot-toast";
import { getStoredUser } from "../utils/auth";

const IconGithub = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
const IconCheck  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const IconUnlink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.84 15.42l1.34-1.34a5 5 0 0 0-7.08-7.08l-2.66 2.66a5 5 0 0 0 0 7.08m-1.42-1.42l-1.34 1.34a5 5 0 0 1 7.08 7.08l2.66-2.66a5 5 0 0 1 0-7.08"/><line x1="8.59" y1="15.41" x2="15.41" y2="8.59"/></svg>;

export default function Settings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useWorkspace();
  
  const [ghProfile, setGhProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState("");

  const user = getStoredUser();

  useEffect(() => {
    const status = searchParams.get("github");
    if (status === "connected") toast.success("GitHub account connected!");
    if (status === "error") toast.error("Failed to connect GitHub");
    
    fetchGitHubData();
  }, [searchParams]);

  const fetchGitHubData = async () => {
    try {
      setLoading(true);
      const profileRes = await API.get("/github/me");
      setGhProfile(profileRes.data);
      
      if (profileRes.data.connected) {
        const reposRes = await API.get("/github/repos");
        setRepos(reposRes.data);
      }
    } catch (err) {
      console.error("fetchGitHubData:", err);
    } finally {
      setLoading(false);
    }
  };

  const connectGitHub = async () => {
    try {
      const res = await API.get("/github/oauth/url");
      window.location.href = res.data.url;
    } catch (err) {
      toast.error("Failed to get OAuth URL");
    }
  };

  const disconnectGitHub = async () => {
    if (!window.confirm("Disconnect GitHub account? This will also unlink repositories from your workspaces.")) return;
    try {
      await API.delete("/github/oauth/disconnect");
      toast.success("GitHub disconnected");
      setGhProfile({ connected: false });
      setRepos([]);
    } catch (err) {
      toast.error("Failed to disconnect");
    }
  };

  const linkRepo = async (repo) => {
    if (!activeWorkspace) return;
    setLinking(true);
    try {
      const res = await API.patch(`/github/workspaces/${activeWorkspace._id}/github/link`, {
        repoOwner: repo.fullName.split("/")[0],
        repoName: repo.name,
        repoFullName: repo.fullName,
        repoUrl: repo.url,
        defaultBranch: repo.defaultBranch
      });
      toast.success("Repository linked!");
      setActiveWorkspace(res.data.workspace);
      refreshWorkspaces();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to link repository");
    } finally {
      setLinking(false);
    }
  };

  const unlinkRepo = async () => {
    if (!activeWorkspace || !window.confirm("Unlink this repository from the workspace?")) return;
    setLinking(true);
    try {
      await API.delete(`/github/workspaces/${activeWorkspace._id}/github/unlink`);
      toast.success("Repository unlinked");
      const updated = { ...activeWorkspace };
      delete updated.github;
      setActiveWorkspace(updated);
      refreshWorkspaces();
    } catch (err) {
      toast.error("Failed to unlink repository");
    } finally {
      setLinking(false);
    }
  };

  const filteredRepos = repos.filter(r => 
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div style={{ padding: "40px 60px", maxWidth: 900, margin: "0 auto", color: "#F1F5F9" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}>Settings</h1>
        <p style={{ color: "#64748B", marginBottom: 40, fontSize: 14 }}>Manage your account connections and workspace integrations.</p>

        {/* ── User GitHub Connection ── */}
        <section style={{ background: "#1E293B", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(51,65,85,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconGithub />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: "#F1F5F9" }}>GitHub Connection</h2>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Sync your projects with GitHub repositories.</p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 60, background: "#253448", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
          ) : ghProfile?.connected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 12, padding: "16px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <img src={ghProfile.avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(52,211,153,0.3)" }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: 6 }}>
                    Connected as {ghProfile.login} <IconCheck />
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Since {new Date(ghProfile.connectedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <button onClick={disconnectGitHub} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                Disconnect
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 20 }}>Connect your GitHub account to enable branch automation and PR tracking.</p>
              <button onClick={connectGitHub} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, margin: "0 auto" }}>
                <IconGithub /> Connect GitHub
              </button>
            </div>
          )}
        </section>

        {/* ── Workspace Repo Link ── */}
        <section style={{ background: "#1E293B", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: "#F1F5F9" }}>Workspace Repository</h2>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Link a GitHub repo to <strong style={{ color: "#CBD5E1" }}>{activeWorkspace?.name || "Active Workspace"}</strong>.</p>
            </div>
          </div>

          {!activeWorkspace ? (
            <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 14 }}>
              Select a workspace from the sidebar to manage its integrations.
            </div>
          ) : activeWorkspace.github?.repoFullName ? (
            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <IconGithub />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#818cf8" }}>{activeWorkspace.github.repoFullName}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Linked branch: <strong>{activeWorkspace.github.defaultBranch}</strong></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={activeWorkspace.github.repoUrl} target="_blank" rel="noreferrer" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                    Open on GitHub ↗
                  </a>
                  <button onClick={unlinkRepo} disabled={linking} style={{ background: "rgba(248,113,113,0.1)", border: "none", color: "#f87171", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <IconUnlink /> {linking ? "Unlinking..." : "Unlink"}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12, background: "rgba(52,211,153,0.1)", color: "#34d399", padding: "8px 12px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconCheck /> Webhook registered — commits and PRs will sync automatically
              </div>
            </div>
          ) : !ghProfile?.connected ? (
            <div style={{ textAlign: "center", padding: 20, color: "#64748B", fontSize: 14 }}>
              Connect your GitHub account above to link a repository.
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16 }}>
                <input 
                  placeholder="Search your repositories..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 10, padding: "12px 16px", color: "#F1F5F9", fontSize: 14, outline: "none",
                    fontFamily: "inherit"
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                {filteredRepos.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No repositories found</div>
                ) : filteredRepos.map(repo => (
                  <div key={repo.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#253448", border: "1px solid rgba(51,65,85,0.4)", borderRadius: 10, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#2d3f56"} onMouseLeave={e => e.currentTarget.style.background = "#253448"}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{repo.fullName}</div>
                      {repo.private && <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "1px 6px", borderRadius: 4, marginTop: 4, display: "inline-block" }}>Private</span>}
                    </div>
                    <button 
                      onClick={() => linkRepo(repo)} 
                      disabled={linking}
                      style={{ background: "rgba(99,102,241,0.15)", border: "none", color: "#818cf8", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      {linking ? "Linking..." : "Link"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </AppShell>
  );
}
