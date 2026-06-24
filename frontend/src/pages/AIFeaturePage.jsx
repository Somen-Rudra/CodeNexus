import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/ai-feature-page.css";

// ─── Feature definitions ──────────────────────────────────────────────────────

const ALL_FEATURES = [
  {
    key: "codeExplanation",
    title: "AI Code Explanation",
    description: "Get step-by-step explanations of any code or algorithm.",
    iconClass: "icon-green",
    to: "/ai-features/code-explanation",
    // relevant when user arrives with code from a submission
    relevantForCode: true,
  },
  {
    key: "hintGenerator",
    title: "AI Hint Generator",
    description: "Stuck on a problem? Get smart hints without spoiling the solution.",
    iconClass: "icon-yellow",
    to: "/ai-features/hint-generator",
    relevantForCode: false, // needs problem description, not code
  },
  {
    key: "solutionGenerator",
    title: "AI Solution Generator",
    description: "Generate optimized solutions with detailed explanations.",
    iconClass: "icon-blue",
    to: "/ai-features/solution-generator",
    relevantForCode: false,
  },
  {
    key: "codeReview",
    title: "AI Code Review",
    description: "Review your code for bugs, complexity, and best practices.",
    iconClass: "icon-red",
    to: "/ai-features/code-review",
    relevantForCode: true,
  },
  {
    key: "testCaseGenerator",
    title: "AI Test Case Generator",
    description: "Generate edge cases and custom test cases for better coverage.",
    iconClass: "icon-orange",
    to: "/ai-features/test-case-generator",
    relevantForCode: false,
  },
  {
    key: "mockInterview",
    title: "AI Mock Interview",
    description: "Practice with AI interviewers and get real-time feedback.",
    iconClass: "icon-purple",
    to: "/ai-features/mock-interview",
    relevantForCode: false,
  },
  {
    key: "complexityAnalysis",
    title: "AI Complexity Analysis",
    description: "Analyse time and space complexity of your solution.",
    iconClass: "icon-blue",
    to: "/ai-features/complexity",
    relevantForCode: true,
  },
  {
    key: "codeOptimizer",
    title: "AI Code Optimizer",
    description: "Get an optimized rewrite with explanation of improvements.",
    iconClass: "icon-orange",
    to: "/ai-features/optimize",
    relevantForCode: true,
  },
  {
    key: "bugFinder",
    title: "AI Bug Finder",
    description: "Automatically detect logical and runtime bugs in your code.",
    iconClass: "icon-red",
    to: "/ai-features/bug-finder",
    relevantForCode: true,
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function SparklesIcon({ className }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8
               M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FeatureCardIcon({ featureKey }) {
  const icons = {
    codeExplanation: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    hintGenerator: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
      </svg>
    ),
    solutionGenerator: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    ),
    codeReview: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    testCaseGenerator: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    mockInterview: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    complexityAnalysis: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    codeOptimizer: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83
                 M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    bugFinder: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2l1.5 1.5M15.5 3.5L17 2M12 2a5 5 0 0 0-5 5v3H5l-2 4h18l-2-4h-2V7a5 5 0 0 0-5-5z" />
        <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
      </svg>
    ),
  };
  return icons[featureKey] ?? null;
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function VerdictBadge({ verdict }) {
  const map = {
    accepted:            { label: "Accepted",   cls: "verdict--accepted" },
    wrong_answer:        { label: "Wrong Answer", cls: "verdict--wrong"  },
    time_limit_exceeded: { label: "TLE",          cls: "verdict--tle"    },
    runtime_error:       { label: "Runtime Error", cls: "verdict--re"    },
    compile_error:       { label: "Compile Error", cls: "verdict--ce"    },
  };
  const m = map[verdict] ?? { label: verdict, cls: "verdict--pending" };
  return <span className={`sub-verdict ${m.cls}`}>{m.label}</span>;
}

// ─── Preloaded context banner ─────────────────────────────────────────────────

function ContextBanner({ preloaded, onDismiss }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ai-context-banner">
      <div className="ai-context-banner__left">
        <SparklesIcon className="ai-context-banner__icon" />
        <div>
          <div className="ai-context-banner__title">
            Analyzing:&nbsp;
            <a href={`/problems/${preloaded.problemSlug}`} className="ai-context-banner__problem-link">
              #{preloaded.problemNumber} {preloaded.problemTitle}
            </a>
            {preloaded.difficulty && (
              <span className={`sub-diff sub-diff--${preloaded.difficulty}`} style={{ marginLeft: 8 }}>
                {preloaded.difficulty.charAt(0).toUpperCase() + preloaded.difficulty.slice(1)}
              </span>
            )}
          </div>
          <div className="ai-context-banner__meta">
            <span className="sub-lang-badge">{preloaded.language?.toUpperCase()}</span>
            {preloaded.verdict && <VerdictBadge verdict={preloaded.verdict} />}
            <button
              className="ai-context-banner__toggle"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? "Hide code" : "Preview code"}
            </button>
          </div>
          {expanded && (
            <pre className="ai-context-banner__code">
              <code>{preloaded.code}</code>
            </pre>
          )}
        </div>
      </div>
      <div className="ai-context-banner__right">
        <button className="ai-context-banner__dismiss" onClick={onDismiss} title="Clear context">
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIFeaturesPage() {
  const location   = useLocation();
  const [preloaded, setPreloaded] = useState(location.state?.preloaded ?? null);

  // When a submission is preloaded, show only tools that work with code
  const features = preloaded
    ? ALL_FEATURES.filter(f => f.relevantForCode)
    : ALL_FEATURES;

  // Attach preloaded state to each Link so destination pages can read it
  const linkState = preloaded ? { preloaded } : undefined;

  return (
    <main className="ai-features-page">

      {/* Back button when in analyze mode */}
      {preloaded && (
        <button className="ai-back-btn" onClick={() => window.history.back()}>
          <BackIcon /> Back to submissions
        </button>
      )}

      {/* Context banner */}
      {preloaded && (
        <ContextBanner
          preloaded={preloaded}
          onDismiss={() => setPreloaded(null)}
        />
      )}

      {/* Page header */}
      <div className="ai-features-header">
        <SparklesIcon className="header-icon" />
        <h1>{preloaded ? "Choose an AI Tool" : "AI Features"}</h1>
      </div>

      <p className="ai-features-subtitle">
        {preloaded
          ? "Tools relevant to your submitted code — click any to get started."
          : "Your AI-powered coding companion to learn, practice and grow faster."}
      </p>

      {/* Feature grid */}
      <div className="feature-grid">
        {features.map((feature) => (
          <div className="feature-card" key={feature.key}>
            <div className={`feature-icon ${feature.iconClass}`}>
              <FeatureCardIcon featureKey={feature.key} />
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <Link to={feature.to} state={linkState} className="feature-try-link">
              {preloaded ? "Analyze" : "Try Now"} <ArrowRightIcon />
            </Link>
          </div>
        ))}
      </div>

      {/* "Show all tools" toggle when in analyze mode */}
      {preloaded && (
        <div className="ai-show-all-wrap">
          <Link to="/ai-features" className="ai-show-all-link">
            View all AI tools <ArrowRightIcon />
          </Link>
        </div>
      )}

      {/* Ask AI banner — only on the full page, not analyze mode */}
      {!preloaded && (
        <section className="ask-ai-banner">
          <div className="ask-ai-content">
            <h2>Ask AI anything about coding</h2>
            <p>From doubts to deep explanations, your AI assistant is here.</p>
            <div className="ask-ai-input-row">
              <input
                type="text"
                placeholder="Ask anything... e.g. Explain dynamic programming"
              />
              <button className="ask-ai-submit">
                Ask AI <PaperPlaneIcon />
              </button>
            </div>
          </div>
          <div className="ask-ai-illustration" />
        </section>
      )}

    </main>
  );
}