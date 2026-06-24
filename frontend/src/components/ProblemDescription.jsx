import React, { useState } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaLightbulb,
  FaCopy,
  FaGoogle,
  FaAmazon,
  FaApple,
  FaFacebook,
  FaMicrosoft,
  FaBuilding,
  FaTag,
} from "react-icons/fa";
import "../styles/problem-description.css";

/* =========================================
   DEMO DATA
========================================= */
const DEMO_PROBLEM = {
  problemNumber: 15,
  title: "3Sum",
  difficulty: "medium",
  acceptanceRate: { totalSubs: 8_420_000, acceptedSubs: 2_868_000 },
  topics: ["Array", "Two Pointers", "Sorting"],
  description:
    "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
  examples: [
    {
      input: "nums = [-1,0,1,2,-1,-4]",
      output: "[[-1,-1,2],[-1,0,1]]",
      explanation:
        "nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0. nums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0. The distinct triplets are [-1,0,1] and [-1,-1,2].",
    },
    {
      input: "nums = [0,1,1]",
      output: "[]",
      explanation: "The only possible triplet does not sum up to 0.",
    },
    {
      input: "nums = [0,0,0]",
      output: "[[0,0,0]]",
      explanation: "The only possible triplet sums up to 0.",
    },
  ],
  constraints: ["`3 <= nums.length <= 3000`", "`-10^5 <= nums[i] <= 10^5`"],
  followUps: [
    "Can you solve it in O(n²) time complexity?",
    "How would you handle extremely large arrays that don't fit in memory?",
  ],
  hints: [
    "So, we essentially need to find three numbers x, y, and z such that they add up to the given value. If we fix one of the numbers say x, we are left with the two-sum problem at hand!",
    "For the two-sum problem, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y, which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
    "The second train of thought for two-sum is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?",
  ],
  companies: ["Google", "Amazon", "Apple", "Meta", "Microsoft"],
  similarQuestions: [
    { slug: "two-sum", title: "Two Sum" },
    { slug: "3sum-closest", title: "3Sum Closest" },
    { slug: "4sum", title: "4Sum" },
    { slug: "3sum-smaller", title: "3Sum Smaller" },
  ],
};

/* =========================================
   HELPERS
========================================= */
const renderHighlightedText = (text) => {
  if (!text || typeof text !== "string") return null;
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i}>{part.slice(1, -1)}</code>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
};

const ParsedText = ({ text }) => <>{renderHighlightedText(text)}</>;

const formatNumber = (num) => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error(e);
  }
};

/* =========================================
   COMPANY ICONS
========================================= */
const companyIcons = {
  Google: <FaGoogle />,
  Amazon: <FaAmazon />,
  Apple: <FaApple />,
  Meta: <FaFacebook />,
  Facebook: <FaFacebook />,
  Microsoft: <FaMicrosoft />,
};

/* =========================================
   ACCORDION
========================================= */
const Accordion = ({
  title,
  sectionKey,
  openSections,
  toggleSection,
  children,
  icon,
}) => (
  <div className="accordion">
    <button
      className="accordion-header"
      onClick={() => toggleSection(sectionKey)}
    >
      <div className="accordion-left">
        {icon}
        <span>{title}</span>
      </div>
      {openSections[sectionKey] ? <FaChevronUp /> : <FaChevronDown />}
    </button>
    {openSections[sectionKey] && (
      <div className="accordion-content">{children}</div>
    )}
  </div>
);

/* =========================================
   EXAMPLE BLOCK
========================================= */
const ExampleBlock = ({ index, input, output, explanation }) => (
  <div className="example-block">
    <div className="example-block__header">
      <span className="example-block__label">Example {index + 1}</span>
      <button
        className="example-block__run-btn"
        onClick={() => copyText(`Input: ${input}\nOutput: ${output}`)}
      >
        <FaCopy style={{ marginRight: 4, fontSize: 10 }} /> Copy
      </button>
    </div>
    <div className="example-block__body">
      <div className="example-block__row">
        <span className="example-block__key">Input:</span>
        <span className="example-block__val">{input}</span>
      </div>
      <div className="example-block__row">
        <span className="example-block__key">Output:</span>
        <span className="example-block__val">{output}</span>
      </div>
      {explanation && (
        <div className="example-block__explain">
          <strong>Explanation:</strong> {explanation}
        </div>
      )}
    </div>
  </div>
);

/* =========================================
   LOADING SKELETON
========================================= */
const LoadingSkeleton = () => (
  <div style={{ padding: "2rem" }}>
    {[60, 100, 80, 90].map((w, i) => (
      <div
        key={i}
        style={{
          height: i === 0 ? 28 : 16,
          background: "var(--bg-tertiary)",
          borderRadius: 4,
          width: `${w}%`,
          marginBottom: 10,
        }}
      />
    ))}
  </div>
);

