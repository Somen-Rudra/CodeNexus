import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/problem-page.css";

const BASE_URL = "http://localhost:8000";

// ─── Default sort options (used as fallback before metadata loads) ────────────
const DEFAULT_SORT_OPTIONS = [
  { value: "numberAsc",     label: "Number ↑" },
  { value: "numberDesc",    label: "Number ↓" },
  { value: "titleAsc",      label: "Title A→Z" },
  { value: "titleDesc",     label: "Title Z→A" },
  { value: "difficultyAsc", label: "Difficulty ↑" },
  { value: "difficultyDesc",label: "Difficulty ↓" },
  { value: "acceptanceAsc", label: "Acceptance ↑" },
  { value: "acceptanceDesc",label: "Acceptance ↓" },
  { value: "newest",        label: "Newest first" },
  { value: "oldest",        label: "Oldest first" },
];

// ─── FilterPanel ──────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange, metadata, problemCounts }) {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const toggle = useCallback((key, value) => {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }, [filters, onChange]);

  const diffColors = { easy: "diff-easy", medium: "diff-medium", hard: "diff-hard" };
  const diffLabels = { easy: "Easy", medium: "Medium", hard: "Hard" };

  const topics = metadata.topics || [];
  const companies = metadata.companies || [];
  const difficulties = metadata.difficulties || ["easy", "medium", "hard"];

  const visibleTopics = showAllTopics ? topics : topics.slice(0, 6);
  const visibleCompanies = showAllCompanies ? companies : companies.slice(0, 4);

  return (
    <aside className="ps-sidebar">
      {/* Difficulty */}
      <div className="ps-filter-section">
        <span className="ps-filter-label">Difficulty</span>
        {difficulties.map((d) => {
          const active = (filters.difficulty || []).includes(d);
          return (
            <div
              key={d}
              className={`ps-check-item ${active ? "active" : ""}`}
              onClick={() => toggle("difficulty", d)}
            >
              <span className={`ps-check-box ${active ? "checked" : ""}`} />
              <span className={`diff-dot ${diffColors[d]}`} />
              {diffLabels[d]}
              <span className="ps-count-badge">{problemCounts.byDifficulty[d] ?? ""}</span>
            </div>
          );
        })}
      </div>

      {/* Topics */}
      <div className="ps-filter-section">
        <span className="ps-filter-label">Topics</span>
        {visibleTopics.map((t) => {
          const active = (filters.topics || []).includes(t);
          return (
            <div
              key={t}
              className={`ps-check-item ${active ? "active" : ""}`}
              onClick={() => toggle("topics", t)}
            >
              <span className={`ps-check-box ${active ? "checked" : ""}`} />
              {t.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
            </div>
          );
        })}
        {topics.length > 6 && (
          <button className="ps-show-more" onClick={() => setShowAllTopics((s) => !s)}>
            {showAllTopics ? "Show less" : `Show ${topics.length - 6} more`}
          </button>
        )}
      </div>

      {/* Companies */}
      <div className="ps-filter-section">
        <span className="ps-filter-label">Companies</span>
        {visibleCompanies.map((c) => {
          const active = (filters.companies || []).includes(c);
          return (
            <div
              key={c}
              className={`ps-check-item ${active ? "active" : ""}`}
              onClick={() => toggle("companies", c)}
            >
              <span className={`ps-check-box ${active ? "checked" : ""}`} />
              {c}
            </div>
          );
        })}
        {companies.length > 4 && (
          <button className="ps-show-more" onClick={() => setShowAllCompanies((s) => !s)}>
            {showAllCompanies ? "Show less" : `Show ${companies.length - 4} more`}
          </button>
        )}
      </div>

      {/* Status */}
      <div className="ps-filter-section">
        <span className="ps-filter-label">Status</span>
        {["solved", "unsolved"].map((s) => {
          const active = filters.status === s;
          return (
            <div
              key={s}
              className={`ps-check-item ${active ? "active" : ""}`}
              onClick={() => onChange({ ...filters, status: active ? null : s })}
            >
              <span className={`ps-check-box ${active ? "checked" : ""}`} />
              {s[0].toUpperCase() + s.slice(1)}
            </div>
          );
        })}
      </div>

      {/* Reset */}
      <button
        className="ps-reset-btn"
        onClick={() => onChange({ difficulty: [], topics: [], companies: [], status: null })}
      >
        Reset filters
      </button>
    </aside>
  );
}

