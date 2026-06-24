import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { API } from "../config/axios";
import "../styles/ai-page.css";

const LANGUAGE_OPTIONS = ["Python", "JavaScript", "Java", "C++", "C", "Go", "Kotlin", "Swift"];
const LANGUAGE_MAP = {
  Python: "py", JavaScript: "js", Java: "java",
  "C++": "cpp", C: "c", Go: "go", Kotlin: "kotlin", Swift: "swift",
};
const REVERSE_LANGUAGE_MAP = Object.fromEntries(
  Object.entries(LANGUAGE_MAP).map(([label, key]) => [key, label])
);
const FOLLOWUPS = [
  { key: "complexity", label: "Explain Complexity", endpoint: "/ai/complexity"  },
  { key: "approach",   label: "Approach Explainer", endpoint: "/ai/approach"    },
  { key: "bugs",       label: "Bug Finder",          endpoint: "/ai/bug-finder"  },
  { key: "optimize",   label: "Code Optimization",   endpoint: "/ai/optimize"    },
];

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function SparkleIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8
               M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ComplexityBadge({ label, value }) {
  return (
    <div className="complexity-badge">
      <span className="complexity-badge__label">{label}</span>
      <strong className="complexity-badge__value">{value}</strong>
    </div>
  );
}
function SeverityDot({ severity }) {
  const colors = { high: "var(--hard)", medium: "var(--medium)", low: "var(--easy)" };
  return <span className="severity-dot" style={{ background: colors[severity] ?? "var(--text-muted)" }} />;
}

