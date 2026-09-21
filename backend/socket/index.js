const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Workspace = require("../models/workspace");

let _io = null;

/* ── Cursor colours assigned per snippet session ─────────────────
   Each connected user gets a stable colour within a snippet room.
   ─────────────────────────────────────────────────────────────── */
const CURSOR_COLORS = [
  "#E24B4A", "#1D9E75", "#378ADD",
  "#EF9F27", "#7F77DD", "#D85A30",
];

/**
 * Deterministic colour index from userId string
 * so the same user always gets the same colour.
 */
function colorForUser(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

/* ── Online presence tracking ────────────────────────────────────
   Map<workspaceId, Set<userId>>  — kept in-process memory.
   ─────────────────────────────────────────────────────────────── */
const onlineByWorkspace = new Map();

function markOnline(workspaceId, userId) {
  if (!onlineByWorkspace.has(workspaceId)) {
    onlineByWorkspace.set(workspaceId, new Set());
  }
  onlineByWorkspace.get(workspaceId).add(userId.toString());
}

function markOffline(workspaceId, userId) {
  onlineByWorkspace.get(workspaceId)?.delete(userId.toString());
}

/* ── Initialise Socket.IO on the HTTP server ─────────────────── */
function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [
          process.env.CLIENT_URL,
          process.env.FRONTEND_URL,
          process.env.SOCKET_CORS_ORIGIN,
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]
          .filter(Boolean)
          .flatMap(u => u.split(","))
          .map(s => s.trim().replace(/\/$/, ""));

        const normalizedOrigin = origin.replace(/\/$/, "");
        if (
          allowed.includes(normalizedOrigin) ||
          normalizedOrigin.includes("localhost") ||
          normalizedOrigin.includes("127.0.0.1")
        ) {
          return callback(null, true);
        }

        try {
          const parsed = new URL(origin);
          if (parsed.hostname.endsWith(".onrender.com")) {
            return callback(null, true);
          }
        } catch {
          // invalid url
        }

        return callback(null, false);
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* ── JWT auth middleware ────────────────────────────────────── */
  _io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.warn("[Socket] ✗ Auth failed: No token provided");
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id name avatar email");
      if (!user) {
        console.warn("[Socket] ✗ Auth failed: User not found in DB");
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.warn("[Socket] ✗ Auth failed: Invalid token", err.message);
      next(new Error("Invalid token"));
    }
  });

  /* ── Connection handler ─────────────────────────────────────── */
  _io.on("connection", (socket) => {
    console.log(`[Socket] ✓ ${socket.user.name} connected  (${socket.id})`);

    /* ════════════════════════════════════════════════════════════
       WORKSPACE ROOMS + ONLINE PRESENCE
       ════════════════════════════════════════════════════════════ */
    socket.on("join:workspace", async (workspaceId) => {
      try {
        const room = `ws:${workspaceId}`;
        socket.join(room);

        markOnline(workspaceId, socket.user._id);

        // Broadcast to everyone else in the workspace
        socket.to(room).emit("user:online", {
          userId: socket.user._id.toString(),
          name: socket.user.name,
          workspaceId,
        });

        // Tell this socket who is already online
        const online = [...(onlineByWorkspace.get(workspaceId) || [])];
        socket.emit("workspace:onlineUsers", { workspaceId, userIds: online });
      } catch (err) {
        console.error("[Socket] join:workspace error:", err.message);
      }
    });

    /* ════════════════════════════════════════════════════════════
       CHANNEL ROOMS
       ════════════════════════════════════════════════════════════ */
    socket.on("join:channel", (channelId) => {
      socket.join(`ch:${channelId}`);
    });

    socket.on("leave:channel", (channelId) => {
      socket.leave(`ch:${channelId}`);
    });

    /* ════════════════════════════════════════════════════════════
       DM ROOMS
       ════════════════════════════════════════════════════════════ */
    socket.on("join:dm", ({ myId, recipientId }) => {
      const dmKey = [myId, recipientId].sort().join(":");
      socket.join(`dm:${dmKey}`);
    });

    /* ════════════════════════════════════════════════════════════
       CHANNEL TYPING INDICATORS
       ════════════════════════════════════════════════════════════ */
    socket.on("typing:start", ({ channelId }) => {
      socket.to(`ch:${channelId}`).emit("user:typing", {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        channelId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", ({ channelId }) => {
      socket.to(`ch:${channelId}`).emit("user:stopTyping", {
        userId: socket.user._id.toString(),
        channelId,
        isTyping: false,
      });
    });

    /* DM typing */
    socket.on("typing:start:dm", ({ recipientId }) => {
      const dmKey = [socket.user._id.toString(), recipientId].sort().join(":");
      socket.to(`dm:${dmKey}`).emit("user:typing:dm", {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        isTyping: true,
      });
    });

    socket.on("typing:stop:dm", ({ recipientId }) => {
      const dmKey = [socket.user._id.toString(), recipientId].sort().join(":");
      socket.to(`dm:${dmKey}`).emit("user:stopTyping:dm", {
        userId: socket.user._id.toString(),
        isTyping: false,
      });
    });

    /* ════════════════════════════════════════════════════════════
       ──────────────────────────────────────────────────────────
       ITEM 2 — SNIPPET COLLABORATIVE PAD SOCKET EVENTS
       ──────────────────────────────────────────────────────────
       ════════════════════════════════════════════════════════════ */

    /**
     * snippet:join — client opens a snippet pad.
     * Joins the snippet room and announces presence to other editors.
     */
    socket.on("snippet:join", ({ snippetId }) => {
      if (!snippetId) return;
      const room = `snippet:${snippetId}`;
      const color = colorForUser(socket.user._id.toString());

      socket.join(room);

      // Tell everyone else in the room that this user joined
      socket.to(room).emit("snippet:presenceUpdate", {
        snippetId,
        event: "joined",
        userId: socket.user._id.toString(),
        name: socket.user.name,
        color,
      });

      // Confirm to the joining user their assigned colour
      socket.emit("snippet:yourColor", { snippetId, color });

      console.log(`[Socket] snippet:join  ${socket.user.name} → ${snippetId}`);
    });

    /**
     * snippet:leave — client closes the snippet pad.
     * Leaves the room and notifies others.
     */
    socket.on("snippet:leave", ({ snippetId }) => {
      if (!snippetId) return;
      const room = `snippet:${snippetId}`;

      socket.leave(room);

      socket.to(room).emit("snippet:presenceUpdate", {
        snippetId,
        event: "left",
        userId: socket.user._id.toString(),
        name: socket.user.name,
      });

      console.log(`[Socket] snippet:leave ${socket.user.name} ← ${snippetId}`);
    });

    /**
     * snippet:codeChange — relay code changes to everyone else in the snippet room.
     * The sender's local state is already updated; we only push to others.
     *
     * Payload: { snippetId, code, version }
     */
    socket.on("snippet:codeChange", ({ snippetId, code, version }) => {
      if (!snippetId) return;
      socket.to(`snippet:${snippetId}`).emit("snippet:codeChange", {
        snippetId,
        code,
        version,
        userId: socket.user._id.toString(),
      });
    });

    /**
     * snippet:cursorMove — relay cursor position to everyone else.
     * Used to render coloured cursor decorations in Monaco.
     *
     * Payload: { snippetId, line, column }
     */
    socket.on("snippet:cursorMove", ({ snippetId, line, column }) => {
      if (!snippetId) return;
      const color = colorForUser(socket.user._id.toString());
      socket.to(`snippet:${snippetId}`).emit("snippet:cursorMove", {
        snippetId,
        userId: socket.user._id.toString(),
        name: socket.user.name,
        line,
        column,
        color,
      });
    });

    /**
     * snippet:saved — broadcast to the snippet room that a save occurred.
     * Triggered by the controller after a successful PATCH.
     * Also emitted by the client after auto-save succeeds (client-side emit
     * is cheaper — no need for the client to call this; the controller does it).
     *
     * Payload: { snippetId, version, savedBy }
     */
    socket.on("snippet:saved", ({ snippetId, version, savedBy }) => {
      if (!snippetId) return;
      _io.to(`snippet:${snippetId}`).emit("snippet:saved", {
        snippetId,
        version,
        savedBy: savedBy || socket.user._id.toString(),
        savedByName: socket.user.name,
      });
    });

    /* ════════════════════════════════════════════════════════════
       TASK EVENTS (emitted from controllers via getIO())
       ════════════════════════════════════════════════════════════ */
    // task:statusChanged and task:assigned are emitted by the task controller.
    // No socket.on() needed here — those are server-initiated, not client-initiated.

    /* ════════════════════════════════════════════════════════════
       DISCONNECT
       ════════════════════════════════════════════════════════════ */
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] ✗ ${socket.user.name} disconnected (${reason})`);

      // Broadcast offline to all workspace rooms this socket was in
      socket.rooms.forEach((room) => {
        if (room.startsWith("ws:")) {
          const workspaceId = room.slice(3);
          markOffline(workspaceId, socket.user._id);
          socket.to(room).emit("user:offline", {
            userId: socket.user._id.toString(),
            workspaceId,
          });
        }

        // Notify snippet rooms that this user left
        if (room.startsWith("snippet:")) {
          const snippetId = room.slice(8);
          socket.to(room).emit("snippet:presenceUpdate", {
            snippetId,
            event: "left",
            userId: socket.user._id.toString(),
            name: socket.user.name,
          });
        }
      });
    });
  });

  return _io;
}

/* ── Getter — use in controllers to emit events ──────────────── */
function getIO() {
  if (!_io) throw new Error("[Socket] Not initialized — call initSocket first");
  return _io;
}

module.exports = { initSocket, getIO };
