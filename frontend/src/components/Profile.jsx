import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API } from "../config/axios";
import DifficultyRings from "./DifficultyRings";
import "../styles/profile.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function fmtRelative(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const VERDICT_MAP = {
  accepted:            { label: "Accepted",      pass: true  },
  wrong_answer:        { label: "Wrong Answer",  pass: false },
  time_limit_exceeded: { label: "TLE",           pass: false },
  runtime_error:       { label: "Runtime Error", pass: false },
  compile_error:       { label: "Compile Error", pass: false },
};

const LANGUAGE_LABELS = {
  c: "C", cpp: "C++", js: "JavaScript", py: "Python",
  java: "Java", kotlin: "Kotlin", swift: "Swift",
};

const BADGE_ICONS = ["🏆", "⭐", "🎯", "⚡", "🔥", "💎", "🚀", "🎖️"];

// Totals — replace with API data if you have a totals endpoint
const TOTAL_PROBLEMS = { easy: 800, medium: 1600, hard: 600 };

// ─── Heatmap builder ──────────────────────────────────────────────────────────

function buildHeatmap(activityMap = {}, weeks = 52) {
  const result = [];
  const today = new Date();
  for (let w = weeks - 1; w >= 0; w--) {
    const week = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + d));
      const key = date.toISOString().slice(0, 10);
      const count = activityMap[key] ?? 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 7 ? 3 : 4;
      week.push(level);
    }
    result.push(week);
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub }) => (
  <div className="pf__stat-card">
    <div className="pf__stat-val">{value}</div>
    <div className="pf__stat-label">{label}</div>
    {sub && <div className="pf__stat-sub">{sub}</div>}
  </div>
);