/* =========================================
   MAIN COMPONENT
========================================= */
const ProblemDescription = ({ problem }) => {
  const [openSections, setOpenSections] = useState({
    examples: true,
    constraints: true,
    followup: false,
    hints: false,
    companies: false,
    similar: false,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!problem?.title) return <LoadingSkeleton />;

  const { totalSubs = 0, acceptedSubs = 0 } = problem.acceptanceRate ?? {};
  const acceptanceRate =
    totalSubs === 0 ? "0.00" : ((acceptedSubs / totalSubs) * 100).toFixed(1);

  const diffClass =
    problem.difficulty === "easy"
      ? "difficulty-badge--easy"
      : problem.difficulty === "medium"
        ? "difficulty-badge--medium"
        : "difficulty-badge--hard";

  return (
    <div className="problem-description">
      {/* ── HEADER ── */}
      <div className="prob__header">
        <div className="prob__title-row">
          <span className="prob__number">{problem.problemNumber}.</span>
          <h1 className="prob__title">{problem.title}</h1>
          <span className={`difficulty-badge ${diffClass}`}>
            {problem.difficulty.charAt(0).toUpperCase() +
              problem.difficulty.slice(1)}
          </span>
        </div>

        {/* META ROW */}
        <div className="prob__meta">
          <span className="prob__meta-item">
            Acceptance&nbsp;
            <span className="prob__meta-accent">{acceptanceRate}%</span>
          </span>
          <span className="prob__meta-item">
            Accepted&nbsp;
            <span className="prob__meta-accent">
              {formatNumber(acceptedSubs)}
            </span>
          </span>
          <span className="prob__meta-item">
            Submissions&nbsp;
            <span className="prob__meta-accent">{formatNumber(totalSubs)}</span>
          </span>
        </div>
      </div>

      {/* ── DESCRIPTION ── */}
      <div className="prob__body">
        {problem.description?.split("\n").map((line, i) => (
          <p key={i}>{renderHighlightedText(line)}</p>
        ))}
      </div>

      {/* ── EXAMPLES ── */}
      <div className="prob__examples">
        {problem.examples?.map((ex, i) => (
          <ExampleBlock key={i} index={i} {...ex} />
        ))}
      </div>

      {/* ── CONSTRAINTS ── */}
      {problem.constraints?.length > 0 && (
        <div className="prob__constraints">
          <div className="prob__section-title">Constraints</div>
          <ul className="constraints-list">
            {problem.constraints.map((c, i) => (
              <li key={i}>
                <ParsedText text={c} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── TOPICS ── */}
      {problem.topics?.length > 0 && (
        <div className="prob__topics">
          {problem.topics.map((t) => (
            <span key={t} className="topic-tag">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* ── FOLLOW-UP ── */}
      {problem.followUps?.length > 0 && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <Accordion
            title="Follow-up"
            sectionKey="followup"
            openSections={openSections}
            toggleSection={toggleSection}
            icon={<FaLightbulb />}
          >
            <ul className="constraints-list">
              {problem.followUps.map((f, i) => (
                <li key={i}>
                  <ParsedText text={f} />
                </li>
              ))}
            </ul>
          </Accordion>
        </div>
      )}

      {/* ── HINTS ── */}
      {problem.hints?.length > 0 && (
        <Accordion
          title="Hints"
          sectionKey="hints"
          openSections={openSections}
          toggleSection={toggleSection}
          icon={<FaLightbulb />}
        >
          <div className="hint-stack">
            {problem.hints.map((hint, i) => (
              <Accordion
                key={i}
                title={`Hint ${i + 1}`}
                sectionKey={`hint${i}`}
                openSections={openSections}
                toggleSection={toggleSection}
                icon={<FaLightbulb />}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  <ParsedText text={hint} />
                </p>
              </Accordion>
            ))}
          </div>
        </Accordion>
      )}

      {/* ── COMPANIES ── */}
      {problem.companies?.length > 0 && (
        <Accordion
          title="Companies"
          sectionKey="companies"
          openSections={openSections}
          toggleSection={toggleSection}
          icon={<FaBuilding />}
        >
          <div className="companies-grid">
            {problem.companies.map((company) => (
              <div key={company} className="company-card">
                <div className="company-fallback-icon">
                  {companyIcons[company] || <FaBuilding />}
                </div>
                <span>{company}</span>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* ── SIMILAR QUESTIONS ── */}
      {problem.similarQuestions?.length > 0 && (
        <Accordion
          title="Similar Questions"
          sectionKey="similar"
          openSections={openSections}
          toggleSection={toggleSection}
          icon={<FaTag />}
        >
          <ul className="constraints-list">
            {problem.similarQuestions.map((q) => (
              <li key={q.slug}>
                <a
                  href={`/problemSet/${q.slug}`}
                  style={{
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    fontSize: 13,
                  }}
                >
                  {q.title}
                </a>
              </li>
            ))}
          </ul>
        </Accordion>
      )}
    </div>
  );
};

export default ProblemDescription;
