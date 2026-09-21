import { createContext, useContext, useReducer, useEffect } from "react";
import API from "../services/api";
import { getStoredToken, getStoredUserId } from "../utils/auth";

/* ─── Initial State ──────────────────────────────────────────── */
const initialState = {
  workspaces:       [],
  activeWorkspace:  null,   // full workspace object
  channels:         [],
  members:          [],
  userRole:         "member",
  loadingWorkspace: false,
  loadingChannels:  false,
};

/* ─── Reducer ────────────────────────────────────────────────── */
function workspaceReducer(state, action) {
  switch (action.type) {
    case "SET_WORKSPACES":
      return { ...state, workspaces: action.payload };

    case "SET_ACTIVE_WORKSPACE":
      return {
        ...state,
        activeWorkspace: action.payload,
        channels: [],
        members:  [],
        userRole: "member",
      };

    case "SET_CHANNELS":
      return { ...state, channels: action.payload };

    case "ADD_CHANNEL":
      return { ...state, channels: [...state.channels, action.payload] };

    case "REMOVE_CHANNEL":
      return { ...state, channels: state.channels.filter(c => c._id !== action.payload) };

    case "SET_MEMBERS":
      return { ...state, members: action.payload };

    case "SET_USER_ROLE":
      return { ...state, userRole: action.payload };

    case "SET_LOADING_WORKSPACE":
      return { ...state, loadingWorkspace: action.payload };

    case "SET_LOADING_CHANNELS":
      return { ...state, loadingChannels: action.payload };

    default:
      return state;
  }
}

/* ─── Context ────────────────────────────────────────────────── */
const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  /* ─ Fetch all workspaces on mount ─ */
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    fetchWorkspaces();
  }, []);

  /* ─ Load channels/members whenever the active workspace changes ─ */
  useEffect(() => {
    if (!state.activeWorkspace) return;
    fetchChannels(state.activeWorkspace._id);
    fetchMembers(state.activeWorkspace._id);
  }, [state.activeWorkspace?._id]);

  const fetchWorkspaces = async () => {
    dispatch({ type: "SET_LOADING_WORKSPACE", payload: true });
    try {
      const res = await API.get("/workspaces");
      const list = res.data;
      dispatch({ type: "SET_WORKSPACES", payload: list });

      // Auto-select: restore last used workspace, or fall back to the first one
      const currentActive = state.activeWorkspace;
      if (!currentActive && list.length > 0) {
        const lastId = localStorage.getItem("devspace_last_workspace");
        const target = (lastId && list.find(w => w._id === lastId)) || list[0];
        dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: target });
      }
    } catch (err) {
      console.error("WorkspaceContext: fetchWorkspaces error", err);
    } finally {
      dispatch({ type: "SET_LOADING_WORKSPACE", payload: false });
    }
  };

  const setActiveWorkspace = (workspace) => {
    if (workspace?._id) {
      localStorage.setItem("devspace_last_workspace", workspace._id);
    }
    dispatch({ type: "SET_ACTIVE_WORKSPACE", payload: workspace });
  };

  const fetchChannels = async (workspaceId) => {
    dispatch({ type: "SET_LOADING_CHANNELS", payload: true });
    try {
      const res = await API.get(`/channels?workspaceId=${workspaceId}`);
      dispatch({ type: "SET_CHANNELS", payload: res.data });
    } catch (err) {
      console.error("WorkspaceContext: fetchChannels error", err);
    } finally {
      dispatch({ type: "SET_LOADING_CHANNELS", payload: false });
    }
  };

  const fetchMembers = async (workspaceId) => {
    try {
      const res = await API.get(`/workspaces/${workspaceId}/members`);
      dispatch({ type: "SET_MEMBERS", payload: res.data });

      // Determine current user's role
      const userId = getStoredUserId();
      const m = res.data.find(
        m => m.userId?._id?.toString() === userId || m.userId?.toString() === userId
      );
      if (m) dispatch({ type: "SET_USER_ROLE", payload: m.role });
    } catch (err) {
      console.error("WorkspaceContext: fetchMembers error", err);
    }
  };

  const addChannel = (channel) => dispatch({ type: "ADD_CHANNEL", payload: channel });
  const removeChannel = (channelId) => dispatch({ type: "REMOVE_CHANNEL", payload: channelId });
  const refreshWorkspaces = () => fetchWorkspaces();
  const refreshChannels = () => state.activeWorkspace && fetchChannels(state.activeWorkspace._id);
  const refreshMembers  = () => state.activeWorkspace && fetchMembers(state.activeWorkspace._id);

  return (
    <WorkspaceContext.Provider value={{
      ...state,
      dispatch,
      setActiveWorkspace,
      addChannel,
      removeChannel,
      refreshWorkspaces,
      refreshChannels,
      refreshMembers,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

export default WorkspaceContext;
