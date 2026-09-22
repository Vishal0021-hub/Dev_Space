import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import { toast } from "react-hot-toast";
import {
  Folder,
  ArrowLeft,
  ArrowRight,
  Activity,
  Users,
  Plus,
  Settings as SettingsIcon,
  X,
  Kanban,
  Sparkles,
  Calendar,
} from "lucide-react";
import AppShell from "../components/AppShell";
import NotificationBell from "../components/NotificationBell";
import MembersSidebar from "../components/MembersSidebar";
import InviteModal from "../components/InviteModal";
import ActivityLog from "../components/ActivityLog";
import { useWorkspace } from "../context/WorkspaceContext";
import { getStoredUserId } from "../utils/auth";

export default function Projects() {
  const { workspaceId: paramWorkspaceId } = useParams();
  const navigate = useNavigate();
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useWorkspace();

  const currentWorkspaceId = paramWorkspaceId || activeWorkspace?._id || (workspaces?.length > 0 ? workspaces[0]._id : null);

  const [projects, setProjects] = useState([]);
  const [workspace, setWorkspace] = useState(activeWorkspace || null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState("member");

  // Sidebars / Modals
  const [showMembers, setShowMembers] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // New Project Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentWorkspaceId) {
      fetchWorkspace();
      fetchProjects();
      fetchMembers();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId]);

  const fetchWorkspace = async () => {
    if (!currentWorkspaceId) return;
    try {
      let current = workspaces?.find((w) => w._id === currentWorkspaceId);
      if (!current) {
        const res = await API.get("/workspaces");
        const list = Array.isArray(res.data) ? res.data : res.data?.workspaces || [];
        current = list.find((w) => w._id === currentWorkspaceId);
      }
      if (current) {
        setWorkspace(current);
        if (activeWorkspace?._id !== current._id) {
          setActiveWorkspace(current);
        }
        const userId = getStoredUserId();
        const m = current.members?.find(
          (mb) => mb.userId?.toString() === userId || mb.userId?._id?.toString() === userId
        );
        if (m) setUserRole(m.role);
      }
    } catch (err) {
      console.error("fetchWorkspace error:", err);
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspaceId) return;
    try {
      const res = await API.get(`/workspaces/${currentWorkspaceId}/members`);
      const list = Array.isArray(res.data) ? res.data : res.data?.members || [];
      setMembers(list);
    } catch (err) {
      console.error("fetchMembers:", err);
    }
  };

  const fetchProjects = async () => {
    if (!currentWorkspaceId) return;
    try {
      setLoading(true);
      const res = await API.get(`/projects/${currentWorkspaceId}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.projects || [];
      setProjects(list);
    } catch (err) {
      console.error("Error fetching projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspaceId) return;
    setCreating(true);
    const t = toast.loading("Creating project…");
    try {
      const res = await API.post("/projects", {
        name: name.trim(),
        workspaceId: currentWorkspaceId,
        description: description.trim(),
      });
      toast.success("Project created!", { id: t });
      setProjects((prev) => [...prev, res.data]);
      setName("");
      setDescription("");
      setIsModalOpen(false);

      // Auto remember this project and navigate to its Kanban board
      localStorage.setItem("devspace_last_project", res.data._id);
      navigate(`/boards/${res.data._id}`, { state: { workspaceId: currentWorkspaceId } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project", { id: t });
    } finally {
      setCreating(false);
    }
  };

  const isAdmin = userRole === "owner" || userRole === "admin";

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-bg-canvas text-text-heading transition-colors select-none">
        {/* ========================================================================= */}
        {/* SUBHEADER: Breadcrumb + Action Controls                                   */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-border bg-bg-surface/70 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-transparent border-none cursor-pointer text-text-muted hover:text-text-heading flex items-center p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border opacity-30" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Workspace</div>
              <div className="text-sm font-bold text-text-heading truncate max-w-[140px] sm:max-w-xs">
                {workspace?.name || activeWorkspace?.name || "DevSpace Workspace"}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-2 items-center">
            <NotificationBell />
            <button
              onClick={() => setShowActivity((p) => !p)}
              className={`border rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer transition ${
                showActivity
                  ? "bg-accent/15 border-accent text-accent"
                  : "bg-bg-canvas border-border text-text-muted hover:text-text-heading"
              }`}
              title="Activity Log"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMembers((p) => !p)}
              className={`border rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer transition ${
                showMembers
                  ? "bg-accent/15 border-accent text-accent"
                  : "bg-bg-canvas border-border text-text-muted hover:text-text-heading"
              }`}
              title="Workspace Members"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="bg-bg-canvas hover:bg-bg-surface-elevated border border-border rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer text-text-muted hover:text-text-heading transition"
              title="Workspace Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-brand-accent rounded-xl px-3.5 py-1.5 text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Project</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN CONTENT AREA: REAL PROJECT CARDS GRID                                */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
                  <span>Workspace Projects</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                    {projects.length} {projects.length === 1 ? "Project" : "Projects"}
                  </span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Each project provides a dedicated Kanban board with customizable columns, tasks, and sprint tracking.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="saas-card p-6 h-48 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10" />
                      <div className="w-3/4 h-4 rounded bg-black/10 dark:bg-white/10" />
                      <div className="w-1/2 h-3 rounded bg-black/10 dark:bg-white/10" />
                    </div>
                    <div className="w-full h-8 rounded-xl bg-black/5 dark:bg-white/5" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              /* ── CLEAN MODERN EMPTY STATE (ZERO ROCKET EMOJIS) ── */
              <div className="saas-card p-12 text-center max-w-lg mx-auto my-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center text-accent shadow-sm">
                  <Folder className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-heading">No Projects Yet</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-sm leading-relaxed">
                    Create your first project board to start tracking sprints, managing tasks, and collaborating with your team.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-brand-accent px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Project</span>
                </button>
              </div>
            ) : (
              /* ── REAL DYNAMIC PROJECT CARDS ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      localStorage.setItem("devspace_last_project", p._id);
                      navigate(`/boards/${p._id}`, { state: { workspaceId: currentWorkspaceId } });
                    }}
                    className="saas-card p-6 cursor-pointer hover:border-accent/40 transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shadow-xs">
                          <Folder className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-border font-bold text-text-muted">
                          Kanban Board
                        </span>
                      </div>
                      <h3 className="text-base font-black mb-1.5 group-hover:text-accent transition text-text-heading">
                        {p.name}
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-4">
                        {p.description || "Active sprint workspace for sprint engineering and cross-team collaboration."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Active Project"}
                      </span>
                      <span className="font-bold brand-accent-text flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Open Board <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add Project Card Trigger */}
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="border-2 border-dashed border-border hover:border-accent/50 rounded-3xl p-6 cursor-pointer flex flex-col items-center justify-center text-center gap-3 opacity-70 hover:opacity-100 transition min-h-[190px]"
                >
                  <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Plus className="w-5 h-5 brand-accent-text" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-heading">New Project Board</div>
                    <div className="text-[11px] text-text-muted mt-0.5">Add another project to this workspace</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CREATE PROJECT MODAL                                                      */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-md saas-card p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-text-heading">Create New Project</h3>
                  <p className="text-xs text-text-muted mt-0.5">Add a project Kanban board to {workspace?.name || "your workspace"}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={createProject} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-text-heading mb-1.5">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core Engine, Mobile App, Web Platform..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-canvas border border-border rounded-xl focus:border-accent outline-none text-text-heading font-medium transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-heading mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="What is this project focused on?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-canvas border border-border rounded-xl focus:border-accent outline-none text-text-heading font-medium transition resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-text-muted hover:text-text-heading transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="btn-brand-accent px-5 py-2 rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
                  >
                    {creating ? "Creating…" : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sidebars & Modals */}
        <MembersSidebar
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
          members={members}
          workspaceId={currentWorkspaceId}
          onInvite={() => setIsInviteOpen(true)}
          currentUserRole={userRole}
          onMembersChange={fetchMembers}
        />

        <ActivityLog
          isOpen={showActivity}
          onClose={() => setShowActivity(false)}
          workspaceId={currentWorkspaceId}
        />

        <InviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          workspaceId={currentWorkspaceId}
        />
      </div>
    </AppShell>
  );
}