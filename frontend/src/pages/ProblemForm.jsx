import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../config/axios";
import "../styles/admin-panel.css";
import {
  MdArrowBack,
  MdSave,
  MdAdd,
  MdClose,
  MdCheck,
  MdWarning,
} from "react-icons/md";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const DIFFICULTIES = ["easy", "medium", "hard"];
const LANGUAGES = ["cpp", "py", "js", "java", "c"];

const EMPTY_EXAMPLE = { input: "", output: "", explanation: "" };
const EMPTY_TESTCASE = { input: "", output: "" };

const EMPTY_FORM = {
  problemNumber: "",
  title: "",
  slug: "",
  difficulty: "easy",
  topics: [],
  companies: [],
  description: "",
  constraints: [],
  hints: [],
  followUps: [],
  examples: [{ ...EMPTY_EXAMPLE }],
  visibleTestCases: [{ ...EMPTY_TESTCASE }],
  languages: ["cpp", "py", "js"],
  timeLimit: 1000,
  memoryLimit: 256,
  isPremium: false,
  isFeatured: false,
  isPublished: false,
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function slugify(str = "") {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ─── Small reusable pieces ─────────────────────────────────────────────── */

const Banner = ({ message, type, onClose }) => (
  <div className={`adm-toast adm-toast--${type}`} style={{ position: "static", marginBottom: "1rem" }}>
    {type === "success" ? <MdCheck size={16} /> : <MdWarning size={16} />}
    <span>{message}</span>
    <button onClick={onClose} className="adm-toast-close"><MdClose size={14} /></button>
  </div>
);

const Field = ({ label, children, hint }) => (
  <label className="adm-field">
    <span className="adm-field-label">{label}</span>
    {children}
    {hint && <span className="adm-field-hint">{hint}</span>}
  </label>
);

/* Chip-style input for short comma/enter-separated values (topics, companies) */
function ChipInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };

  const remove = (v) => onChange(values.filter((x) => x !== v));

  return (
    <Field label={label}>
      <div className="adm-chip-box">
        {values.map((v) => (
          <span key={v} className="adm-chip">
            {v}
            <button type="button" onClick={() => remove(v)}><MdClose size={12} /></button>
          </span>
        ))}
        <input
          className="adm-chip-input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
        />
      </div>
    </Field>
  );
}

/* List of plain strings, one per row (constraints, hints, followUps) */
function StringListEditor({ label, values, onChange, placeholder }) {
  const update = (i, val) => onChange(values.map((v, idx) => (idx === i ? val : v)));
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, ""]);

  return (
    <div className="adm-field">
      <span className="adm-field-label">{label}</span>
      <div className="adm-list-editor">
        {values.map((v, i) => (
          <div key={i} className="adm-list-row">
            <input
              className="adm-input"
              value={v}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => remove(i)}>
              <MdClose size={16} />
            </button>
          </div>
        ))}
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={add}>
          <MdAdd size={14} /> Add row
        </button>
      </div>
    </div>
  );
}

