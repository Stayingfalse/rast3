"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * Scroll motion for the home page (owner, 22 Oct 2026): a section is posted
 * in, like a letter through a slot, the first time it scrolls into view.
 * Content is visible without JavaScript and for anything already on screen
 * when the page loads; only sections below the fold are held back, and
 * reduced motion shows them at rest.
 */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
  id,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "ol" | "ul";
  id?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"rest" | "armed" | "shown">("rest");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // only hold back what the visitor hasn't seen yet
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // one ref for whichever element this renders as
      ref={ref as unknown as RefObject<HTMLDivElement & HTMLOListElement & HTMLUListElement>}
      id={id}
      data-reveal={state}
      className={`reveal ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
