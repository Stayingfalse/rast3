import { useId } from "react";

type PostmarkProps = {
  /** Text around the top of the ring */
  top?: string;
  /** Text around the bottom of the ring */
  bottom?: string;
  /** The large centre line, e.g. the season year */
  centre: string;
  /** Small line under the centre */
  sub?: string;
  /** Draw the wavy cancellation lines to the right of the ring */
  cancellation?: boolean;
  className?: string;
  /** Stamp it on with the franking motion */
  animate?: boolean;
  title?: string;
};

/**
 * A circular date-stamp postmark in gold ink. Authored SVG, so it scales
 * crisply and the text stays real text.
 */
export function Postmark({
  top = "RANDOM ACTS",
  bottom = "CHRISTMAS POST",
  centre,
  sub,
  cancellation = false,
  className = "",
  animate = false,
  title,
}: PostmarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const width = cancellation ? 260 : 120;
  return (
    <svg
      viewBox={`0 0 ${width} 120`}
      className={`${animate ? "animate-frank" : ""} ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      stroke="currentColor"
    >
      <defs>
        <path id={`${id}-top`} d="M 22 60 A 38 38 0 0 1 98 60" />
        <path id={`${id}-bottom`} d="M 16 60 A 44 44 0 0 0 104 60" />
      </defs>
      <circle cx="60" cy="60" r="56" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="34" strokeWidth="1.5" />
      <g fill="currentColor" stroke="none" style={{ fontStretch: "125%" }}>
        <text fontSize="8.5" fontWeight="700" letterSpacing="1.2">
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fontSize="8.5" fontWeight="700" letterSpacing="1.2">
          <textPath
            href={`#${id}-bottom`}
            startOffset="50%"
            textAnchor="middle"
          >
            {bottom}
          </textPath>
        </text>
        <text
          x="60"
          y={sub ? 64 : 68}
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          className="tabular"
        >
          {centre}
        </text>
        {sub && (
          <text
            x="60"
            y="78"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            letterSpacing="1"
          >
            {sub}
          </text>
        )}
      </g>
      {cancellation &&
        [34, 48, 62, 76, 90].map((y) => (
          <path
            key={y}
            d={`M 124 ${y} q 9 -7 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}
    </svg>
  );
}
