"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";
import type { RouterOutputs } from "~/trpc/react";
import { AdminActionsDropdown } from "./admin-actions-dropdown";
import { ShareSheet, type ShareRequest } from "./share/share-sheet";

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

// Consistent anonymous Christmas name for a user ID
const getChristmasIdentity = (userId: string) => {
  // Create a simple hash from the user ID for consistency
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const nameIndex = Math.abs(hash) % CHRISTMAS_NAMES.length;

  return {
    name: CHRISTMAS_NAMES[nameIndex]!,
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
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null);
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
      return `No kudos in ${requestedName} yet, showing ${actualName} kudos instead.`;
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
      <section ref={feedRef} aria-busy="true" className={`w-full ${className}`}>
        <div className="bg-night-raised mb-6 h-9 w-48 animate-pulse rounded" />
        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="label-stock p-5 opacity-70"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {i % 3 === 0 && (
                <div className="animate-skeleton-pulse bg-label-shade mb-4 aspect-[4/3] rounded" />
              )}
              <div className="animate-skeleton-pulse bg-label-shade mb-3 h-4 w-1/2 rounded" />
              <div className="animate-skeleton-pulse bg-label-shade mb-2 h-3 w-full rounded" />
              <div className="animate-skeleton-pulse bg-label-shade h-3 w-4/5 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`label-stock w-full p-6 text-center ${className}`}>
        <p className="text-ink font-semibold">
          The kudos feed didn&apos;t load.
        </p>
        <p className="text-ink-soft mt-1 text-sm">{error.message}</p>
      </section>
    );
  }

  const renderPostcard = (kudos: Kudos, isNew: boolean) => {
    const images = kudos.images ? (JSON.parse(kudos.images) as string[]) : [];
    const identity = getChristmasIdentity(kudos.user.id);
    return (
      <article
        key={kudos.id}
        className={`label-stock overflow-hidden ${isNew ? "animate-fade-in-slide" : ""}`}
        style={isNew ? { animationDuration: "1.1s" } : undefined}
      >
        {images.length > 0 && (
          <ImageCarousel
            images={images}
            onZoom={(index) => setLightbox({ images, index })}
          />
        )}
        <div className="p-5">
          <p className="text-ink leading-relaxed whitespace-pre-wrap">
            {kudos.message}
          </p>
          <footer className="border-rule mt-4 flex items-end justify-between gap-3 border-t pt-3">
            <div className="min-w-0">
              <p className="font-expanded text-ink truncate text-sm font-bold">
                {identity.name}
                {kudos.hidden && (
                  <span className="label-caps bg-post-tint text-post-deep ml-2 rounded-sm px-1.5 py-0.5">
                    Hidden
                  </span>
                )}
              </p>
              <p className="text-ink-soft text-xs">
                {kudos.purchase && (
                  <>
                    Thanking{" "}
                    {
                      getChristmasIdentity(
                        kudos.purchase.wishlistAssignment.wishlistOwner.id,
                      ).name
                    }{" "}
                    for a gift ·{" "}
                  </>
                )}
                <time dateTime={new Date(kudos.createdAt).toISOString()}>
                  {formatDistanceToNow(new Date(kudos.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {session?.user?.id === kudos.user.id && !kudos.hidden && (
                <button
                  type="button"
                  onClick={() =>
                    setShareRequest({ kind: "thanks", kudosId: kudos.id })
                  }
                  className="text-post min-h-9 px-2 text-sm font-semibold underline-offset-4 hover:underline"
                >
                  Share
                </button>
              )}
              {session && (
                <AdminActionsDropdown
                  kudosId={kudos.id}
                  kudosUserId={kudos.user.id}
                  isHidden={kudos.hidden}
                />
              )}
            </div>
          </footer>
        </div>
      </article>
    );
  };

  return (
    <section
      ref={feedRef}
      aria-labelledby="kudos-heading"
      className={`w-full ${className}`}
    >
      <ShareSheet
        request={shareRequest}
        onClose={() => setShareRequest(null)}
      />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="kudos-heading"
            className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase"
          >
            Thank-you post
          </h2>
          <p className="text-frost-soft mt-2">
            Kudos from people whose parcels arrived.
          </p>
        </div>

        {session && (
          <div
            role="tablist"
            aria-label="Kudos from"
            className="rounded-label border-frost/25 flex border p-1"
          >
            {(["department", "domain", "site"] as ScopeType[]).map((scope) => (
              <button
                key={scope}
                role="tab"
                aria-selected={currentScope === scope}
                onClick={() => setSelectedScope(scope)}
                className={`min-h-9 flex-1 rounded-sm px-3 text-sm font-semibold transition-colors ${
                  currentScope === scope
                    ? "bg-label text-ink"
                    : "text-frost-soft hover:text-frost"
                }`}
                title={getScopeDescription(scope)}
              >
                {getScopeDisplayName(scope)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {getFallbackMessage() && (
          <p className="text-frost-soft mb-4 text-sm">{getFallbackMessage()}</p>
        )}

        {allKudos.length === 0 && newKudos.length === 0 ? (
          <div className="rounded-label border-frost/30 border border-dashed p-10 text-center">
            <p className="font-expanded text-frost text-xl font-bold">
              No thank-yous yet
            </p>
            <p className="text-frost-soft mt-2">
              When someone&apos;s gift arrives, their kudos note will be posted
              here.
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {newKudos.map((kudos) => renderPostcard(kudos, true))}
            {allKudos.map((kudos) => renderPostcard(kudos, false))}
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
              <div className="text-frost-soft flex items-center justify-center space-x-2">
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
                className="btn-quiet text-frost"
              >
                Load more kudos
              </button>
            )}
          </div>
        )}
      </div>
    </section>
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
