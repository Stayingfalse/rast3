import { StampMark } from "./stamp-mark";

type WordmarkProps = {
  /** "hero" for the landing lockup, "masthead" for the slim signed-in bar */
  size?: "hero" | "masthead";
  /** Render the name as the page's h1 */
  asHeading?: boolean;
  year?: string;
};

/**
 * The Random Acts of Santa lockup: the stamp mark beside the name, set in
 * mixed case on two lines so it reads at a glance. The season year sits on
 * the stamp.
 */
export function Wordmark({
  size = "hero",
  asHeading = false,
  year = "2026",
}: WordmarkProps) {
  const Tag = asHeading ? "h1" : "p";
  const hero = size === "hero";
  return (
    <div className={`flex items-center ${hero ? "gap-3 sm:gap-5" : "gap-3"}`}>
      <StampMark
        year={hero ? year : undefined}
        className={`shrink-0 -rotate-4 ${hero ? "w-14 min-[360px]:w-16 min-[400px]:w-20 sm:w-24 lg:w-28" : "w-9 sm:w-10"}`}
      />
      <Tag
        className={`font-expanded text-frost leading-[0.95] font-extrabold tracking-[-0.01em] ${
          hero
            ? "text-[clamp(1.875rem,5vw,3.75rem)] max-[359px]:text-[1.625rem]"
            : "text-lg sm:text-xl"
        }`}
      >
        <span className="block whitespace-nowrap">Random Acts</span>
        <span className="block whitespace-nowrap">
          <span className="font-normal [font-stretch:100%]">of</span> Santa
          <span className="sr-only"> {year}</span>
        </span>
      </Tag>
    </div>
  );
}
