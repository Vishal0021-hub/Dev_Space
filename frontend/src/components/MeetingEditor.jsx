import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import API from "../services/api";

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase: "#0F172A", bgCard: "#1E293B", bgElevated: "#253448",
  border: "#334155", textPrimary: "#F1F5F9", textSecondary: "#94A3B8",
  textMuted: "#64748B", accent: "#6366F1", accentHover: "#4F46E5",
};

/* ── Toolbar button ────────────────────────────────────────── */
const ToolbarBtn = ({ active, onClick, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      background: active ? "rgba(99,102,241,0.15)" : "transparent",
      color: active ? "#818cf8" : C.textSecondary,
      border: "none", borderRadius: 6, padding: "4px 8px",
      cursor: "pointer", fontSize: 13, fontWeight: 600,
      transition: "all 0.15s", display: "flex", alignItems: "center",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
  >
    {children}
  </button>
);

/* ── Mention suggestion dropdown ───────────────────────────── */
function createMentionSuggestion(fetchTasks) {
  return {
    items: async ({ query }) => {
      const tasks = await fetchTasks();
      return tasks
        .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);
    },
    render: () => {
      let component;
      let popup;

      return {
        onStart: (props) => {
          component = document.createElement("div");
          component.style.cssText = `
            position: fixed; z-index: 9999;
            background: ${C.bgCard}; border: 1px solid ${C.border};
            border-radius: 12px; padding: 6px; min-width: 220px; max-width: 320px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            max-height: 240px; overflow-y: auto;
          `;
          document.body.appendChild(component);
          popup = component;
          renderItems(props);
          updatePosition(props);
        },
        onUpdate: (props) => {
          renderItems(props);
          updatePosition(props);
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.remove();
            return true;
          }
          return false;
        },
        onExit: () => {
          popup?.remove();
        },
      };

      function updatePosition(props) {
        if (!popup || !props.clientRect) return;
        const rect = props.clientRect();
        if (!rect) return;
        popup.style.top = `${rect.bottom + 8}px`;
        popup.style.left = `${rect.left}px`;
      }

      function renderItems(props) {
        if (!popup) return;
        const { items, command } = props;
        popup.innerHTML = "";

        if (items.length === 0) {
          const empty = document.createElement("div");
          empty.style.cssText = `padding: 10px 12px; color: ${C.textMuted}; font-size: 12px;`;
          empty.textContent = "No tasks found";
          popup.appendChild(empty);
          return;
        }

        items.forEach((item, i) => {
          const btn = document.createElement("button");
          btn.style.cssText = `
            display: flex; align-items: center; gap: 8px; width: 100%;
            padding: 8px 10px; border: none; border-radius: 8px;
            background: ${i === props.selectedIndex ? C.bgElevated : "transparent"};
            color: ${C.textPrimary}; font-size: 13px; cursor: pointer;
            text-align: left; transition: background 0.1s;
          `;
          btn.onmouseenter = () => { btn.style.background = C.bgElevated; };
          btn.onmouseleave = () => { if (i !== props.selectedIndex) btn.style.background = "transparent"; };
          btn.onclick = () => command({ id: item._id, label: item.title });

          const statusDot = document.createElement("span");
          const statusColors = { todo: "#94a3b8", inprogress: "#fbbf24", review: "#818cf8", done: "#34d399" };
          statusDot.style.cssText = `width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background: ${statusColors[item.status] || "#94a3b8"};`;
          
          const label = document.createElement("span");
          label.style.cssText = `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
          label.textContent = item.title;

          btn.appendChild(statusDot);
          btn.appendChild(label);
          popup.appendChild(btn);
        });
      }
    },
  };
}

/* ── Main Editor Component ─────────────────────────────────── */
const MeetingEditor = forwardRef(function MeetingEditor({ content, onChange, workspaceId, placeholder: ph }, ref) {
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef([]);

  // Fetch all tasks in workspace for @mention autocomplete
  const fetchAllTasks = useCallback(async () => {
    if (tasksRef.current.length > 0) return tasksRef.current;
    try {
      // Get all projects → boards → tasks
      const projRes = await API.get(`/projects/${workspaceId}`);
      const projects = projRes.data || [];
      const allTasks = [];
      for (const proj of projects) {
        const boardRes = await API.get(`/boards/${proj._id}`);
        const boards = boardRes.data || [];
        for (const board of boards) {
          const taskRes = await API.get(`/tasks/board/${board._id}`);
          allTasks.push(...(taskRes.data || []));
        }
      }
      tasksRef.current = allTasks;
      setTasks(allTasks);
      return allTasks;
    } catch {
      return tasksRef.current;
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) fetchAllTasks();
  }, [workspaceId, fetchAllTasks]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ph || "Start writing meeting notes… Type @ to mention a task",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention-chip",
          style: `background: rgba(99,102,241,0.15); color: #818cf8; border-radius: 6px; padding: 1px 6px; font-weight: 600; font-size: 12px; cursor: pointer;`,
        },
        suggestion: createMentionSuggestion(fetchAllTasks),
      }),
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      if (onChange) onChange(ed.getJSON());
    },
  });

  useImperativeHandle(ref, () => ({
    getJSON: () => editor?.getJSON(),
    getHTML: () => editor?.getHTML(),
    clear: () => editor?.commands.clearContent(),
  }));

  if (!editor) return null;

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: C.bgBase }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", gap: 2, padding: "6px 10px",
        borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)",
      }}>
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        ><strong>B</strong></ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        ><em>I</em></ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        ><s>S</s></ToolbarBtn>
        <div style={{ width: 1, background: C.border, margin: "2px 4px" }} />
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading"
        >H2</ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >• List</ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >1. List</ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >" Quote</ToolbarBtn>
      </div>

      {/* ── Editor ── */}
      <div style={{ padding: "12px 16px", minHeight: 180 }}>
        <EditorContent editor={editor} />
      </div>

      {/* ── Tiptap editor styles ── */}
      <style>{`
        .tiptap {
          outline: none;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 14px;
          color: ${C.textPrimary};
          line-height: 1.7;
        }
        .tiptap p { margin: 0 0 8px; }
        .tiptap h1, .tiptap h2, .tiptap h3 {
          color: ${C.textPrimary}; font-weight: 700; margin: 16px 0 8px;
        }
        .tiptap h2 { font-size: 18px; }
        .tiptap h3 { font-size: 15px; }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin: 4px 0; }
        .tiptap li { margin: 2px 0; }
        .tiptap blockquote {
          border-left: 3px solid ${C.accent};
          padding-left: 14px; margin: 8px 0;
          color: ${C.textSecondary};
        }
        .tiptap code {
          background: rgba(99,102,241,0.1);
          border-radius: 4px; padding: 1px 4px;
          font-size: 13px; color: #c084fc;
        }
        .tiptap .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${C.textMuted};
          pointer-events: none;
          height: 0;
        }
        .mention-chip {
          background: rgba(99,102,241,0.15);
          color: #818cf8;
          border-radius: 6px;
          padding: 1px 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
});

export default MeetingEditor;
