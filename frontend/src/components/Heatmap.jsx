/**
 * Heatmap.jsx
 *
 * Uses:  react-calendar-heatmap  (npm install react-calendar-heatmap)
 *        react-tooltip            (npm install react-tooltip)
 *
 * Drop-in replacement. Props:
 *   heatmap : Record<"YYYY-MM-DD", number>
 *   title   : string  (optional)
 */

import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";
import "react-calendar-heatmap/dist/styles.css";
import "../styles/heatmap.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLevel(count) {
  if (!count || count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Heatmap({ heatmap = {}, title = "Activity" }) {
  const today     = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1); // Jan 1 this year

  // react-calendar-heatmap wants [{ date, count }]
  const values = Object.entries(heatmap).map(([date, count]) => ({ date, count }));

  const totalThisYear = values
    .filter(v => v.date.startsWith(String(today.getFullYear())))
    .reduce((s, v) => s + v.count, 0);

  return (
    <div className="hm-card">
      {/* Header */}
      <div className="hm-header">
        <h3 className="hm-title">{title}</h3>
        <span className="hm-summary">
          <strong>{totalThisYear.toLocaleString()}</strong> submissions this year
        </span>
      </div>

      {/* Heatmap */}
      <div className="hm-wrap">
        <CalendarHeatmap
          startDate={startDate}
          endDate={today}
          values={values}
          showMonthLabels={true}
          showWeekdayLabels={true}
          gutterSize={2}
          squareSize={10}
          classForValue={(value) => {
            const level = value ? getLevel(value.count) : 0;
            return `hm-color-${level}`;
          }}
          tooltipDataAttrs={(value) => {
            if (!value || !value.date) return {};
            const count = value.count ?? 0;
            const label = count === 0
              ? "No submissions"
              : `${count} submission${count !== 1 ? "s" : ""}`;
            return {
              "data-tooltip-id":      "hm-tip",
              "data-tooltip-content": `${label} · ${fmtDate(value.date)}`,
            };
          }}
        />
        <Tooltip
          id="hm-tip"
          place="top"
          className="hm-tooltip"
          style={{ zIndex: 9999 }}
        />
      </div>

      {/* Legend */}
      <div className="hm-legend">
        <span className="hm-legend-label">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`hm-color-${l} hm-legend-cell`} />
        ))}
        <span className="hm-legend-label">More</span>
      </div>
    </div>
  );
}