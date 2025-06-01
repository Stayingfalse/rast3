"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";
import { useQueryClient } from '@tanstack/react-query';
import type { RouterOutputs } from "~/trpc/react";

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

const LightboxModal: React.FC<LightboxModalProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" ref={backdropRef} onClick={onClose}>
      <div className="relative max-w-3xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 text-white text-2xl bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-80 transition z-10">&times;</button>
        <div className="w-full flex items-center justify-center">
          <Image
            src={getProxyImageUrl(images[currentIndex]!)}
            alt={`Zoomed image ${currentIndex + 1}`}
            width={900}
            height={900}
            className="object-contain rounded-lg max-h-[80vh] max-w-full bg-black"
            onError={handleImageError}
            priority
          />
        </div>
        {images.length > 1 && (
          <div className="flex items-center justify-center mt-4 space-x-4">
            <button onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)} className="text-white text-2xl bg-black bg-opacity-40 rounded-full p-2 hover:bg-opacity-80 transition">&#8592;</button>
            <span className="text-white text-lg">{currentIndex + 1} / {images.length}</span>
            <button onClick={() => setCurrentIndex((i) => (i + 1) % images.length)} className="text-white text-2xl bg-black bg-opacity-40 rounded-full p-2 hover:bg-opacity-80 transition">&#8594;</button>
          </div>
        )}
      </div>
    </div>
  );
}

type ScopeType = "department" | "domain" | "site";

// Christmas-themed names for anonymization
const CHRISTMAS_NAMES = [
  "Jingle Bell", "Holly Berry", "Candy Cane", "Snow Flake", "Winter Star",
  "Frost Bite", "Pine Needle", "Sugar Plum", "Ginger Bread", "Icicle Drop",
  "Mistletoe", "Nutcracker", "Tinsel Shine", "Cocoa Bean", "Peppermint",
  "Sleigh Bell", "Reindeer", "Snowball", "Eggnog", "Christmas Tree",
  "Angel Wing", "Star Light", "Gift Wrap", "Ribbon Bow", "Ornament",
  "Candy Mint", "Hot Cocoa", "Fire Place", "Wreath Maker", "Cookie Baker",
  "Snow Angel", "Ice Crystal", "Winter Moon", "Frost King", "Snow Queen",
  "Jingle Jangle", "Merry Maker", "Joy Bringer", "Hope Bearer", "Peace Keeper",
  "Love Giver", "Kind Heart", "Gentle Soul", "Warm Hug", "Sweet Smile",
  "Bright Light", "Happy Helper", "Cheerful Elf", "Magic Maker", "Wonder Worker"
];

// Christmas-themed emojis for avatars
const CHRISTMAS_AVATARS = [
  "🎅", "🤶", "🎄", "⭐", "❄️", "🎁", "🔔", "🕯️", "🍪", "🥛",
  "🦌", "⛄", "🎊", "🎉", "✨", "🌟", "🎀", "🧑‍🎄", "🎯", "🎪",
  "🍭", "🧤", "🧣", "👑", "💎", "🎭", "🎨", "🎵", "🎶", "💫"
];

// Christmas-themed colors for user backgrounds - more vibrant for full cards
const CHRISTMAS_COLORS = [
    // Classic Christmas reds & greens
    "bg-red-600",      // Santa red
    "bg-green-600",    // Pine green
    "bg-emerald-500",  // Emerald
    "bg-lime-500",     // Holly green
    "bg-rose-500",     // Holly berry red
    "bg-green-800",    // Deep pine
    "bg-red-800",      // Deep red

    // Snowy & frosty blues
    "bg-blue-500",     // Winter blue
    "bg-sky-400",      // Frost blue
    "bg-cyan-400",     // Icy blue
    "bg-blue-800",     // Night sky

    // Golds & yellows (bells, stars, lights)
    "bg-yellow-400",   // Star yellow
    "bg-amber-400",    // Golden bell
    "bg-yellow-600",   // Warm gold

    // Accents: festive purples, pinks, and silver
    "bg-fuchsia-500",  // Festive pink
    "bg-purple-500",   // Royal purple
    "bg-indigo-500",   // Midnight
    "bg-gray-200",     // Snow
    "bg-white",        // Pure snow
    "bg-slate-400",    // Silver tinsel

    // Orange for gingerbread/cookies
    "bg-orange-400",   // Gingerbread
    "bg-orange-600",   // Toasty cookie

    // Extra: teal for icy accents
    "bg-teal-400",     // Icy teal
];

// Function to generate consistent Christmas name, avatar, and color based on user ID
const getChristmasIdentity = (userId: string) => {
  // Create a simple hash from the user ID for consistency
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const nameIndex = Math.abs(hash) % CHRISTMAS_NAMES.length;
  const avatarIndex = Math.abs(hash >> 8) % CHRISTMAS_AVATARS.length;
  const colorIndex = Math.abs(hash >> 16) % CHRISTMAS_COLORS.length;
  
  return {
    name: CHRISTMAS_NAMES[nameIndex]!,
    avatar: CHRISTMAS_AVATARS[avatarIndex]!,
    color: CHRISTMAS_COLORS[colorIndex]!
  };
};

