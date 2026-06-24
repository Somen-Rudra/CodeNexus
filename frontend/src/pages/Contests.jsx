import { useState, useMemo } from "react";
import "../styles/contests.css";

/* ── Icons (inline SVG helpers) ─────────────────────────── */
const Icon = {
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Trophy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 21 16 21" /><line x1="12" y1="17" x2="12" y2="21" /><path d="M7 4H17l-1 7a5 5 0 0 1-4 4 5 5 0 0 1-4-4Z" /><path d="M5 4H3v3a4 4 0 0 0 4 4" /><path d="M19 4h2v3a4 4 0 0 1-4 4" />
    </svg>
  ),
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Bookmark: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

/* ── Data ───────────────────────────────────────────────── */
const ALL_CONTESTS = [
  {
    id: 1,
    name: "CodeSprint Challenge",
    desc: "Monthly challenge with amazing prizes.",
    featured: true,
    icon: "🏆",
    iconClass: "gold",
    tags: ["Rated", "Algorithm", "Data Structures"],
    startDate: "June 28, 2026",
    startTime: "08:00 PM",
    duration: "2 Hours",
    durationHours: 2,
    participants: 3245,
    prize: 500,
    tab: "Upcoming",
  },
  {
    id: 2,
    name: "Weekly Warriors",
    desc: "Weekly contest to test your skills.",
    icon: "⚡",
    iconClass: "purple",
    tags: ["Rated", "Algorithm"],
    startDate: "July 05, 2026",
    startTime: "07:30 PM",
    duration: "1.5 Hours",
    durationHours: 1.5,
    participants: 1823,
    prize: 250,
    tab: "Upcoming",
  },
  {
    id: 3,
    name: "CodeClause 2026",
    desc: "Ace the challenge and secure your rank.",
    icon: "</>",
    iconClass: "green",
    tags: ["Rated", "Data Structures"],
    startDate: "July 12, 2026",
    startTime: "06:00 PM",
    duration: "2.5 Hours",
    durationHours: 2.5,
    participants: 4578,
    prize: 125,
    tab: "Upcoming",
  },
  {
    id: 4,
    name: "SpeedCoders Arena",
    desc: "Fast-paced coding contest for quick thinkers.",
    icon: "⚡",
    iconClass: "orange",
    tags: ["Rated", "Algorithm"],
    startDate: "June 22, 2026",
    startTime: "06:00 PM",
    duration: "1 Hour",
    durationHours: 1,
    participants: 2109,
    prize: 100,
    tab: "Ongoing",
  },
  {
    id: 5,
    name: "Data Structures Showdown",
    desc: "Let's see who's the DSA master!",
    icon: "🛡",
    iconClass: "blue",
    tags: ["Rated", "Data Structures"],
    startDate: "May 30, 2026",
    startTime: "09:00 PM",
    duration: "2 Hours",
    durationHours: 2,
    participants: 2987,
    prize: 150,
    tab: "Past",
  },
  {
    id: 6,
    name: "Graph Gladiators",
    desc: "Compete in graph theory challenges.",
    icon: "🌐",
    iconClass: "purple",
    tags: ["Rated", "Graph Theory"],
    startDate: "May 15, 2026",
    startTime: "05:00 PM",
    duration: "3 Hours",
    durationHours: 3,
    participants: 3100,
    prize: 300,
    tab: "Past",
  },
  {
    id: 7,
    name: "HashCode Blitz",
    desc: "Speed and accuracy combined.",
    icon: "#",
    iconClass: "gold",
    tags: ["Unrated", "Algorithm"],
    startDate: "April 20, 2026",
    startTime: "08:00 PM",
    duration: "2 Hours",
    durationHours: 2,
    participants: 2450,
    prize: 200,
    tab: "Past",
  },
];

const PAST_CONTESTS = [
  { id: 101, name: "CodeArena April Challenge", date: "Apr 20, 2024", rank: 1287, icon: "🏆", iconClass: "gold" },
  { id: 102, name: "Weekly Contest 410", date: "Apr 13, 2024", rank: 562, icon: "⚡", iconClass: "purple" },
  { id: 103, name: "CodeDash 2024", date: "Apr 06, 2024", rank: 982, icon: "🛡", iconClass: "blue" },
];

