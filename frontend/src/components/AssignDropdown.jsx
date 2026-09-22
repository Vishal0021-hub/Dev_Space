import React, { useState, useRef, useEffect } from "react";

const AVATAR_PALETTES = [
  ["#6366f1","#4f46e5"], ["#8b5cf6","#7c3aed"], ["#06b6d4","#0891b2"],
  ["#10b981","#059669"], ["#f59e0b","#d97706"], ["#f43f5e","#e11d48"],
];

const MiniAvatar = ({ name, index, size = 24 }) => {
  const [a, b] = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: a,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, fontWeight: 700, color: "#fff",
      flexShrink: 0
    }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

const AssignDropdown = ({ members = [], selectedId, selectedUserId, onSelect, onChange }) => {
  const currentSelected = selectedId !== undefined ? selectedId : selectedUserId;
  const handleSelect = onSelect || onChange || (() => {});

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getMemberUser = (m) => m.userId || m.user || m;

  const selectedMember = (members || []).find((m) => {
    const user = getMemberUser(m);
    const uId = user?._id || user;
    return uId && currentSelected && uId.toString() === currentSelected.toString();
  });
  const selectedUser = selectedMember ? getMemberUser(selectedMember) : null;
  const filteredMembers = (members || []).filter(m => {
    const user = getMemberUser(m);
    return user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      user?.email?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 bg-bg-surface border ${
          isOpen ? "border-accent ring-2 ring-accent/20" : "border-border"
        } rounded-xl cursor-pointer flex items-center gap-3 transition shadow-xs`}
      >
        {selectedUser ? (
          <>
            <MiniAvatar name={selectedUser?.name} index={members.indexOf(selectedMember)} />
            <span className="text-sm font-medium text-text-heading flex-1 truncate">
              {selectedUser?.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-text-muted flex-1">Unassigned</span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Menu */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-bg-surface border border-border rounded-2xl z-50 shadow-2xl p-2 animate-in fade-in duration-150">
          {/* Search */}
          <div className="p-1 pb-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full px-3 py-2 bg-bg-canvas border border-border rounded-xl text-text-heading placeholder:text-text-muted text-xs outline-none focus:border-accent transition"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {/* Unassign option */}
            <div
              onClick={() => {
                handleSelect("");
                setIsOpen(false);
              }}
              className={`p-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition text-xs font-medium ${
                !currentSelected
                  ? "bg-accent/10 text-accent font-semibold"
                  : "text-text-muted hover:bg-bg-surface-elevated hover:text-text-heading"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-text-muted">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <span>Unassigned</span>
            </div>

            {filteredMembers.map((m, idx) => {
              const user = getMemberUser(m);
              const uId = user?._id || user;
              const isSelected = uId && currentSelected && uId.toString() === currentSelected.toString();
              return (
                <div
                  key={uId}
                  onClick={() => {
                    handleSelect(uId);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition ${
                    isSelected
                      ? "bg-accent/10 text-accent font-semibold"
                      : "text-text-heading hover:bg-bg-surface-elevated"
                  }`}
                >
                  <MiniAvatar name={user?.name} index={idx} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {user?.name}
                    </div>
                    <div className="text-[11px] text-text-muted truncate">
                      {user?.email}
                    </div>
                  </div>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="p-4 text-center text-xs text-text-muted">
                No members found
              </div>
            )}
          </div>
        </div>
      )}

      {/* <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dc-dropdown-item:hover {
          background: rgba(255,255,255,0.05) !important;
        }
      `}</style> */}
    </div>
  );
};

export default AssignDropdown;
