const nodemailer = require("nodemailer");

/* ─── Transporter ──────────────────────────────────────────── */
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, ""); // Strip spaces from Google App Passwords

  // If using Gmail, use nodemailer's built-in Gmail service (uses secure direct TLS on port 465, bypassing cloud port 587 blocks)
  const isGmail = !process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.gmail.com" || (user && user.endsWith("@gmail.com"));

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: parseInt(process.env.SMTP_PORT || "587") === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

exports.createTransporter = createTransporter;

const ROLE_DESCRIPTIONS = {
  owner:  "You'll have full control over the workspace including managing members and billing.",
  admin:  "You'll be able to manage members, create projects, assign tasks, and access all workspace channels.",
  member: "You'll be able to view projects, work on tasks, and collaborate with the team.",
};

const ROLE_COLORS = {
  owner:  "#fbbf24",
  admin:  "#818cf8",
  member: "#94a3b8",
};

exports.sendInviteEmail = async ({ toEmail, inviterName, workspaceName, role, inviteLink }) => {
  const transporter = createTransporter();
  const roleColor  = ROLE_COLORS[role] || "#818cf8";
  const roleDesc   = ROLE_DESCRIPTIONS[role] || ROLE_DESCRIPTIONS.member;
  const roleLabel  = role.charAt(0).toUpperCase() + role.slice(1);
  const fromName   = process.env.EMAIL_FROM_NAME || "DevSpace";
  const fromEmail  = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#07090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07090f;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="520" cellpadding="0" cellspacing="0" style="background:#0a0c14;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;max-width:520px;">
  <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);height:4px;"></td></tr>
  <tr><td style="padding:32px 36px 16px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:40px;height:40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;text-align:center;vertical-align:middle;">
        <span style="color:#fff;font-size:20px;font-weight:800;line-height:40px;">D</span>
      </td>
      <td style="padding-left:12px;vertical-align:middle;">
        <span style="font-size:22px;font-weight:800;color:#fff;">DevSpace</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:8px 36px 32px;">
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#fff;">
      You've been invited to join<br/>
      <span style="color:#818cf8;">"${workspaceName}"</span>
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6;">
      <strong style="color:#fff;">${inviterName}</strong> has invited you to join the
      <strong style="color:#fff;">${workspaceName}</strong> workspace on DevSpace as
      <span style="display:inline-block;padding:2px 12px;border-radius:20px;font-size:13px;font-weight:700;background:${roleColor}22;color:${roleColor};border:1px solid ${roleColor}44;margin-left:4px;">${roleLabel}</span>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:${roleColor};text-transform:uppercase;letter-spacing:0.08em;">As a ${roleLabel}</p>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">${roleDesc}</p>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.4);">This invite expires in <strong style="color:rgba(255,255,255,0.6);">7 days</strong>.</p>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
        <a href="${inviteLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">
          Accept Invitation &rarr;
        </a>
      </td>
    </tr></table>
    <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.3);">
      Or copy: <a href="${inviteLink}" style="color:#818cf8;word-break:break-all;">${inviteLink}</a>
    </p>
  </td></tr>
  <tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);">
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
      This invitation was sent from DevSpace. If you didn't expect this, you can safely ignore it.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from:    `"${fromName}" <${fromEmail}>`,
    to:      toEmail,
    subject: `${inviterName} invited you to "${workspaceName}" on DevSpace`,
    html,
    text: `You've been invited to join "${workspaceName}" on DevSpace as ${roleLabel}.\n\nAccept the invitation: ${inviteLink}\n\nThis invite expires in 7 days.`,
  });

  console.log(`[email] Invite sent to ${toEmail} — messageId: ${info.messageId}`);
  return info;
};

exports.verifySmtp = async () => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your_gmail@gmail.com") {
    console.warn("[email] SMTP not configured — invite emails disabled. Set SMTP_USER and SMTP_PASS in .env");
    return false;
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(`[email] SMTP ready — connected as ${process.env.SMTP_USER}`);
    return true;
  } catch (err) {
    console.error("[email] SMTP connection failed:", err.message);
    return false;
  }
};