// ─── ProblemList ──────────────────────────────────────────────────────────────
function ProblemList({
  problems,
  filters,
  onFilterChange,
  sort,
  onSortChange,
  metadata,
  search,
  onSearchChange,
  pagination,
  onPageChange,
  loading,
}) {
  const hasActiveFilters =
    (filters.difficulty?.length > 0) ||
    (filters.topics?.length > 0) ||
    (filters.companies?.length > 0) ||
    !!filters.status;

  const allChips = [
    ...(filters.difficulty || []).map((v) => ({ key: "difficulty", value: v, label: `Difficulty: ${v[0].toUpperCase()}${v.slice(1)}` })),
    ...(filters.topics || []).map((v) => ({ key: "topics", value: v, label: `Topic: ${v}` })),
    ...(filters.companies || []).map((v) => ({ key: "companies", value: v, label: `Company: ${v}` })),
    ...(filters.status ? [{ key: "status", value: filters.status, label: `Status: ${filters.status}` }] : []),
  ];

  const removeChip = (chip) => {
    if (chip.key === "status") {
      onFilterChange({ ...filters, status: null });
    } else {
      onFilterChange({ ...filters, [chip.key]: (filters[chip.key] || []).filter((v) => v !== chip.value) });
    }
  };

  const diffBadgeClass = { easy: "diff-badge-easy", medium: "diff-badge-medium", hard: "diff-badge-hard" };
  const sortOptions = metadata.sortOptions || DEFAULT_SORT_OPTIONS;

  return (
    <main className="ps-main">
      {/* Toolbar */}
      <div className="ps-toolbar">
        <div>
          <div className="ps-page-title">Problems</div>
          <div className="ps-page-count">
            {pagination ? `${pagination.totalProblems} problems` : `${problems.length} problems`}
          </div>
        </div>

        <div className="ps-search-wrap">
          <span className="ps-search-icon">🔍</span>
          <input
            className="ps-search"
            placeholder="Search problems…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <select
          className="ps-sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="ps-active-filters">
          {allChips.map((chip) => (
            <span
              key={`${chip.key}-${chip.value}`}
              className="ps-filter-chip"
              onClick={() => removeChip(chip)}
            >
              {chip.label} ×
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="ps-table-wrap">
        <table className="ps-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Title</th>
              <th>Difficulty</th>
              <th>Acceptance</th>
              <th>Solved</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="ps-empty">
                    <div className="ps-empty-icon">⏳</div>
                    Loading problems…
                  </div>
                </td>
              </tr>
            ) : problems.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="ps-empty">
                    <div className="ps-empty-icon">🔍</div>
                    No problems match your filters.
                  </div>
                </td>
              </tr>
            ) : (
              problems.map((p) => (
                <tr key={p.problemNumber}>
                  <td className="ps-num">{p.problemNumber}</td>
                  <td className="ps-title-cell">
                    <Link className="problem-link" to={`/problemSet/${p.slug}`}>
                      {p.title}
                      {p.isPremium && <span className="ps-premium-icon">🔒</span>}
                    </Link>
                  </td>
                  <td>
                    <span className={`diff-badge ${diffBadgeClass[p.difficulty]}`}>
                      {p.difficulty[0].toUpperCase() + p.difficulty.slice(1)}
                    </span>
                  </td>
                  <td className="ps-acceptance">{p.acceptancePercentage?.toFixed(1)}%</td>
                  <td className="ps-solved-num">
                    {p.solved >= 1000000
                      ? (p.solved / 1000000).toFixed(1) + "M"
                      : p.solved >= 1000
                        ? (p.solved / 1000).toFixed(1) + "K"
                        : p.solved ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="ps-pagination">
          <button
            className="ps-page-btn"
            disabled={!pagination.hasPrev}
            onClick={() => onPageChange(pagination.currentPage - 1)}
          >
            ← Prev
          </button>
          <span className="ps-page-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            className="ps-page-btn"
            disabled={!pagination.hasNext}
            onClick={() => onPageChange(pagination.currentPage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ProblemSet() {
  const [filters, setFilters] = useState({ difficulty: [], topics: [], companies: [], status: null });
  const [sort, setSort] = useState("numberAsc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [metadata, setMetadata] = useState({ topics: [], companies: [], difficulties: ["easy", "medium", "hard"], sortOptions: DEFAULT_SORT_OPTIONS });
  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derived difficulty counts from current problem list
  const problemCounts = useMemo(() => {
    const byDifficulty = {};
    problems.forEach((p) => {
      byDifficulty[p.difficulty] = (byDifficulty[p.difficulty] || 0) + 1;
    });
    return { byDifficulty };
  }, [problems]);

  // Debounce search input (400 ms)
  const debounceTimer = useRef(null);
  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1); // reset to first page on new search
    }, 400);
  };

  // Reset page to 1 whenever filters or sort change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };
  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  // ── Fetch metadata once on mount ───────────────────────────────────────────
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`${BASE_URL}/problemSet/metadata`);
        if (!res.ok) throw new Error(`Metadata fetch failed: ${res.status}`);
        const json = await res.json();
        if (json.success) setMetadata(json.data);
      } catch (err) {
        console.error("Failed to load metadata:", err);
        // keep default metadata on error
      }
    };
    fetchMetadata();
  }, []);

  // ── Fetch problems whenever filters / sort / search / page change ──────────
  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();

        params.set("page", page);
        params.set("limit", 20);
        params.set("sort", sort);

        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

        if (filters.difficulty?.length)
          params.set("difficulty", filters.difficulty.join(","));

        if (filters.topics?.length)
          params.set("topics", filters.topics.join(","));

        if (filters.companies?.length)
          params.set("companies", filters.companies.join(","));

        // status filter (solved/unsolved) — pass through if your backend supports it
        if (filters.status) params.set("status", filters.status);

        const res = await fetch(`${BASE_URL}/problemSet?${params.toString()}`);
        if (!res.ok) throw new Error(`Problems fetch failed: ${res.status}`);

        const json = await res.json();
        if (json.success) {
          setProblems(json.data);
          setPagination(json.pagination);
        } else {
          throw new Error(json.message || "Unknown error");
        }
      } catch (err) {
        console.error("Failed to load problems:", err);
        setError(err.message);
        setProblems([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [filters, sort, debouncedSearch, page]);

  return (
    <>
      {error && (
        <div className="ps-error-banner">
          Failed to load problems: {error}
        </div>
      )}
      <div className="ps-root">
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          metadata={metadata}
          problemCounts={problemCounts}
        />
        <ProblemList
          problems={problems}
          filters={filters}
          onFilterChange={handleFilterChange}
          sort={sort}
          onSortChange={handleSortChange}
          metadata={metadata}
          search={search}
          onSearchChange={handleSearchChange}
          pagination={pagination}
          onPageChange={setPage}
          loading={loading}
        />
      </div>
    </>
  );
}