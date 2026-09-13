const cron = require("node-cron");
const StandupConfig = require("../models/StandupConfig");
const StandupEntry = require("../models/StandupEntry");
const Workspace = require("../models/workspace");
const User = require("../models/User");
const nodemailer = require("nodemailer");

/* ── Transporter (reuse same config as emailService) ─────────── */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

/* ── Build digest HTML ───────────────────────────────────────── */
function buildDigestHtml(workspace, weekData) {
  const { totalMembers, submittedCount, missingNames, topBlockers, participationRate } = weekData;

  const blockerRows = topBlockers
    .map(
      (b) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#f87171;font-size:13px;">🚩 ${b.reason}</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-size:13px;">${b.taskTitle || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-size:13px;">${b.reportedByName}</td>
        </tr>`
    )
    .join("");

  const missingList = missingNames.length
    ? missingNames.map((n) => `<span style="display:inline-block;padding:4px 10px;margin:2px;border-radius:8px;background:rgba(239,68,68,0.1);color:#f87171;font-size:12px;">${n}</span>`).join("")
    : '<span style="color:#34d399;font-size:13px;">✓ Everyone submitted!</span>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1E293B;border:1px solid #334155;border-radius:20px;overflow:hidden;max-width:560px;">
  <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);height:4px;"></td></tr>
  <tr><td style="padding:28px 32px 16px;">
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#F1F5F9;">
      📊 Weekly Standup Digest
    </h1>
    <p style="margin:6px 0 0;font-size:13px;color:#94A3B8;">${workspace.name} · Week ending ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
  </td></tr>

  <tr><td style="padding:0 32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="8" style="margin-top:12px;">
      <tr>
        <td style="background:#0F172A;border-radius:12px;padding:16px;text-align:center;width:33%;">
          <div style="font-size:24px;font-weight:800;color:#6366F1;">${participationRate}%</div>
          <div style="font-size:11px;color:#64748B;margin-top:4px;">Participation</div>
        </td>
        <td style="background:#0F172A;border-radius:12px;padding:16px;text-align:center;width:33%;">
          <div style="font-size:24px;font-weight:800;color:#34d399;">${submittedCount}</div>
          <div style="font-size:11px;color:#64748B;margin-top:4px;">Submitted</div>
        </td>
        <td style="background:#0F172A;border-radius:12px;padding:16px;text-align:center;width:33%;">
          <div style="font-size:24px;font-weight:800;color:#f87171;">${topBlockers.length}</div>
          <div style="font-size:11px;color:#64748B;margin-top:4px;">Blockers</div>
        </td>
      </tr>
    </table>
  </td></tr>

  ${topBlockers.length > 0 ? `
  <tr><td style="padding:0 32px 20px;">
    <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#F1F5F9;">🚩 Unresolved Blockers</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;border-radius:12px;overflow:hidden;">
      <tr style="background:rgba(255,255,255,0.03);">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;">Blocker</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;">Task</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;">Reported by</th>
      </tr>
      ${blockerRows}
    </table>
  </td></tr>` : ""}

  <tr><td style="padding:0 32px 24px;">
    <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#F1F5F9;">Missing this week</h3>
    <div>${missingList}</div>
  </td></tr>

  <tr><td style="padding:16px 32px;border-top:1px solid #334155;">
    <p style="margin:0;font-size:12px;color:#64748B;">
      Sent by DevSpace · Standup Digest · <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" style="color:#818cf8;text-decoration:none;">Open Dashboard →</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ── Collect weekly data for a workspace ──────────────────────── */
async function collectWeekData(workspaceId) {
  const workspace = await Workspace.findById(workspaceId).populate("members.userId", "name email");
  if (!workspace) return null;

  const totalMembers = workspace.members.length;

  // Last 7 days
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const entries = await StandupEntry.find({
    workspaceId,
    date: { $in: dates },
  }).populate("userId", "name").populate("blockers.taskId", "title");

  const submittedUserIds = new Set(entries.map((e) => e.userId?._id?.toString()).filter(Boolean));
  const submittedCount = submittedUserIds.size;

  const missingNames = workspace.members
    .filter((m) => m.userId && !submittedUserIds.has(m.userId._id.toString()))
    .map((m) => m.userId.name);

  // Collect unresolved blockers
  const topBlockers = [];
  for (const entry of entries) {
    for (const b of entry.blockers || []) {
      if (!b.resolved) {
        topBlockers.push({
          reason: b.description,
          taskTitle: b.taskId?.title || null,
          reportedByName: entry.userId?.name || "Unknown",
        });
      }
    }
  }

  const workingDays = 5; // Approximate M–F
  const participationRate = totalMembers > 0
    ? Math.round((submittedCount / totalMembers) * 100)
    : 0;

  return {
    workspace,
    totalMembers,
    submittedCount,
    missingNames,
    topBlockers: topBlockers.slice(0, 10),
    participationRate,
  };
}

/* ── Start the digest cron ───────────────────────────────────── */
function startStandupDigest() {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your_gmail@gmail.com") {
    console.warn("[standup-digest] SMTP not configured — digest emails disabled.");
    return;
  }

  // Run every minute, check if any workspace digest is due NOW
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const currentDay = now.getUTCDay();   // 0=Sun … 6=Sat
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();

      // Only fire at minute 0 of the digest hour
      if (currentMinute !== 0) return;

      const configs = await StandupConfig.find({
        enabled: true,
        digestDay: currentDay,
        digestHourUTC: currentHour,
      });

      if (configs.length === 0) return;

      console.log(`[standup-digest] Processing ${configs.length} workspace digest(s)...`);
      const transporter = createTransporter();

      for (const config of configs) {
        try {
          const weekData = await collectWeekData(config.workspaceId);
          if (!weekData) continue;

          const { workspace } = weekData;

          // Determine recipients
          let recipients;
          if (config.digestRecipients === "all") {
            recipients = workspace.members
              .filter((m) => m.userId?.email)
              .map((m) => m.userId.email);
          } else {
            recipients = workspace.members
              .filter((m) => ["owner", "admin"].includes(m.role) && m.userId?.email)
              .map((m) => m.userId.email);
          }

          if (recipients.length === 0) continue;

          const html = buildDigestHtml(workspace, weekData);
          const fromName = process.env.EMAIL_FROM_NAME || "DevSpace";
          const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

          await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: recipients.join(","),
            subject: `📊 Weekly Standup Digest — ${workspace.name}`,
            html,
          });

          console.log(`[standup-digest] ✓ Sent digest for "${workspace.name}" to ${recipients.length} recipient(s)`);
        } catch (wsErr) {
          console.error(`[standup-digest] Error processing workspace ${config.workspaceId}:`, wsErr.message);
        }
      }
    } catch (err) {
      console.error("[standup-digest] Cron error:", err.message);
    }
  });

  console.log("[standup-digest] Cron started — checking every minute for due digests.");
}

module.exports = { startStandupDigest };
