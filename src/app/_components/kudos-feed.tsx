"use client";
import React, { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";

interface KudosFeedProps {
  className?: string;
}

interface ImageModalProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

interface ImageCarouselProps {
  images: string[];
  onImageClick: (index: number) => void;
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

// Image Modal Component
const ImageModal: React.FC<ImageModalProps> = ({ 
  images, 
  currentIndex, 
  isOpen, 
  onClose, 
  onNext, 
  onPrev 
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative max-w-4xl max-h-screen p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image */}
        <img
          src={getProxyImageUrl(images[currentIndex]!)}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg"
          onError={handleImageError}
        />

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
};

// Image Carousel Component
const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      handleNext();
    } else {
      handlePrev();
    }
  };

  if (images.length === 0) return null;  if (images.length === 1) {
    return (
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg aspect-square flex-shrink-0">
        <img
          src={getProxyImageUrl(images[0]!)}
          alt="Kudos image"
          className="w-full h-full object-cover rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          onClick={() => onImageClick(0)}
          onError={handleImageError}
        />
      </div>
    );
  }  return (
    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg aspect-square flex-shrink-0">
      <img
        src={getProxyImageUrl(images[currentIndex]!)}
        alt={`Image ${currentIndex + 1} of ${images.length}`}
        className="w-full h-full object-cover rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
        onClick={() => onImageClick(currentIndex)}
        onError={handleImageError}
      />
      
      {/* Navigation dots */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>

      {/* Swipe overlay for mobile */}
      <div className="absolute inset-0 flex">
        <div 
          className="w-1/2 h-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        />
        <div 
          className="w-1/2 h-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        />
      </div>      {/* Image counter */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1 rounded">
        {currentIndex + 1}/{images.length}
      </div>
    </div>
  );
};

export const KudosFeed: React.FC<KudosFeedProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const [selectedScope, setSelectedScope] = useState<ScopeType | null>(null);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalCurrentIndex, setModalCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Modal handlers
  const openModal = (images: string[], startIndex: number = 0) => {
    setModalImages(images);
    setModalCurrentIndex(startIndex);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalImages([]);
    setModalCurrentIndex(0);
  };

  const nextModalImage = () => {
    setModalCurrentIndex((prev) => (prev + 1) % modalImages.length);
  };

  const prevModalImage = () => {
    setModalCurrentIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length);
  };

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
    <>
      {/* Image Modal */}
      <ImageModal
        images={modalImages}
        currentIndex={modalCurrentIndex}
        isOpen={isModalOpen}
        onClose={closeModal}
        onNext={nextModalImage}
        onPrev={prevModalImage}
      />

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
            <div className="space-y-4 p-6">
              {allKudos.map((kudos) => {
                const images = kudos.images ? JSON.parse(kudos.images) as string[] : [];
                
                // Get Christmas-themed anonymous identity
                const christmasIdentity = getChristmasIdentity(kudos.user.id);
                const displayName = christmasIdentity.name;
                const avatarEmoji = christmasIdentity.avatar;

                return (
                  <div key={kudos.id} className="bg-gradient-to-r from-red-50 to-green-50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-red-100">
                    {/* Purchase context */}
                    {kudos.purchase && (
                      <div className="mb-3 p-3 bg-red-100 rounded-lg border-l-4 border-red-400">
                        <p className="text-sm text-red-800">
                          🎁 Thanking{" "}
                          <span className="font-medium">
                            {getChristmasIdentity(kudos.purchase.wishlistAssignment.wishlistOwner.id).name}
                          </span>{" "}
                          for a gift
                        </p>
                      </div>
                    )}                    <div className="flex flex-col lg:flex-row items-start lg:space-x-6 space-y-4 lg:space-y-0">
                      {/* Left side: Avatar, name, message */}
                      <div className="flex-1 min-w-0 w-full lg:w-1/2">
                        {/* User info */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-red-200">
                              <span className="text-2xl">
                                {avatarEmoji}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <p className="text-lg font-semibold text-gray-900">{displayName}</p>
                              {kudos.user.department && (
                                <span className="text-xs text-red-700 bg-red-200 px-2 py-1 rounded-full font-medium">
                                  {kudos.user.department.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(kudos.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {/* Message */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{kudos.message}</p>
                        </div>
                      </div>

                      {/* Right side: Images */}
                      {images.length > 0 && (
                        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
                          <ImageCarousel
                            images={images}
                            onImageClick={(index) => openModal(images, index)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
    </>
  );
};

export default KudosFeed;
