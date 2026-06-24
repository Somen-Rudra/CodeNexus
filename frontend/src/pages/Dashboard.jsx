import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../styles/dashboard.css";
import { useDashboard } from "../hooks/useDashboard";
import { useAuth } from "../context/AuthContext";
import Heatmap from "../components/Heatmap";
import DifficultyRings from "../components/DifficultyRings";

// ─── Constants ────────────────────────────────────────────────────────────────

const UPCOMING_CONTESTS = [
  {
    id: 1,
    org: "Google",
    title: "Google CodeSprint Challenge",
    date: "June 28, 2026",
    time: "10:30 AM",
    msLeft: 2 * 24 * 3600 + 4 * 3600 + 15 * 60 + 45,
    color: "#4285F4",
  },
  {
    id: 2,
    org: "Code",
    title: "Weekly Contest 512",
    date: "July 05, 2026",
    time: "08:00 PM",
    msLeft: 9 * 24 * 3600 + 10 * 3600 + 45 * 60 + 30,
    color: "var(--info)",
  },
  {
    id: 3,
    org: "Arena",
    title: "CodeArena Monthly Challenge",
    date: "July 12, 2026",
    time: "09:00 AM",
    msLeft: 16 * 24 * 3600 + 5 * 3600 + 15 * 60 + 30,
    color: "var(--color-primary)",
  },
  {
    id: 4,
    org: "Microsoft",
    title: "Microsoft Coding Cup",
    date: "July 19, 2026",
    time: "07:00 PM",
    msLeft: 23 * 24 * 3600 + 8 * 3600,
    color: "#00A4EF",
  },
  {
    id: 5,
    org: "Amazon",
    title: "Amazon Hiring Challenge",
    date: "July 26, 2026",
    time: "06:30 PM",
    msLeft: 30 * 24 * 3600 + 7 * 3600,
    color: "#FF9900",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${h} : ${m} : ${s}`;
}

function cap(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Builds 12-month chart data.
 */
function buildMonthlyData(heatmap = {}) {
  const labels = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  const monthTotals = {};
  Object.entries(heatmap).forEach(([date, count]) => {
    const month = labels[new Date(date).getMonth()];
    monthTotals[month] = (monthTotals[month] ?? 0) + count;
  });
  return labels.map((month) => ({ month, solved: monthTotals[month] ?? 0 }));
}

// ─── Mini heatmap cells for the streak card ───────────────────────────────────

function buildMiniCells(heatmap = {}, count = 42) {
  const cells = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const n = heatmap[key] ?? 0;
    const level = n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4;
    cells.push({ key, level });
  }
  return cells;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <div className="db-tooltip__label">{label}</div>
      <div className="db-tooltip__val">{payload[0].value} solved</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [chartPeriod, setChartPeriod] = useState("This Year");
  const { user } = useAuth();
  const { stats, overview, recentSubs, recommended, loading } = useDashboard();

  // ── Derived data ────────────────────────────────────────────────────────────

  // Mini cells for streak card only (42 days = 6 weeks × 7)
  const miniCells = useMemo(
    () => buildMiniCells(stats?.heatmap ?? {}, 42),
    [stats?.heatmap],
  );

  const allMonthlyData = useMemo(
    () => buildMonthlyData(stats?.heatmap ?? {}),
    [stats?.heatmap],
  );

  const chartData = useMemo(() => {
    if (chartPeriod === "Last 6 Months") return allMonthlyData.slice(-6);
    if (chartPeriod === "Last 3 Months") return allMonthlyData.slice(-3);
    return allMonthlyData;
  }, [chartPeriod, allMonthlyData]);

  const yMax = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.solved), 0);
    return max < 5 ? 5 : Math.ceil(max * 1.2);
  }, [chartData]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Solved Problems",
        value: stats.totalSolved?.toLocaleString() ?? "0",
        delta: `${stats.solvedCount?.easy ?? 0}E · ${stats.solvedCount?.medium ?? 0}M · ${stats.solvedCount?.hard ?? 0}H`,
        trend: "neutral",
      },
      {
        label: "Contest Rating",
        value: stats.contestRating ?? "—",
        delta: "",
        trend: "neutral",
      },
      {
        label: "Global Rank",
        value: stats.globalRank ? `#${stats.globalRank.toLocaleString()}` : "—",
        delta: "",
        trend: "neutral",
      },
      {
        label: "Badge Count",
        value: stats.badgeCount ?? 0,
        delta: "See all",
        trend: "link",
      },
    ];
  }, [stats]);

  const difficultyData = useMemo(() => {
    const solved = stats?.solvedCount ?? {};
    // overview.byDifficulty is [{ _id: "easy", count: 4 }, ...]
    const totals = {};
    (overview?.byDifficulty ?? []).forEach(({ _id, count }) => {
      totals[_id] = count;
    });
    return [
      { name: "Easy",   solved: solved.easy   ?? 0, total: totals.easy   ?? 0 },
      { name: "Medium", solved: solved.medium  ?? 0, total: totals.medium ?? 0 },
      { name: "Hard",   solved: solved.hard    ?? 0, total: totals.hard   ?? 0 },
    ];
  }, [stats?.solvedCount, overview]);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="db-layout">
        <main
          className="db-scroll"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <p style={{ color: "var(--text-muted)" }}>Loading dashboard…</p>
        </main>
      </div>
    );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="db-layout">
      <main className="db-scroll">
        <div className="db-container">

          {/* ── LEFT COLUMN ─────────────────────────────────── */}
          <div className="db-left">

            {/* Welcome + Streak */}
            <div className="db-welcome">
              <div className="db-greeting">
                <h1>
                  Good morning,{" "}
                  {user?.name?.split(" ")[0].toUpperCase() ?? "there"}!{" "}
                  <span aria-label="wave">👋</span>
                </h1>
                <p>Let's solve some problems today and keep that streak alive.</p>
              </div>

              <div className="db-streak-card">
                <div className="db-streak-info">
                  <div className="db-flame">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.22.1-.46.04-.64-.12a.83.83 0 0 1-.15-.17c-1.1-1.43-1.28-3.48-.53-5.12C5.89 10 5 12.3 5.14 14.47c.04.5.1 1 .27 1.5.14.6.4 1.2.72 1.73 1.04 1.73 2.87 2.97 4.84 3.22 2.1.27 4.35-.12 5.96-1.6 1.8-1.66 2.45-4.32 1.5-6.6l-.13-.26c-.2-.45-.47-.87-.78-1.25z" />
                    </svg>
                  </div>
                  <div>
                    <div className="db-streak-label">Current Streak</div>
                    <div className="db-streak-count">{stats?.streak?.current ?? 0} days</div>
                    <div className="db-streak-best">Best: {stats?.streak?.best ?? 0} days</div>
                  </div>
                </div>
                {/* Mini heatmap — compact 6-week strip in the streak card */}
                <div className="db-mini-heatmap">
                  {miniCells.map((cell, i) => (
                    <div key={i} className={`db-hcell db-hcell--${cell.level}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="db-stats-grid">
              {statCards.map((s) => (
                <div key={s.label} className="db-card db-stat-card">
                  <div className="db-stat-label">{s.label}</div>
                  <div className="db-stat-val">{s.value}</div>
                  {s.delta && (
                    <div className={`db-stat-delta db-stat-delta--${s.trend}`}>
                      {s.trend === "up" && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="12 19 12 5" />
                          <polyline points="5 12 12 5 19 12" />
                        </svg>
                      )}
                      {s.delta}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Activity Heatmap — full-width GitHub-style ── */}
            <div className="db-heatmap-section">
              <Heatmap
                heatmap={stats?.heatmap ?? {}}
                title="Activity Heatmap"
              />
            </div>

            {/* ── Charts row (area + radial) ── */}
            <div className="db-charts-grid">

              {/* Area chart */}
              <div className="db-card">
                <div className="db-card-header">
                  <h3 className="db-card-title">Problems Solved</h3>
                  <select
                    className="db-select"
                    value={chartPeriod}
                    onChange={(e) => setChartPeriod(e.target.value)}
                  >
                    <option>This Year</option>
                    <option>Last 6 Months</option>
                    <option>Last 3 Months</option>
                  </select>
                </div>
                <div className="db-chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="solvedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#dc143c" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#dc143c" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border-primary)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, yMax]}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ stroke: "var(--color-primary)", strokeWidth: 1, strokeDasharray: "4 2" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="solved"
                        stroke="#dc143c"
                        strokeWidth={2.5}
                        fill="url(#solvedGrad)"
                        dot={{ r: 3, fill: "#dc143c", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#dc143c", stroke: "var(--bg-card)", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Difficulty rings */}
              <div className="db-card db-card--radial">
                <div className="db-card-header">
                  <h3 className="db-card-title">Difficulty Breakdown</h3>
                </div>
                <DifficultyRings data={difficultyData} size={80} />
              </div>

            </div>

            {/* Recommended */}
            <div className="db-section">
              <div className="db-section-header">
                <div>
                  <h3 className="db-card-title">Recommended for You</h3>
                  <p className="db-section-sub">Based on your recent activity</p>
                </div>
                <a href="/problemSet" className="db-link">View all</a>
              </div>
              <div className="db-rec-grid">
                {recommended.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    No recommendations yet.
                  </p>
                )}
                {recommended.map((r) => (
                  <a
                    key={r._id}
                    className="db-rec-card"
                    href={`/problemSet/${r.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div className="db-rec-top">
                      <div className="db-icon-box">
                        <svg
                          width="15" height="15" viewBox="0 0 24 24"
                          fill="none" stroke={`var(--${r.difficulty})`} strokeWidth="2"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                      </div>
                      <span className={`db-badge db-badge--${r.difficulty}`}>
                        {cap(r.difficulty)}
                      </span>
                    </div>
                    <h4 className="db-rec-title">{r.title}</h4>
                    <div className="db-rec-meta">
                      <span>{r.topics?.slice(0, 2).join(", ")}</span>
                      <span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {r.acceptancePercentage != null ? `${r.acceptancePercentage}%` : "—"}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────── */}
          <div className="db-right">

            {/* Upcoming Contests */}
            <div className="db-card db-card--right">
              <div className="db-card-header">
                <h3 className="db-card-title">Upcoming Contests</h3>
                <a href="#" className="db-link">View all</a>
              </div>
              <div className="db-list">
                {UPCOMING_CONTESTS.map((c) => (
                  <div key={c.id} className="db-list-item">
                    <div className="db-list-left">
                      <div
                        className="db-org-badge"
                        style={{ background: c.color + "22", color: c.color }}
                      >
                        {c.org.charAt(0)}
                      </div>
                      <div>
                        <div className="db-list-title">{c.title}</div>
                        <div className="db-list-sub">{c.date} · {c.time}</div>
                      </div>
                    </div>
                    <div className="db-list-right">
                      <div className="db-timer">{fmtTime(c.msLeft)}</div>
                      <button className="db-btn-outline">Register</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Solving */}
            <div className="db-card db-card--right">
              <div className="db-card-header">
                <h3 className="db-card-title">Continue Solving</h3>
                <a href="/submissions" className="db-link">View all</a>
              </div>
              <div className="db-list">
                {recentSubs.length === 0 && (
                  <p className="db-list-sub" style={{ padding: "8px 0" }}>
                    No recent activity yet.
                  </p>
                )}
                {recentSubs.map((sub) => (
                  <div key={sub._id} className="db-list-item">
                    <div className="db-list-left">
                      <div className="db-icon-box">
                        <svg
                          width="15" height="15" viewBox="0 0 24 24"
                          fill="none" stroke={`var(--${sub.problem?.difficulty})`} strokeWidth="2"
                        >
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                      <div>
                        <div className="db-list-title">
                          {sub.problem?.title}
                          <span
                            className={`db-badge db-badge--${sub.problem?.difficulty}`}
                            style={{ marginLeft: 7 }}
                          >
                            {cap(sub.problem?.difficulty ?? "")}
                          </span>
                        </div>
                        <div className="db-list-sub">
                          {sub.problem?.topics?.slice(0, 2).join(", ")}
                        </div>
                      </div>
                    </div>
                    <a href={`/problemSet/${sub.problem?.slug}`} className="db-btn-outline">
                      Continue
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="db-card db-card--right">
              <div className="db-card-header">
                <h3 className="db-card-title">Recent Achievements</h3>
                <a href="#" className="db-link">View all</a>
              </div>
              <div className="db-list">
                <p className="db-list-sub" style={{ padding: "8px 0" }}>
                  No badges earned yet — keep solving!
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}