const TABS = ["Upcoming", "Ongoing", "Past", "My Contests"];

const ALL_TAGS = ["Algorithm", "Data Structures", "Rated", "Unrated"];
const DURATION_OPTS = ["≤ 1 Hour", "1–2 Hours", "> 2 Hours"];
const PRIZE_OPTS = ["$0–$150", "$151–$300", "$300+"];

/* ── Helpers ─────────────────────────────────────────────── */
function fmtParticipants(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "k" : n.toString();
}

function matchDuration(hours, opt) {
  if (opt === "≤ 1 Hour")  return hours <= 1;
  if (opt === "1–2 Hours") return hours > 1 && hours <= 2;
  if (opt === "> 2 Hours") return hours > 2;
  return true;
}

function matchPrize(prize, opt) {
  if (opt === "$0–$150")   return prize <= 150;
  if (opt === "$151–$300") return prize > 150 && prize <= 300;
  if (opt === "$300+")     return prize > 300;
  return true;
}

/* ── Component ───────────────────────────────────────────── */
export default function Contests() {
  const [activeTab, setActiveTab]       = useState("Upcoming");
  const [showFilters, setShowFilters]   = useState(false);
  const [savedBookmark, setSavedBookmark] = useState(false);

  // Filter state
  const [selTags, setSelTags]       = useState([]);
  const [selDuration, setSelDuration] = useState(null);
  const [selPrize, setSelPrize]     = useState(null);

  const featured = ALL_CONTESTS.find((c) => c.featured);

  const toggleTag = (tag) =>
    setSelTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const clearFilters = () => { setSelTags([]); setSelDuration(null); setSelPrize(null); };

  const filtered = useMemo(() => {
    return ALL_CONTESTS.filter((c) => {
      if (activeTab !== "My Contests" && c.tab !== activeTab) return false;
      if (activeTab === "My Contests") return false; // no data for demo
      if (selTags.length && !selTags.some((t) => c.tags.includes(t))) return false;
      if (selDuration && !matchDuration(c.durationHours, selDuration)) return false;
      if (selPrize && !matchPrize(c.prize, selPrize)) return false;
      return true;
    });
  }, [activeTab, selTags, selDuration, selPrize]);

  const hasFilters = selTags.length > 0 || selDuration || selPrize;

  return (
    <div className="contests-page">

      {/* ── LEFT ─────────────────────────────────────────── */}
      <div className="contests-left">

        {/* Header */}
        <div className="contests-header">
          <h1>Contests</h1>
          <p>Compete, improve, and win exciting prizes!</p>
        </div>

        {/* Tabs + Filter toggle */}
        <div className="contests-tabs-row">
          <div className="contests-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`tab-btn${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            className="filter-btn"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <Icon.Filter />
            Filters
            {hasFilters && (
              <span style={{
                background: "var(--color-primary)", color: "#fff",
                borderRadius: "50%", width: 16, height: 16,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {selTags.length + (selDuration ? 1 : 0) + (selPrize ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="filter-panel">

            <div className="filter-group">
              <label>Tags</label>
              <div className="filter-chips">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    className={`chip${selTags.includes(tag) ? " active" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Duration</label>
              <div className="filter-chips">
                {DURATION_OPTS.map((opt) => (
                  <button
                    key={opt}
                    className={`chip${selDuration === opt ? " active" : ""}`}
                    onClick={() => setSelDuration((v) => v === opt ? null : opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Prize Pool</label>
              <div className="filter-chips">
                {PRIZE_OPTS.map((opt) => (
                  <button
                    key={opt}
                    className={`chip${selPrize === opt ? " active" : ""}`}
                    onClick={() => setSelPrize((v) => v === opt ? null : opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <div className="filter-actions">
                <button className="btn-clear" onClick={clearFilters}>Clear all</button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="contests-table-wrap">
          <table className="contests-table">
            <thead>
              <tr>
                <th>Contest</th>
                <th>Start Time</th>
                <th>Duration</th>
                <th>Participants</th>
                <th>Prize Pool</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <span style={{ fontSize: 32 }}>🔍</span>
                      <p>No contests match your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    {/* Contest name */}
                    <td data-label="Contest">
                      <div className="contest-name-cell">
                        <div className={`contest-icon ${c.iconClass}`}>{c.icon}</div>
                        <div className="contest-name-info">
                          <strong>
                            {c.name}
                            {c.featured && <span className="badge-featured">Featured</span>}
                          </strong>
                          <span className="contest-desc">{c.desc}</span>
                          <div className="contest-tags">
                            {c.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Start time */}
                    <td data-label="Start Time">
                      <div className="start-time-cell">
                        <Icon.Calendar />
                        <div>
                          <div>{c.startDate}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.startTime}</div>
                        </div>
                      </div>
                    </td>

                    {/* Duration */}
                    <td data-label="Duration">
                      <div className="icon-cell">
                        <Icon.Clock />
                        {c.duration}
                      </div>
                    </td>

                    {/* Participants */}
                    <td data-label="Participants">
                      <div className="icon-cell">
                        <Icon.Users />
                        {fmtParticipants(c.participants)}
                      </div>
                    </td>

                    {/* Prize */}
                    <td data-label="Prize Pool">
                      <span className="prize">${c.prize}</span>
                    </td>

                    {/* Register */}
                    <td>
                      <button className="btn-register">Register</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Timezone note */}
        <div className="timezone-note">
          <Icon.Calendar />
          All times are shown in your local timezone (IST)
        </div>
      </div>

      {/* ── RIGHT ────────────────────────────────────────── */}
      <div className="contests-right">

        {/* Featured card */}
        {featured && (
          <div className="featured-card">
            <div className="featured-card-header">
              <div>
                <div className="featured-label">Featured Contest</div>
                <h2>{featured.name}</h2>
              </div>
              <div className="trophy-img">🏆</div>
            </div>

            <p className="featured-desc">
              This monthly challenge features a diverse set of problems to test
              your algorithmic skills and consistency.
            </p>

            <div className="featured-stats">
              <div className="featured-stat">
                <div className="featured-stat-label"><Icon.Calendar /> Start Time</div>
                <div className="featured-stat-value">{featured.startDate}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{featured.startTime}</div>
              </div>
              <div className="featured-stat">
                <div className="featured-stat-label"><Icon.Clock /> Duration</div>
                <div className="featured-stat-value">{featured.duration}</div>
              </div>
              <div className="featured-stat">
                <div className="featured-stat-label"><Icon.Users /> Participants</div>
                <div className="featured-stat-value">{featured.participants.toLocaleString()}</div>
              </div>
              <div className="featured-stat">
                <div className="featured-stat-label"><Icon.Trophy /> Prize Pool</div>
                <div className="featured-stat-value prize-val">${featured.prize}</div>
              </div>
            </div>

            <div className="featured-card-footer">
              <button className="btn-register-now">Register Now</button>
              <button
                className={`btn-bookmark${savedBookmark ? " saved" : ""}`}
                onClick={() => setSavedBookmark((v) => !v)}
                aria-label="Bookmark"
              >
                <Icon.Bookmark />
              </button>
            </div>
          </div>
        )}

        {/* Past contests */}
        <div className="past-contests-section">
          <div className="past-header">
            <h3>Past Contests</h3>
            <a className="view-all-link" href="#">View all</a>
          </div>

          {PAST_CONTESTS.map((pc) => (
            <div className="past-contest-item" key={pc.id}>
              <div className={`past-icon ${pc.iconClass}`}>{pc.icon}</div>
              <div className="past-contest-info">
                <strong>{pc.name}</strong>
                <div className="past-contest-meta">
                  <span className="past-date">{pc.date}</span>
                  <span className="past-rank">Rank: {pc.rank.toLocaleString()}</span>
                </div>
              </div>
              <span className="past-arrow"><Icon.ChevronRight /></span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}