function ComplexityResult({ data }) {
  return (
    <div className="result-section">
      <div className="complexity-badges-row">
        <ComplexityBadge label="Time"  value={data.timeComplexity}  />
        <ComplexityBadge label="Space" value={data.spaceComplexity} />
      </div>
      <div className="result-block"><h4>Time Complexity</h4><p>{data.timeExplanation}</p></div>
      <div className="result-block"><h4>Space Complexity</h4><p>{data.spaceExplanation}</p></div>
      {data.bottleneck && <div className="result-block"><h4>Bottleneck</h4><p>{data.bottleneck}</p></div>}
      {data.optimizationTip && data.optimizationTip !== "Already optimal" && (
        <div className="result-tip"><span className="tip-label">💡 Tip</span>{data.optimizationTip}</div>
      )}
    </div>
  );
}
function ApproachResult({ data }) {
  return (
    <div className="result-section">
      <div className="approach-name-badge">{data.approachName}</div>
      <p className="result-summary">{data.summary}</p>
      {data.steps?.length > 0 && (
        <div className="result-block">
          <h4>Steps</h4>
          <ol className="result-ol">{data.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
      {data.dataStructuresUsed?.length > 0 && (
        <div className="result-block">
          <h4>Data Structures Used</h4>
          <div className="tag-row">{data.dataStructuresUsed.map((d, i) => <span key={i} className="tag">{d}</span>)}</div>
        </div>
      )}
      {data.whyThisWorks && <div className="result-block"><h4>Why This Works</h4><p>{data.whyThisWorks}</p></div>}
      {data.realLifeAnalogy && (
        <div className="result-tip"><span className="tip-label">🌍 Analogy</span>{data.realLifeAnalogy}</div>
      )}
    </div>
  );
}
function BugResult({ data }) {
  return (
    <div className="result-section">
      <p className="result-summary">{data.overallVerdict}</p>
      {!data.hasIssues && (
        <div className="result-tip" style={{ color: "var(--easy)" }}>
          <CheckIcon /> No issues found — code looks clean!
        </div>
      )}
      {data.issues?.map((issue, i) => (
        <div key={i} className="bug-card">
          <div className="bug-card__header">
            <SeverityDot severity={issue.severity} />
            <span className="bug-card__type">{issue.type}</span>
            <span className="bug-card__location">{issue.location}</span>
            <span className="bug-card__severity">{issue.severity}</span>
          </div>
          <p className="bug-card__desc">{issue.description}</p>
          {issue.suggestedFix && (
            <div className="bug-card__fix"><span className="tip-label">Fix</span> {issue.suggestedFix}</div>
          )}
        </div>
      ))}
    </div>
  );
}
function OptimizeResult({ data }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(data.optimizedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="result-section">
      {data.canOptimize ? (
        <>
          <div className="complexity-badges-row">
            <ComplexityBadge label="Before Time"  value={data.currentComplexity?.time}    />
            <ComplexityBadge label="After Time"   value={data.optimizedComplexity?.time}  />
            <ComplexityBadge label="Before Space" value={data.currentComplexity?.space}   />
            <ComplexityBadge label="After Space"  value={data.optimizedComplexity?.space} />
          </div>
          <div className="result-block"><h4>What Changed</h4><p>{data.explanation}</p></div>
          <div className="code-result-wrap">
            <div className="code-result-header">
              <span>Optimized Code</span>
              <button className="copy-icon-btn" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
            <pre className="optimized-code-block"><code>{data.optimizedCode}</code></pre>
          </div>
        </>
      ) : (
        <>
          <div className="result-tip" style={{ color: "var(--easy)" }}>
            <CheckIcon /> {data.explanation || "Your code is already optimal."}
          </div>
          <pre className="optimized-code-block"><code>{data.optimizedCode}</code></pre>
        </>
      )}
    </div>
  );
}
function TestCasesResult({ data }) {
  const categoryColor = {
    normal: "var(--info)", edge: "var(--hard)",
    boundary: "var(--medium)", stress: "var(--color-primary)",
  };
  return (
    <div className="result-section">
      {data.testCases?.map((tc, i) => (
        <div key={i} className="test-case-card">
          <div className="test-case-card__header">
            <span className="tag" style={{ color: categoryColor[tc.category], borderColor: categoryColor[tc.category] }}>
              {tc.category}
            </span>
            <span className="bug-card__desc">{tc.reason}</span>
          </div>
          <div className="test-case-io">
            <div><span className="io-label">Input</span><code>{tc.input}</code></div>
            <div><span className="io-label">Expected</span><code>{tc.expectedOutput}</code></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreloadedBanner({ preloaded, onUseThis, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ai-preloaded-banner">
      <div className="ai-preloaded-banner__left">
        <SparkleIcon size={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ai-preloaded-banner__title">
            Submission preloaded:&nbsp;
            <strong>{preloaded.problemTitle ?? preloaded.problemSlug}</strong>
            <span className="sub-lang-badge" style={{ marginLeft: 8 }}>
              {(REVERSE_LANGUAGE_MAP[preloaded.language] ?? preloaded.language)?.toUpperCase()}
            </span>
          </div>
          <div className="ai-preloaded-banner__actions">
            <button className="btn btn-primary" style={{ padding: "4px 14px", fontSize: 12 }} onClick={onUseThis}>
              Load into editor
            </button>
            <button className="followup-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? "Hide preview" : "Preview code"}
            </button>
            <button className="followup-btn" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
          {expanded && (
            <pre className="ai-context-banner__code" style={{ marginTop: 8, maxHeight: 200, overflow: "auto" }}>
              <code>{preloaded.code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AICodeExplanation() {
  const location  = useLocation();

  // Preloaded from submissions — stored separately, never auto-injected into textarea
  const [preloaded, setPreloaded] = useState(location.state?.preloaded ?? null);

  // Textarea is always free — user controls it
  const [code,     setCode]     = useState("");
  const [language, setLanguage] = useState("Python");

  const [overview,        setOverview]        = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError,   setOverviewError]   = useState(null);

  const [followupResults, setFollowupResults] = useState({});
  const [followupLoading, setFollowupLoading] = useState(null);
  const [followupError,   setFollowupError]   = useState(null);
  const [activeFollowup,  setActiveFollowup]  = useState(null);

  const [testCases,        setTestCases]        = useState(null);
  const [testCasesLoading, setTestCasesLoading] = useState(false);
  const [showTestCases,    setShowTestCases]    = useState(false);

  const [copied, setCopied] = useState(false);

  // Snapshot of code+lang AT explain time — followups always use this
  const explainedCodeRef = useRef("");
  const explainedLangRef = useRef("Python");

  const handleUsePreloaded = () => {
    const langLabel = REVERSE_LANGUAGE_MAP[preloaded.language] ?? "C++";
    setCode(preloaded.code ?? "");
    setLanguage(langLabel);
    setPreloaded(null);
  };

  const resetResults = () => {
    setOverview(null);
    setOverviewError(null);
    setFollowupResults({});
    setActiveFollowup(null);
    setShowTestCases(false);
    setTestCases(null);
  };

  const handleExplain = async () => {
    if (!code.trim()) return;

    // Snapshot exactly what is in the textarea right now
    explainedCodeRef.current = code;
    explainedLangRef.current = language;

    setOverviewLoading(true);
    resetResults();

    try {
      const res = await API.post("/ai/approach", {
        code,
        language: LANGUAGE_MAP[language] ?? language.toLowerCase(),
      });
      setOverview(res.data.data);
    } catch {
      setOverviewError("Failed to explain code. Please try again.");
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleFollowup = async (followup) => {
    if (activeFollowup === followup.key && followupResults[followup.key]) {
      setActiveFollowup(null);
      return;
    }
    setActiveFollowup(followup.key);
    if (followupResults[followup.key]) return;

    setFollowupLoading(followup.key);
    setFollowupError(null);

    try {
      const res = await API.post(followup.endpoint, {
        code:     explainedCodeRef.current,   // always the snapshotted version
        language: LANGUAGE_MAP[explainedLangRef.current] ?? explainedLangRef.current.toLowerCase(),
      });
      setFollowupResults(prev => ({ ...prev, [followup.key]: res.data.data }));
    } catch {
      setFollowupError(`Failed to load ${followup.label}. Please try again.`);
      setActiveFollowup(null);
    } finally {
      setFollowupLoading(null);
    }
  };

  const handleGenerateTestCases = async () => {
    setShowTestCases(true);
    if (testCases) return;
    setTestCasesLoading(true);
    try {
      const res = await API.post("/ai/test-cases", {
        problemDescription: `Generate test cases for this ${explainedLangRef.current} code:\n\n${explainedCodeRef.current}`,
        constraints: "",
      });
      setTestCases(res.data.data);
    } catch {
      setTestCases(null);
    } finally {
      setTestCasesLoading(false);
    }
  };

  const handleClear = () => {
    setCode("");
    resetResults();
    explainedCodeRef.current = "";
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFollowupMeta = FOLLOWUPS.find(f => f.key === activeFollowup);

  return (
    <div className="ai-explain-page">
      <div className="ai-explain-breadcrumb">
        AI Features <span className="crumb-active">/ AI Code Explanation</span>
      </div>
      <div className="ai-explain-header">
        <h1>AI Code Explanation</h1>
        <p>Get detailed explanations of any code snippet</p>
      </div>

      {preloaded && (
        <PreloadedBanner
          preloaded={preloaded}
          onUseThis={handleUsePreloaded}
          onDismiss={() => setPreloaded(null)}
        />
      )}

      <div className="ai-explain-grid">

        {/* Left: Code input */}
        <div className="panel code-panel">
          <div className="panel-title">Your Code</div>
          <div className="panel-toolbar">
            <select className="language-select" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map(l => <option key={l}>{l}</option>)}
            </select>
            <button className="copy-icon-btn" onClick={handleCopyCode} title="Copy code">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <textarea
            className="code-textarea"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Paste your code here…"
            spellCheck="false"
          />
          <div className="code-panel-actions">
            <button className="btn btn-secondary" onClick={handleClear}>Clear</button>
            <button
              className="btn btn-primary"
              onClick={handleExplain}
              disabled={!code.trim() || overviewLoading}
            >
              {overviewLoading ? <><span className="btn-spinner" /> Explaining…</> : "Explain Code"}
            </button>
          </div>
        </div>

        {/* Middle: Results */}
        <div className="panel explanation-panel">
          <div className="panel-title">
            {activeFollowupMeta ? activeFollowupMeta.label : "AI Explanation"}
          </div>

          {(overviewLoading || followupLoading) && (
            <div className="loading-row">
              <div className="spinner" />
              {followupLoading
                ? `Running ${FOLLOWUPS.find(f => f.key === followupLoading)?.label}…`
                : "Analyzing your code…"}
            </div>
          )}

          {!overviewLoading && !followupLoading && !overview && !overviewError && (
            <div className="explanation-empty">
              <SparkleIcon />
              <p>Paste your code and click "Explain Code" to get started.</p>
            </div>
          )}

          {overviewError && !overviewLoading && (
            <div className="result-error">
              {overviewError}
              <button className="subs-retry-btn" onClick={handleExplain}>Retry</button>
            </div>
          )}

          {followupError && !followupLoading && (
            <div className="result-error">{followupError}</div>
          )}

          {!overviewLoading && overview && !activeFollowup && (
            <>
              <div className="result-section">
                <div className="approach-name-badge">{overview.approachName}</div>
                <p className="result-summary">{overview.summary}</p>
              </div>
              <div className="result-block">
                <h4>Step-by-step</h4>
                <ol className="result-ol">{overview.steps?.map((s, i) => <li key={i}>{s}</li>)}</ol>
              </div>
              {overview.whyThisWorks && (
                <div className="result-block"><h4>Why This Works</h4><p>{overview.whyThisWorks}</p></div>
              )}
              {overview.realLifeAnalogy && (
                <div className="result-tip">
                  <span className="tip-label">🌍 Analogy</span>{overview.realLifeAnalogy}
                </div>
              )}
            </>
          )}

          {!followupLoading && activeFollowup && followupResults[activeFollowup] && (
            <>
              {activeFollowup === "complexity" && <ComplexityResult data={followupResults.complexity} />}
              {activeFollowup === "approach"   && <ApproachResult   data={followupResults.approach}   />}
              {activeFollowup === "bugs"       && <BugResult        data={followupResults.bugs}        />}
              {activeFollowup === "optimize"   && <OptimizeResult   data={followupResults.optimize}    />}
            </>
          )}

          {showTestCases && !activeFollowup && (
            <div className="result-block" style={{ marginTop: "var(--space-4)" }}>
              <h4>Generated Test Cases</h4>
              {testCasesLoading
                ? <div className="loading-row"><div className="spinner" /> Generating…</div>
                : testCases
                  ? <TestCasesResult data={testCases} />
                  : <p className="result-error">Failed to generate test cases.</p>}
            </div>
          )}

          {overview && !overviewLoading && (
            <div className="explanation-section" style={{ marginTop: "auto", paddingTop: "var(--space-5)" }}>
              <div className="followup-title">Dig deeper</div>
              <div className="followup-grid">
                {FOLLOWUPS.map(f => (
                  <button
                    key={f.key}
                    className={`followup-btn ${activeFollowup === f.key ? "active" : ""}`}
                    onClick={() => handleFollowup(f)}
                    disabled={followupLoading === f.key}
                  >
                    {followupLoading === f.key
                      ? <><span className="btn-spinner btn-spinner--sm" /> Loading…</>
                      : f.label}
                  </button>
                ))}
                {activeFollowup && (
                  <button className="followup-btn" onClick={() => setActiveFollowup(null)}>
                    ← Back to Overview
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="right-column">
          <div className="panel more-actions-panel">
            <div className="panel-title">More Actions</div>
            <div className="more-actions-list">
              <button
                className="more-action-btn"
                onClick={handleGenerateTestCases}
                disabled={!overview || testCasesLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Generate Test Cases
              </button>
            </div>
          </div>

          {overview && (
            <div className="panel related-panel">
              <div className="panel-title">Code Summary</div>
              <ul className="related-list" style={{ gap: "var(--space-3)" }}>
                {overview.approachName && (
                  <li>
                    <span className="problem-name">Approach</span>
                    <span className="tag">{overview.approachName}</span>
                  </li>
                )}
                {overview.dataStructuresUsed?.slice(0, 3).map((ds, i) => (
                  <li key={i}>
                    <span className="problem-name">{i === 0 ? "Data structures" : ""}</span>
                    <span className="tag">{ds}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}