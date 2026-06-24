/**
 * DifficultyRings.jsx
 *
 * Three separate circular progress rings — one per difficulty.
 * Zero dependencies beyond React.
 *
 * Props:
 *   data : Array<{ name: "Easy"|"Medium"|"Hard", solved: number, total: number }>
 *   size : number  (ring diameter in px, default 80)
 */
import "../styles/difficulty-rings.css";

const COLOR = {
  Easy:   "var(--easy)",
  Medium: "var(--medium)",
  Hard:   "var(--hard)",
};
 
const BG_COLOR = {
  Easy:   "var(--easy-bg,   rgba(0,184,100,0.12))",
  Medium: "var(--medium-bg, rgba(255,179,0,0.12))",
  Hard:   "var(--hard-bg,   rgba(220,20,60,0.12))",
};
 
/**
 * Single SVG ring.
 * Uses stroke-dasharray trick — clean, no path math needed.
 */
function Ring({ name, solved, total, size = 80 }) {
  const stroke    = size * 0.11;          // stroke width scales with size
  const radius    = (size - stroke) / 2;  // inset by half stroke so it doesn't clip
  const cx        = size / 2;
  const cy        = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct       = total > 0 ? Math.min(solved / total, 1) : 0;
  const dash      = pct * circumference;
  const gap       = circumference - dash;
  const color     = COLOR[name];
  const bgColor   = BG_COLOR[name];
 
  return (
    <div className="dr-ring-wrap" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
 
      {/* Label — sits over SVG, not rotated */}
      <div className="dr-ring-label">
        <span className="dr-ring-solved" style={{ color }}>{solved}</span>
        <span className="dr-ring-total">/{total}</span>
      </div>
    </div>
  );
}
 
/**
 * The exported component.
 * Renders three rings side by side with labels below each.
 */
export default function DifficultyRings({ data = [], size = 80 }) {
  return (
    <div className="dr-root">
      {data.map((d) => (
        <div key={d.name} className="dr-item">
          <Ring {...d} size={size} />
          <span className="dr-name" style={{ color: COLOR[d.name] }}>{d.name}</span>
        </div>
      ))}
    </div>
  );
}
 