/* List of objects rendered as small grouped cards (examples, test cases) */
function ObjectListEditor({ label, values, onChange, fields, emptyItem }) {
  const update = (i, key, val) =>
    onChange(values.map((item, idx) => (idx === i ? { ...item, [key]: val } : item)));
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { ...emptyItem }]);

  return (
    <div className="adm-field">
      <span className="adm-field-label">{label}</span>
      <div className="adm-list-editor">
        {values.map((item, i) => (
          <div key={i} className="adm-object-row">
            <div className="adm-object-row-header">
              <span>#{i + 1}</span>
              <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => remove(i)}>
                <MdClose size={16} />
              </button>
            </div>
            {fields.map((f) => (
              <div key={f.key} className="adm-field" style={{ marginTop: 6 }}>
                <span className="adm-field-label">{f.label}</span>
                {f.textarea ? (
                  <textarea
                    className="adm-textarea"
                    rows={2}
                    value={item[f.key] ?? ""}
                    onChange={(e) => update(i, f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="adm-input"
                    value={item[f.key] ?? ""}
                    onChange={(e) => update(i, f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={add}>
          <MdAdd size={14} /> Add {label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */

export default function ProblemForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(slug);

  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const showBanner = useCallback((message, type = "error") => {
    setBanner({ message, type });
    if (type === "success") setTimeout(() => setBanner(null), 3000);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await API.get(`/problemSet/${slug}/manage`);
        const p = res.data.data;
        setForm({
          ...EMPTY_FORM,
          ...p,
          topics: p.topics ?? [],
          companies: p.companies ?? [],
          constraints: p.constraints ?? [],
          hints: p.hints ?? [],
          followUps: p.followUps ?? [],
          examples: p.examples?.length ? p.examples : [{ ...EMPTY_EXAMPLE }],
          visibleTestCases: p.visibleTestCases?.length ? p.visibleTestCases : [{ ...EMPTY_TESTCASE }],
          languages: p.languages?.length ? p.languages : ["cpp", "py", "js"],
        });
        setSlugTouched(true);
      } catch {
        showBanner("Failed to load problem for editing.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, slug, showBanner]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleTitleChange = (val) => {
    setForm((f) => ({
      ...f,
      title: val,
      slug: slugTouched ? f.slug : slugify(val),
    }));
  };

  const toggleLanguage = (lang) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.slug.trim()) return "Slug is required.";
    if (!DIFFICULTIES.includes(form.difficulty)) return "Difficulty is invalid.";
    if (!form.languages.length) return "Select at least one language.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return showBanner(err);

    setSaving(true);
    try {
      const payload = {
        ...form,
        problemNumber: form.problemNumber === "" ? undefined : Number(form.problemNumber),
        timeLimit: Number(form.timeLimit),
        memoryLimit: Number(form.memoryLimit),
        constraints: form.constraints.filter((c) => c.trim()),
        hints: form.hints.filter((h) => h.trim()),
        followUps: form.followUps.filter((f) => f.trim()),
        examples: form.examples.filter((ex) => ex.input.trim() || ex.output.trim()),
        visibleTestCases: form.visibleTestCases.filter((tc) => tc.input.trim() || tc.output.trim()),
      };

      if (isEdit) {
        await API.patch(`/problemSet/${slug}`, payload);
        showBanner("Problem updated.", "success");
      } else {
        await API.post(`/problemSet`, payload);
        showBanner("Problem created.", "success");
      }
      setTimeout(() => navigate("/admin"), 600);
    } catch (err2) {
      showBanner(err2?.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="adm-loading">Loading…</div>;

  return (
    <div className="adm-root">
      <header className="adm-header">
        <button className="adm-btn adm-btn--ghost" onClick={() => navigate("/admin")}>
          <MdArrowBack size={16} /> Back
        </button>
        <span className="adm-header-brand" style={{ marginLeft: 12 }}>
          {isEdit ? `Edit: ${form.title || slug}` : "New problem"}
        </span>
      </header>

      <div className="adm-body">
        <main className="adm-main" style={{ maxWidth: 860 }}>
          {banner && <Banner {...banner} onClose={() => setBanner(null)} />}

          <form onSubmit={handleSubmit} className="adm-form">
            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Basic info</div>
              <div className="adm-form-grid">
                <Field label="Title">
                  <input
                    className="adm-input"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Slug">
                  <input
                    className="adm-input"
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
                    disabled={isEdit}
                    required
                  />
                </Field>
                <Field label="Problem number">
                  <input
                    className="adm-input"
                    type="number"
                    value={form.problemNumber}
                    onChange={(e) => set("problemNumber", e.target.value)}
                  />
                </Field>
                <Field label="Difficulty">
                  <select
                    className="adm-select"
                    value={form.difficulty}
                    onChange={(e) => set("difficulty", e.target.value)}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Time limit (ms)">
                  <input
                    className="adm-input"
                    type="number"
                    value={form.timeLimit}
                    onChange={(e) => set("timeLimit", e.target.value)}
                  />
                </Field>
                <Field label="Memory limit (MB)">
                  <input
                    className="adm-input"
                    type="number"
                    value={form.memoryLimit}
                    onChange={(e) => set("memoryLimit", e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Description</div>
              <Field label="Problem statement">
                <textarea
                  className="adm-textarea"
                  rows={8}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
            </div>

            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Topics &amp; companies</div>
              <div className="adm-form-grid">
                <ChipInput
                  label="Topics"
                  values={form.topics}
                  onChange={(v) => set("topics", v)}
                  placeholder="Type and press Enter"
                />
                <ChipInput
                  label="Companies"
                  values={form.companies}
                  onChange={(v) => set("companies", v)}
                  placeholder="Type and press Enter"
                />
              </div>
            </div>

            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Examples</div>
              <ObjectListEditor
                label="Examples"
                values={form.examples}
                onChange={(v) => set("examples", v)}
                emptyItem={EMPTY_EXAMPLE}
                fields={[
                  { key: "input", label: "Input", textarea: true },
                  { key: "output", label: "Output", textarea: true },
                  { key: "explanation", label: "Explanation", textarea: true },
                ]}
              />
            </div>

            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Visible test cases</div>
              <ObjectListEditor
                label="Test cases"
                values={form.visibleTestCases}
                onChange={(v) => set("visibleTestCases", v)}
                emptyItem={EMPTY_TESTCASE}
                fields={[
                  { key: "input", label: "Input", textarea: true },
                  { key: "output", label: "Output", textarea: true },
                ]}
              />
            </div>

            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Constraints, hints &amp; follow-ups</div>
              <StringListEditor
                label="Constraints"
                values={form.constraints}
                onChange={(v) => set("constraints", v)}
                placeholder="e.g. 1 <= n <= 10^5"
              />
              <StringListEditor
                label="Hints"
                values={form.hints}
                onChange={(v) => set("hints", v)}
                placeholder="e.g. Try using two pointers"
              />
              <StringListEditor
                label="Follow-ups"
                values={form.followUps}
                onChange={(v) => set("followUps", v)}
                placeholder="e.g. Can you do this in O(n)?"
              />
            </div>

            <div className="adm-card adm-form-section">
              <div className="adm-card-title">Settings</div>
              <div className="adm-form-grid">
                <div className="adm-field">
                  <span className="adm-field-label">Allowed languages</span>
                  <div className="adm-chip-box">
                    {LANGUAGES.map((lang) => (
                      <button
                        type="button"
                        key={lang}
                        className={`adm-lang-toggle ${form.languages.includes(lang) ? "adm-lang-toggle--active" : ""}`}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="adm-field">
                  <span className="adm-field-label">Flags</span>
                  <div className="adm-checkbox-row">
                    <label className="adm-checkbox">
                      <input
                        type="checkbox"
                        checked={form.isPremium}
                        onChange={(e) => set("isPremium", e.target.checked)}
                      />
                      Premium
                    </label>
                    <label className="adm-checkbox">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(e) => set("isFeatured", e.target.checked)}
                      />
                      Featured
                    </label>
                    <label className="adm-checkbox">
                      <input
                        type="checkbox"
                        checked={form.isPublished}
                        onChange={(e) => set("isPublished", e.target.checked)}
                      />
                      Published
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="adm-form-actions">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => navigate("/admin")}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
                <MdSave size={16} /> {saving ? "Saving…" : isEdit ? "Save changes" : "Create problem"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}