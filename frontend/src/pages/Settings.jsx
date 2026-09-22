import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useWorkspace } from "../context/WorkspaceContext";
import AppShell from "../components/AppShell";
import { toast } from "react-hot-toast";
import { getStoredUser } from "../utils/auth";
import {
  GitBranch,
  Check,
  Unlink,
  FolderGit2,
  ArrowLeft,
  ExternalLink,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";

const IconGithub = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

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
    } catch {
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
    } catch {
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
        defaultBranch: repo.defaultBranch,
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
    } catch {
      toast.error("Failed to unlink repository");
    } finally {
      setLinking(false);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="bg-bg-canvas min-h-screen text-text-heading transition-colors py-10 px-4 sm:px-6 select-none">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <span>Workspace Settings</span>
                  <SettingsIcon className="w-5 h-5 brand-accent-text" />
                </h1>
                <p className="text-xs opacity-70 mt-0.5">
                  Manage external integrations, version control repositories, and workspace sync.
                </p>
              </div>
            </div>
            {activeWorkspace && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-inherit">
                {activeWorkspace.name}
              </span>
            )}
          </div>

          {/* User GitHub Connection Card */}
          <section className="saas-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 brand-accent-text flex items-center justify-center shadow-xs">
                <IconGithub />
              </div>
              <div>
                <h2 className="text-base font-bold m-0">GitHub Account Connection</h2>
                <p className="text-xs opacity-70 m-0">Sync your personal GitHub identity for PR and commit tracking.</p>
              </div>
            </div>

            {loading ? (
              <div className="h-16 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
            ) : ghProfile?.connected ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 px-6">
                <div className="flex items-center gap-4">
                  <img
                    src={ghProfile.avatarUrl}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-emerald-500/40"
                  />
                  <div>
                    <div className="text-sm font-bold text-emerald-500 flex items-center gap-1.5">
                      Connected as {ghProfile.login} <Check className="w-4 h-4" />
                    </div>
                    <div className="text-xs opacity-60">
                      Since {new Date(ghProfile.connectedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={disconnectGitHub}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs opacity-70 mb-5">
                  Connect your GitHub account to enable branch automation and PR tracking.
                </p>
                <button
                  onClick={connectGitHub}
                  className="btn-brand-accent px-6 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer inline-flex items-center gap-2 shadow-md transition"
                >
                  <IconGithub /> <span>Connect GitHub</span>
                </button>
              </div>
            )}
          </section>

          {/* Workspace Repo Link Card */}
          <section className="saas-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 brand-accent-text flex items-center justify-center shadow-xs">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold m-0">Workspace Repository</h2>
                <p className="text-xs opacity-70 m-0">
                  Link a GitHub repo to <strong className="font-semibold">{activeWorkspace?.name || "Active Workspace"}</strong>.
                </p>
              </div>
            </div>

            {!activeWorkspace ? (
              <div className="p-6 text-center opacity-60 text-xs border border-dashed border-inherit rounded-2xl">
                Select a workspace from the top menu to manage its integrations.
              </div>
            ) : activeWorkspace.github?.repoFullName ? (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 px-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconGithub />
                    <div>
                      <div className="text-sm font-bold brand-accent-text">{activeWorkspace.github.repoFullName}</div>
                      <div className="text-xs opacity-60">
                        Default branch: <strong className="font-semibold">{activeWorkspace.github.defaultBranch}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <a
                      href={activeWorkspace.github.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-inherit rounded-xl px-3.5 py-2 text-xs font-bold no-underline transition flex items-center gap-1.5"
                    >
                      <span>Open GitHub</span> <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={unlinkRepo}
                      disabled={linking}
                      className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Unlink className="w-3.5 h-3.5" /> {linking ? "Unlinking..." : "Unlink"}
                    </button>
                  </div>
                </div>
                <div className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Webhook active — commits and pull requests sync automatically
                </div>
              </div>
            ) : !ghProfile?.connected ? (
              <div className="text-center py-6 opacity-60 text-xs border border-dashed border-inherit rounded-2xl">
                Connect your GitHub account above to link a repository.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    placeholder="Search your repositories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl pl-8 pr-4 py-2.5 text-xs outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredRepos.length === 0 ? (
                    <div className="py-6 text-center opacity-60 text-xs border border-dashed border-inherit rounded-xl">
                      No repositories found
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        className="flex items-center justify-between p-3 px-4 bg-black/5 dark:bg-white/5 border border-inherit rounded-xl hover:border-accent/40 transition"
                      >
                        <div>
                          <div className="text-xs font-bold">{repo.fullName}</div>
                          {repo.private && (
                            <span className="text-[10px] brand-accent-text bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded mt-1 inline-block">
                              Private
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => linkRepo(repo)}
                          disabled={linking}
                          className="btn-brand-accent rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-xs"
                        >
                          {linking ? "Linking..." : "Link"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