// Image Carousel Component with max height enforced
const ImageCarousel: React.FC<ImageCarouselProps & { onZoom?: (index: number) => void }> = ({ images, onZoom }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  const handleImageClick = () => {
    if (onZoom) onZoom(currentIndex);
  };

  if (images.length === 0) return null;

  // Single image: no fixed aspect, but limit height
  if (images.length === 1) {
    return (
      <div className="relative w-full flex justify-center items-center">
        <div className="w-full max-w-full min-h-[180px] max-h-[400px] rounded-lg bg-black flex items-center justify-center overflow-hidden">
          <Image
            src={getProxyImageUrl(images[0]!)}
            alt="Kudos image"
            fill
            className="cursor-pointer shadow-sm hover:shadow-md transition-shadow rounded-lg object-contain max-h-[400px]"
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
    <div className="relative w-full flex justify-center items-center">
      <div className="relative w-full aspect-square min-h-[180px] max-h-[400px] rounded-lg bg-black flex items-center justify-center overflow-hidden">
        <Image
          src={getProxyImageUrl(images[currentIndex]!)}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          fill
          className="cursor-pointer shadow-sm hover:shadow-md transition-shadow rounded-lg object-contain max-h-[400px]"
          onClick={handleImageClick}
          onError={handleImageError}
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        {/* Navigation dots */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`}
            />
          ))}
        </div>
        {/* Swipe overlay for mobile - with visual indicators */}
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full cursor-pointer group flex items-center justify-start pl-2" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full p-1">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>
          <div className="w-1/3 h-full cursor-pointer group flex items-center justify-center" onClick={handleImageClick}>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </div>
          <div className="w-1/3 h-full cursor-pointer group flex items-center justify-end pr-2" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full p-1">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
        {/* Image counter */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1 rounded z-10">
          {currentIndex + 1}/{images.length}
        </div>
        {/* Click hint text */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity z-10">
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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [isFeedInView, setIsFeedInView] = useState(false);
  const [newKudos, setNewKudos] = useState<Kudos[]>([]);

  const queryClient = useQueryClient();

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
    }
  );

  // Memoize allKudos to avoid useEffect dependency warning
  const allKudos = React.useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

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
      }
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
      { threshold: 0.1 }
    );
    const ref = feedRef.current;
    if (ref) observer.observe(ref);
    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, []);
  // Poll for new kudos when feed is in view
  useEffect(() => {
    if (!isFeedInView) return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await queryClient.fetchQuery({
            queryKey: ["kudos.getFeed", { scope: currentScope, limit: 5 }],
            staleTime: 0
          });
          
          // Type guard to check if res has the expected structure
          if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
            const latest = res.items as Kudos[];
            if (latest.length && allKudos.length) {
              const newOnes = latest.filter(k => !allKudos.some(a => a.id === k.id));
              if (newOnes.length) {
                setNewKudos((prev) => [...newOnes, ...prev]);
              }
            }
          }
        } catch {}
      })();
    }, 10000);
    return () => clearInterval(interval);
  }, [isFeedInView, currentScope, allKudos, queryClient]);

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
  };  if (isLoading) {
    return (
      <div ref={feedRef} className={`rounded-lg ${className}`}>
        {/* Header skeleton */}
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-skeleton-shimmer"></div>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div 
                  key={i} 
                  className="flex-1 h-8 bg-gray-200 rounded-md animate-skeleton-shimmer"
                  style={{ animationDelay: `${i * 100}ms` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading cards that match the actual feed layout */}
        <div className="p-6">
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {Array.from({ length: 6 }, (_, i) => {
              const hasImage = i % 3 === 0; // Some cards have images
              const colorIndex = i % CHRISTMAS_COLORS.length;
              const bgColor = CHRISTMAS_COLORS[colorIndex];
              
              return (
                <div
                  key={i}
                  className={`break-inside-avoid mb-6 animate-skeleton-pulse ${
                    hasImage ? 'md:col-span-2 lg:col-span-3 w-full' : ''
                  }`}
                  style={{
                    animationDelay: `${i * 150}ms`,
                  }}
                >
                  <div className={`${bgColor} rounded-2xl shadow-sm border border-white border-opacity-50 overflow-hidden opacity-60`}>
                    {/* Image placeholder for some cards */}
                    {hasImage && (
                      <div className="w-full aspect-square min-h-[180px] max-h-[400px] bg-gray-300 animate-skeleton-shimmer"></div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      {/* User info skeleton */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-white border-opacity-70">
                            <div className="w-6 h-6 bg-gray-200 rounded animate-skeleton-shimmer"></div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-32 animate-skeleton-shimmer" style={{ animationDelay: '200ms' }}></div>
                          <div className="h-3 bg-gray-200 rounded w-20 animate-skeleton-shimmer" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>

                      {/* Message skeleton */}
                      <div className="bg-white bg-opacity-40 rounded-xl p-4 shadow-sm border border-white border-opacity-30">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-full animate-skeleton-shimmer" style={{ animationDelay: '100ms' }}></div>
                          <div className="h-4 bg-gray-200 rounded w-4/5 animate-skeleton-shimmer" style={{ animationDelay: '200ms' }}></div>
                          <div className="h-4 bg-gray-200 rounded w-3/5 animate-skeleton-shimmer" style={{ animationDelay: '300ms' }}></div>
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
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Failed to load kudos feed</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef} className={`rounded-lg ${className}`}> 
      {/* Header with scope selection */}      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Kudos Feed</h2>
        
        {session && (
          /* Scope Selection Tabs */
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
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
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
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
        {allKudos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-lg font-medium">No kudos yet</p>
            <p className="text-sm">Be the first to share some appreciation!</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Masonry Grid Container */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {/* Animated new kudos at the top */}
              {newKudos.map((kudos) => {
                const images = kudos.images ? JSON.parse(kudos.images) as string[] : [];
                const christmasIdentity = getChristmasIdentity(kudos.user.id);
                const displayName = christmasIdentity.name;
                const avatarEmoji = christmasIdentity.avatar;
                return (
                  <div
                    key={kudos.id}
                    className={`break-inside-avoid mb-6 animate-fade-in-slide ${images.length > 0 ? 'md:col-span-2 lg:col-span-3 w-full' : ''}`}
                    style={{ animationDuration: '1.1s' }}
                  >
                    <div className={`${christmasIdentity.color} rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-white border-opacity-50 overflow-hidden`}>
                      {/* Purchase context */}
                      {kudos.purchase && (
                        <div className="m-4 mb-3 p-3 bg-white bg-opacity-50 rounded-lg border-l-4 border-red-400">
                          <p className="text-sm text-red-800">
                            🎁 Thanking{" "}
                            <span className="font-medium">
                              {getChristmasIdentity(kudos.purchase.wishlistAssignment.wishlistOwner.id).name}
                            </span>{" "}
                            for a gift
                          </p>
                        </div>
                      )}
                      {/* Images at the top */}
                      {images.length > 0 && (
                        <div className="w-full">
                          <ImageCarousel images={images} onZoom={(index) => setLightbox({ images, index })} />
                        </div>
                      )}

                      {/* Content below image */}
                      <div className="p-5">
                        {/* User info */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-white border-opacity-70">
                              <span className="text-2xl">
                                {avatarEmoji}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <p className="text-lg font-semibold text-gray-900">{displayName}</p>
                            </div>
                            <p className="text-sm text-gray-700 opacity-80">
                              {formatDistanceToNow(new Date(kudos.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {/* Message */}
                        <div className="bg-white bg-opacity-40 rounded-xl p-4 shadow-sm border border-white border-opacity-30">
                          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{kudos.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Existing kudos */}
              {allKudos.map((kudos) => {
                const images = kudos.images ? JSON.parse(kudos.images) as string[] : [];
                
                // Get Christmas-themed anonymous identity
                const christmasIdentity = getChristmasIdentity(kudos.user.id);
                const displayName = christmasIdentity.name;
                const avatarEmoji = christmasIdentity.avatar;

                return (
                  <div key={kudos.id} className={`break-inside-avoid mb-6 ${images.length > 0 ? 'md:col-span-2 lg:col-span-3 w-full' : ''}`}>
                    <div className={`${christmasIdentity.color} rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-white border-opacity-50 overflow-hidden`}>
                      {/* Purchase context */}
                      {kudos.purchase && (
                        <div className="m-4 mb-3 p-3 bg-white bg-opacity-50 rounded-lg border-l-4 border-red-400">
                          <p className="text-sm text-red-800">
                            🎁 Thanking{" "}
                            <span className="font-medium">
                              {getChristmasIdentity(kudos.purchase.wishlistAssignment.wishlistOwner.id).name}
                            </span>{" "}
                            for a gift
                          </p>
                        </div>
                      )}                      {/* Images at the top */}
                      {images.length > 0 && (
                        <div className="w-full">
                          <ImageCarousel images={images} onZoom={(index) => setLightbox({ images, index })} />
                        </div>
                      )}

                      {/* Content below image */}
                      <div className="p-5">
                        {/* User info */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-white border-opacity-70">
                              <span className="text-2xl">
                                {avatarEmoji}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <p className="text-lg font-semibold text-gray-900">{displayName}</p>
                            </div>
                            <p className="text-sm text-gray-700 opacity-80">
                              {formatDistanceToNow(new Date(kudos.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {/* Message */}
                        <div className="bg-white bg-opacity-40 rounded-xl p-4 shadow-sm border border-white border-opacity-30">
                          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{kudos.message}</p>
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
          <div 
            ref={loadMoreRef}
            className="p-4 text-center"
          >
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span className="text-sm">Loading more kudos...</span>
              </div>
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="text-sm text-blue-600 hover:text-blue-700 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors"
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
