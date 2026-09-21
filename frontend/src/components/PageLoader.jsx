import React from "react";

export default function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#05070a",
        color: "#94a3b8",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "48px",
          height: "48px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid rgba(99, 102, 241, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#6366f1",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
      <span style={{ fontSize: "13px", letterSpacing: "0.03em", opacity: 0.8 }}>
        Loading DevSpace…
      </span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
