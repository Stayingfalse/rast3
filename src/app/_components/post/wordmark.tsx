import { Postmark } from "./postmark";

type WordmarkProps = {
  /** "hero" for the landing lockup, "masthead" for the slim signed-in bar */
  size?: "hero" | "masthead";
  /** Render the name as the page's h1 */
  asHeading?: boolean;
  year?: string;
};

/**
 * The Random Acts of Santa lockup: the name set in expanded Archivo caps with
 * the season year postmarked across its corner.
 */
export function Wordmark({
  size = "hero",
  asHeading = false,
  year = "2026",
}: WordmarkProps) {
  const Tag = asHeading ? "h1" : "p";
  const hero = size === "hero";
  return (
    <div className="relative inline-block">
      <Tag
        className={`font-expanded text-frost leading-[0.88] font-extrabold tracking-[-0.01em] uppercase ${
          hero
            ? "text-[2.75rem] sm:text-6xl lg:text-7xl"
            : "text-xl sm:text-2xl"
        }`}
      >
        <span className="block">Random</span>
        <span className="text-post-bright block">Acts of</span>
        <span className="block">
          Santa<span className="sr-only"> {year}</span>
        </span>
      </Tag>
      <Postmark
        centre={year}
        sub="SEASON"
        className={`text-gold pointer-events-none absolute -rotate-10 ${
          hero
            ? "-right-16 bottom-0 w-20 sm:-right-24 sm:w-28"
            : "-right-12 -bottom-1 w-12"
        }`}
      />
    </div>
  );
}
