"use client";
import React, { useEffect, useState } from "react";

const HomeHeader: React.FC = () => {
  const [swingDone, setSwingDone] = useState(false);
  const [show2025, setShow2025] = useState(false);
  const [typed2025, setTyped2025] = useState("");

  useEffect(() => {
    setSwingDone(false);
    setShow2025(false);
    setTyped2025("");
    const swingTimeout = setTimeout(() => {
      setSwingDone(true);
      setTimeout(() => setShow2025(true), 350); // longer delay for effect
    }, 1800); // swing duration slower
    return () => clearTimeout(swingTimeout);
  }, []);

  useEffect(() => {
    if (show2025) {
      let i = 0;
      const str = "2025";
      const type = () => {
        setTyped2025(str.slice(0, i + 1));
        i++;
        if (i < str.length) setTimeout(type, 160); // slower typing
      };
      type();
    }
  }, [show2025]);

  return (
    <div className="relative">
      <h1
        className={`text-5xl font-extrabold tracking-tight text-white transition-transform duration-700 sm:text-[5rem] ${swingDone ? "-rotate-12 skew-x-5" : "swing-animate"}`}
        style={{ display: "inline-block" }}
        onAnimationEnd={() => setSwingDone(true)}
      >
        Random{" "}
        <span className="text-[hsl(0,53%,31%)]">
          Acts
          <br /> Of
        </span>{" "}
        Santa
        {show2025 && (
          <span
            className={`ml-3 inline-block align-middle text-[hsl(0,53%,31%)] transition-all duration-500 ${typed2025.length === 4 ? "" : "typewriter-cursor"}`}
            aria-label="2025"
          >
            {typed2025}
          </span>
        )}
      </h1>
      <span className="sr-only">2025</span>
      <style jsx global>{`
        @keyframes swing {
          0% {
            transform: rotate(-8deg) skewX(-8deg);
          }
          20% {
            transform: rotate(10deg) skewX(8deg);
          }
          40% {
            transform: rotate(-6deg) skewX(-6deg);
          }
          60% {
            transform: rotate(4deg) skewX(4deg);
          }
          80% {
            transform: rotate(-2deg) skewX(-2deg);
          }
          100% {
            transform: rotate(0deg) skewX(3deg);
          }
        }
        .swing-animate {
          animation: swing 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .skew-x-3 {
          transform: skewX(3deg);
        }
        .typewriter-cursor::after {
          content: "|";
          animation: blink 1s steps(1) infinite;
          color: #fff;
          margin-left: 2px;
          font-weight: 400;
        }
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
        .stamp-effect {
          animation: stamp 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          text-shadow:
            0 2px 8px #fff7,
            0 0 2px #fff7;
          letter-spacing: 0.08em;
          transform: scale(1.12) rotate(-2deg);
        }
        @keyframes stamp {
          0% {
            opacity: 0;
            transform: scale(2) rotate(-12deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.1) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1.12) rotate(-2deg);
          }
        }
      `}</style>
    </div>
  );
};

export default HomeHeader;
