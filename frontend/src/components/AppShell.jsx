import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Kanban,
  LayoutGrid,
  Table as TableIcon,
  MessageSquare,
  Search,
  Sun,
  Moon,
  UserPlus,
  ChevronDown,
  Plus,
  Hash,
  Lock,
  Settings,
  LogOut,
  MoreVertical,
  Edit3,
  Trash2,
  X,
  Users,
  Check,
  BarChart3,
  Calendar,
  Folder,
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useTheme, THEMES } from "../context/ThemeContext";
import API from "../services/api";
import { toast } from "react-hot-toast";
import { getStoredUser } from "../utils/auth";
import InviteModal from "./InviteModal";

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    channels,
    members,
    userRole,
    loadingChannels,
    refreshWorkspaces,
    refreshChannels,
    refreshMembers,
  } = useWorkspace();

  const user = getStoredUser();

  // Dropdown states
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  const [renamingWs, setRenamingWs] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [renamingLoading, setRenamingLoading] = useState(false);

  const [deletingWs, setDeletingWs] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Close dropdowns on outside click
  const navRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setWsDropdownOpen(false);
        setChatDropdownOpen(false);
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Remember active project for the "Board" nav button
  useEffect(() => {
    const match = location.pathname.match(/\/boards\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      localStorage.setItem("devspace_last_project", match[1]);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const res = await API.post("/workspaces", { name: newWsName.trim() });
      toast.success(`Workspace "${res.data.name}" created!`);
      setNewWsName("");
      setShowNewWsModal(false);
      await refreshWorkspaces();
      setActiveWorkspace(res.data);
      navigate(`/projects/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setCreatingWs(false);
    }
  };

  const handleRenameWorkspace = async (e) => {
    e.preventDefault();
    if (!renamingWs || !renameInput.trim()) return;
    setRenamingLoading(true);
    const loadingToast = toast.loading("Updating workspace name...");
    try {
      const res = await API.put(`/workspaces/${renamingWs._id}`, { name: renameInput.trim() });
      toast.success("Workspace renamed successfully!", { id: loadingToast });
      setRenamingWs(null);
      await refreshWorkspaces();
      if (activeWorkspace?._id === renamingWs._id) {
        setActiveWorkspace(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rename workspace", { id: loadingToast });
    } finally {
      setRenamingLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deletingWs) return;
    setDeletingLoading(true);
    const loadingToast = toast.loading("Deleting workspace...");
    try {
      await API.delete(`/workspaces/${deletingWs._id}`);
      toast.success("Workspace deleted successfully!", { id: loadingToast });
      const deletedId = deletingWs._id;
      setDeletingWs(null);
      await refreshWorkspaces();
      if (activeWorkspace?._id === deletedId) {
        const remaining = workspaces.filter((w) => w._id !== deletedId);
        if (remaining.length > 0) {
          setActiveWorkspace(remaining[0]);
          navigate(`/projects/${remaining[0]._id}`);
        } else {
          setActiveWorkspace(null);
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete workspace", { id: loadingToast });
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeWorkspace) return;
    setCreatingChannel(true);
    try {
      const res = await API.post("/channels", {
        name: newChannelName.trim(),
        workspaceId: activeWorkspace._id,
      });
      toast.success(`#${res.data.name} created!`);
      setNewChannelName("");
      setShowNewChannelModal(false);
      refreshChannels();
      navigate(`/channels/${res.data._id}?workspaceId=${activeWorkspace._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create channel");
    } finally {
      setCreatingChannel(false);
    }
  };

  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  // Nav destinations
  const lastProject = localStorage.getItem("devspace_last_project");
  const boardLink = lastProject
    ? `/boards/${lastProject}`
    : activeWorkspace
    ? `/projects/${activeWorkspace._id}`
    : "/projects";

  const projectsLink = activeWorkspace ? `/projects/${activeWorkspace._id}` : "/projects";
  const firstChannel = channels.length > 0 ? channels[0]._id : null;
  const chatLink = firstChannel && activeWorkspace
    ? `/channels/${firstChannel}?workspaceId=${activeWorkspace._id}`
    : "/channels";
  const meetingsLink = activeWorkspace ? `/meetings/${activeWorkspace._id}` : "/dashboard";
  const analyticsLink = activeWorkspace ? `/analytics/${activeWorkspace._id}` : "/dashboard";

  const isDashboardActive = location.pathname === "/dashboard";
  const isProjectsActive = location.pathname.startsWith("/projects");
  const isBoardActive = location.pathname.startsWith("/boards") || location.pathname === "/board";
  const isChatActive = location.pathname.startsWith("/channels") || location.pathname.startsWith("/dm");
  const isMeetingsActive = location.pathname.startsWith("/meetings");
  const isAnalyticsActive = location.pathname.startsWith("/analytics");

  // Teammates filter
  const otherMembers = members.filter((m) => {
    const memberId = m.userId?._id || m.userId;
    return memberId?.toString() !== user?._id?.toString();
  });

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans transition-colors duration-250 select-none"
      style={{ backgroundColor: "var(--bg-canvas)", color: "var(--text-heading)" }}
    >
      {/* ========================================================================= */}
      {/* 1. HORIZONTAL TOP NAVIGATION BAR                                         */}
      {/* ========================================================================= */}
      <header
        ref={navRef}
        id="unified-top-navbar"
        className="h-16 px-4 sm:px-6 border-b flex items-center justify-between gap-3 sticky top-0 z-40 transition-colors"
        style={{ backgroundColor: "var(--bg-canvas)", borderColor: "var(--border)", color: "var(--text-heading)" }}
      >
        {/* ── LEFT: Logo + Workspace Dropdown + Primary Navigation Pills ──────── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Brand Monogram & Workspace Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setWsDropdownOpen((prev) => !prev);
                setChatDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-inherit transition group cursor-pointer"
            >
              <div
                id="app-logo-badge"
                className="w-8 h-8 rounded-xl brand-accent-bg flex items-center justify-center font-black text-xs font-mono shadow-md flex-shrink-0"
                style={{ color: "var(--accent-contrast)" }}
              >
                {activeWorkspace?.name ? activeWorkspace.name.slice(0, 2).toUpperCase() : "DS"}
              </div>
              <div className="flex items-center gap-1.5 font-bold text-sm leading-none text-left">
                <span className="tracking-tight max-w-[120px] sm:max-w-[160px] truncate">
                  {activeWorkspace?.name || (workspaces?.length > 0 ? "Select Workspace" : "No Workspace")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition" />
              </div>
            </button>

            {/* Workspace Switcher Menu Dropdown */}
            {wsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-bg-surface border border-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-3 py-1.5">
                  Switch Workspace
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {workspaces.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-text-muted text-center">
                      No workspaces created yet
                    </div>
                  ) : (
                    workspaces.map((ws) => {
                    const isSelected = activeWorkspace?._id === ws._id;
                    return (
                      <div
                        key={ws._id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                          isSelected
                            ? "bg-accent/15 text-accent border border-accent/20"
                            : "text-text-body hover:bg-bg-canvas"
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 flex-1 truncate mr-2"
                          onClick={() => {
                            setActiveWorkspace(ws);
                            setWsDropdownOpen(false);
                            navigate(`/projects/${ws._id}`);
                          }}
                        >
                          <div className="w-6 h-6 rounded-lg bg-bg-surface-elevated flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {ws.name?.[0]?.toUpperCase() || "W"}
                          </div>
                          <span className="truncate">{ws.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-accent ml-auto flex-shrink-0" />}
                        </div>

                        {/* Workspace actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWsDropdownOpen(false);
                              setRenamingWs(ws);
                              setRenameInput(ws.name);
                            }}
                            className="p-1 rounded-lg hover:bg-bg-canvas text-text-muted hover:text-text-heading transition"
                            title="Rename"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWsDropdownOpen(false);
                              setDeletingWs(ws);
                            }}
                            className="p-1 rounded-lg hover:bg-rose-500/15 text-text-muted hover:text-rose-500 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

                <div className="pt-2 mt-2 border-t border-border">
                  <button
                    onClick={() => {
                      setWsDropdownOpen(false);
                      setShowNewWsModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-border hover:border-accent text-xs font-semibold text-text-muted hover:text-accent transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block h-5 w-px bg-border opacity-30"></div>

          {/* PRIMARY NAV PILLS (Clean, punchy, uncrowded!) */}
          <nav className="hidden md:flex items-center bg-black/5 dark:bg-black/40 border border-border p-1 rounded-2xl gap-1">
            <Link
              to="/dashboard"
              className={`nav-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isDashboardActive
                  ? "active brand-accent-text bg-amber-500/15"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              to={projectsLink}
              className={`nav-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isProjectsActive
                  ? "active brand-accent-text bg-amber-500/15"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Projects</span>
            </Link>

            <Link
              to={boardLink}
              className={`nav-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isBoardActive
                  ? "active brand-accent-text bg-amber-500/15"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-purple-400" />
              <span>Board</span>
            </Link>

            {/* Chat Pill with quick dropdown toggle */}
            <div className="relative">
              <div
                className={`flex items-center rounded-xl text-xs font-bold transition ${
                  isChatActive
                    ? "active brand-accent-text bg-amber-500/15"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Link to={chatLink} className="px-3 py-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                  <span>Chat</span>
                </Link>
                <button
                  onClick={() => {
                    setChatDropdownOpen((prev) => !prev);
                    setWsDropdownOpen(false);
                    setProfileDropdownOpen(false);
                  }}
                  className="pr-2 pl-0.5 py-1.5 opacity-60 hover:opacity-100"
                  title="Channels & DMs"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Chat & Channels Drawer Menu */}
              {chatDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-bg-surface border border-border rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Channels</span>
                    <button
                      onClick={() => {
                        setChatDropdownOpen(false);
                        setShowNewChannelModal(true);
                      }}
                      className="text-accent hover:text-accent-hover text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>

                  <div className="py-2 space-y-1 max-h-40 overflow-y-auto">
                    {loadingChannels ? (
                      <div className="text-xs text-text-muted px-2 py-1">Loading channels...</div>
                    ) : channels.length === 0 ? (
                      <div className="text-xs text-text-muted px-2 py-1">No channels yet</div>
                    ) : (
                      channels.map((ch) => (
                        <Link
                          key={ch._id}
                          to={`/channels/${ch._id}?workspaceId=${activeWorkspace?._id}`}
                          onClick={() => setChatDropdownOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-text-body hover:bg-bg-canvas hover:text-text-heading transition"
                        >
                          {ch.isPrivate ? <Lock className="w-3 h-3 text-text-muted" /> : <Hash className="w-3 h-3 text-text-muted" />}
                          <span className="truncate">{ch.name}</span>
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                      Direct Messages
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {otherMembers.length === 0 ? (
                        <div className="text-xs text-text-muted px-2 py-1">No teammates yet</div>
                      ) : (
                        otherMembers.map((m) => {
                          const mId = m.userId?._id || m.userId;
                          const mName = m.userId?.name || "Teammate";
                          return (
                            <Link
                              key={mId}
                              to={`/dm/${mId}?workspaceId=${activeWorkspace?._id}`}
                              onClick={() => setChatDropdownOpen(false)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-text-body hover:bg-bg-canvas hover:text-text-heading transition"
                            >
                              <div className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold text-[10px] flex items-center justify-center">
                                {mName[0]?.toUpperCase()}
                              </div>
                              <span className="truncate">{mName}</span>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              to={meetingsLink}
              className={`nav-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isMeetingsActive
                  ? "active brand-accent-text bg-amber-500/15"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">Meetings</span>
            </Link>

            <Link
              to={analyticsLink}
              className={`nav-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isAnalyticsActive
                  ? "active brand-accent-text bg-amber-500/15"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Analytics</span>
            </Link>
          </nav>
        </div>

        {/* ── RIGHT: Search, Dual Theme Toggle, Teammate Stack, Invite, Profile ─ */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Quick Search capsule */}
          <button
            onClick={openSearch}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-black/40 border border-border text-xs opacity-70 hover:opacity-100 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Search issues...</span>
            <kbd className="font-mono text-[10px] bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>

          {/* ========================================================================= */}
          {/* THE HERO DUAL THEME TOGGLE: ☀️ DAYLIGHT vs 🌙 WARM DARK                 */}
          {/* ========================================================================= */}
          <div className="flex items-center bg-black/5 dark:bg-black/50 border border-border p-1 rounded-2xl shadow-inner gap-1">
            <button
              onClick={() => setTheme(THEMES.DAYLIGHT)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === THEMES.DAYLIGHT
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Daylight Clean Light (Cashmere White, High Contrast)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Daylight</span>
            </button>

            <button
              onClick={() => setTheme(THEMES.WARM_DARK)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === THEMES.WARM_DARK
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="HeroUI Warm Dark (Warm Stone, Amber Glow)"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Warm Dark</span>
            </button>
          </div>

          {/* Teammate Presence Stack (Only rendered when real members exist) */}
          {otherMembers.length > 0 && (
            <div className="hidden xl:flex items-center -space-x-1.5">
              {otherMembers.slice(0, 3).map((m, idx) => {
                const u = m.userId || {};
                const name = u.name || "Member";
                return u.avatar ? (
                  <img
                    key={u._id || idx}
                    src={u.avatar}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-border"
                    title={name}
                    alt={name}
                  />
                ) : (
                  <div
                    key={u._id || idx}
                    className="w-7 h-7 rounded-full bg-accent/20 text-accent font-bold text-[10px] flex items-center justify-center ring-2 ring-border"
                    title={name}
                  >
                    {(name[0] || "M").toUpperCase()}
                  </div>
                );
              })}
              {otherMembers.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 text-text-muted font-bold text-[10px] flex items-center justify-center ring-2 ring-border">
                  +{otherMembers.length - 3}
                </div>
              )}
            </div>
          )}

          {/* + Invite Button */}
          {activeWorkspace && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-brand-accent px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </button>
          )}

          {/* User Avatar & Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen((prev) => !prev);
                setWsDropdownOpen(false);
                setChatDropdownOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-bold text-xs text-accent cursor-pointer hover:scale-105 transition overflow-hidden"
              title={user?.name || "User Profile"}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                user?.name
                  ? user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"
              )}
            </button>

            {profileDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-bg-surface border border-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <div className="font-bold text-xs text-text-heading truncate">{user?.name || "User"}</div>
                  <div className="text-[11px] text-text-muted truncate">{user?.email || ""}</div>
                  {userRole && (
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                      {userRole}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-text-body hover:bg-bg-canvas hover:text-text-heading transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-text-muted" />
                    <span>Workspace Settings</span>
                  </Link>

                  {activeWorkspace && (
                    <>
                      <Link
                        to={`/analytics/${activeWorkspace._id}`}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-text-body hover:bg-bg-canvas hover:text-text-heading transition"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-text-muted" />
                        <span>Analytics</span>
                      </Link>

                      <Link
                        to={`/meetings/${activeWorkspace._id}`}
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-text-body hover:bg-bg-canvas hover:text-text-heading transition"
                      >
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        <span>Meeting Notes</span>
                      </Link>
                    </>
                  )}
                </div>

                <div className="pt-1 mt-1 border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION CONTENT VIEWPORT (Edge-to-edge, zero outer line borders)*/}
      {/* ========================================================================= */}
      <main className="flex-1 w-full flex flex-col overflow-auto bg-bg-canvas text-text-body">
        {children}
      </main>

      {/* ========================================================================= */}
      {/* 3. RESPONSIVE MOBILE FLOATING DOCK (Thumb navigation for smaller viewports)*/}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-4 inset-x-4 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto saas-card px-3 py-2 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-2 border border-inherit">
          <Link
            to="/dashboard"
            className={`p-2.5 rounded-xl transition ${
              isDashboardActive ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
            }`}
            title="Dashboard"
          >
            <LayoutGrid className="w-5 h-5 text-sky-400" />
          </Link>
          <Link
            to={projectsLink}
            className={`p-2.5 rounded-xl transition ${
              isProjectsActive ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
            }`}
            title="Projects"
          >
            <Folder className="w-5 h-5 text-amber-400" />
          </Link>
          <Link
            to={boardLink}
            className={`p-2.5 rounded-xl transition ${
              isBoardActive ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
            }`}
            title="Board"
          >
            <Kanban className="w-5 h-5 text-purple-400" />
          </Link>
          <Link
            to={chatLink}
            className={`p-2.5 rounded-xl transition ${
              isChatActive ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
            }`}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5 text-rose-400" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. WORKSPACE MODALS                                                       */}
      {/* ========================================================================= */}

      {/* ── Create Workspace Modal ── */}
      {showNewWsModal && (
        <div
          onClick={() => setShowNewWsModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-bg-surface border border-border p-6 rounded-3xl shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-text-heading">Create New Workspace</h3>
              <button
                onClick={() => setShowNewWsModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-heading"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-body mb-1">Workspace Name</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Engineering Space"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-bg-canvas border border-border rounded-xl px-3 py-2 text-xs text-text-heading focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWsModal(false)}
                  className="px-3.5 py-1.5 rounded-xl font-semibold text-text-muted hover:text-text-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingWs}
                  className="bg-accent hover:bg-accent-hover text-bg-canvas font-bold px-4 py-1.5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {creatingWs ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rename Workspace Modal ── */}
      {renamingWs && (
        <div
          onClick={() => setRenamingWs(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-bg-surface border border-border p-6 rounded-3xl shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-text-heading">Rename Workspace</h3>
              <button
                onClick={() => setRenamingWs(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-heading"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameWorkspace} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-body mb-1">Workspace Name</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="w-full bg-bg-canvas border border-border rounded-xl px-3 py-2 text-xs text-text-heading focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingWs(null)}
                  className="px-3.5 py-1.5 rounded-xl font-semibold text-text-muted hover:text-text-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renamingLoading}
                  className="bg-accent hover:bg-accent-hover text-bg-canvas font-bold px-4 py-1.5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {renamingLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Workspace Modal ── */}
      {deletingWs && (
        <div
          onClick={() => setDeletingWs(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-bg-surface border border-rose-500/30 p-6 rounded-3xl shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-text-heading">Delete Workspace?</h3>
                <p className="text-xs text-text-muted">This action is irreversible.</p>
              </div>
            </div>
            <p className="text-xs text-text-body leading-relaxed my-3">
              Are you sure you want to delete <strong className="text-text-heading">"{deletingWs.name}"</strong>? All associated projects, boards, channels, and tasks will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWs(null)}
                className="px-3.5 py-1.5 rounded-xl font-semibold text-text-muted hover:text-text-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={deletingLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {deletingLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Channel Modal ── */}
      {showNewChannelModal && (
        <div
          onClick={() => setShowNewChannelModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-bg-surface border border-border p-6 rounded-3xl shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-text-heading">Create Channel</h3>
              <button
                onClick={() => setShowNewChannelModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-heading"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-body mb-1">Channel Name</label>
                <div className="flex items-center bg-bg-canvas border border-border rounded-xl px-3 py-2 text-xs focus-within:border-accent">
                  <Hash className="w-3.5 h-3.5 text-text-muted mr-1.5" />
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. backend-sprint"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-transparent text-text-heading focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="px-3.5 py-1.5 rounded-xl font-semibold text-text-muted hover:text-text-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingChannel}
                  className="bg-accent hover:bg-accent-hover text-bg-canvas font-bold px-4 py-1.5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {creatingChannel ? "Creating..." : "Create Channel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Workspace Invite Modal ── */}
      {showInviteModal && activeWorkspace && (
        <InviteModal
          workspaceId={activeWorkspace._id}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => {
            setShowInviteModal(false);
            refreshMembers?.();
          }}
        />
      )}
    </div>
  );
}
