import { Link } from "react-router-dom";
import "../../styles/problem-page.css";

function DifficultyBadge({ difficulty }) {
  return (
    <span
      className={`ps-badge ps-badge--${difficulty?.toLowerCase()}`}
    >
      {difficulty}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="ps-row ps-row--skeleton">
      <td>
        <div className="ps-skel ps-skel--sm" />
      </td>

      <td>
        <div className="ps-skel ps-skel--lg" />
      </td>

      <td>
        <div className="ps-skel ps-skel--md" />
      </td>

      <td>
        <div className="ps-skel ps-skel--lg" />
      </td>

      <td>
        <div className="ps-skel ps-skel--sm" />
      </td>
    </tr>
  );
}

export default function ProblemList({
  problems,
  loading,
}) {
  return (
    <div className="ps-table-wrap">

      <table className="ps-table">

        <thead>
          <tr>
            <th className="ps-th ps-th--num">
              #
            </th>

            <th className="ps-th ps-th--title">
              Title
            </th>

            <th className="ps-th ps-th--diff">
              Difficulty
            </th>

            <th className="ps-th ps-th--topics">
              Topics
            </th>

            <th className="ps-th ps-th--acc">
              Acceptance
            </th>
          </tr>
        </thead>

        <tbody>

          {loading ? (
            Array.from({ length: 10 }).map(
              (_, index) => (
                <SkeletonRow
                  key={index}
                />
              )
            )
          ) : problems.length === 0 ? (

            <tr>
              <td
                colSpan={5}
                className="ps-empty"
              >
                <div className="ps-empty-inner">

                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />

                    <path
                      d="M21 21L16.65 16.65"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>

                  <h3>
                    No problems found
                  </h3>

                  <p>
                    Try changing your
                    filters or search
                    query.
                  </p>

                </div>
              </td>
            </tr>

          ) : (

            problems.map((problem) => (
              <tr
                key={problem.slug}
                className="ps-row"
              >

                <td className="ps-td ps-td--num">
                  {
                    problem.problemNumber
                  }
                </td>

                <td className="ps-td ps-td--title">

                  <Link
                    to={`/problemSet/${problem.slug}`}
                    className="ps-problem-link"
                  >
                    {problem.title}

                    {problem.isPremium && (
                      <span
                        className="ps-premium"
                        title="Premium"
                      >
                        ★
                      </span>
                    )}

                    {problem.isFeatured && (
                      <span
                        className="ps-featured"
                        title="Featured"
                      >
                        🔥
                      </span>
                    )}
                  </Link>

                </td>

                <td className="ps-td ps-td--diff">
                  <DifficultyBadge
                    difficulty={
                      problem.difficulty
                    }
                  />
                </td>

                <td className="ps-td ps-td--topics">

                  <div className="ps-topics">

                    {problem.topics
                      ?.slice(0, 2)
                      .map((topic) => (
                        <span
                          key={topic}
                          className="ps-topic-chip"
                        >
                          {topic}
                        </span>
                      ))}

                    {problem.topics
                      ?.length > 2 && (
                      <span className="ps-topic-chip ps-topic-chip--more">
                        +
                        {problem.topics
                          .length - 2}
                      </span>
                    )}

                  </div>

                </td>

                <td className="ps-td ps-td--acc">

                  <span className="ps-acceptance">

                    {problem.acceptancePercentage !=
                    null
                      ? `${problem.acceptancePercentage.toFixed(
                          1
                        )}%`
                      : "—"}

                  </span>

                </td>

              </tr>
            ))

          )}

        </tbody>

      </table>

    </div>
  );
}