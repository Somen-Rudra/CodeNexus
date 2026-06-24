import "../styles/output.css";
import { MdDeleteSweep } from "react-icons/md";

export default function Output({ terminalOutput, isErrorOutput, clearOutput }) {
  return (
    <div
      className="terminal-panel"
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        background: "#050101",
        padding: "15px",
        fontFamily: "monospace",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={clearOutput}
        title="Clear Output"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#e8001c",
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "0.2s ease",
        }}
      >
        <MdDeleteSweep />
      </button>

      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          color: isErrorOutput ? "#ff355e" : "#00ffcc",
          fontSize: "14px",
          tabSize: 4,
        }}
      >
        {terminalOutput}
      </pre>
    </div>
  );
}