const TABS = ["Overview", "Submissions", "Badges"];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [tab, setTab]               = useState("Overview");
  const [submissions, setSubmissions] = useState(null);
  const [subsLoading, setSubsLoading] = useState(false);

  const solved      = user?.solvedCount ?? { easy: 0, medium: 0, hard: 0 };
  const streak      = user?.streak      ?? { current: 0, best: 0 };
  const badges      = user?.badges      ?? [];
  const activityMap = useMemo(
    () => Object.fromEntries(Object.entries(user?.activityMap ?? {})),
    [user?.activityMap],
  );

  const totalSolved   = solved.easy + solved.medium + solved.hard;
  const totalProblems = TOTAL_PROBLEMS.easy + TOTAL_PROBLEMS.medium + TOTAL_PROBLEMS.hard;
  const heatmap       = useMemo(() => buildHeatmap(activityMap), [activityMap]);

  // Build the data array DifficultyRings expects
  const difficultyData = useMemo(() => [
    { name: "Easy",   solved: solved.easy,   total: TOTAL_PROBLEMS.easy   },
    { name: "Medium", solved: solved.medium,  total: TOTAL_PROBLEMS.medium },
    { name: "Hard",   solved: solved.hard,    total: TOTAL_PROBLEMS.hard   },
  ], [solved]);

  // Lazy-load submissions when tab is opened
  const handleTabChange = async (t) => {
    setTab(t);
    if (t === "Submissions" && submissions === null && !subsLoading) {
      setSubsLoading(true);
      try {
        const res = await API.get("/user/submissions?limit=50");
        setSubmissions(res.data.submissions ?? []);
      } catch {
        setSubmissions([]);
      } finally {
        setSubsLoading(false);
      }
    }
  };

  if (!user) {
    return (
      <div className="pf__root" style={{ justifyContent: "center", padding: "var(--space-8)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="pf__root">

      {/* ── Left aside ──────────────────────────────────────────────────── */}
      <aside className="pf__aside">

        {/* Identity */}
        <div className="pf__card pf__identity">
          <div className="pf__avatar">{getInitials(user.name)}</div>
          <h2 className="pf__name">{user.name}</h2>
          <p className="pf__handle">@{user.email.split("@")[0]}</p>

          <div className="pf__meta">
            <span className="pf__meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              Joined {fmtDate(user.createdAt)}
            </span>
            {user.isPremium && (
              <span className="pf__meta-item" style={{ color: "var(--medium)" }}>
                ⭐ Premium
              </span>
            )}
          </div>

          <button className="pf__edit-btn" onClick={() => navigate("/settings")}>
            Edit Profile
          </button>
        </div>

        {/* Stats */}
        <div className="pf__card pf__stats-grid">
          <StatCard
            label="Global Rank"
            value={user.globalRank ? `#${user.globalRank.toLocaleString()}` : "—"}
          />
          <StatCard label="Day Streak" value={`${streak.current}🔥`} />
          <StatCard label="Problems"   value={totalSolved} sub={`/ ${totalProblems}`} />
          <StatCard label="Rating"     value={user.contestRating ?? "—"} />
        </div>

        {/* Difficulty rings — reusing shared component */}
        <div className="pf__card">
          <div className="pf__section-title" style={{ marginBottom: "var(--space-4)" }}>
            Solved by Difficulty
          </div>
          <DifficultyRings data={difficultyData} size={72} />
        </div>

      </aside>

      {/* ── Right main ──────────────────────────────────────────────────── */}
      <main className="pf__main">

        <div className="pf__tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`pf__tab ${tab === t ? "pf__tab--active" : ""}`}
              onClick={() => handleTabChange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === "Overview" && (
          <>
            <div className="pf__card">
              <div className="pf__card-header">
                <span className="pf__section-title">Activity</span>
                <span className="pf__section-sub">
                  {totalSolved} submissions in the last year
                </span>
              </div>
              <div className="pf__heatmap">
                {heatmap.map((week, wi) => (
                  <div key={wi} className="hm__week">
                    {week.map((level, di) => (
                      <div key={di} className={`hm__cell hm__cell--${level}`} />
                    ))}
                  </div>
                ))}
              </div>
              <div className="pf__heatmap-legend">
                <span className="pf__section-sub">Less</span>
                {[0, 1, 2, 3, 4].map(l => (
                  <div key={l} className={`hm__cell hm__cell--${l}`} />
                ))}
                <span className="pf__section-sub">More</span>
              </div>
            </div>

            {/* Streak card */}
            <div className="pf__card">
              <div className="pf__section-title" style={{ marginBottom: "var(--space-3)" }}>
                Streak
              </div>
              <div style={{ display: "flex", gap: "var(--space-6)" }}>
                <div>
                  <div className="pf__stat-val">{streak.current} 🔥</div>
                  <div className="pf__stat-label">Current Streak</div>
                </div>
                <div>
                  <div className="pf__stat-val">{streak.best}</div>
                  <div className="pf__stat-label">Best Streak</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Submissions ── */}
        {tab === "Submissions" && (
          <div className="pf__card">
            <div className="pf__section-title" style={{ marginBottom: "var(--space-3)" }}>
              All Submissions
            </div>

            {subsLoading && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "var(--space-4) 0" }}>
                Loading submissions…
              </p>
            )}

            {!subsLoading && submissions?.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "var(--space-4) 0" }}>
                No submissions yet — go solve something!
              </p>
            )}

            {!subsLoading && submissions && submissions.length > 0 && (
              <div className="pf__submissions">
                {submissions.map((sub) => {
                  const verdict = VERDICT_MAP[sub.verdict] ?? { label: sub.verdict, pass: false };
                  const title   = sub.problem?.title ?? sub.problemSlug;
                  const diff    = sub.problem?.difficulty ?? null;

                  return (
                    <div key={sub._id} className="pf__sub-row">
                      <div className="pf__sub-left">
                        <span
                          className="pf__sub-title"
                          onClick={() => navigate(`/problems/${sub.problemSlug}`)}
                        >
                          #{sub.problemNumber} {title}
                        </span>
                        {diff && (
                          <span className={`pf__diff-badge pf__diff-badge--${diff}`}>
                            {diff.charAt(0).toUpperCase() + diff.slice(1)}
                          </span>
                        )}
                      </div>
                      <div className="pf__sub-right">
                        <span className={`pf__sub-status pf__sub-status--${verdict.pass ? "pass" : "fail"}`}>
                          {verdict.label}
                        </span>
                        <span className="pf__sub-lang">
                          {LANGUAGE_LABELS[sub.language] ?? sub.language}
                        </span>
                        <span className="pf__sub-time">{fmtRelative(sub.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Badges ── */}
        {tab === "Badges" && (
          <div className="pf__card">
            <div className="pf__section-title" style={{ marginBottom: "var(--space-4)" }}>
              Earned Badges
            </div>

            {badges.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                No badges yet — keep solving to earn them!
              </p>
            ) : (
              <div className="pf__badges-grid">
                {badges.map((b, i) => (
                  <div key={i} className="pf__badge-card">
                    <div className="pf__badge-icon">
                      {b.icon ?? BADGE_ICONS[i % BADGE_ICONS.length]}
                    </div>
                    <div className="pf__badge-name">{b.label}</div>
                    {b.earnedAt && (
                      <div className="pf__stat-sub">{fmtDate(b.earnedAt)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}