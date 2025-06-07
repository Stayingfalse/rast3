"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";

interface KudosFeedProps {
  className?: string;
}

interface ImageCarouselProps {
  images: string[];
}

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
  "bg-red-200",
  "bg-green-200",
  "bg-red-300",
  "bg-green-300",
  "bg-emerald-200",
  "bg-rose-200",
  "bg-lime-200",
  "bg-pink-200",
  "bg-teal-200",
  "bg-amber-200",
  "bg-orange-200",
  "bg-yellow-200",
  "bg-indigo-200",
  "bg-purple-200",
  "bg-cyan-200",
  "bg-slate-200",
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

// Image Carousel Component with expand/collapse functionality
const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageClick = () => {
    setIsExpanded(!isExpanded);
  };

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div
        className={`relative w-full transition-all duration-300 ${isExpanded ? "aspect-auto" : "aspect-square"}`}
      >
        <Image
          src={getProxyImageUrl(images[0]!)}
          alt="Kudos image"
          fill
          className={`cursor-pointer rounded-lg shadow-sm transition-shadow hover:shadow-md ${
            isExpanded ? "object-contain" : "object-cover"
          }`}
          onClick={handleImageClick}
          onError={handleImageError}
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        {/* Expand/collapse indicator overlay */}
        <div className="bg-opacity-20 absolute inset-0 flex items-center justify-center rounded-lg bg-black opacity-0 transition-opacity hover:opacity-100">
          <div className="bg-opacity-90 rounded-full bg-white p-2">
            <svg
              className="h-6 w-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isExpanded
                    ? "M6 18L18 6M6 6l12 12"
                    : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                }
              />
            </svg>
          </div>
        </div>
        {/* Click hint text */}
        <div className="bg-opacity-50 absolute bottom-2 left-2 rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100">
          {isExpanded ? "Click to collapse" : "Click to expand"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full transition-all duration-300 ${isExpanded ? "aspect-auto" : "aspect-square"}`}
    >
      <Image
        src={getProxyImageUrl(images[currentIndex]!)}
        alt={`Image ${currentIndex + 1} of ${images.length}`}
        fill
        className={`cursor-pointer rounded-lg shadow-sm transition-shadow hover:shadow-md ${
          isExpanded ? "object-contain" : "object-cover"
        }`}
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
            className={`h-2 w-2 rounded-full transition-colors sm:h-3 sm:w-3 ${
              index === currentIndex ? "bg-white" : "bg-opacity-50 bg-white"
            }`}
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
          {/* Expand/collapse indicator overlay */}
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
                d={
                  isExpanded
                    ? "M6 18L18 6M6 6l12 12"
                    : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                }
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
        {isExpanded ? "Click center to collapse" : "Click center to expand"}
      </div>
    </div>
  );
};

export const KudosFeed: React.FC<KudosFeedProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const [selectedScope, setSelectedScope] = useState<ScopeType | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get recommended scope
  const { data: recommendedScope } = api.kudos.getRecommendedScope.useQuery();

  // Use recommended scope if no scope is selected
  const currentScope = selectedScope ?? recommendedScope ?? "site";

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

  const allKudos = data?.pages.flatMap((page) => page.items) ?? [];

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
      <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="border-b pb-4">
                <div className="mb-3 flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="space-y-1">
                    <div className="h-4 w-24 rounded bg-gray-200"></div>
                    <div className="h-3 w-16 rounded bg-gray-200"></div>
                  </div>
                </div>
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200"></div>
              </div>
            ))}
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
    <div className={`rounded-lg bg-white shadow-md ${className}`}>
      {/* Header with scope selection */}
      <div className="border-b p-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Kudos Feed</h2>

        {/* Scope Selection Tabs */}
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

        {session && recommendedScope && !selectedScope && (
          <p className="mt-2 text-sm text-gray-500">
            Showing {getScopeDisplayName(recommendedScope).toLowerCase()} feed
            by default
          </p>
        )}

        {!session && (
          <p className="mt-2 text-sm text-gray-500">
            Showing all kudos. Sign in to see department and domain-specific
            feeds.
          </p>
        )}
      </div>

      {/* Feed Content */}
      <div>
        {allKudos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="mx-auto mb-4 h-16 w-16 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-medium">No kudos yet</p>
            <p className="text-sm">Be the first to share some appreciation!</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Masonry Grid Container */}
            <div className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3">
              {allKudos.map((kudos) => {
                const images = kudos.images
                  ? (JSON.parse(kudos.images) as string[])
                  : [];

                // Get Christmas-themed anonymous identity
                const christmasIdentity = getChristmasIdentity(kudos.user.id);
                const displayName = christmasIdentity.name;
                const avatarEmoji = christmasIdentity.avatar;

                return (
                  <div key={kudos.id} className="mb-6 break-inside-avoid">
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
                          <div className="aspect-square">
                            <ImageCarousel images={images} />
                          </div>
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
                            </div>
                            <p className="text-sm text-gray-700 opacity-80">
                              {formatDistanceToNow(new Date(kudos.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
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
