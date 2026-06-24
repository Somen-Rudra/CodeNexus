import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../config/axios";
import "../styles/submission.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const VERDICT_META = {
  accepted:              { label: "Accepted",              cls: "verdict--accepted"  },
  wrong_answer:          { label: "Wrong Answer",          cls: "verdict--wrong"     },
  time_limit_exceeded:   { label: "Time Limit Exceeded",   cls: "verdict--tle"       },
  memory_limit_exceeded: { label: "Memory Limit Exceeded", cls: "verdict--mle"       },
  runtime_error:         { label: "Runtime Error",         cls: "verdict--re"        },
  compile_error:         { label: "Compile Error",         cls: "verdict--ce"        },
  output_limit_exceeded: { label: "Output Limit Exceeded", cls: "verdict--ole"       },
  pending:               { label: "Pending",               cls: "verdict--pending"   },
  running:               { label: "Running",               cls: "verdict--pending"   },
};

const LANGUAGE_LABELS = {
  c: "C", cpp: "C++", js: "JS", py: "Python",
  java: "Java", kotlin: "Kotlin", swift: "Swift",
};

const MODE_OPTIONS    = ["all", "run", "submit"];
const VERDICT_OPTIONS = ["all", "accepted", "wrong_answer", "time_limit_exceeded",
                         "runtime_error", "compile_error"];
