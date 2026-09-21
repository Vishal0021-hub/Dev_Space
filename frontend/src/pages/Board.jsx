import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";

import "../utils/collab.css";
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

/* ─── Icons ──────────────────────────────────────────────────── */
const IconPlus = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>;
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const IconEdit = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconCalendar = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconActivity = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const IconUsers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconGithub = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>;
const IconGitBranch = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>;
const IconGitPR = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" /></svg>;
const IconGitCommit = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="1.05" y1="12" x2="7" y2="12" /><line x1="17.01" y1="12" x2="22.96" y2="12" /></svg>;

/* ─── Priority config ──────────────────────────────────────────── */
const PRIORITY_CONFIG = {
  high: { label: "High", bg: "rgba(239,68,68,0.15)", color: "#f87171", dot: "#ef4444" },
  medium: { label: "Med", bg: "rgba(245,158,11,0.15)", color: "#fbbf24", dot: "#f59e0b" },
  low: { label: "Low", bg: "rgba(16,185,129,0.15)", color: "#34d399", dot: "#10b981" },
};

const STATUS_STEPS = [
  { key: "todo", label: "Todo", color: "#94a3b8", icon: "○" },
  { key: "inprogress", label: "In Progress", color: "#fbbf24", icon: "◑" },
  { key: "review", label: "Review", color: "#818cf8", icon: "◕" },
  { key: "done", label: "Done", color: "#34d399", icon: "●" },
];

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
const isOverdue = (d) => d && new Date(d) < new Date();

