// src/components/Problem/CodeEditor.jsx

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { VscPlay } from "react-icons/vsc";

import "../styles/code-editor.css";
import { defineEditorThemes } from "./problemConfig/editorTheme";
import { MONACO_OPTIONS, LANGUAGES } from "./problemConfig/editorConfig";

/**
 * Detects the active color mode by checking (in order):
 *  1. data-theme="dark"  on <html>  (most common pattern)
 *  2. class="dark"       on <html>  (Tailwind / next-themes)
 *  3. class="dark"       on <body>  (some libs target body)
 *  4. OS prefers-color-scheme       (fallback)
 */
function isDarkMode() {
  const html = document.documentElement;
  const body = document.body;

  if (html.dataset.theme === "dark") return true;
  if (html.dataset.theme === "light") return false;
  if (html.classList.contains("dark")) return true;
  if (html.classList.contains("light")) return false;
  if (body.classList.contains("dark")) return true;
  if (body.classList.contains("light")) return false;

  // last resort — OS preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveEditorTheme() {
  return isDarkMode() ? "crimson" : "daybreak";
}

export default function CodeEditor({
  problem,
  onRun,
  onSubmit,
  isSubmitting,
  onCodeChange,
  isRunning,
}) {
  const [langKey, setLangKey] = useState("cpp");
  const [code, setCode] = useState("");
  const [editorTheme, setEditorTheme] = useState(resolveEditorTheme);

  useEffect(() => {
    const update = () => setEditorTheme(resolveEditorTheme());

    // Watch data-theme AND class changes on <html> and <body>
    const observer = new MutationObserver(update);
    const opts = { attributes: true, attributeFilter: ["class", "data-theme"] };

    observer.observe(document.documentElement, opts);
    observer.observe(document.body, opts);

    // Also catch OS-level changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  // Initialize editor when problem data arrives
  useEffect(() => {
    if (!problem?.languages) return;

    const availableLanguages = Object.keys(problem.languages);

    if (!availableLanguages.length) return;

    const defaultLang = availableLanguages.includes("cpp")
      ? "cpp"
      : availableLanguages[0];

    setLangKey(defaultLang);

    const starterCode = problem.languages?.[defaultLang]?.codeStub || "";

    setCode(starterCode);

    onCodeChange?.(
      starterCode,
      LANGUAGES[defaultLang]?.judgeKey || defaultLang,
    );
  }, [problem]);

  function handleCodeChange(value) {
    const newCode = value || "";

    setCode(newCode);

    onCodeChange?.(newCode, LANGUAGES[langKey]?.judgeKey || langKey);
  }

  function handleLanguageChange(e) {
    const newLang = e.target.value;

    setLangKey(newLang);

    const starterCode = problem?.languages?.[newLang]?.codeStub || "";

    setCode(starterCode);

    onCodeChange?.(starterCode, LANGUAGES[newLang]?.judgeKey || newLang);
  }

  function handleRun() {
    onRun?.(code, LANGUAGES[langKey]?.judgeKey || langKey);
  }

  function handleSubmit() {
    onSubmit?.();
  }

  return (
    <div className="editor-page">
      <div className="editor-wrapper">
        <div className="editor-toolbar">
          <div className="dropdown-container">
            <label htmlFor="lang-select">Language: </label>

            <select
              id="lang-select"
              value={langKey}
              onChange={handleLanguageChange}
              className="styled-select"
            >
              {Object.keys(problem?.languages || {}).map((key) => (
                <option key={key} value={key}>
                  {LANGUAGES[key]?.name || key}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-buttons">
            <button
              className={`run-button ${isRunning ? "running" : ""}`}
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
            >
              {isRunning ? (
                <>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Running…
                </>
              ) : (
                <>
                  <VscPlay size={16} />
                  Run
                </>
              )}
            </button>
            {/* Submit button — new */}
            <button
              className={`submit-button ${isSubmitting ? "submitting" : ""}`}
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting} // ← disable during run too
            >
              {isSubmitting ? (
                <>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Submitting…
                </>
              ) : (
                <>
                  <i className="ti ti-send" aria-hidden="true" /> Submit
                </>
              )}
            </button>
          </div>
        </div>

        <div className="monaco-container">
          <Editor
            height="100%"
            language={LANGUAGES[langKey]?.monacoLang || langKey}
            value={code}
            onChange={handleCodeChange}
            beforeMount={defineEditorThemes}
            theme={editorTheme}
            options={MONACO_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
