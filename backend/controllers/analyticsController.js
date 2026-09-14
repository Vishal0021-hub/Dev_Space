const mongoose = require("mongoose");
const Task = require("../models/Task");
const Board = require("../models/Board");
const Project = require("../models/Project");
const Message = require("../models/Message");

const Workspace = require("../models/workspace");

/* ── Helper: get all board IDs inside a workspace ─────────────── */
async function getBoardIds(workspaceId) {
  const projects = await Project.find({ workspace: workspaceId }).select("_id");
  if (!projects.length) return [];
  const boards = await Board.find({ project: { $in: projects.map(p => p._id) } }).select("_id");
  return boards.map(b => b._id);
}

/* ── Helper: start-of-day for range ──────────────────────────── */
function rangeStart(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ══════════════════════════════════════════════════════════════
   GET /api/analytics/workspace/:workspaceId?range=7d|30d|90d
   Returns a complete analytics payload for the workspace.
   Only workspace members can access this.
   ══════════════════════════════════════════════════════════════ */
exports.getAnalytics = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const rawRange = req.query.range || "30d";
    const days = rawRange === "7d" ? 7 : rawRange === "90d" ? 90 : 30;
    const since = rangeStart(days);

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspaceId" });
    }

    const workspace = await Workspace.findById(workspaceId).populate("members.userId", "name avatar email");
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const boardIds = await getBoardIds(workspaceId);

    /* ── 1. Task counts by status ──────────────────────────── */
    const allTasks = boardIds.length
      ? await Task.find({ board: { $in: boardIds } })
      : [];

    const tasksByStatus = {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === "todo").length,
      inprogress: allTasks.filter(t => t.status === "inprogress").length,
      review: allTasks.filter(t => t.status === "review").length,
      done: allTasks.filter(t => t.status === "done").length,
    };

    /* ── 2. Completed tasks over time (grouped by day) ─────── */
    const completedOverTime = boardIds.length ? await Task.aggregate([
      {
        $match: {
          board: { $in: boardIds },
          status: "done",
          updatedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]) : [];

    /* ── 3. Velocity by member (tasks completed in range) ──── */
    const velocityByMember = boardIds.length ? await Task.aggregate([
      {
        $match: {
          board: { $in: boardIds },
          status: "done",
          assignedTo: { $ne: null },
          updatedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: { $ifNull: ["$user.name", "Unknown"] },
          avatar: "$user.avatar",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]) : [];

    /* ── 4. Burndown: created vs completed per day ─────────── */
    const [createdPerDay, completedPerDay] = await Promise.all([
      boardIds.length ? Task.aggregate([
        { $match: { board: { $in: boardIds }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]) : [],
      boardIds.length ? Task.aggregate([
        { $match: { board: { $in: boardIds }, status: "done", updatedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]) : [],
    ]);

    // Merge into unified burndown array
    const dateSet = new Set([
      ...createdPerDay.map(d => d.date),
      ...completedPerDay.map(d => d.date),
    ]);
    const burndown = [...dateSet].sort().map(date => ({
      date,
      created: (createdPerDay.find(d => d.date === date)?.count || 0),
      completed: (completedPerDay.find(d => d.date === date)?.count || 0),
    }));

    /* ── 5. Overdue tasks ──────────────────────────────────── */
    const overdueList = boardIds.length ? await Task.find({
      board: { $in: boardIds },
      status: { $ne: "done" },
      dueDate: { $lt: new Date(), $ne: null },
    })
      .populate("assignedTo", "name avatar")
      .select("title status priority dueDate assignedTo board")
      .sort({ dueDate: 1 })
      .limit(20)
      : [];

    /* ── 6. Top contributors score ──────────────────────────
       score = (tasksCompleted × 3) + (messages × 1)
       ─────────────────────────────────────────────────────── */
    const memberIds = workspace.members
      .map(m => m.userId?._id || m.userId)
      .filter(Boolean);

    // Get messages in the workspace in the range
    const channels = await require("../models/Channel").find({ workspace: workspaceId }).select("_id");
    const channelIds = channels.map(c => c._id);

    const [msgCounts, taskCounts] = await Promise.all([
      channelIds.length ? Message.aggregate([
        { $match: { channel: { $in: channelIds }, sender: { $in: memberIds }, createdAt: { $gte: since } } },
        { $group: { _id: "$sender", count: { $sum: 1 } } },
      ]) : [],
      boardIds.length ? Task.aggregate([
        { $match: { board: { $in: boardIds }, status: "done", assignedTo: { $in: memberIds }, updatedAt: { $gte: since } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      ]) : [],
    ]);

    const topContributors = workspace.members
      .map(m => {
        const uid = (m.userId?._id || m.userId)?.toString();
        const msgs = msgCounts.find(x => x._id?.toString() === uid)?.count || 0;
        const done = taskCounts.find(x => x._id?.toString() === uid)?.count || 0;
        const score = (done * 3) + (msgs * 1);
        return {
          userId: uid,
          name: m.userId?.name || "Unknown",
          avatar: m.userId?.avatar || null,
          role: m.role,
          score,
          tasksCompleted: done,
          messages: msgs,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    /* ── 7. Standup Participation Rate over time ─────────────── */
    const StandupEntry = require("../models/StandupEntry");
    const sinceStr = since.toISOString().slice(0, 10);
    const totalMembersCount = workspace.members?.length || 1;

    const standupStats = await StandupEntry.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          date: { $gte: sinceStr },
        },
      },
      {
        $group: {
          _id: "$date",
          submittedCount: { $sum: 1 },
          blockerCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ["$blockers", []] } }, 0] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          submitted: "$submittedCount",
          blockers: "$blockerCount",
          participationRate: {
            $min: [
              100,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$submittedCount", totalMembersCount] },
                      100,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
    ]);

    const totalSubmissions = standupStats.reduce((acc, curr) => acc + curr.submitted, 0);
    const averageRate = standupStats.length
      ? Math.round(
          standupStats.reduce((acc, curr) => acc + curr.participationRate, 0) /
            standupStats.length
        )
      : 0;

    /* ── Summary ───────────────────────────────────────────── */
    res.json({
      range: rawRange,
      since: since.toISOString(),
      tasksByStatus,
      completedOverTime,
      velocityByMember,
      burndown,
      overdueCount: overdueList.length,
      overdueList,
      topContributors,
      standup: {
        stats: standupStats,
        averageRate,
        totalSubmissions,
      },
    });
  } catch (err) {
    console.error("[analytics]", err.message);
    res.status(500).json({ message: err.message });
  }
};
