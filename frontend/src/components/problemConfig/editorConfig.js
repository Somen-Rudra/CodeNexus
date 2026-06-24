// src/components/Problem/problemConfig/editorConfig.js

export const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  minimap: { enabled: true },
  scrollBeyondLastLine: true,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: "on",
  lineNumbers: "on",
  renderWhitespace: "selection",
  smoothScrolling: true,
  cursorBlinking: "smooth",
  padding: { top: 12, bottom: 12 },
};

/**
 * key        – internal UI key (component state / <select> value)
 * name       – display label
 * monacoLang – Monaco editor language ID
 * dbKey      – key in problem.languages map (Mongoose ALLOWED_LANGUAGES)
 * judgeKey   – language string the judge server expects (must match judge's LANGUAGES keys exactly)
 */
export const LANGUAGES = {
  cpp: {
    name: "C++",
    monacoLang: "cpp",
    dbKey: "cpp",
    judgeKey: "cpp",
  },
  c: {
    name: "C",
    monacoLang: "c",
    dbKey: "c",
    judgeKey: "c",
  },
  js: {
    name: "JavaScript",
    monacoLang: "javascript",
    dbKey: "js",
    judgeKey: "js", // judge uses "javascript", DB stores "js"
  },
  py: {
    name: "Python",
    monacoLang: "python",
    dbKey: "py",
    judgeKey: "py", // judge uses "python", DB stores "py"
  },
  java: {
    name: "Java",
    monacoLang: "java",
    dbKey: "java",
    judgeKey: "java",
  },
  kotlin: {
    name: "Kotlin",
    monacoLang: "kotlin",
    dbKey: "kotlin",
    judgeKey: "kt",
  },
  swift: {
    name: "Swift",
    monacoLang: "swift",
    dbKey: "swift",
    judgeKey: "swift",
  },
};