/* ═══════════════════════════════════════════════════════════════ */
const Board = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveWorkspace, workspaces, activeWorkspace } = useWorkspace();

  // workspaceId can come from navigation state (from Projects page) or from project fetch
  const [workspaceId, setWorkspaceId] = useState(location.state?.workspaceId || null);

  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState("member");

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
  const [modalTab, setModalTab] = useState("details"); // "details" | "attachments" | "github"
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", priority: "medium", dueDate: "", assignedTo: "", status: "todo"
  });

  const [ghUrl, setGhUrl] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState("");

  const [taskMeetings, setTaskMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  useEffect(() => {
    if (modalTab === "meetings" && taskModal?.task?._id) {
      setLoadingMeetings(true);
      API.get(`/meetings/task/${taskModal.task._id}`)
        .then((res) => setTaskMeetings(res.data || []))
        .catch((err) => {
          console.error("Failed to load meetings for task:", err);
          setTaskMeetings([]);
        })
        .finally(() => setLoadingMeetings(false));
    }
  }, [modalTab, taskModal?.task?._id]);

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
      toast.error(err.response?.data?.message || "Failed to resolve flag");
    }
  };

  const handleAddPR = async (e) => {
    e.preventDefault();
    if (!ghUrl.trim()) return;
    setGhLoading(true);
    setGhError("");
    try {
      const res = await API.post(`/tasks/${taskModal.task._id}/github-links`, { url: ghUrl });
      setTaskModal({ ...taskModal, task: res.data });
      setGhUrl("");
    } catch (err) {
      if (err.response?.status === 404) {
        setGhError("PR not found or repository is private");
      } else {
        setGhError(err.response?.data?.message || "Failed to add PR link");
      }
    } finally {
      setGhLoading(false);
    }
  };

  const handleRemovePR = async (linkId) => {
    try {
      const res = await API.delete(`/tasks/${taskModal.task._id}/github-links/${linkId}`);
      setTaskModal({ ...taskModal, task: res.data.task });
    } catch (err) {
      toast.error("Failed to remove link");
    }
  };

  /* ── Fetch on mount ── */
  useEffect(() => {
    fetchProject();
    fetchBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // When workspaceId becomes known (from state or fetchProject), load members
  useEffect(() => {
    if (workspaceId) fetchMembers(workspaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const fetchProject = async () => {
    try {
      const res = await API.get(`/projects/details/${projectId}`);
      if (res?.data) {
        setProject(res.data);
        const wsId = res.data.workspace?._id || res.data.workspace;
        if (wsId) {
          if (!workspaceId) setWorkspaceId(wsId);   // set if not already from nav state
          const ws = workspaces.find(w => w._id?.toString() === wsId?.toString());
          if (ws) setActiveWorkspace(ws);
        }
      }
    } catch (err) {
      console.error("fetchProject:", err.response?.status, err.response?.data?.message);
    }
  };

  const fetchMembers = async (wsId) => {
    try {
      const res = await API.get(`/workspaces/${wsId}/members`);
      setMembers(res.data);
      const userId = getStoredUserId();
      const m = res.data.find(
        m => m.userId?.toString() === userId || m.userId?._id?.toString() === userId
      );
      if (m) setUserRole(m.role);
    } catch (err) { console.error("fetchMembers:", err); }
  };

  const normalizeId = (v) => {
    if (!v) return v;
    if (typeof v === "string") return v;
    if (typeof v === "object" && v._id) return v._id.toString();
    return String(v);
  };

  /* ── Real-time: join workspace room and listen for task events ── */
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket || !workspaceId) return;

    socket.emit("join:workspace", workspaceId);

    const onTaskCreated = ({ task, boardId }) => {
      setTasks(prev => {
        if (prev.find(t => t._id === task._id)) return prev;
        return [...prev, { ...task, board: normalizeId(boardId) }];
      });
    };

    const onTaskMoved = ({ taskId, fromBoardId, toBoardId }) => {
      setTasks(prev => prev.map(t =>
        normalizeId(t._id) === normalizeId(taskId)
          ? { ...t, board: normalizeId(toBoardId) }
          : t
      ));
    };

    const onTaskDeleted = ({ taskId }) => {
      setTasks(prev => prev.filter(t => normalizeId(t._id) !== normalizeId(taskId)));
    };

    const onTaskAssigned = ({ task }) => {
      setTasks(prev => prev.map(t => normalizeId(t._id) === normalizeId(task._id) ? { ...t, ...task } : t));
    };

    const onStatusChanged = ({ taskId, boardId, status }) => {
      setTasks(prev => prev.map(t =>
        normalizeId(t._id) === normalizeId(taskId) ? { ...t, status } : t
      ));
    };

    const onGitHubSync = ({ taskId, github }) => {
      setTasks(prev => prev.map(t => normalizeId(t._id) === normalizeId(taskId) ? { ...t, github } : t));
      if (taskModal?.task?._id === taskId) {
        setTaskModal(prev => ({ ...prev, task: { ...prev.task, github } }));
      }
    };

    socket.on("task:created", onTaskCreated);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("task:assigned", onTaskAssigned);
    socket.on("task:statusChanged", onStatusChanged);
    socket.on("github:sync", onGitHubSync);

    return () => {
      socket.off("task:created", onTaskCreated);
      socket.off("task:moved", onTaskMoved);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("task:assigned", onTaskAssigned);
      socket.off("task:statusChanged", onStatusChanged);
      socket.off("github:sync", onGitHubSync);
    };
  }, [socket, workspaceId, taskModal?.task?._id]);



  /* KEY FIX: fetch boards then tasks — errors surfaced via toast */
  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/boards/${projectId}`);
      const boardsFromApi = res.data;
      setBoards(boardsFromApi);

      // Fetch tasks for each board independently — Promise.allSettled prevents one failure blocking others
      const taskResults = await Promise.allSettled(
        boardsFromApi.map(board => API.get(`/tasks/board/${board._id}`))
      );

      const allTasks = taskResults.flatMap((r, i) => {
        if (r.status === "fulfilled") {
          return r.value.data.map(task => ({ ...task, board: normalizeId(boardsFromApi[i]._id) }));
        }
        return [];
      });

      setTasks(allTasks);
    } catch (err) {
      console.error("fetchBoards:", err);
      toast.error("Failed to load board");
    } finally {
      setLoading(false);
    }
  };

  /* ── Create column — optimistic + confirmed ── */
  const createBoardHandler = async (e) => {
    e.preventDefault();
    if (!colName.trim()) return;
    setColLoading(true);

    // Optimistic: add a placeholder column immediately
    const tempId = `temp-${Date.now()}`;
    const tempBoard = { _id: tempId, name: colName.trim(), project: projectId, _temp: true };
    setBoards(prev => [...prev, tempBoard]);
    setColName("");
    setIsColModal(false);

    try {
      const res = await API.post("/boards", { name: tempBoard.name, projectId });
      const newBoard = res.data;
      // Replace temp with real board
      setBoards(prev => prev.map(b => b._id === tempId ? newBoard : b));
      toast.success(`Column "${newBoard.name}" added`);
    } catch (err) {
      // Rollback on failure
      setBoards(prev => prev.filter(b => b._id !== tempId));
      toast.error(err.response?.data?.message || "Failed to add column");
    } finally {
      setColLoading(false);
    }
  };

  /* ── Delete column ── */
  const deleteBoard = async (boardId) => {
    if (!window.confirm("Delete this column and ALL its tasks?")) return;
    setBoards(prev => prev.filter(b => normalizeId(b._id) !== normalizeId(boardId)));
    setTasks(prev => prev.filter(t => normalizeId(t.board) !== normalizeId(boardId)));
    try {
      await API.delete(`/boards/${boardId}`);
      toast.success("Column deleted");
    } catch (err) {
      toast.error("Failed to delete column");
      fetchBoards(); // revert on error
    }
  };

  /* ── Task CRUD ── */
  const openAddTask = (boardId) => {
    setTaskForm({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "", status: "todo" });
    setTaskModal({ mode: "add", boardId });
    setModalTab("details");
  };

  const openEditTask = (task) => {
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      status: task.status || "todo",
    });
    setTaskModal({ mode: "edit", boardId: task.board, task });
    setModalTab("details");
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks(prev => prev.map(t => normalizeId(t._id) === normalizeId(taskId) ? { ...t, status: newStatus } : t));
      if (taskModal?.task?._id === taskId) {
        setTaskForm(f => ({ ...f, status: newStatus }));
        setTaskModal(m => ({ ...m, task: { ...m.task, status: newStatus } }));
      }
      toast.success(`→ ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const submitTaskModal = async (e) => {
    e.preventDefault();
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || null,
    };
    const t = toast.loading(`${taskModal.mode === "add" ? "Creating" : "Updating"} task…`);
    try {
      if (taskModal.mode === "add") {
        const res = await API.post("/tasks", { ...payload, boardId: taskModal.boardId });
        let newTask = { ...res.data, board: normalizeId(taskModal.boardId) };
        if (taskForm.assignedTo) {
          await API.put(`/tasks/${res.data._id}/assign`, { userId: taskForm.assignedTo });
          newTask = { ...newTask, assignedTo: taskForm.assignedTo };
        }
        setTasks(prev => [...prev, newTask]);
        toast.success("Task created!", { id: t });
      } else {
        const res = await API.put(`/tasks/${taskModal.task._id}`, payload);
        await API.put(`/tasks/${taskModal.task._id}/assign`, { userId: taskForm.assignedTo || null });
        setTasks(prev => prev.map(tk =>
          normalizeId(tk._id) === normalizeId(taskModal.task._id)
            ? { ...tk, ...payload, assignedTo: taskForm.assignedTo || null, status: tk.status }
            : tk
        ));
        toast.success("Task updated!", { id: t });
      }
      setTaskModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task", { id: t });
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setTasks(prev => prev.filter(t => normalizeId(t._id) !== normalizeId(taskId)));
    try {
      await API.delete(`/tasks/${taskId}`);
      toast.success("Task deleted");
    } catch { fetchBoards(); }
  };

  /* ── Drag & drop ── */
  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    setTasks(prev => prev.map(t =>
      t._id === draggableId ? { ...t, board: destination.droppableId } : t
    ));
    try {
      await API.put(`/tasks/move/${draggableId}`, { boardId: destination.droppableId });
    } catch { fetchBoards(); }
  };

  /* ── Derived stats ── */
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const pctDone = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const isAdmin = userRole === "owner" || userRole === "admin";

  /* ─── Render ─────────────────────────────────────────────────── */
  if (loading) return (
    <AppShell>
      <BoardSkeleton />
    </AppShell>
  );

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#07090f", overflow: "hidden" }}>

        {/* ── Top bar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "0 24px",
          height: 60, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,13,22,0.9)", backdropFilter: "blur(20px)", zIndex: 10
        }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", padding: 6, borderRadius: 8, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
          ><IconBack /></button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Project</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{project?.name || "Board"}</div>
          </div>

          {/* Progress pill */}
          {totalTasks > 0 && (
            <div style={{ marginLeft: 16, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "4px 14px" }}>
              <div style={{ width: 80, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pctDone}%`, background: "#34d399", borderRadius: 4, transition: "width 0.4s ease" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{pctDone}%</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{doneTasks}/{totalTasks} done</span>
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {/* Status stat pills */}
            {totalTasks > 0 && STATUS_STEPS.map(s => {
              const cnt = tasks.filter(t => t.status === s.key).length;
              if (!cnt) return null;
              return (
                <div key={s.key} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.color + "18", color: s.color, border: `1px solid ${s.color}30` }}>
                  {cnt} {s.label}
                </div>
              );
            })}

            <NotificationBell />

            <button onClick={() => setShowActivity(p => !p)} style={{ background: showActivity ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.7)", transition: "all 0.2s" }} title="Activity">
              <IconActivity />
            </button>
            <button onClick={() => setShowMembers(p => !p)} style={{ background: showMembers ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.7)", transition: "all 0.2s" }} title="Members">
              <IconUsers />
            </button>

            {isAdmin && (
              <button onClick={() => setIsColModal(true)} style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <IconPlus size={13} /> Add Column
              </button>
            )}
          </div>
        </div>

        {/* ── Board canvas ── */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ display: "flex", gap: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ flexShrink: 0, width: 300, height: 480, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          ) : boards.length === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No columns yet</div>
                <p style={{ fontSize: 14, marginBottom: 24 }}>Create your first column to start organizing tasks.</p>
                {isAdmin && (
                  <button onClick={() => setIsColModal(true)} style={{ background: "#4F46E5", border: "none", borderRadius: 12, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    Add First Column
                  </button>
                )}
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", height: "100%" }}>
                {boards.map((board) => {
                  const bid = normalizeId(board._id);
                  const boardTasks = tasks.filter(t => normalizeId(t.board) === bid);
                  const doneCnt = boardTasks.filter(t => t.status === "done").length;
                  const pct = boardTasks.length ? Math.round((doneCnt / boardTasks.length) * 100) : 0;
                  const isTemp = board._temp;

                  return (
                    <div key={bid} style={{
                      flexShrink: 0, width: 300,
                      background: "rgba(255,255,255,0.03)",
                      border: isTemp ? "1px dashed rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 16, display: "flex", flexDirection: "column",
                      maxHeight: "calc(100vh - 120px)", opacity: isTemp ? 0.6 : 1,
                      transition: "opacity 0.3s"
                    }}>
                      {/* Column header */}
                      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{board.name}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{boardTasks.length}</span>
                          </div>
                          {isAdmin && !isTemp && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => openAddTask(board._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4, borderRadius: 6, display: "flex", transition: "color 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#818cf8"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
                                title="Add task"
                              ><IconPlus size={14} /></button>
                              <button onClick={() => deleteBoard(board._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4, borderRadius: 6, display: "flex", transition: "color 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
                                title="Delete column"
                              ><IconTrash /></button>
                            </div>
                          )}
                        </div>
                        {/* Per-column progress bar */}
                        {boardTasks.length > 0 && (
                          <div>
                            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#34d399" : "#6366f1", borderRadius: 3, transition: "width 0.4s ease" }} />
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3, textAlign: "right" }}>{pct}% complete</div>
                          </div>
                        )}
                      </div>

                      {/* Tasks */}
                      <Droppable droppableId={bid}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              flex: 1, overflowY: "auto", padding: "8px 10px",
                              background: snapshot.isDraggingOver ? "rgba(99,102,241,0.04)" : "transparent",
                              borderRadius: 10, transition: "background 0.2s",
                              display: "flex", flexDirection: "column", gap: 8,
                              minHeight: 60
                            }}
                          >
                            {boardTasks.map((task, index) => {
                              const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                              const overdue = isOverdue(task.dueDate);
                              const statusStep = STATUS_STEPS.find(s => s.key === task.status) || STATUS_STEPS[0];
                              return (
                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => openEditTask(task)}
                                      style={{
                                        ...provided.draggableProps.style,
                                        background: snapshot.isDragging ? "rgba(30,33,50,0.98)" : "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        borderRadius: 12, padding: "12px 12px",
                                        cursor: "pointer", transition: snapshot.isDragging ? "none" : "all 0.15s",
                                        boxShadow: snapshot.isDragging ? "0 20px 50px rgba(0,0,0,0.6)" : "none",
                                        transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} rotate(1.5deg)` : provided.draggableProps.style?.transform,
                                      }}
                                      onMouseEnter={e => { if (!snapshot.isDragging) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
                                      onMouseLeave={e => { if (!snapshot.isDragging) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                                    >
                                      {/* Header: Priority + Actions */}
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: pCfg.bg, color: pCfg.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{pCfg.label}</span>
                                          <span style={{ fontSize: 10, fontWeight: 600, color: statusStep.color }}>{statusStep.icon} {statusStep.label}</span>
                                          {task.flags?.some(f => !f.resolved) && (
                                            <span
                                              style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                padding: "2px 7px",
                                                borderRadius: 20,
                                                background: "rgba(239,68,68,0.2)",
                                                color: "#f87171",
                                                border: "1px solid rgba(239,68,68,0.35)",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 3,
                                              }}
                                              title={`Blocked: ${task.flags.filter(f => !f.resolved).map(f => f.reason).join("; ")}`}
                                            >
                                              🚩 Blocker
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                                          <button onClick={() => openEditTask(task)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 3, borderRadius: 5, transition: "color 0.15s" }}
                                            onMouseEnter={e => e.currentTarget.style.color = "#818cf8"}
                                            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
                                          ><IconEdit /></button>
                                          {isAdmin && (
                                            <button onClick={() => deleteTask(task._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 3, borderRadius: 5, transition: "color 0.15s" }}
                                              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                                              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
                                            ><IconTrash /></button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Title */}
                                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.45, marginBottom: task.description ? 6 : 0 }}>{task.title}</div>

                                      {/* Description */}
                                      {task.description && (
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: 8 }}>
                                          {task.description.length > 70 ? task.description.slice(0, 70) + "…" : task.description}
                                        </div>
                                      )}

                                      {/* GitHub Indicators */}
                                      {task.github && (task.github.branch || task.github.pr || (task.github.commits && task.github.commits.length > 0)) && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", marginBottom: 8, padding: "6px 8px", background: "rgba(99,102,241,0.06)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.1)" }}>
                                          {task.github.branch && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#818cf8", fontSize: 10, fontWeight: 600 }} title={`Branch: ${task.github.branch}`}>
                                              <IconGitBranch /> <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.github.branch}</span>
                                            </div>
                                          )}
                                          {task.github.commits?.length > 0 && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600 }}>
                                              <IconGitCommit /> {task.github.commits.length}
                                            </div>
                                          )}
                                          {task.github.pr && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: task.github.pr.state === "merged" ? "#a78bfa" : task.github.pr.state === "open" ? "#34d399" : "#f87171", fontSize: 10, fontWeight: 700 }}>
                                              <IconGitPR /> PR #{task.github.pr.number}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Footer: Avatar + Due date */}
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                                        {task.assignedTo?.name ? (
                                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#312E81", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#C7D2FE" }}>
                                              {task.assignedTo.name[0].toUpperCase()}
                                            </div>
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{task.assignedTo.name}</span>
                                          </div>
                                        ) : <span />}

                                        {task.dueDate && (
                                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: overdue ? "#f87171" : "rgba(255,255,255,0.4)" }}>
                                            <IconCalendar /> {formatDate(task.dueDate)}{overdue && " ⚠"}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}

                            {boardTasks.length === 0 && !snapshot.isDraggingOver && (
                              <div style={{ padding: "16px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
                                Drop tasks here
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>

                      {/* Add Task button */}
                      {!isTemp && (
                        <button onClick={() => openAddTask(board._id)}
                          style={{ margin: "8px 10px 10px", background: "none", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "#818cf8"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                        >
                          <IconPlus size={12} /> Add Task
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Ghost add column */}
                {isAdmin && (
                  <button onClick={() => setIsColModal(true)} style={{ flexShrink: 0, width: 200, height: 100, background: "none", border: "1.5px dashed rgba(255,255,255,0.08)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", cursor: "pointer", gap: 8, fontSize: 12, transition: "all 0.2s", alignSelf: "flex-start" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "#818cf8"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                  >
                    <IconPlus size={18} /> Add Column
                  </button>
                )}
              </div>
            </DragDropContext>
          )}
        </div>

        {/* ── Sidebars ── */}
        {showMembers && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setShowMembers(false)}>
            <div style={{ position: "absolute", right: 0, top: 0, width: 380, height: "100vh", background: "rgba(10,13,22,0.98)", borderLeft: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }} onClick={e => e.stopPropagation()}>
              <MembersSidebar workspaceId={workspaceId} members={members} userRole={userRole} showMembers={showMembers}
                onUpdate={() => fetchMembers(workspaceId)} onClose={() => setShowMembers(false)} onInviteOpen={() => { setShowMembers(false); setShowInvite(true); }} />
            </div>
          </div>
        )}

        {showActivity && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setShowActivity(false)}>
            <div style={{ position: "absolute", right: 0, top: 0, width: 380, height: "100vh", background: "rgba(10,13,22,0.98)", borderLeft: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", padding: 24, boxSizing: "border-box", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>Activity</h3>
                <button onClick={() => setShowActivity(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 20 }}>×</button>
              </div>
              <ActivityLog workspaceId={workspaceId} />
            </div>
          </div>
        )}

        {showInvite && (
          <InviteModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} onInviteSent={() => fetchMembers(workspaceId)} />
        )}

        {/* ── Create Column Modal ── */}
        {isColModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setIsColModal(false)}>
            <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 20, padding: 32, width: 380, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6, fontFamily: "Figtree, sans-serif" }}>New Column</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Add a new stage to your project workflow.</p>
              <form onSubmit={createBoardHandler}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Column name</label>
                <input
                  autoFocus required value={colName} onChange={e => setColName(e.target.value)}
                  placeholder="e.g. In Progress, Review…"
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 20, fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setIsColModal(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                  <button type="submit" disabled={colLoading} style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "8px 20px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    {colLoading ? "Adding…" : "Add Column"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Task Modal ── */}
        {taskModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setTaskModal(null)}>
            <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 20, padding: 32, width: taskModal.mode === "edit" ? 620 : 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>

              {/* Title */}
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4, fontFamily: "Figtree, sans-serif" }}>
                {taskModal.mode === "add" ? "New Task" : taskModal.task?.title || "Edit Task"}
              </div>

              {/* ── Tabs (edit mode only) ── */}
              {taskModal.mode === "edit" && (
                <div style={{ display: "flex", gap: 2, marginBottom: 20, marginTop: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    { key: "details", label: "📋 Details" },
                    { key: "attachments", label: "📎 Attachments" },
                    { key: "github", label: "🐙 GitHub" },
                    { key: "meetings", label: "📝 Meetings" },
                  ].map(tab => (
                    <button key={tab.key} type="button" onClick={() => setModalTab(tab.key)}
                      style={{
                        flex: 1, border: "none", borderRadius: 8, padding: "7px 10px",
                        cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                        background: modalTab === tab.key ? "rgba(99,102,241,0.2)" : "transparent",
                        color: modalTab === tab.key ? "#818cf8" : "rgba(255,255,255,0.4)",
                        borderBottom: modalTab === tab.key ? "2px solid #6366f1" : "2px solid transparent",
                      }}
                    >{tab.label}</button>
                  ))}
                </div>
              )}

              {/* ── Details Tab (+ add mode) ── */}
              {(modalTab === "details" || taskModal.mode === "add") && (
                <form onSubmit={submitTaskModal}>

                  {/* Active Blocker Flags Banner (edit mode) */}
                  {taskModal.mode === "edit" && taskModal.task?.flags?.filter(f => !f.resolved).length > 0 && (
                    <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <span>🚩 Active Blockers</span>
                        <span style={{ fontSize: 10, background: "rgba(239,68,68,0.2)", padding: "1px 6px", borderRadius: 10 }}>
                          {taskModal.task.flags.filter(f => !f.resolved).length}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {taskModal.task.flags.filter(f => !f.resolved).map(flag => (
                          <div key={flag._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: 8 }}>
                            <div style={{ fontSize: 12, color: "#fca5a5", flex: 1, marginRight: 10 }}>
                              {flag.reason || "Blocker reported in standup"}
                              <span style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                                Reported {flag.reportedAt ? new Date(flag.reportedAt).toLocaleDateString() : "recently"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleResolveFlag(flag._id)}
                              style={{ background: "#22c55e", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#16a34a"}
                              onMouseLeave={e => e.currentTarget.style.background = "#22c55e"}
                            >
                              ✓ Resolve
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Stepper — edit mode only */}
                  {taskModal.mode === "edit" && taskModal.task?._id && (
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</label>
                      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.07)" }}>
                        {STATUS_STEPS.map((s) => {
                          const isActive = (taskModal.task?.status || taskForm.status) === s.key;
                          const stepIdx = STATUS_STEPS.findIndex(x => x.key === (taskModal.task?.status || taskForm.status));
                          const isPast = STATUS_STEPS.findIndex(x => x.key === s.key) < stepIdx;
                          return (
                            <button key={s.key} type="button" onClick={() => updateTaskStatus(taskModal.task._id, s.key)}
                              style={{
                                flex: 1, border: "none", borderRadius: 9, padding: "8px 4px", cursor: "pointer", fontWeight: isActive ? 700 : 500, fontSize: 11, transition: "all 0.2s",
                                background: isActive ? s.color + "25" : "transparent",
                                color: isActive ? s.color : isPast ? s.color + "90" : "rgba(255,255,255,0.3)",
                                borderBottom: isActive ? `2px solid ${s.color}` : "2px solid transparent",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 2
                              }}>
                              <span style={{ fontSize: 18 }}>{s.icon}</span>
                              <span>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {(() => {
                        const idx = STATUS_STEPS.findIndex(s => s.key === (taskModal.task?.status || taskForm.status));
                        const pct = Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
                        const col = STATUS_STEPS[idx]?.color || "#94a3b8";
                        return (
                          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 4, transition: "width 0.4s ease" }} />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Title *</label>
                  <input autoFocus required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title…"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit" }} />

                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</label>
                  <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description…" rows={3}
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Priority</label>
                      <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer" }}>
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Due Date</label>
                      <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  {isAdmin && (
                    <>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Assign To</label>
                      <AssignDropdown members={members} selectedId={taskForm.assignedTo} onSelect={uid => setTaskForm(f => ({ ...f, assignedTo: uid }))} />
                      <div style={{ marginBottom: 8 }} />
                    </>
                  )}

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                    <button type="button" onClick={() => setTaskModal(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 18px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                    <button type="submit" style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "9px 20px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                      {taskModal.mode === "add" ? "Create Task" : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Attachments Tab ── */}
              {modalTab === "attachments" && taskModal.mode === "edit" && (
                <AttachmentPanel taskId={taskModal.task._id} isAdmin={isAdmin} />
              )}



              {/* ── GitHub Tab ── */}
              {modalTab === "github" && taskModal.mode === "edit" && (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                  {!activeWorkspace?.github?.repoFullName ? (
                    /* STATE 1: No GitHub repo linked to workspace */
                    <div style={{ textAlign: "center", padding: "40px 0", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: 24, marginBottom: 12 }}>🐙</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>No repository linked</div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 280, margin: "0 auto", marginBottom: 16 }}>
                        Link a GitHub repository in workspace settings to enable PR tracking
                      </p>
                      <button onClick={() => navigate(`/workspace/${workspaceId}/settings?tab=integrations`)} style={{ background: "#4F46E5", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Go to settings
                      </button>
                    </div>
                  ) : !taskModal.task.githubLinks?.length ? (
                    /* STATE 2: Repo linked, but no PR links */
                    <div>
                      <div style={{ textAlign: "center", padding: "40px 0", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)", marginBottom: 20 }}>
                        <div style={{ fontSize: 24, marginBottom: 12 }}>🐙</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>No PR links yet</div>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 280, margin: "0 auto" }}>
                          Paste a GitHub PR URL to track it here
                        </p>
                      </div>
                      <form onSubmit={handleAddPR}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input
                            type="url"
                            placeholder="https://github.com/owner/repo/pull/123"
                            value={ghUrl}
                            onChange={e => setGhUrl(e.target.value)}
                            style={{ flex: 1, padding: "10px 14px", background: "#0F172A", border: "1px solid #334155", borderRadius: 10, color: "#F1F5F9", fontSize: 13, outline: "none" }}
                          />
                          <button type="submit" disabled={ghLoading} style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "0 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: ghLoading ? "not-allowed" : "pointer" }}>
                            {ghLoading ? "Adding…" : "Add PR"}
                          </button>
                        </div>
                        {ghError && <div style={{ color: "#F87171", fontSize: 12, marginTop: 8 }}>{ghError}</div>}
                      </form>
                    </div>
                  ) : (
                    /* STATE 3: Has PR links */
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {taskModal.task.githubLinks.map(link => {
                        const statusColors = {
                          open: { bg: "rgba(34,197,94,0.1)", text: "#4ade80", border: "rgba(34,197,94,0.2)" },
                          closed: { bg: "rgba(239,68,68,0.1)", text: "#f87171", border: "rgba(239,68,68,0.2)" },
                          merged: { bg: "rgba(168,85,247,0.1)", text: "#c084fc", border: "rgba(168,85,247,0.2)" }
                        };
                        const sc = statusColors[link.meta?.state?.toLowerCase()] || { bg: "rgba(255,255,255,0.1)", text: "#e2e8f0", border: "rgba(255,255,255,0.2)" };

                        return (
                          <div key={link._id} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>{activeWorkspace.github.repoFullName}</div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                                  {link.meta?.state || "Unknown"}
                                </span>
                                <button onClick={() => handleRemovePR(link._id)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 4 }} title="Remove link">
                                  <IconTrash />
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0", marginBottom: 12 }}>
                              {link.meta?.title || link.url}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94A3B8" }}>
                                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff" }}>
                                  {(link.meta?.author || "?")[0].toUpperCase()}
                                </div>
                                @{link.meta?.author || "unknown"}
                              </div>
                              <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.textDecoration="underline"} onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>
                                Open on GitHub ↗
                              </a>
                            </div>
                          </div>
                        );
                      })}
                      
                      <form onSubmit={handleAddPR} style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input
                            type="url"
                            placeholder="Add another PR URL..."
                            value={ghUrl}
                            onChange={e => setGhUrl(e.target.value)}
                            style={{ flex: 1, padding: "10px 14px", background: "#0F172A", border: "1px dashed #334155", borderRadius: 10, color: "#F1F5F9", fontSize: 13, outline: "none" }}
                          />
                          <button type="submit" disabled={ghLoading || !ghUrl.trim()} style={{ background: "transparent", border: "1px dashed #334155", borderRadius: 10, padding: "0 20px", color: ghUrl.trim() ? "#F1F5F9" : "#64748B", fontSize: 13, fontWeight: 600, cursor: ghLoading ? "not-allowed" : (ghUrl.trim() ? "pointer" : "default") }}>
                            {ghLoading ? "Adding…" : "+ Add"}
                          </button>
                        </div>
                        {ghError && <div style={{ color: "#F87171", fontSize: 12, marginTop: 8 }}>{ghError}</div>}
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* ── Meetings Tab ── */}
              {modalTab === "meetings" && taskModal.mode === "edit" && (
                <div style={{ animation: "fadeIn 0.2s ease" }}>
                  {loadingMeetings ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
                      {[1, 2].map((i) => (
                        <div key={i} style={{ height: 72, background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
                      ))}
                    </div>
                  ) : taskMeetings.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>📝</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>No meetings linked</div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
                        This task hasn't been mentioned in any meeting notes yet. When you type <code style={{ color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "2px 5px", borderRadius: 4 }}>@task</code> in meeting notes, it will automatically link here.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                        Mentioned in {taskMeetings.length} {taskMeetings.length === 1 ? "meeting" : "meetings"}:
                      </div>
                      {taskMeetings.map((m) => (
                        <div
                          key={m._id}
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                            padding: "14px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
                              {m.title || "Untitled Meeting"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                              <span>📅 {new Date(m.date || m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                              {m.createdBy?.name && (
                                <span>👤 By {m.createdBy.name}</span>
                              )}
                              {m.attendees?.length > 0 && (
                                <span>👥 {m.attendees.length} attendee{m.attendees.length > 1 ? "s" : ""}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const wsId = workspaceId || activeWorkspace?._id;
                              setTaskModal(null);
                              navigate(`/meetings/${wsId}?meetingId=${m._id}`);
                            }}
                            style={{
                              background: "rgba(99,102,241,0.15)",
                              color: "#a5b4fc",
                              border: "1px solid rgba(99,102,241,0.3)",
                              borderRadius: 8,
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#6366f1";
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(99,102,241,0.15)";
                              e.currentTarget.style.color = "#a5b4fc";
                            }}
                          >
                            Open Notes ↗
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
          select option { background: #0F172A; }
        `}</style>
      </div>
    </AppShell>
  );
};

export default Board;
