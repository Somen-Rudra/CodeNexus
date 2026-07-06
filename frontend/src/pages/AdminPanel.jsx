import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API } from "../config/axios";
import "../styles/admin-panel.css";
import {
  MdDashboard,
  MdCode,
  MdPeople,
  MdAssignment,
  MdAdd,
  MdEdit,
  MdDelete,
  MdPublish,
  MdUnpublished,
  MdSearch,
  MdRefresh,
  MdClose,
  MdCheck,
  MdWarning,
  MdTrendingUp,
  MdShield,
  MdStar,
  MdAdminPanelSettings,
  MdAccountCircle,
} from "react-icons/md";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const TABS = [
  { key: "overview",    label: "Overview",    icon: MdDashboard  },
  { key: "problems",    label: "Problems",    icon: MdCode       },
  { key: "users",       label: "Users",       icon: MdPeople     },
  { key: "submissions", label: "Submissions", icon: MdAssignment },
];

const DIFFICULTY_COLORS = {
  easy:   { color: "var(--easy)",   bg: "var(--easy-bg)"   },
  medium: { color: "var(--medium)", bg: "var(--medium-bg)" },
  hard:   { color: "var(--hard)",   bg: "var(--hard-bg)"   },
};

const VERDICT_COLORS = {
  accepted:            { color: "#16a34a", bg: "#dcfce7" },
  wrong_answer:        { color: "#dc2626", bg: "#fee2e2" },
  time_limit_exceeded: { color: "#d97706", bg: "#fef3c7" },
  runtime_error:       { color: "#9333ea", bg: "#f3e8ff" },
  compile_error:       { color: "#0891b2", bg: "#cffafe" },
};

const VERDICT_LABELS = {
  accepted:            "Accepted",
  wrong_answer:        "Wrong Answer",
  time_limit_exceeded: "TLE",
  runtime_error:       "Runtime Error",
  compile_error:       "Compile Error",
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtRelative(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

const StatCard = ({ icon: Icon, label, value, sub, color = "var(--color-primary)" }) => (
  <div className="adm-stat-card">
    <div className="adm-stat-icon" style={{ background: color + "18", color }}>
      <Icon size={20} />
    </div>
    <div>
      <div className="adm-stat-value">{value ?? "—"}</div>
      <div className="adm-stat-label">{label}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  </div>
);

const Badge = ({ text, color, bg }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: "2px 8px",
    borderRadius: 999, color, background: bg,
    textTransform: "capitalize", whiteSpace: "nowrap",
  }}>
    {text}
  </span>
);

const DiffBadge = ({ difficulty }) => {
  const s = DIFFICULTY_COLORS[difficulty] ?? {};
  return <Badge text={difficulty} color={s.color} bg={s.bg} />;
};

const VerdictBadge = ({ verdict }) => {
  const s = VERDICT_COLORS[verdict] ?? { color: "#6b7280", bg: "#f3f4f6" };
  return <Badge text={VERDICT_LABELS[verdict] ?? verdict} color={s.color} bg={s.bg} />;
};

const Toast = ({ message, type, onClose }) => (
  <div className={`adm-toast adm-toast--${type}`}>
    {type === "success" ? <MdCheck size={16} /> : <MdWarning size={16} />}
    <span>{message}</span>
    <button onClick={onClose} className="adm-toast-close"><MdClose size={14} /></button>
  </div>
);

