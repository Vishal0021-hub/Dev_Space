import { useEffect, useState } from "react";
import API from "../services/api";

const ActivityLog = ({ workspaceId, isOpen = false, onClose = () => {} }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workspaceId && isOpen) {
      fetchActivities();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, isOpen]);

  if (!isOpen) return null;

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/activities/${workspaceId}`);
      setActivities(res.data);
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "task_created":  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
      case "task_moved":    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>;
      case "task_assigned": return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      case "member_invited": return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
      case "role_changed":  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
      case "task_deleted":  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
      default: return null;
    }
  };

  const getActivityMessage = (activity) => {
    const { type, details, user } = activity;
    const userName = <strong style={{color: '#fff'}}>{user?.name || "Someone"}</strong>;

    switch (type) {
      case "task_created":
        return <>{userName} created task <span className="highlight-text">{details.taskTitle}</span></>;
      case "task_moved":
        return <>{userName} moved <span className="highlight-text">{details.taskTitle}</span> from <span style={{opacity: 0.8}}>{details.fromBoard}</span> to <span style={{opacity: 0.8}}>{details.toBoard}</span></>;
      case "task_assigned":
        return <>{userName} assigned <span className="highlight-text">{details.taskTitle}</span> to <span style={{color: 'var(--indigo)'}}>{details.assignedToName === user?.name ? 'themselves' : details.assignedToName}</span></>;
      case "member_invited":
        return <>{userName} invited <span className="highlight-text">{details.invitedEmail}</span></>;
      case "role_changed":
        return <>{userName} changed <span style={{opacity: 0.8}}>{details.assignedToName}</span> to <span className="highlight-text">{details.newRole}</span></>;
      case "project_created":
        return <>{userName} created project <span className="highlight-text">{details.projectName}</span></>;
      case "task_deleted":
        return <>{userName} deleted task <span className="highlight-text">{details.taskTitle}</span></>;
      default:
        return <>{userName} performed an action</>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-sm h-full bg-bg-surface border-l border-inherit p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-inherit mb-4">
            <div>
              <h3 className="font-bold text-lg leading-none">Activity Stream</h3>
              <p className="text-xs opacity-60 mt-1">Real-time audit log of team actions</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-16 opacity-60 text-xs">No activity logged yet.</div>
            ) : (
              activities.map((a) => (
                <div key={a._id} className="flex gap-3 items-start py-2.5 border-b border-inherit text-xs">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 brand-accent-text flex items-center justify-center shrink-0">
                    {getActivityIcon(a.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="leading-snug">{getActivityMessage(a)}</div>
                    <div className="text-[10px] opacity-50 mt-1 font-mono">
                      {new Date(a.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
