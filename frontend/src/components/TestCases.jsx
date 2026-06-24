// src/components/Problem/TestCases.jsx
import { useState } from "react";
import "../styles/testcases.css";

// Renders one field row: label + textarea or pre
function FieldRow({ label, value, onChange, readOnly }) {
  return (
    <div className="tc-field">
      <span className="tc-label">{label}</span>
      {readOnly ? (
        <pre className="tc-pre">{value}</pre>
      ) : (
        <textarea
          className="tc-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          spellCheck={false}
        />
      )}
    </div>
  );
}

// Build stdin string from structured fields
function buildStdin(fields, fieldValues) {
  if (!fields?.length) return fieldValues["__raw__"] ?? "";
  return fields.map((f) => fieldValues[f] ?? "").join("\n");
}

export default function TestCases({ problem, onRun, submitResults }) {
  const [activeTab, setActiveTab] = useState(0);
  const [customCases, setCustomCases] = useState([]);

  const visibleCases = problem?.visibleTestCases || [];
  const inputFields = problem?.inputFields || null;

  const totalCases = [
    ...visibleCases.map((tc) => ({ ...tc, _type: "db" })),
    ...customCases.map((cc) => ({ ...cc, _type: "custom" })),
  ];

  const allPassed = submitResults?.every((r) => r.passed);
  const passCount = submitResults?.filter((r) => r.passed).length ?? 0;
  const totalCount = submitResults?.length ?? 0;
  const visibleCount = visibleCases.length;

  function resultForTab(tabIndex) {
    return submitResults?.[tabIndex] ?? null;
  }

  function addCustomCase() {
    const blank = inputFields
      ? Object.fromEntries(inputFields.map((f) => [f, ""]))
      : { __raw__: "" };

    setCustomCases((prev) => [...prev, { _fields: blank, output: "" }]);
    setActiveTab(totalCases.length);
  }

  function removeCustomCase(customIndex) {
    setCustomCases((prev) => prev.filter((_, i) => i !== customIndex));
    setActiveTab((t) => Math.max(0, t - 1));
  }

  function updateCustomField(customIndex, key, value) {
    setCustomCases((prev) =>
      prev.map((cc, i) =>
        i === customIndex
          ? { ...cc, _fields: { ...cc._fields, [key]: value } }
          : cc,
      ),
    );
  }

  function updateCustomExpected(customIndex, value) {
    setCustomCases((prev) =>
      prev.map((cc, i) => (i === customIndex ? { ...cc, output: value } : cc)),
    );
  }

  const active = totalCases[activeTab];
  const activeResult = resultForTab(activeTab);
  const isCustom = active?._type === "custom";
  const customIndex = isCustom ? activeTab - visibleCount : -1;

  // Judge /run-tests returns actualOutput per result
  // Guard: fall back to stdout if actualOutput is absent (future-proofing)
  function getActualOutput(result) {
    if (!result) return "";
    return result.actualOutput ?? result.stdout ?? "";
  }

  return (
    <div className="tc-root">
      <div className="tc-header">
        <div className="tc-tabs">
          {totalCases.map((tc, i) => {
            const res = resultForTab(i);
            const statusClass = !res
              ? ""
              : res.passed
                ? "tab-pass"
                : "tab-fail";
            const isC = tc._type === "custom";
            return (
              <button
                key={i}
                className={`tc-tab ${activeTab === i ? "active" : ""} ${statusClass} ${isC ? "tc-tab-custom" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                {isC ? `Custom ${i - visibleCount + 1}` : `Case ${i + 1}`}
                {res && (
                  <span
                    className={`tc-dot ${res.passed ? "dot-pass" : "dot-fail"}`}
                  />
                )}
                {isC && (
                  <span
                    className="tc-tab-close"
                    role="button"
                    aria-label="Remove custom case"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomCase(i - visibleCount);
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}

          <button
            className="tc-tab tc-tab-add"
            onClick={addCustomCase}
            title="Add custom test case"
          >
            + Add
          </button>
        </div>
      </div>

      {submitResults && (
        <div
          className={`tc-result-banner ${allPassed ? "banner-pass" : "banner-fail"}`}
        >
          <i
            className={`ti ${allPassed ? "ti-circle-check" : "ti-circle-x"}`}
            aria-hidden="true"
          />
          {allPassed
            ? `All ${totalCount} test cases passed`
            : `${passCount} / ${totalCount} test cases passed`}
        </div>
      )}

      {totalCases.length === 0 ? (
        <div className="tc-empty">No test cases available.</div>
      ) : (
        <div className="tc-body">
          {active && (
            <>
              {/* Input fields */}
              {inputFields ? (
                inputFields.map((field) => (
                  <FieldRow
                    key={field}
                    label={field}
                    value={
                      isCustom
                        ? (customCases[customIndex]?._fields[field] ?? "")
                        : active.input
                    }
                    onChange={(v) => updateCustomField(customIndex, field, v)}
                    readOnly={!isCustom}
                  />
                ))
              ) : (
                <FieldRow
                  label="Input"
                  value={
                    isCustom
                      ? (customCases[customIndex]?._fields.__raw__ ?? "")
                      : active.input
                  }
                  onChange={(v) => updateCustomField(customIndex, "__raw__", v)}
                  readOnly={!isCustom}
                />
              )}

              {/* Expected output */}
              <FieldRow
                label="Expected output"
                value={
                  isCustom
                    ? (customCases[customIndex]?.output ?? "")
                    : active.output
                }
                onChange={(v) => updateCustomExpected(customIndex, v)}
                readOnly={!isCustom}
              />

              {/* Actual output — from judge /run-tests result */}
              {activeResult && (
                <div className="tc-field">
                  <span className="tc-label">Your output</span>
                  <pre
                    className={`tc-pre ${activeResult.passed ? "pre-pass" : "pre-fail"}`}
                  >
                    {getActualOutput(activeResult) || "(no output)"}
                  </pre>

                  {/* Show status badge for non-accepted results */}
                  {!activeResult.passed && activeResult.status && (
                    <span className="tc-status-badge">
                      {activeResult.status === "time_limit_exceeded" &&
                        "⏱ Time Limit Exceeded"}
                      {activeResult.status === "runtime_error" &&
                        "💥 Runtime Error"}
                      {activeResult.status === "compile_error" &&
                        "🔧 Compile Error"}
                      {activeResult.status === "wrong_answer" &&
                        "✗ Wrong Answer"}
                      {activeResult.status === "output_limit_exceeded" &&
                        "📤 Output Limit Exceeded"}
                    </span>
                  )}

                  {/* stderr (compile errors, runtime errors) */}
                  {activeResult.stderr && (
                    <pre className="tc-pre pre-fail" style={{ marginTop: 4 }}>
                      {activeResult.stderr}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
