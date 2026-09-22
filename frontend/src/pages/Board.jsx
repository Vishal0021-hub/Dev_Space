import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import API from "../services/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";

import AppShell from "../components/AppShell";
import MembersSidebar from "../components/MembersSidebar";
import InviteModal from "../components/InviteModal";
import ActivityLog from "../components/ActivityLog";
import AssignDropdown from "../components/AssignDropdown";
import NotificationBell from "../components/NotificationBell";
import AttachmentPanel from "../components/AttachmentPanel";

import { BoardSkeleton } from "../components/Skeletons";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSocket } from "../context/SocketContext";
import { getStoredUserId } from "../utils/auth";
import {
  Plus,
  ArrowLeft,
  Trash2,
  Edit2,
  Calendar,
  Activity,
  Users,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle,
  Clock,
  GitPullRequest,
  Paperclip,
  FileText,
} from "lucide-react";

/* ─── Priority config ──────────────────────────────────────────── */
const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", bg: "bg-rose-500/15 text-rose-500 border border-rose-500/30" },
  high:   { label: "High",   bg: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
  medium: { label: "Med",    bg: "bg-amber-500/15 text-amber-500 border border-amber-500/30" },
  low:    { label: "Low",    bg: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" },
};

const STATUS_STEPS = [
  { key: "todo", label: "Todo", color: "text-slate-400", dot: "bg-slate-400" },
  { key: "inprogress", label: "In Progress", color: "brand-accent-text", dot: "brand-accent-bg animate-pulse" },
  { key: "review", label: "Review", color: "text-purple-400", dot: "bg-purple-500" },
  { key: "done", label: "Done", color: "text-emerald-500", dot: "bg-emerald-500" },
];

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
const isOverdue = (d) => d && new Date(d) < new Date();

export default function Board() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveWorkspace, workspaces, activeWorkspace } = useWorkspace();

  const [workspaceId, setWorkspaceId] = useState(location.state?.workspaceId || null);

  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState("member");
  const [activeFilter, setActiveFilter] = useState("all");

  // Sidebars
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // Column creation
  const [colName, setColName] = useState("");
  const [isColModal, setIsColModal] = useState(false);
  const [colLoading, setColLoading] = useState(false);

  // Task modal
  const [taskModal, setTaskModal] = useState(null);
  const [modalTab, setModalTab] = useState("details"); // "details" | "attachments" | "github" | "meetings"
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
    status: "todo",
  });

  const [ghUrl, setGhUrl] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState("");

  const [taskMeetings, setTaskMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Subtask creation in modal
  const [newSubtask, setNewSubtask] = useState("");

  /* ── Auto-resolve projectId if visited via /board or /boards ── */
  useEffect(() => {
    if (!projectId) {
      const last = localStorage.getItem("devspace_last_project");
      if (last) {
        navigate(`/boards/${last}`, { replace: true });
        return;
      }
      const wsId = workspaceId || activeWorkspace?._id;
      if (wsId) {
        API.get(`/projects/${wsId}`)
          .then((res) => {
            if (Array.isArray(res.data) && res.data.length > 0) {
              navigate(`/boards/${res.data[0]._id}`, { replace: true });
            } else {
              setLoading(false);
            }
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } else {
      localStorage.setItem("devspace_last_project", projectId);
      fetchProject();
      fetchBoards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, workspaceId, activeWorkspace?._id]);

  useEffect(() => {
    if (workspaceId) fetchMembers(workspaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (modalTab === "meetings" && taskModal?.task?._id) {
      setLoadingMeetings(true);
      API.get(`/meetings/task/${taskModal.task._id}`)
        .then((res) => setTaskMeetings(res.data || []))
        .catch(() => setTaskMeetings([]))
        .finally(() => setLoadingMeetings(false));
    }
  }, [modalTab, taskModal?.task?._id]);

  const fetchProject = async () => {
    if (!projectId) return;
    try {
      const res = await API.get(`/projects/details/${projectId}`);
      if (res?.data) {
        setProject(res.data);
        const wsId = res.data.workspace?._id || res.data.workspace;
        if (wsId) {
          if (!workspaceId) setWorkspaceId(wsId);
          const ws = workspaces.find((w) => w._id?.toString() === wsId?.toString());
          if (ws) setActiveWorkspace(ws);
        }
      }
    } catch (err) {
      console.error("fetchProject:", err);
    }
  };

  const fetchMembers = async (wsId) => {
    try {
      const res = await API.get(`/workspaces/${wsId}/members`);
      setMembers(Array.isArray(res.data) ? res.data : []);
      const userId = getStoredUserId();
      const m = res.data?.find(
        (mb) => mb.userId?.toString() === userId || mb.userId?._id?.toString() === userId
      );
      if (m) setUserRole(m.role);
    } catch (err) {
      console.error("fetchMembers:", err);
    }
  };

  const normalizeId = (v) => {
    if (!v) return v;
    if (typeof v === "string") return v;
    if (typeof v === "object" && v._id) return v._id.toString();
    return String(v);
  };

  /* ── Socket: join workspace room and listen for real-time task events ── */
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket || !workspaceId) return;

    socket.emit("join:workspace", workspaceId);

    const onTaskCreated = ({ task, boardId }) => {
      setTasks((prev) => {
        if (prev.find((t) => t._id === task._id)) return prev;
        return [...prev, { ...task, board: normalizeId(boardId) }];
      });
    };

    const onTaskMoved = ({ taskId, toBoardId }) => {
      setTasks((prev) =>
        prev.map((t) =>
          normalizeId(t._id) === normalizeId(taskId) ? { ...t, board: normalizeId(toBoardId) } : t
        )
      );
    };

    const onTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => normalizeId(t._id) !== normalizeId(taskId)));
    };

    const onTaskAssigned = ({ task }) => {
      setTasks((prev) =>
        prev.map((t) => (normalizeId(t._id) === normalizeId(task._id) ? { ...t, ...task } : t))
      );
    };

    const onStatusChanged = ({ taskId, status }) => {
      setTasks((prev) =>
        prev.map((t) => (normalizeId(t._id) === normalizeId(taskId) ? { ...t, status } : t))
      );
    };

    socket.on("task:created", onTaskCreated);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("task:assigned", onTaskAssigned);
    socket.on("task:statusChanged", onStatusChanged);

    return () => {
      socket.off("task:created", onTaskCreated);
      socket.off("task:moved", onTaskMoved);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("task:assigned", onTaskAssigned);
      socket.off("task:statusChanged", onStatusChanged);
    };
  }, [socket, workspaceId]);

  const fetchBoards = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await API.get(`/boards/${projectId}`);
      const boardsFromApi = Array.isArray(res.data) ? res.data : [];
      setBoards(boardsFromApi);

      const taskResults = await Promise.allSettled(
        boardsFromApi.map((b) => API.get(`/tasks/board/${b._id}`))
      );

      const allTasks = taskResults.flatMap((r, i) => {
        if (r.status === "fulfilled" && Array.isArray(r.value.data)) {
          return r.value.data.map((task) => ({ ...task, board: normalizeId(boardsFromApi[i]._id) }));
        }
        return [];
      });

      setTasks(allTasks);
    } catch (err) {
      console.error("fetchBoards error:", err);
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  /* ── Column CRUD ── */
  const createBoardHandler = async (e) => {
    e.preventDefault();
    if (!colName.trim() || !projectId) return;
    setColLoading(true);

    const tempId = `temp-${Date.now()}`;
    const tempBoard = { _id: tempId, name: colName.trim(), project: projectId, _temp: true };
    setBoards((prev) => [...prev, tempBoard]);
    setIsColModal(false);
    const enteredName = colName.trim();
    setColName("");

    try {
      const res = await API.post("/boards", { name: enteredName, projectId });
      setBoards((prev) => prev.map((b) => (b._id === tempId ? res.data : b)));
      toast.success("Column created!");
    } catch (err) {
      setBoards((prev) => prev.filter((b) => b._id !== tempId));
      toast.error(err.response?.data?.message || "Failed to create column");
    } finally {
      setColLoading(false);
    }
  };

  const deleteBoard = async (boardId) => {
    if (!window.confirm("Delete this column and its tasks?")) return;
    setBoards((prev) => prev.filter((b) => normalizeId(b._id) !== normalizeId(boardId)));
    setTasks((prev) => prev.filter((t) => normalizeId(t.board) !== normalizeId(boardId)));
    try {
      await API.delete(`/boards/${boardId}`);
      toast.success("Column deleted");
    } catch {
      fetchBoards();
    }
  };

  /* ── Task CRUD & Modals ── */
  const openAddTask = (boardId) => {
    setTaskModal({ mode: "add", boardId });
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      assignedTo: "",
      status: "todo",
    });
    setModalTab("details");
  };

  const openEditTask = (task) => {
    setTaskModal({ mode: "edit", task });
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      status: task.status || "todo",
    });
    setModalTab("details");
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (normalizeId(t._id) === normalizeId(taskId) ? { ...t, status: newStatus } : t))
      );
      if (taskModal?.task?._id === taskId) {
        setTaskForm((f) => ({ ...f, status: newStatus }));
        setTaskModal((m) => ({ ...m, task: { ...m.task, status: newStatus } }));
      }
      toast.success(`Moved to ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const submitTaskModal = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority || "medium",
      dueDate: taskForm.dueDate || null,
      assignedTo: taskForm.assignedTo || null,
    };
    const t = toast.loading(`${taskModal.mode === "add" ? "Creating" : "Updating"} task…`);
    try {
      if (taskModal.mode === "add") {
        const res = await API.post("/tasks", { ...payload, boardId: taskModal.boardId });
        let newTask = { ...res.data, board: normalizeId(taskModal.boardId) };
        setTasks((prev) => [...prev, newTask]);
        toast.success("Task created!", { id: t });
      } else {
        const res = await API.put(`/tasks/${taskModal.task._id}`, payload);
        await API.put(`/tasks/${taskModal.task._id}/assign`, { userId: taskForm.assignedTo || null });
        setTasks((prev) =>
          prev.map((tk) =>
            normalizeId(tk._id) === normalizeId(taskModal.task._id)
              ? { ...tk, ...payload, assignedTo: taskForm.assignedTo || null, status: tk.status }
              : tk
          )
        );
        toast.success("Task updated!", { id: t });
      }
      setTaskModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task", { id: t });
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => normalizeId(t._id) !== normalizeId(taskId)));
    try {
      await API.delete(`/tasks/${taskId}`);
      toast.success("Task deleted");
    } catch {
      fetchBoards();
    }
  };

  /* ── Subtasks in Modal ── */
  const handleToggleSubtask = async (subtaskId) => {
    if (!taskModal?.task?._id) return;
    try {
      const res = await API.patch(`/tasks/${taskModal.task._id}/subtasks/${subtaskId}/toggle`);
      const updated = res.data;
      setTaskModal((m) => ({ ...m, task: updated }));
      setTasks((prev) =>
        prev.map((t) => (normalizeId(t._id) === normalizeId(updated._id) ? updated : t))
      );
    } catch (err) {
      toast.error("Failed to toggle subtask");
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim() || !taskModal?.task?._id) return;
    try {
      const res = await API.post(`/tasks/${taskModal.task._id}/subtasks`, { title: newSubtask.trim() });
      const updated = res.data;
      setTaskModal((m) => ({ ...m, task: updated }));
      setTasks((prev) =>
        prev.map((t) => (normalizeId(t._id) === normalizeId(updated._id) ? updated : t))
      );
      setNewSubtask("");
    } catch (err) {
      toast.error("Failed to add subtask");
    }
  };

  /* ── Blocker Flags ── */
  const handleResolveFlag = async (flagId) => {
    try {
      const res = await API.patch(`/tasks/${taskModal.task._id}/flags/${flagId}/resolve`);
      const updatedTask = res.data.task;
      setTaskModal((m) => ({ ...m, task: updatedTask }));
      setTasks((prev) =>
        prev.map((t) => (normalizeId(t._id) === normalizeId(updatedTask._id) ? updatedTask : t))
      );
      toast.success("Blocker flag resolved!");
    } catch (err) {
      toast.error("Failed to resolve flag");
    }
  };

  /* ── GitHub PRs ── */
  const handleAddPR = async (e) => {
    e.preventDefault();
    if (!ghUrl.trim() || !taskModal?.task?._id) return;
    setGhLoading(true);
    setGhError("");
    try {
      const res = await API.post(`/tasks/${taskModal.task._id}/github-links`, { url: ghUrl });
      setTaskModal({ ...taskModal, task: res.data });
      setGhUrl("");
      toast.success("GitHub PR linked!");
    } catch (err) {
      setGhError(err.response?.data?.message || "Failed to link PR");
    } finally {
      setGhLoading(false);
    }
  };

  /* ── Drag & drop with backend persistence ── */
  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;

    setTasks((prev) =>
      prev.map((t) => (t._id === draggableId ? { ...t, board: destination.droppableId } : t))
    );

    try {
      await API.put(`/tasks/move/${draggableId}`, { boardId: destination.droppableId });
    } catch {
      fetchBoards();
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (activeFilter === "urgent") {
      return tasks.filter((t) => t.priority === "urgent" || t.priority === "high");
    }
    if (activeFilter === "mine") {
      const myId = getStoredUserId();
      return tasks.filter((t) => {
        const aId = t.assignedTo?._id || t.assignedTo;
        return aId === myId;
      });
    }
    return tasks;
  }, [tasks, activeFilter]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const pctDone = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const isAdmin = userRole === "owner" || userRole === "admin";

  if (loading) {
    return (
      <AppShell>
        <BoardSkeleton />
      </AppShell>
    );
  }

  if (!projectId) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-6 bg-bg-canvas min-h-[calc(100vh-4rem)]">
          <div className="saas-card p-10 max-w-md text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
              <Kanban className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-heading">No Active Project Board</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Select an existing project or create a new one to open its Kanban board and manage team tasks.
              </p>
            </div>
            <button
              onClick={() => navigate(workspaceId || activeWorkspace?._id ? `/projects/${workspaceId || activeWorkspace?._id}` : "/projects")}
              className="btn-brand-accent px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer mt-1"
            >
              Browse Workspace Projects →
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-bg-canvas text-text-heading select-none overflow-hidden">
        {/* ============================================================= */}
        {/* SUBHEADER: Clean Breadcrumb + Live Pulse + Sprint Telemetry   */}
        {/* ============================================================= */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-border bg-bg-surface/70 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(workspaceId ? `/projects/${workspaceId}` : "/dashboard")}
              className="bg-transparent border-none cursor-pointer text-text-muted hover:text-text-heading flex items-center p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Return to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-sm tracking-tight text-text-heading truncate max-w-[200px] sm:max-w-xs">
                {project?.name || "Sprint Kanban"}
              </span>
              <span className="opacity-30">|</span>
              <span className="opacity-70 text-xs font-mono">
                {doneTasks}/{totalTasks} completed ({pctDone}%)
              </span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="hidden sm:flex items-center bg-black/5 dark:bg-black/40 border border-border p-1 rounded-2xl gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeFilter === "all" ? "brand-accent-text bg-amber-500/15 font-bold" : "opacity-70 hover:opacity-100"
              }`}
            >
              All Tasks ({totalTasks})
            </button>
            <button
              onClick={() => setActiveFilter("mine")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeFilter === "mine" ? "brand-accent-text bg-amber-500/15 font-bold" : "opacity-70 hover:opacity-100"
              }`}
            >
              Only Mine
            </button>
            <button
              onClick={() => setActiveFilter("urgent")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeFilter === "urgent" ? "text-rose-500 bg-rose-500/15 font-bold" : "opacity-70 hover:opacity-100"
              }`}
            >
              Urgent
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setShowActivity((p) => !p)}
              className={`border rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer transition ${
                showActivity
                  ? "bg-accent/15 border-accent text-accent"
                  : "bg-bg-canvas border-border text-text-muted hover:text-text-heading"
              }`}
              title="Activity"
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
              title="Members"
            >
              <Users className="w-4 h-4" />
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsColModal(true)}
                className="btn-brand-accent rounded-xl px-3.5 py-1.5 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Add Column</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* KANBAN BOARD CANVAS: Drag and drop columns & real tasks       */}
        {/* ============================================================= */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          {boards.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="saas-card p-8 max-w-sm flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 brand-accent-text flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="font-bold text-base">No board columns yet</div>
                <p className="text-xs opacity-70">
                  Initialize columns like Backlog, In Progress, Review, and Done to begin tracking sprint items.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setIsColModal(true)}
                    className="btn-brand-accent px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Add First Column
                  </button>
                )}
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-5 items-start h-full pb-4">
                {boards.map((board) => {
                  const bid = normalizeId(board._id);
                  const boardTasks = filteredTasks.filter((t) => normalizeId(t.board) === bid);
                  const doneCnt = boardTasks.filter((t) => t.status === "done").length;
                  const pct = boardTasks.length ? Math.round((doneCnt / boardTasks.length) * 100) : 0;

                  return (
                    <div
                      key={bid}
                      className="saas-card w-[310px] shrink-0 flex flex-col max-h-full rounded-3xl border border-border shadow-lg overflow-hidden"
                    >
                      {/* Column Header */}
                      <div className="p-4 border-b border-border shrink-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-heading truncate max-w-[160px]">
                              {board.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-text-muted">
                              {boardTasks.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openAddTask(board._id)}
                              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-heading transition cursor-pointer"
                              title="Add task"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => deleteBoard(board._id)}
                                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-rose-500 transition cursor-pointer"
                                title="Delete column"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Column Progress Bar */}
                        {boardTasks.length > 0 && (
                          <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct === 100 ? "#10b981" : "var(--accent)",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Tasks Droppable Area */}
                      <Droppable droppableId={bid}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${
                              snapshot.isDraggingOver ? "bg-accent/5" : ""
                            }`}
                            style={{ minHeight: "80px" }}
                          >
                            {boardTasks.map((task, index) => {
                              const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                              const overdue = isOverdue(task.dueDate);

                              return (
                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                  {(prov, snap) => (
                                    <div
                                      ref={prov.innerRef}
                                      {...prov.draggableProps}
                                      {...prov.dragHandleProps}
                                      onClick={() => openEditTask(task)}
                                      className={`saas-card p-3.5 rounded-2xl cursor-pointer hover:border-accent/40 transition-all duration-150 shadow-xs hover:shadow-md select-none group ${
                                        snap.isDragging ? "shadow-2xl scale-102 ring-2 ring-accent" : ""
                                      }`}
                                    >
                                      {/* Header: Key + Priority */}
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-[10px] font-bold brand-accent-text">
                                          DES-{normalizeId(task._id).slice(-4).toUpperCase()}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pCfg.bg}`}>
                                            {pCfg.label}
                                          </span>
                                          {task.flags?.some((f) => !f.resolved) && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40">
                                              🚩 Blocker
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Title */}
                                      <h4 className="font-bold text-xs sm:text-sm text-text-heading leading-snug group-hover:text-accent transition mb-1">
                                        {task.title}
                                      </h4>

                                      {/* Description */}
                                      {task.description && (
                                        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-3">
                                          {task.description}
                                        </p>
                                      )}

                                      {/* Card Footer: Assignee, Due Date, Subtasks */}
                                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-text-muted">
                                        <div className="flex items-center gap-2">
                                          {task.assignedTo ? (
                                            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[9px] flex items-center justify-center ring-1 ring-inherit">
                                              {(task.assignedTo.name || "U")[0].toUpperCase()}
                                            </div>
                                          ) : (
                                            <span className="opacity-50">Unassigned</span>
                                          )}

                                          {task.dueDate && (
                                            <span className={`flex items-center gap-1 ${overdue ? "text-rose-500 font-bold" : ""}`}>
                                              <Calendar className="w-3 h-3" />
                                              {formatDate(task.dueDate)}
                                            </span>
                                          )}
                                        </div>

                                        {task.subtasks && task.subtasks.length > 0 && (
                                          <span className="flex items-center gap-1 font-mono">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
        </div>

        {/* ============================================================= */}
        {/* ADD COLUMN MODAL                                              */}
        {/* ============================================================= */}
        {isColModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="saas-card w-full max-w-sm p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">Add New Board Column</h3>
                <button
                  onClick={() => setIsColModal(false)}
                  className="p-1 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={createBoardHandler} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold opacity-80 mb-1.5">Column Name</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={colName}
                    onChange={(e) => setColName(e.target.value)}
                    placeholder="e.g. Quality Assurance"
                    className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsColModal(false)}
                    className="px-3 py-1.5 rounded-xl font-bold opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={colLoading || !colName.trim()}
                    className="btn-brand-accent px-4 py-1.5 rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {colLoading ? "Adding..." : "Add Column"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TASK MODAL / DRAWER (Complete MERN task management)           */}
        {/* ============================================================= */}
        {taskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="saas-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-black text-lg text-text-heading">
                    {taskModal.mode === "add" ? "Create New Task" : "Edit Task Details"}
                  </h3>
                  <p className="text-xs opacity-60 mt-0.5">
                    {taskModal.mode === "add" ? "Initialize a new issue card on this board" : `Key: DES-${normalizeId(taskModal.task?._id).slice(-4).toUpperCase()}`}
                  </p>
                </div>
                <button
                  onClick={() => setTaskModal(null)}
                  className="p-1 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs for Edit Mode */}
              {taskModal.mode === "edit" && (
                <div className="flex items-center gap-1 bg-black/5 dark:bg-black/40 border border-inherit p-1 rounded-2xl mb-5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModalTab("details")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                      modalTab === "details" ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("attachments")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalTab === "attachments" ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("github")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalTab === "github" ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("meetings")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalTab === "meetings" ? "brand-accent-text bg-amber-500/15" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notes</span>
                  </button>
                </div>
              )}

              {/* 1. Details Tab */}
              {(modalTab === "details" || taskModal.mode === "add") && (
                <form onSubmit={submitTaskModal} className="space-y-4 text-xs">
                  {/* Blocker Flags Banner */}
                  {taskModal.mode === "edit" && taskModal.task?.flags?.some((f) => !f.resolved) && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🚩 Active Blocker Flagged</span>
                      </div>
                      {taskModal.task.flags
                        .filter((f) => !f.resolved)
                        .map((flag) => (
                          <div key={flag._id} className="flex items-center justify-between text-xs bg-black/10 dark:bg-black/40 p-2 rounded-xl">
                            <span>{flag.reason}</span>
                            <button
                              type="button"
                              onClick={() => handleResolveFlag(flag._id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                            >
                              Resolve
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Status Stepper (Edit Mode) */}
                  {taskModal.mode === "edit" && (
                    <div>
                      <label className="block font-bold opacity-80 mb-1.5">Status Workflow</label>
                      <div className="grid grid-cols-4 gap-2">
                        {STATUS_STEPS.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => updateTaskStatus(taskModal.task._id, s.key)}
                            className={`p-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                              taskModal.task.status === s.key
                                ? "bg-amber-500/15 brand-accent-text border-amber-500/40"
                                : "bg-black/5 dark:bg-black/30 border-inherit opacity-70 hover:opacity-100"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold opacity-80 mb-1.5">Task Title</label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="e.g. Implement WebSocket reconnect logic"
                      className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold opacity-80 mb-1.5">Description</label>
                    <textarea
                      rows={3}
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Detailed acceptance criteria and technical notes..."
                      className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold opacity-80 mb-1.5">Priority</label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                        className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold opacity-80 mb-1.5">Due Date</label>
                      <input
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        className="w-full bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      >
                      </input>
                    </div>
                  </div>

                  {/* Assignee Selection */}
                  <div>
                    <label className="block font-bold opacity-80 mb-1.5">Assignee</label>
                    <AssignDropdown
                      members={members}
                      selectedUserId={taskForm.assignedTo}
                      onChange={(uid) => setTaskForm({ ...taskForm, assignedTo: uid })}
                    />
                  </div>

                  {/* Subtasks (Edit Mode) */}
                  {taskModal.mode === "edit" && (
                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span>Checklist Subtasks</span>
                        <span className="font-mono text-[10px] opacity-60">
                          {taskModal.task?.subtasks?.filter((s) => s.completed).length || 0} /{" "}
                          {taskModal.task?.subtasks?.length || 0}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {taskModal.task?.subtasks?.map((sub) => (
                          <div
                            key={sub._id}
                            onClick={() => handleToggleSubtask(sub._id)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-black/30 border border-inherit cursor-pointer hover:border-accent/40 transition"
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                sub.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-inherit"
                              }`}
                            >
                              {sub.completed && <Check className="w-3 h-3" />}
                            </div>
                            <span className={`flex-1 ${sub.completed ? "line-through opacity-50" : ""}`}>
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Add subtask input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          placeholder="Add checklist item..."
                          className="flex-1 bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSubtask(e);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddSubtask}
                          disabled={!newSubtask.trim()}
                          className="btn-brand-accent px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    {taskModal.mode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => deleteTask(taskModal.task._id)}
                        className="text-rose-500 hover:text-rose-400 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTaskModal(null)}
                        className="px-4 py-2 rounded-xl font-bold opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-brand-accent px-5 py-2 rounded-xl font-bold shadow-md cursor-pointer"
                      >
                        {taskModal.mode === "add" ? "Create Task" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* 2. Attachments Tab */}
              {modalTab === "attachments" && taskModal.mode === "edit" && (
                <div className="py-2">
                  <AttachmentPanel taskId={taskModal.task._id} />
                </div>
              )}

              {/* 3. GitHub PR Tab */}
              {modalTab === "github" && taskModal.mode === "edit" && (
                <div className="space-y-4 py-2">
                  <form onSubmit={handleAddPR} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://github.com/owner/repo/pull/123"
                      value={ghUrl}
                      onChange={(e) => setGhUrl(e.target.value)}
                      className="flex-1 bg-black/5 dark:bg-black/40 border border-inherit rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={ghLoading || !ghUrl.trim()}
                      className="btn-brand-accent px-4 py-2 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {ghLoading ? "Linking..." : "Link PR"}
                    </button>
                  </form>
                  {ghError && <p className="text-xs text-rose-500">{ghError}</p>}

                  <div className="space-y-2">
                    {taskModal.task?.githubLinks?.map((link) => (
                      <div
                        key={link._id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-black/40 border border-inherit text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <GitPullRequest className="w-4 h-4 brand-accent-text" />
                          <span className="font-bold">{link.title || link.url}</span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold brand-accent-text hover:underline flex items-center gap-1"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Meetings Tab */}
              {modalTab === "meetings" && taskModal.mode === "edit" && (
                <div className="space-y-3 py-2">
                  {loadingMeetings ? (
                    <div className="space-y-2">
                      <div className="h-12 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
                      <div className="h-12 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
                    </div>
                  ) : taskMeetings.length === 0 ? (
                    <div className="text-center py-10 opacity-60 text-xs border border-dashed border-border rounded-2xl">
                      No meeting notes mention this task yet. Type @task in meeting notes to link.
                    </div>
                  ) : (
                    taskMeetings.map((m) => (
                      <div
                        key={m._id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-black/40 border border-inherit text-xs"
                      >
                        <div>
                          <div className="font-bold text-text-heading">{m.title || "Meeting Notes"}</div>
                          <div className="text-[10px] opacity-60 mt-0.5">
                            {new Date(m.date || m.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setTaskModal(null);
                            navigate(`/meetings/${workspaceId}?meetingId=${m._id}`);
                          }}
                          className="btn-brand-accent px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Open Notes ↗
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebars */}
        <MembersSidebar
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
          workspaceId={workspaceId}
          members={members}
          userRole={userRole}
          onInviteOpen={() => {
            setShowMembers(false);
            setShowInvite(true);
          }}
        />
        <InviteModal
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          workspaceId={workspaceId}
        />
        <ActivityLog
          isOpen={showActivity}
          onClose={() => setShowActivity(false)}
          workspaceId={workspaceId}
        />
      </div>
    </AppShell>
  );
}