const ConfirmModal = ({ message, onConfirm, onCancel, loading, confirmLabel = "Delete", danger = true }) => (
  <div className="adm-modal-backdrop">
    <div className="adm-modal">
      <div className="adm-modal-icon"><MdWarning size={28} color="var(--danger)" /></div>
      <p className="adm-modal-msg">{message}</p>
      <div className="adm-modal-actions">
        <button className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button
          className={`adm-btn ${danger ? "adm-btn--danger" : "adm-btn--primary"}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Overview tab ──────────────────────────────────────────────────────── */

function OverviewTab({ problemStats, platformStats }) {
  const easy   = problemStats?.byDifficulty?.find(d => d._id === "easy")?.count  ?? 0;
  const medium = problemStats?.byDifficulty?.find(d => d._id === "medium")?.count ?? 0;
  const hard   = problemStats?.byDifficulty?.find(d => d._id === "hard")?.count  ?? 0;

  return (
    <div className="adm-tab-content">
      <div className="adm-stat-grid">
        <StatCard icon={MdPeople}     label="Total users"       value={platformStats?.totalUsers ?? "—"}       color="var(--info)"    />
        <StatCard icon={MdCode}       label="Total problems"    value={problemStats?.totalCount  ?? "—"}       color="var(--color-primary)" />
        <StatCard icon={MdAssignment} label="Total submissions" value={platformStats?.totalSubmissions ?? "—"} color="var(--success)" />
        <StatCard
          icon={MdTrendingUp}
          label="Acceptance rate"
          value={platformStats?.globalAcceptanceRate != null ? `${platformStats.globalAcceptanceRate}%` : "—"}
          color="var(--warning)"
        />
      </div>

      <div className="adm-section-grid" style={{ marginTop: "1.25rem" }}>
        <div className="adm-card">
          <div className="adm-card-title">Problems by difficulty</div>
          <div className="adm-diff-bars">
            {[
              { label: "Easy",   count: easy,   color: "var(--easy)",   total: easy + medium + hard },
              { label: "Medium", count: medium, color: "var(--medium)", total: easy + medium + hard },
              { label: "Hard",   count: hard,   color: "var(--hard)",   total: easy + medium + hard },
            ].map(({ label, count, color, total }) => (
              <div key={label} className="adm-diff-row">
                <span className="adm-diff-label" style={{ color }}>{label}</span>
                <div className="adm-diff-track">
                  <div
                    className="adm-diff-fill"
                    style={{ width: total ? `${(count / total) * 100}%` : "0%", background: color }}
                  />
                </div>
                <span className="adm-diff-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-title">Problem flags</div>
          <div className="adm-kv-list">
            <div className="adm-kv-row">
              <span className="adm-kv-label">Published</span>
              <span className="adm-kv-value">{problemStats?.totalCount ?? "—"}</span>
            </div>
            <div className="adm-kv-row">
              <span className="adm-kv-label">Premium</span>
              <span className="adm-kv-value">{problemStats?.premiumCount ?? "—"}</span>
            </div>
            <div className="adm-kv-row">
              <span className="adm-kv-label">Featured</span>
              <span className="adm-kv-value">{problemStats?.featuredCount ?? "—"}</span>
            </div>
            <div className="adm-kv-row">
              <span className="adm-kv-label">Accepted submissions</span>
              <span className="adm-kv-value">{platformStats?.acceptedSubmissions ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Problems tab ──────────────────────────────────────────────────────── */

function ProblemsTab({ toast, navigate }) {
  const [problems,   setProblems]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [difficulty, setDifficulty] = useState("");
  // "true" | "false" | "all" — default to "true" so the admin sees published
  // problems first, matching the backend default.
  const [published,  setPublished]  = useState("true");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState(null);
  const [toggling,   setToggling]   = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search)     params.set("search",     search);
      if (difficulty) params.set("difficulty", difficulty);
      params.set("published", published);

      const res = await API.get(`/problemSet?${params}`);
      setProblems(res.data.data ?? []);
      setPagination(res.data.pagination);
    } catch {
      toast("Failed to load problems", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, difficulty, published]);

  useEffect(() => { load(); }, [load]);

  const togglePublish = async (slug, current) => {
    setToggling(slug);
    try {
      await API.patch(`/problemSet/${slug}/publish`);
      setProblems(p => p.map(pr =>
        pr.slug === slug ? { ...pr, isPublished: !current } : pr
      ));
      toast(`Problem ${current ? "unpublished" : "published"}`, "success");
    } catch {
      toast("Failed to update publish status", "error");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await API.delete(`/problemSet/${confirm.slug}`);
      setProblems(p => p.filter(pr => pr.slug !== confirm.slug));
      toast("Problem deleted", "success");
      setConfirm(null);
    } catch {
      toast("Failed to delete problem", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="adm-tab-content">
      {confirm && (
        <ConfirmModal
          message={`Delete "${confirm.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
          loading={deleting}
        />
      )}

      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <MdSearch size={16} className="adm-search-icon" />
          <input
            className="adm-search"
            placeholder="Search problems…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={e => e.key === "Enter" && load()}
          />
        </div>

        <select className="adm-select" value={difficulty} onChange={e => { setDifficulty(e.target.value); setPage(1); }}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select className="adm-select" value={published} onChange={e => { setPublished(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>

        <button className="adm-btn adm-btn--ghost" onClick={load} title="Refresh">
          <MdRefresh size={16} />
        </button>

        <button className="adm-btn adm-btn--primary" onClick={() => navigate("/admin/problems/new")}>
          <MdAdd size={16} /> New problem
        </button>
      </div>

      <div className="adm-card adm-card--table">
        {loading ? (
          <div className="adm-loading">Loading…</div>
        ) : problems.length === 0 ? (
          <div className="adm-empty">No problems match your filters</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Title</th>
                <th style={{ width: 90 }}>Difficulty</th>
                <th>Topics</th>
                <th style={{ width: 90 }}>Acceptance</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.slug}>
                  <td className="adm-td-num">{p.problemNumber}</td>
                  <td>
                    <span className="adm-problem-title" onClick={() => navigate(`/problems/${p.slug}`)}>
                      {p.title}
                    </span>
                  </td>
                  <td><DiffBadge difficulty={p.difficulty} /></td>
                  <td>
                    <div className="adm-topics">
                      {(p.topics ?? []).slice(0, 2).map(t => (
                        <span key={t} className="adm-topic-chip">{t}</span>
                      ))}
                      {(p.topics ?? []).length > 2 && (
                        <span className="adm-topic-chip">+{p.topics.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="adm-td-num">
                    {p.acceptancePercentage != null ? `${Math.round(p.acceptancePercentage)}%` : "—"}
                  </td>
                  <td>
                    <Badge
                      text={p.isPublished ? "Published" : "Draft"}
                      color={p.isPublished ? "var(--success)" : "var(--text-muted)"}
                      bg={p.isPublished ? "var(--easy-bg)" : "var(--bg-tertiary)"}
                    />
                  </td>
                  <td>
                    <div className="adm-actions">
                      <button
                        className="adm-icon-btn"
                        title={p.isPublished ? "Unpublish" : "Publish"}
                        onClick={() => togglePublish(p.slug, p.isPublished)}
                        disabled={toggling === p.slug}
                      >
                        {p.isPublished ? <MdUnpublished size={16} /> : <MdPublish size={16} />}
                      </button>
                      <button
                        className="adm-icon-btn"
                        title="Edit"
                        onClick={() => navigate(`/admin/problems/${p.slug}/edit`)}
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        className="adm-icon-btn adm-icon-btn--danger"
                        title="Delete"
                        onClick={() => setConfirm({ slug: p.slug, title: p.title })}
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="adm-pagination">
          <button className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className="adm-page-info">
            Page {pagination.currentPage} of {pagination.totalPages}
            <span className="adm-page-muted">({pagination.totalProblems} total)</span>
          </span>
          <button className="adm-btn adm-btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Users tab ─────────────────────────────────────────────────────────── */

function UsersTab({ toast, currentUserId }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [working,    setWorking]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search)     params.set("search", search);
      if (roleFilter) params.set("role",   roleFilter);

      const res = await API.get(`/admin/users?${params}`);
      setUsers(res.data.data ?? []);
      setPagination(res.data.pagination);
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    if (!confirm) return;
    setWorking(confirm.userId);
    try {
      if (confirm.type === "delete") {
        await API.delete(`/admin/users/${confirm.userId}`);
        setUsers(u => u.filter(x => String(x._id) !== String(confirm.userId)));
        toast("User deleted", "success");

      } else if (confirm.type === "role") {
        const res = await API.patch(`/admin/users/${confirm.userId}/role`, { role: confirm.payload });
        setUsers(u => u.map(x => String(x._id) === String(confirm.userId) ? { ...x, role: res.data.data.role } : x));
        toast(`Role updated to ${confirm.payload}`, "success");

      } else if (confirm.type === "premium") {
        const res = await API.patch(`/admin/users/${confirm.userId}/premium`);
        setUsers(u => u.map(x => String(x._id) === String(confirm.userId) ? { ...x, isPremium: res.data.data.isPremium } : x));
        toast(`Premium ${res.data.data.isPremium ? "enabled" : "disabled"}`, "success");
      }
      setConfirm(null);
    } catch (err) {
      toast(err?.response?.data?.message ?? "Action failed", "error");
    } finally {
      setWorking(null);
    }
  };

  const isSelf = (id) => String(id) === String(currentUserId);

  return (
    <div className="adm-tab-content">
      {confirm && (
        <ConfirmModal
          message={
            confirm.type === "delete"
              ? `Permanently delete "${confirm.userName}"? This cannot be undone.`
              : confirm.type === "role"
              ? `Change ${confirm.userName}'s role to "${confirm.payload}"?`
              : `${confirm.currentPremium ? "Remove premium from" : "Grant premium to"} "${confirm.userName}"?`
          }
          confirmLabel={confirm.type === "delete" ? "Delete" : "Confirm"}
          danger={confirm.type === "delete"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={!!working}
        />
      )}

      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <MdSearch size={16} className="adm-search-icon" />
          <input
            className="adm-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={e => e.key === "Enter" && load()}
          />
        </div>

        <select className="adm-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button className="adm-btn adm-btn--ghost" onClick={load} title="Refresh">
          <MdRefresh size={16} />
        </button>
      </div>

      <div className="adm-card adm-card--table">
        {loading ? (
          <div className="adm-loading">Loading…</div>
        ) : users.length === 0 ? (
          <div className="adm-empty">No users match your filters</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th style={{ width: 80 }}>Role</th>
                <th style={{ width: 80 }}>Premium</th>
                <th style={{ width: 100 }}>Solved</th>
                <th style={{ width: 110 }}>Joined</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="adm-user-cell">
                      <div className="adm-avatar adm-avatar--sm">{getInitials(u.name)}</div>
                      <div>
                        <div className="adm-user-name">
                          {u.name}
                          {isSelf(u._id) && <span className="adm-you-badge">you</span>}
                        </div>
                        <div className="adm-user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge
                      text={u.role}
                      color={u.role === "admin" ? "#7c3aed" : "var(--text-secondary)"}
                      bg={u.role === "admin" ? "#ede9fe" : "var(--bg-tertiary)"}
                    />
                  </td>
                  <td>
                    <Badge
                      text={u.isPremium ? "Premium" : "Free"}
                      color={u.isPremium ? "var(--warning)" : "var(--text-muted)"}
                      bg={u.isPremium ? "var(--medium-bg)" : "var(--bg-tertiary)"}
                    />
                  </td>
                  <td className="adm-td-num">
                    {(u.solvedCount?.easy ?? 0) + (u.solvedCount?.medium ?? 0) + (u.solvedCount?.hard ?? 0)}
                  </td>
                  <td className="adm-td-num">{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="adm-actions">
                      <button
                        className="adm-icon-btn"
                        title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                        disabled={isSelf(u._id) || working === u._id}
                        onClick={() => setConfirm({
                          type: "role",
                          userId: u._id,
                          userName: u.name,
                          payload: u.role === "admin" ? "user" : "admin",
                        })}
                      >
                        <MdAdminPanelSettings size={16} />
                      </button>

                      <button
                        className="adm-icon-btn"
                        title={u.isPremium ? "Remove premium" : "Grant premium"}
                        disabled={working === u._id}
                        onClick={() => setConfirm({
                          type: "premium",
                          userId: u._id,
                          userName: u.name,
                          currentPremium: u.isPremium,
                        })}
                      >
                        <MdStar
                          size={16}
                          style={{ color: u.isPremium ? "var(--warning)" : undefined }}
                        />
                      </button>

                      <button
                        className="adm-icon-btn adm-icon-btn--danger"
                        title="Delete user"
                        disabled={isSelf(u._id) || working === u._id}
                        onClick={() => setConfirm({
                          type: "delete",
                          userId: u._id,
                          userName: u.name,
                        })}
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="adm-pagination">
          <button className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className="adm-page-info">
            Page {pagination.currentPage} of {pagination.totalPages}
            <span className="adm-page-muted">({pagination.total} total)</span>
          </span>
          <button className="adm-btn adm-btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Submissions tab ───────────────────────────────────────────────────── */

function SubmissionsTab({ toast, navigate }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [slugFilter,  setSlugFilter]  = useState("");
  const [verdict,     setVerdict]     = useState("");
  const [language,    setLanguage]    = useState("");
  const [mode,        setMode]        = useState("");
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (slugFilter) params.set("slug",     slugFilter.trim());
      if (verdict)    params.set("verdict",  verdict);
      if (language)   params.set("language", language);
      if (mode)       params.set("mode",     mode);

      const res = await API.get(`/admin/submissions?${params}`);
      setSubmissions(res.data.data ?? []);
      setPagination(res.data.pagination);
    } catch {
      toast("Failed to load submissions", "error");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [page, slugFilter, verdict, language, mode]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="adm-tab-content">
      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <MdSearch size={16} className="adm-search-icon" />
          <input
            className="adm-search"
            placeholder="Filter by problem slug…"
            value={slugFilter}
            onChange={e => { setSlugFilter(e.target.value); setPage(1); }}
            onKeyDown={e => e.key === "Enter" && load()}
          />
        </div>

        <select className="adm-select" value={verdict} onChange={e => { setVerdict(e.target.value); setPage(1); }}>
          <option value="">All verdicts</option>
          <option value="accepted">Accepted</option>
          <option value="wrong_answer">Wrong Answer</option>
          <option value="time_limit_exceeded">TLE</option>
          <option value="runtime_error">Runtime Error</option>
          <option value="compile_error">Compile Error</option>
        </select>

        <select className="adm-select" value={language} onChange={e => { setLanguage(e.target.value); setPage(1); }}>
          <option value="">All languages</option>
          <option value="cpp">C++</option>
          <option value="py">Python</option>
          <option value="js">JavaScript</option>
          <option value="java">Java</option>
          <option value="c">C</option>
        </select>

        <select className="adm-select" value={mode} onChange={e => { setMode(e.target.value); setPage(1); }}>
          <option value="">Run + Submit</option>
          <option value="run">Run only</option>
          <option value="submit">Submit only</option>
        </select>

        <button className="adm-btn adm-btn--ghost" onClick={load} title="Refresh">
          <MdRefresh size={16} />
        </button>
      </div>

      <div className="adm-card adm-card--table">
        {loading ? (
          <div className="adm-loading">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="adm-empty">No submissions match your filters</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Problem</th>
                <th style={{ width: 80 }}>Language</th>
                <th style={{ width: 120 }}>Verdict</th>
                <th style={{ width: 80 }}>Passed</th>
                <th style={{ width: 70 }}>Mode</th>
                <th style={{ width: 90 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s._id}>
                  <td className="adm-td-num">{s.userName ?? "—"}</td>
                  <td>
                    <span className="adm-problem-title" onClick={() => navigate(`/problems/${s.problemSlug}`)}>
                      #{s.problemNumber} {s.problemSlug}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{s.language}</code>
                  </td>
                  <td><VerdictBadge verdict={s.verdict} /></td>
                  <td className="adm-td-num">{s.passedCount}/{s.totalCount}</td>
                  <td>
                    <Badge
                      text={s.mode}
                      color={s.mode === "submit" ? "#7c3aed" : "var(--info)"}
                      bg={s.mode === "submit" ? "#ede9fe" : "#dbeafe"}
                    />
                  </td>
                  <td className="adm-td-num">{fmtRelative(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="adm-pagination">
          <button className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className="adm-page-info">
            Page {pagination.currentPage} of {pagination.totalPages}
            <span className="adm-page-muted">({pagination.total} total)</span>
          </span>
          <button className="adm-btn adm-btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main AdminPanel ───────────────────────────────────────────────────── */

export default function AdminPanel() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [tab,           setTab]           = useState("overview");
  const [toastMsg,      setToastMsg]      = useState(null);
  const [problemStats,  setProblemStats]  = useState(null);
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    Promise.all([
      API.get("/problemSet/stats/overview").then(r => setProblemStats(r.data.data)).catch(() => {}),
      API.get("/admin/stats").then(r => setPlatformStats(r.data.data)).catch(() => {}),
    ]);
  }, []);

  const toast = useCallback((message, type = "success") => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="adm-root">
      <header className="adm-header">
        <span className="adm-header-brand">
          <MdShield size={18} />
          Admin Panel
        </span>
        <div className="adm-header-divider" />

        <div className="adm-header-user">
          <MdAccountCircle size={20} />
          <span>{user.name}</span>
        </div>
      </header>

      <div className="adm-body">
        <nav className="adm-sidenav">
          <div className="adm-sidenav-title">Navigation</div>
          <div className="adm-nav-btns">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`adm-nav-btn ${tab === key ? "adm-nav-btn--active" : ""}`}
                onClick={() => setTab(key)}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        <main className="adm-main">
          <div className="adm-page-title">
            {TABS.find(t => t.key === tab)?.label}
          </div>

          {tab === "overview"    && <OverviewTab    problemStats={problemStats} platformStats={platformStats} />}
          {tab === "problems"    && <ProblemsTab    toast={toast} navigate={navigate} />}
          {tab === "users"       && <UsersTab       toast={toast} currentUserId={user._id} />}
          {tab === "submissions" && <SubmissionsTab toast={toast} navigate={navigate} />}
        </main>
      </div>

      {toastMsg && (
        <Toast message={toastMsg.message} type={toastMsg.type} onClose={() => setToastMsg(null)} />
      )}
    </div>
  );
}