"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";
import type { RouterOutputs } from "~/trpc/react";
import { AdminActionsDropdown } from "./admin-actions-dropdown";

interface KudosFeedProps {
  className?: string;
}

interface ImageCarouselProps {
  images: string[];
}

// LightboxModal component for zoomed images
interface LightboxModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const LightboxModal: React.FC<LightboxModalProps> = ({
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        setCurrentIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft")
        setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  return (
    <div
      className="bg-opacity-80 fixed inset-0 z-50 flex items-center justify-center bg-black"
      ref={backdropRef}
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="bg-opacity-50 hover:bg-opacity-80 absolute top-2 right-2 z-10 rounded-full bg-black p-2 text-2xl text-white transition"
        >
          &times;
        </button>
        <div className="flex w-full items-center justify-center">
          <Image
            src={getProxyImageUrl(images[currentIndex]!)}
            alt={`Zoomed image ${currentIndex + 1}`}
            width={900}
            height={900}
            className="max-h-[80vh] max-w-full rounded-lg bg-black object-contain"
            onError={handleImageError}
            priority
          />
        </div>
        {images.length > 1 && (
          <div className="mt-4 flex items-center justify-center space-x-4">
            <button
              onClick={() =>
                setCurrentIndex((i) => (i - 1 + images.length) % images.length)
              }
              className="bg-opacity-40 hover:bg-opacity-80 rounded-full bg-black p-2 text-2xl text-white transition"
            >
              &#8592;
            </button>
            <span className="text-lg text-white">
              {currentIndex + 1} / {images.length}
            </span>
            <button
              onClick={() => setCurrentIndex((i) => (i + 1) % images.length)}
              className="bg-opacity-40 hover:bg-opacity-80 rounded-full bg-black p-2 text-2xl text-white transition"
            >
              &#8594;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

type ScopeType = "department" | "domain" | "site";

// Christmas-themed names for anonymization
const CHRISTMAS_NAMES = [
  "Jingle Bell",
  "Holly Berry",
  "Candy Cane",
  "Snow Flake",
  "Winter Star",
  "Frost Bite",
  "Pine Needle",
  "Sugar Plum",
  "Ginger Bread",
  "Icicle Drop",
  "Mistletoe",
  "Nutcracker",
  "Tinsel Shine",
  "Cocoa Bean",
  "Peppermint",
  "Sleigh Bell",
  "Reindeer",
  "Snowball",
  "Eggnog",
  "Christmas Tree",
  "Angel Wing",
  "Star Light",
  "Gift Wrap",
  "Ribbon Bow",
  "Ornament",
  "Candy Mint",
  "Hot Cocoa",
  "Fire Place",
  "Wreath Maker",
  "Cookie Baker",
  "Snow Angel",
  "Ice Crystal",
  "Winter Moon",
  "Frost King",
  "Snow Queen",
  "Jingle Jangle",
  "Merry Maker",
  "Joy Bringer",
  "Hope Bearer",
  "Peace Keeper",
  "Love Giver",
  "Kind Heart",
  "Gentle Soul",
  "Warm Hug",
  "Sweet Smile",
  "Bright Light",
  "Happy Helper",
  "Cheerful Elf",
  "Magic Maker",
  "Wonder Worker",
];

// Christmas-themed emojis for avatars
const CHRISTMAS_AVATARS = [
  "🎅",
  "🤶",
  "🎄",
  "⭐",
  "❄️",
  "🎁",
  "🔔",
  "🕯️",
  "🍪",
  "🥛",
  "🦌",
  "⛄",
  "🎊",
  "🎉",
  "✨",
  "🌟",
  "🎀",
  "🧑‍🎄",
  "🎯",
  "🎪",
  "🍭",
  "🧤",
  "🧣",
  "👑",
  "💎",
  "🎭",
  "🎨",
  "🎵",
  "🎶",
  "💫",
];

// Christmas-themed colors for user backgrounds - more vibrant for full cards
const CHRISTMAS_COLORS = [
  // Classic Christmas reds & greens
  "bg-red-600", // Santa red
  "bg-green-600", // Pine green
  "bg-emerald-500", // Emerald
  "bg-lime-500", // Holly green
  "bg-rose-500", // Holly berry red
  "bg-green-800", // Deep pine
  "bg-red-800", // Deep red

  // Snowy & frosty blues
  "bg-blue-500", // Winter blue
  "bg-sky-400", // Frost blue
  "bg-cyan-400", // Icy blue
  "bg-blue-800", // Night sky

  // Golds & yellows (bells, stars, lights)
  "bg-yellow-400", // Star yellow
  "bg-amber-400", // Golden bell
  "bg-yellow-600", // Warm gold

  // Accents: festive purples, pinks, and silver
  "bg-fuchsia-500", // Festive pink
  "bg-purple-500", // Royal purple
  "bg-indigo-500", // Midnight
  "bg-gray-200", // Snow
  "bg-white", // Pure snow
  "bg-slate-400", // Silver tinsel

  // Orange for gingerbread/cookies
  "bg-orange-400", // Gingerbread
  "bg-orange-600", // Toasty cookie

  // Extra: teal for icy accents
  "bg-teal-400", // Icy teal
];

// Function to generate consistent Christmas name, avatar, and color based on user ID
const getChristmasIdentity = (userId: string) => {
  // Create a simple hash from the user ID for consistency
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const nameIndex = Math.abs(hash) % CHRISTMAS_NAMES.length;
  const avatarIndex = Math.abs(hash >> 8) % CHRISTMAS_AVATARS.length;
  const colorIndex = Math.abs(hash >> 16) % CHRISTMAS_COLORS.length;

  return {
    name: CHRISTMAS_NAMES[nameIndex]!,
    avatar: CHRISTMAS_AVATARS[avatarIndex]!,
    color: CHRISTMAS_COLORS[colorIndex]!,
  };
};

// Image Carousel Component with max height enforced
const ImageCarousel: React.FC<
  ImageCarouselProps & { onZoom?: (index: number) => void }
> = ({ images, onZoom }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () =>
    setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  const handleImageClick = () => {
    if (onZoom) onZoom(currentIndex);
  };

  if (images.length === 0) return null;

  // Single image: no fixed aspect, but limit height
  if (images.length === 1) {
    return (
      <div className="relative flex w-full items-center justify-center">
        <div className="flex max-h-[400px] min-h-[180px] w-full max-w-full items-center justify-center overflow-hidden rounded-lg bg-black">
          <Image
            src={getProxyImageUrl(images[0]!)}
            alt="Kudos image"
            fill
            className="max-h-[400px] cursor-pointer rounded-lg object-contain shadow-sm transition-shadow hover:shadow-md"
            onClick={handleImageClick}
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      </div>
    );
  }

  // Carousel: keep 1:1, but limit height
  return (
    <div className="relative flex w-full items-center justify-center">
      <div className="relative flex aspect-square max-h-[400px] min-h-[180px] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
        <Image
          src={getProxyImageUrl(images[currentIndex]!)}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          fill
          className="max-h-[400px] cursor-pointer rounded-lg object-contain shadow-sm transition-shadow hover:shadow-md"
          onClick={handleImageClick}
          onError={handleImageError}
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        {/* Navigation dots */}
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 transform space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`h-2 w-2 rounded-full transition-colors sm:h-3 sm:w-3 ${index === currentIndex ? "bg-white" : "bg-opacity-50 bg-white"}`}
            />
          ))}
        </div>
        {/* Swipe overlay for mobile - with visual indicators */}
        <div className="absolute inset-0 flex">
          <div
            className="group flex h-full w-1/3 cursor-pointer items-center justify-start pl-2"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          >
            <div className="bg-opacity-50 rounded-full bg-black p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </div>
          </div>
          <div
            className="group flex h-full w-1/3 cursor-pointer items-center justify-center"
            onClick={handleImageClick}
          >
            <div className="bg-opacity-50 rounded-full bg-black p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </div>
          <div
            className="group flex h-full w-1/3 cursor-pointer items-center justify-end pr-2"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <div className="bg-opacity-50 rounded-full bg-black p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
        {/* Image counter */}
        <div className="bg-opacity-50 absolute top-2 right-2 z-10 rounded bg-black px-2 py-1 text-xs text-white sm:px-3 sm:py-1 sm:text-sm">
          {currentIndex + 1}/{images.length}
        </div>
        {/* Click hint text */}
        <div className="bg-opacity-50 absolute bottom-2 left-2 z-10 rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100">
          Click image to zoom
        </div>
      </div>
    </div>
  );
};

type Kudos = RouterOutputs["kudos"]["getFeed"]["items"][number];

export const KudosFeed: React.FC<KudosFeedProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const [selectedScope, setSelectedScope] = useState<ScopeType | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [isFeedInView, setIsFeedInView] = useState(false);
  const [newKudos, setNewKudos] = useState<Kudos[]>([]);
  const [actualDisplayScope, setActualDisplayScope] =
    useState<ScopeType | null>(null);

  // Get recommended scope
  const { data: recommendedScope } = api.kudos.getRecommendedScope.useQuery();

  // Check content availability for fallback logic
  const { data: departmentHasContent } =
    api.kudos.departmentHasContent.useQuery(undefined, {
      enabled: !!session,
    });
  const { data: domainHasContent } = api.kudos.domainHasContent.useQuery(
    undefined,
    {
      enabled: !!session,
    },
  );

  // Determine current scope with fallback logic
  const currentScope = useMemo(() => {
    const requestedScope = selectedScope ?? recommendedScope ?? "site";

    // If the requested scope has content, use it
    if (requestedScope === "department" && departmentHasContent) {
      setActualDisplayScope("department");
      return "department";
    }
    if (requestedScope === "domain" && domainHasContent) {
      setActualDisplayScope("domain");
      return "domain";
    }

    // Fallback logic: try next available scope
    if (requestedScope === "department" && !departmentHasContent) {
      if (domainHasContent) {
        setActualDisplayScope("domain");
        return "domain";
      } else {
        setActualDisplayScope("site");
        return "site";
      }
    }

    if (requestedScope === "domain" && !domainHasContent) {
      setActualDisplayScope("site");
      return "site";
    }

    setActualDisplayScope(requestedScope);
    return requestedScope;
  }, [selectedScope, recommendedScope, departmentHasContent, domainHasContent]);

  // Generate fallback message
  const getFallbackMessage = () => {
    const requestedScope = selectedScope ?? recommendedScope ?? "site";
    if (actualDisplayScope !== requestedScope) {
      const requestedName = getScopeDisplayName(requestedScope);
      const actualName = getScopeDisplayName(actualDisplayScope!);
      return `No kudos in ${requestedName} yet, showing ${actualName} kudos instead! 🎄`;
    }
    return null;
  };

  // Fetch feed data with infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = api.kudos.getFeed.useInfiniteQuery(
    {
      scope: currentScope,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!currentScope,
    },
  );

  // Memoize allKudos to avoid useEffect dependency warning
  const allKudos = React.useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // Intersection Observer for automatic loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Intersection Observer for feed visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setIsFeedInView(entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.1 },
    );
    const ref = feedRef.current;
    if (ref) observer.observe(ref);
    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, []); // Poll for new kudos when feed is in view - simplified
  useEffect(() => {
    if (!isFeedInView) return;
    const interval = setInterval(() => {
      // Simple refetch of current data
      // The tRPC infinite query will handle detecting new items
    }, 10000);
    return () => clearInterval(interval);
  }, [isFeedInView, currentScope, allKudos]);

  // Merge newKudos at the top, then clear after animation
  useEffect(() => {
    if (newKudos.length === 0) return;
    const timeout = setTimeout(() => {
      setNewKudos([]);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [newKudos]);

  const getScopeDisplayName = (scope: ScopeType) => {
    switch (scope) {
      case "department":
        return "Department";
      case "domain":
        return "Domain";
      case "site":
        return "Site";
      default:
        return scope;
    }
  };

  const getScopeDescription = (scope: ScopeType) => {
    switch (scope) {
      case "department":
        return "See kudos from your department colleagues";
      case "domain":
        return "See kudos from your domain";
      case "site":
        return "See all kudos from the entire site";
      default:
        return "";
    }
  };
  if (isLoading) {
    return (
      <div ref={feedRef} className={`rounded-lg ${className}`}>
        {/* Header skeleton */}
        <div className="p-6">
          <div className="animate-pulse">
            <div className="animate-skeleton-shimmer mb-4 h-8 w-1/3 rounded bg-gray-200"></div>
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="animate-skeleton-shimmer h-8 flex-1 rounded-md bg-gray-200"
                  style={{ animationDelay: `${i * 100}ms` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading cards that match the actual feed layout */}
        <div className="p-6">
          <div className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3">
            {Array.from({ length: 6 }, (_, i) => {
              const hasImage = i % 3 === 0; // Some cards have images
              const colorIndex = i % CHRISTMAS_COLORS.length;
              const bgColor = CHRISTMAS_COLORS[colorIndex];

              return (
                <div
                  key={i}
                  className={`animate-skeleton-pulse mb-6 break-inside-avoid ${
                    hasImage ? "w-full md:col-span-2 lg:col-span-3" : ""
                  }`}
                  style={{
                    animationDelay: `${i * 150}ms`,
                  }}
                >
                  <div
                    className={`${bgColor} border-opacity-50 overflow-hidden rounded-2xl border border-white opacity-60 shadow-sm`}
                  >
                    {/* Image placeholder for some cards */}
                    {hasImage && (
                      <div className="animate-skeleton-shimmer aspect-square max-h-[400px] min-h-[180px] w-full bg-gray-300"></div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      {/* User info skeleton */}
                      <div className="mb-3 flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="border-opacity-70 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                            <div className="animate-skeleton-shimmer h-6 w-6 rounded bg-gray-200"></div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div
                            className="animate-skeleton-shimmer h-5 w-32 rounded bg-gray-200"
                            style={{ animationDelay: "200ms" }}
                          ></div>
                          <div
                            className="animate-skeleton-shimmer h-3 w-20 rounded bg-gray-200"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>

                      {/* Message skeleton */}
                      <div className="bg-opacity-40 border-opacity-30 rounded-xl border border-white bg-white p-4 shadow-sm">
                        <div className="space-y-2">
                          <div
                            className="animate-skeleton-shimmer h-4 w-full rounded bg-gray-200"
                            style={{ animationDelay: "100ms" }}
                          ></div>
                          <div
                            className="animate-skeleton-shimmer h-4 w-4/5 rounded bg-gray-200"
                            style={{ animationDelay: "200ms" }}
                          ></div>
                          <div
                            className="animate-skeleton-shimmer h-4 w-3/5 rounded bg-gray-200"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
        <div className="text-center text-red-600">
          <p>Failed to load kudos feed</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef} className={`rounded-lg ${className}`}>
      {/* Header with scope selection */}{" "}
      <div className="p-6">
        <h2 className="mb-4 text-2xl font-bold text-white">Kudos Feed</h2>

        {session && (
          /* Scope Selection Tabs */
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            {(["department", "domain", "site"] as ScopeType[])
              .filter((scope) => {
                // For unauthenticated users, only show site scope
                if (!session) {
                  return scope === "site";
                }
                // For authenticated users, show all scopes
                return true;
              })
              .map((scope) => (
                <button
                  key={scope}
                  onClick={() => setSelectedScope(scope)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    currentScope === scope
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title={getScopeDescription(scope)}
                >
                  {getScopeDisplayName(scope)}
                </button>
              ))}
          </div>
        )}
      </div>
      {/* Feed Content */}
      <div>
        {/* Fallback message */}
        {getFallbackMessage() && (
          <div className="px-6 pb-2">
            <div className="rounded-lg border border-green-200 bg-green-100 p-3">
              <p className="text-center text-sm font-medium text-green-800">
                {getFallbackMessage()}
              </p>
            </div>
          </div>
        )}

        {allKudos.length === 0 ? (
          <div className="p-6">
            <div className="border-opacity-50 overflow-hidden rounded-2xl border border-white bg-red-600 shadow-lg">
              <div className="p-8 text-center text-white">
                {/* Santa Avatar */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-200 bg-white shadow-lg">
                  <span className="text-4xl">🎅</span>
                </div>

                {/* Christmas-themed message */}
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    Ho ho ho! No kudos yet! 🎄
                  </h3>{" "}
                  <p className="text-lg text-red-100">
                    Santa&apos;s workshop is quiet here...
                  </p>
                  <p className="text-red-200">
                    Be the first elf to spread some Christmas cheer and
                    appreciation! ✨
                  </p>
                  {/* Christmas decorations */}
                  <div className="mt-6 flex justify-center space-x-4 text-2xl opacity-75">
                    <span>🎁</span>
                    <span>⭐</span>
                    <span>❄️</span>
                    <span>🔔</span>
                    <span>🎄</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Masonry Grid Container */}
            <div className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3">
              {/* Animated new kudos at the top */}
              {newKudos.map((kudos) => {
                const images = kudos.images
                  ? (JSON.parse(kudos.images) as string[])
                  : [];
                const christmasIdentity = getChristmasIdentity(kudos.user.id);
                const displayName = christmasIdentity.name;
                const avatarEmoji = christmasIdentity.avatar;
                return (
                  <div
                    key={kudos.id}
                    className={`animate-fade-in-slide mb-6 break-inside-avoid ${images.length > 0 ? "w-full md:col-span-2 lg:col-span-3" : ""}`}
                    style={{ animationDuration: "1.1s" }}
                  >
                    <div
                      className={`${christmasIdentity.color} border-opacity-50 overflow-hidden rounded-2xl border border-white shadow-sm transition-shadow hover:shadow-md`}
                    >
                      {/* Purchase context */}
                      {kudos.purchase && (
                        <div className="bg-opacity-50 m-4 mb-3 rounded-lg border-l-4 border-red-400 bg-white p-3">
                          <p className="text-sm text-red-800">
                            🎁 Thanking{" "}
                            <span className="font-medium">
                              {
                                getChristmasIdentity(
                                  kudos.purchase.wishlistAssignment
                                    .wishlistOwner.id,
                                ).name
                              }
                            </span>{" "}
                            for a gift
                          </p>
                        </div>
                      )}
                      {/* Images at the top */}
                      {images.length > 0 && (
                        <div className="w-full">
                          <ImageCarousel
                            images={images}
                            onZoom={(index) => setLightbox({ images, index })}
                          />
                        </div>
                      )}

                      {/* Content below image */}
                      <div className="p-5">
                        {/* User info */}
                        <div className="mb-3 flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="border-opacity-70 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                              <span className="text-2xl">{avatarEmoji}</span>
                            </div>
                          </div>{" "}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center space-x-2">
                              <p className="text-lg font-semibold text-gray-900">
                                {displayName}
                              </p>
                              {kudos.hidden && (
                                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 opacity-80">
                              {formatDistanceToNow(new Date(kudos.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {session && (
                            <div className="flex-shrink-0">
                              <AdminActionsDropdown
                                kudosId={kudos.id}
                                kudosUserId={kudos.user.id}
                                isHidden={kudos.hidden}
                              />
                            </div>
                          )}
                        </div>

                        {/* Message */}
                        <div className="bg-opacity-40 border-opacity-30 rounded-xl border border-white bg-white p-4 shadow-sm">
                          <p className="leading-relaxed whitespace-pre-wrap text-gray-900">
                            {kudos.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}{" "}
              {/* Existing kudos */}
              {allKudos.map((kudos) => {
                const images = kudos.images
                  ? (JSON.parse(kudos.images) as string[])
                  : [];

                // Get Christmas-themed anonymous identity
                const christmasIdentity = getChristmasIdentity(kudos.user.id);
                const displayName = christmasIdentity.name;
                const avatarEmoji = christmasIdentity.avatar;

                return (
                  <div
                    key={kudos.id}
                    className={`mb-6 break-inside-avoid ${images.length > 0 ? "w-full md:col-span-2 lg:col-span-3" : ""}`}
                  >
                    <div
                      className={`${christmasIdentity.color} border-opacity-50 overflow-hidden rounded-2xl border border-white shadow-sm transition-shadow hover:shadow-md`}
                    >
                      {/* Purchase context */}
                      {kudos.purchase && (
                        <div className="bg-opacity-50 m-4 mb-3 rounded-lg border-l-4 border-red-400 bg-white p-3">
                          <p className="text-sm text-red-800">
                            🎁 Thanking{" "}
                            <span className="font-medium">
                              {
                                getChristmasIdentity(
                                  kudos.purchase.wishlistAssignment
                                    .wishlistOwner.id,
                                ).name
                              }
                            </span>{" "}
                            for a gift
                          </p>
                        </div>
                      )}{" "}
                      {/* Images at the top */}
                      {images.length > 0 && (
                        <div className="w-full">
                          <ImageCarousel
                            images={images}
                            onZoom={(index) => setLightbox({ images, index })}
                          />
                        </div>
                      )}
                      {/* Content below image */}
                      <div className="p-5">
                        {/* User info */}
                        <div className="mb-3 flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="border-opacity-70 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                              <span className="text-2xl">{avatarEmoji}</span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center space-x-2">
                              <p className="text-lg font-semibold text-gray-900">
                                {displayName}
                              </p>
                              {kudos.hidden && (
                                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 opacity-80">
                              {formatDistanceToNow(new Date(kudos.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {session && (
                            <div className="flex-shrink-0">
                              <AdminActionsDropdown
                                kudosId={kudos.id}
                                kudosUserId={kudos.user.id}
                                isHidden={kudos.hidden}
                              />
                            </div>
                          )}
                        </div>

                        {/* Message */}
                        <div className="bg-opacity-40 border-opacity-30 rounded-xl border border-white bg-white p-4 shadow-sm">
                          <p className="leading-relaxed whitespace-pre-wrap text-gray-900">
                            {kudos.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightbox && (
          <LightboxModal
            images={lightbox.images}
            initialIndex={lightbox.index}
            onClose={() => setLightbox(null)}
          />
        )}

        {/* Intersection Observer Target & Loading Indicator */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="p-4 text-center">
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="text-sm">Loading more kudos...</span>
              </div>
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="rounded-md px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                Load more kudos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KudosFeed;

// Animation for new kudos
export const KudosFeedAnimations = () => (
  <style jsx global>{`
    @keyframes fade-in-slide {
      0% {
        opacity: 0;
        transform: translateY(-32px);
      }
      60% {
        opacity: 1;
        transform: translateY(4px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-fade-in-slide {
      animation: fade-in-slide 1.1s cubic-bezier(0.22, 1, 0.36, 1);
    }
  `}</style>
);