const LANG_OPTIONS    = ["all", "c", "cpp", "js", "py", "java", "kotlin", "swift"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(verdict) {
  return VERDICT_META[verdict] ?? { label: verdict, cls: "verdict--pending" };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtElapsed(ms) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8
               M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ChevronIcon({ dir = "right" }) {
  const rotate = { right: 0, left: 180, up: -90, down: 90 }[dir];
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: `rotate(${rotate}deg)` }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="sub-row sub-row--skeleton">
      {[40, 120, 80, 70, 60, 80, 90].map((w, i) => (
        <div key={i} className="sub-skeleton-cell" style={{ width: w }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const navigate = useNavigate();

  // filters
  const [mode,     setMode]     = useState("all");
  const [verdict,  setVerdict]  = useState("all");
  const [language, setLanguage] = useState("all");

  // data
  const [submissions, setSubmissions] = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (mode    !== "all") params.set("mode",     mode);
      if (verdict !== "all") params.set("verdict",  verdict);
      if (language !== "all") params.set("language", language);

      const res = await API.get(`/user/submissions?${params}`);
      setSubmissions(res.data.submissions);
      setPagination(res.data.pagination);
    } catch (err) {
      setError("Failed to load submissions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, mode, verdict, language]);

  useEffect(() => { fetch(); }, [fetch]);

  // Reset to page 1 when filters change
  const applyFilter = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  // ── Navigate to AI Features with submission context ──────────────────────────

  const handleAnalyze = (sub) => {
    navigate("/ai-features", {
      state: {
        preloaded: {
          code:          sub.code,
          language:      sub.language,
          problemTitle:  sub.problem?.title  ?? sub.problemSlug,
          problemSlug:   sub.problemSlug,
          problemNumber: sub.problemNumber,
          difficulty:    sub.problem?.difficulty ?? null,
          verdict:       sub.verdict,
        },
      },
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="subs-page">

      {/* Header */}
      <div className="subs-header">
        <div>
          <h1 className="subs-title">My Submissions</h1>
          {pagination && (
            <p className="subs-subtitle">
              {pagination.total.toLocaleString()} submission{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="subs-filters">
        <FilterIcon />

        <div className="subs-filter-group">
          <label className="subs-filter-label">Mode</label>
          <select className="subs-select" value={mode} onChange={e => applyFilter(setMode)(e.target.value)}>
            {MODE_OPTIONS.map(o => (
              <option key={o} value={o}>{o === "all" ? "All modes" : o.charAt(0).toUpperCase() + o.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="subs-filter-group">
          <label className="subs-filter-label">Verdict</label>
          <select className="subs-select" value={verdict} onChange={e => applyFilter(setVerdict)(e.target.value)}>
            {VERDICT_OPTIONS.map(o => (
              <option key={o} value={o}>{o === "all" ? "All verdicts" : fmt(o).label}</option>
            ))}
          </select>
        </div>

        <div className="subs-filter-group">
          <label className="subs-filter-label">Language</label>
          <select className="subs-select" value={language} onChange={e => applyFilter(setLanguage)(e.target.value)}>
            {LANG_OPTIONS.map(o => (
              <option key={o} value={o}>{o === "all" ? "All languages" : LANGUAGE_LABELS[o] ?? o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="subs-table-wrap">

        {/* Column headers */}
        <div className="subs-thead">
          <span className="sub-col sub-col--num">#</span>
          <span className="sub-col sub-col--problem">Problem</span>
          <span className="sub-col sub-col--verdict">Verdict</span>
          <span className="sub-col sub-col--lang">Lang</span>
          <span className="sub-col sub-col--mode">Mode</span>
          <span className="sub-col sub-col--time">Time</span>
          <span className="sub-col sub-col--date">Submitted</span>
          <span className="sub-col sub-col--action" />
        </div>

        {/* Body */}
        <div className="subs-tbody">
          {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && error && (
            <div className="subs-empty">
              <p className="subs-empty-text">{error}</p>
              <button className="subs-retry-btn" onClick={fetch}>Retry</button>
            </div>
          )}

          {!loading && !error && submissions.length === 0 && (
            <div className="subs-empty">
              <p className="subs-empty-text">No submissions match the current filters.</p>
            </div>
          )}

          {!loading && !error && submissions.map((sub, idx) => {
            const v = fmt(sub.verdict);
            const problemTitle = sub.problem?.title ?? sub.problemSlug;
            const rowNum = (pagination?.currentPage - 1) * 20 + idx + 1;

            return (
              <div key={sub._id} className="sub-row">

                <span className="sub-col sub-col--num sub-text-muted">
                  {rowNum}
                </span>

                <span className="sub-col sub-col--problem">
                  <a
                    className="sub-problem-link"
                    href={`/problems/${sub.problemSlug}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="sub-problem-num">#{sub.problemNumber}</span>
                    {problemTitle}
                  </a>
                  {sub.problem?.difficulty && (
                    <span className={`sub-diff sub-diff--${sub.problem.difficulty}`}>
                      {sub.problem.difficulty.charAt(0).toUpperCase() + sub.problem.difficulty.slice(1)}
                    </span>
                  )}
                </span>

                <span className="sub-col sub-col--verdict">
                  <span className={`sub-verdict ${v.cls}`}>{v.label}</span>
                  {sub.totalCount > 0 && (
                    <span className="sub-passed-ratio">
                      {sub.passedCount}/{sub.totalCount}
                    </span>
                  )}
                </span>

                <span className="sub-col sub-col--lang">
                  <span className="sub-lang-badge">
                    {LANGUAGE_LABELS[sub.language] ?? sub.language}
                  </span>
                </span>

                <span className="sub-col sub-col--mode">
                  <span className={`sub-mode-badge sub-mode--${sub.mode}`}>
                    {sub.mode === "submit" ? "Submit" : "Run"}
                  </span>
                </span>

                <span className="sub-col sub-col--time sub-text-muted">
                  {fmtElapsed(sub.totalElapsed)}
                </span>

                <span className="sub-col sub-col--date sub-text-muted">
                  {fmtDate(sub.createdAt)}
                </span>

                <span className="sub-col sub-col--action">
                  <button
                    className="sub-analyze-btn"
                    onClick={() => handleAnalyze(sub)}
                    title="Analyze with AI"
                  >
                    <SparkIcon />
                    Analyze
                  </button>
                </span>

              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="subs-pagination">
          <button
            className="subs-page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronIcon dir="left" /> Prev
          </button>

          <div className="subs-page-numbers">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="subs-page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`subs-page-num ${p === page ? "subs-page-num--active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
          </div>

          <button
            className="subs-page-btn"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronIcon dir="right" />
          </button>
        </div>
      )}

    </main>
  );
}