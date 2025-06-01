"use client";
import React, { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";

interface KudosFeedProps {
  className?: string;
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

// Function to generate consistent Christmas name and avatar based on user ID
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
  
  return {
    name: CHRISTMAS_NAMES[nameIndex]!,
    avatar: CHRISTMAS_AVATARS[avatarIndex]!
  };
};

export const KudosFeed: React.FC<KudosFeedProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const [selectedScope, setSelectedScope] = useState<ScopeType | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get recommended scope
  const { data: recommendedScope } = api.kudos.getRecommendedScope.useQuery();
  
  // Use recommended scope if no scope is selected
  const currentScope = selectedScope || recommendedScope || "site";

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

  const allKudos = data?.pages.flatMap((page) => page.items) ?? [];

  // Intersection Observer for automatic loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
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
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-b pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
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
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header with scope selection */}
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Kudos Feed</h2>
          {/* Scope Selection Tabs */}
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
        
        {session && recommendedScope && !selectedScope && (
          <p className="text-sm text-gray-500 mt-2">
            Showing {getScopeDisplayName(recommendedScope).toLowerCase()} feed by default
          </p>
        )}
        
        {!session && (
          <p className="text-sm text-gray-500 mt-2">
            Showing all kudos. Sign in to see department and domain-specific feeds.
          </p>
        )}
      </div>      {/* Feed Content */}
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
          <div className="divide-y divide-gray-100">            {allKudos.map((kudos) => {
              const images = kudos.images ? JSON.parse(kudos.images) as string[] : [];
              
              // Get Christmas-themed anonymous identity
              const christmasIdentity = getChristmasIdentity(kudos.user.id);
              const displayName = christmasIdentity.name;
              const avatarEmoji = christmasIdentity.avatar;

              return (
                <div key={kudos.id} className="p-6">
                  {/* User info */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-2xl">
                          {avatarEmoji}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        {kudos.user.department && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {kudos.user.department.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(kudos.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>                  {/* Purchase context */}
                  {kudos.purchase && (
                    <div className="mb-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <p className="text-sm text-red-800">
                        🎁 Thanking{" "}
                        <span className="font-medium">
                          {getChristmasIdentity(kudos.purchase.wishlistAssignment.wishlistOwner.id).name}
                        </span>{" "}
                        for a gift
                      </p>
                    </div>
                  )}

                  {/* Message */}
                  <div className="mb-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{kudos.message}</p>
                  </div>                  {/* Images */}
                  {images.length > 0 && (
                    <div className="grid gap-2 mb-3">
                      {images.length === 1 ? (
                        <div className="max-w-md">
                          <img
                            src={getProxyImageUrl(images[0]!)}
                            alt="Kudos image"
                            className="w-full h-auto rounded-lg shadow-sm"
                            onError={handleImageError}
                          />
                        </div>
                      ) : (
                        <div className={`grid gap-2 ${images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} max-w-2xl`}>
                          {images.slice(0, 4).map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={getProxyImageUrl(image)}
                                alt={`Kudos image ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg shadow-sm"
                                onError={handleImageError}
                              />
                              {index === 3 && images.length > 4 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    +{images.length - 4} more
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}        {/* Intersection Observer Target & Loading Indicator */}
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
