/**
 * A perforated postage stamp carrying a hanging bauble, drawn to match the
 * ornaments in the site header.
 */
export function BaubleStamp({ className = "" }: { className?: string }) {
  return (
    <div className={`perforated ${className}`} aria-hidden>
      <svg viewBox="0 0 64 80" className="bg-night block h-full w-full">
        <line
          x1="32"
          y1="0"
          x2="32"
          y2="20"
          stroke="#caa24c"
          strokeWidth="1.5"
        />
        <rect x="27" y="18" width="10" height="7" rx="1.5" fill="#caa24c" />
        <circle cx="32" cy="45" r="20" fill="#b8262c" />
        <path
          d="M 12.5 41 Q 32 50 51.5 41"
          stroke="#e5cf98"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 13.5 51 Q 32 60 50.5 51"
          stroke="#1f5c47"
          strokeWidth="2.5"
          fill="none"
        />
        <circle cx="24" cy="36" r="4" fill="#f6f0e2" opacity="0.35" />
        <text
          x="32"
          y="76"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="800"
          fill="#e5cf98"
          style={{ fontStretch: "125%" }}
          letterSpacing="0.6"
        >
          RAoS 26
        </text>
      </svg>
    </div>
  );
}
