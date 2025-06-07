"use client";

import {
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { api, type RouterOutputs } from "~/trpc/react";
import { Preloader } from "./preloader";

type WishlistAssignment = RouterOutputs["wishlist"]["getMyAssignments"][number];

export function WishlistManager() {
  const { data: sessionData } = useSession();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(
    null,
  );
  const [modalType, setModalType] = useState<
    "purchase" | "report" | "no-assignments" | null
  >(null);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [reportType, setReportType] = useState<
    "NO_ITEMS" | "DOESNT_EXIST" | "NO_ADDRESS" | "OTHER"
  >("NO_ITEMS");
  const [reportDescription, setReportDescription] = useState("");
  const [strangerModal, setStrangerModal] = useState(false);

  // Check if user has completed profile - only run when authenticated
  const { data: userProfile } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user },
  );

  // Only show queries if user is authenticated and has completed profile
  const shouldShowWishlist =
    !!sessionData?.user && userProfile?.profileCompleted;

  // Queries - only run if user should see wishlist
  const {
    data: assignments,
    isLoading,
    refetch,
  } = api.wishlist.getMyAssignments.useQuery(undefined, {
    enabled: shouldShowWishlist,
  });
  const { data: stats, refetch: refetchStats } =
    api.wishlist.getAssignmentStats.useQuery(undefined, {
      enabled: shouldShowWishlist,
    });

  // Mutations - must be called before any conditional returns
  const requestInitial = api.wishlist.requestInitialAssignments.useMutation({
    onSuccess: () => {
      void refetch();
      void refetchStats();
    },
    onError: (error) => {
      if (error.message.includes("No eligible wishlists available")) {
        setModalType("no-assignments");
      }
    },
  });
  const requestAdditional =
    api.wishlist.requestAdditionalAssignments.useMutation({
      onSuccess: () => {
        void refetch();
        void refetchStats();
      },
      onError: (error) => {
        if (error.message.includes("No additional wishlists available")) {
          setModalType("no-assignments");
        }
      },
    });

  const requestCrossDepartment =
    api.wishlist.requestCrossDepartmentAssignments.useMutation({
      onSuccess: () => {
        void refetch();
        void refetchStats();
        setModalType(null);
      },
    });
  const markPurchase = api.wishlist.markPurchase.useMutation({
    onSuccess: () => {
      void refetch();
      setSelectedAssignment(null);
      setModalType(null);
      setPurchaseNotes("");
    },
  });

  const reportIssue = api.wishlist.reportIssue.useMutation({
    onSuccess: () => {
      void refetch();
      setSelectedAssignment(null);
      setModalType(null);
      setReportDescription("");
    },
  });

  const clearReport = api.wishlist.clearReport.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const undoPurchase = api.wishlist.undoPurchase.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  // Add cross-domain assignment mutation (must be implemented in backend)
  const requestCrossDomain =
    api.wishlist.requestCrossDomainAssignments?.useMutation({
      onSuccess: () => {
        void refetch();
        void refetchStats();
        setStrangerModal(false);
        setModalType(null);
      },
    });

  // Early return if user is not authenticated - after all hooks
  if (!sessionData?.user) {
    return null; // Don't show anything if not authenticated
  }

  const formatReportType = (type: string) => {
    switch (type) {
      case "NO_ITEMS":
        return "No Items";
      case "DOESNT_EXIST":
        return "Link Doesn&apos;t Work";
      case "NO_ADDRESS":
        return "No Shipping Address";
      case "OTHER":
        return "Other Issue";
      default:
        return type;
    }
  };

  if (!userProfile) {
    return <Preloader message="Santa is sorting your parcels..." />;
  }

  if (!userProfile?.profileCompleted) {
    return (
      <div className="mx-auto mt-8 max-w-2xl p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-yellow-800">
            Complete Your Profile First
          </h2>
          <p className="text-yellow-700">
            Please complete your profile setup to access the Secret Santa
            wishlist system.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Preloader message="Loading your wishlist assignments..." />;
  }

  // Patch: handle cross-department fallback
  const handleCrossDepartment = () => {
    requestCrossDepartment.mutate(
      { count: 1 },
      {
        onError: (error) => {
          if (
            error.message.includes("No cross-department wishlists available")
          ) {
            setStrangerModal(true);
          }
        },
      },
    );
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -24; // adjust if you have a sticky header
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Feature Guide - compact stats, feature boxes below */}
      <div className="mb-6 rounded-xl border border-blue-400/30 bg-blue-600/20 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-center text-xl font-bold text-white">
          🎯 Your Secret Santa Dashboard
        </h3>
        {/* Compact stats line */}
        <div className="mb-6 flex flex-wrap justify-center gap-4 text-base font-medium text-blue-100">
          {stats?.totalUsers !== undefined && (
            <span className="flex items-center gap-1">
              <span className="text-green-200">👥</span> {stats.totalUsers}{" "}
              users
            </span>
          )}
          {stats?.totalLinks !== undefined && (
            <span className="flex items-center gap-1">
              <span className="text-blue-200">🔗</span> {stats.totalLinks}{" "}
              wishlists
            </span>
          )}
          {stats?.totalGiftsSent !== undefined && (
            <span className="flex items-center gap-1">
              <span className="text-pink-200">🎁</span> {stats.totalGiftsSent}{" "}
              gifts sent
            </span>
          )}
          {stats?.totalLinksInDomain !== undefined && (
            <span className="flex items-center gap-1">
              <span className="text-purple-200">🏢</span>{" "}
              {stats.totalLinksInDomain} in your domain
            </span>
          )}
          {stats?.totalLinksInDepartment !== undefined && (
            <span className="flex items-center gap-1">
              <span className="text-cyan-200">🏬</span>{" "}
              {stats.totalLinksInDepartment} in your dept
            </span>
          )}
          {stats?.totalUnallocatedLinks !== undefined && (
            <span className="flex items-center gap-1">
              <span className="text-orange-200">🕵️‍♂️</span>{" "}
              {stats.totalUnallocatedLinks} unallocated
            </span>
          )}
        </div>
        {/* Feature boxes */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Browse & Gift */}
          <button
            type="button"
            onClick={() => scrollToSection("assignments-section")}
            className="group w-full cursor-pointer rounded-lg border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm transition hover:bg-orange-100/10 focus:ring-2 focus:ring-orange-300 focus:outline-none"
          >
            <h4 className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold text-white">
              <ShoppingCartIcon
                className="h-6 w-6 text-orange-300 transition group-hover:text-orange-400"
                aria-hidden="true"
              />
              Browse &amp; Gift
            </h4>
            <p className="text-sm text-blue-100">
              Browse up to <b>3</b> colleague wishlists at a time. Send
              anonymous gifts or request more links when ready!
            </p>
          </button>
          {/* Kudos & Thanks */}
          <button
            type="button"
            onClick={() => scrollToSection("kudos-section")}
            className="group w-full cursor-pointer rounded-lg border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm transition hover:bg-pink-100/10 focus:ring-2 focus:ring-pink-200 focus:outline-none"
          >
            <h4 className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold text-white">
              <ChatBubbleLeftRightIcon
                className="h-6 w-6 text-pink-200 transition group-hover:text-pink-300"
                aria-hidden="true"
              />
              Kudos &amp; Thanks
            </h4>
            <p className="text-sm text-blue-100">
              Share anonymous thank you messages when you receive gifts. Spread
              positivity and Christmas cheer!
            </p>
          </button>
          {/* Help a Stranger */}
          <button
            type="button"
            onClick={() => scrollToSection("assignments-section")}
            className="group w-full cursor-pointer rounded-lg border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm transition hover:bg-blue-100/10 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          >
            <h4 className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold text-white">
              <GlobeAltIcon
                className="h-6 w-6 text-blue-200 transition group-hover:text-blue-300"
                aria-hidden="true"
              />
              Help a Stranger
            </h4>
            <p className="text-sm text-blue-100">
              You can request more assignments after gifting, or help a stranger
              if your company runs out of wishlists.
            </p>
          </button>
        </div>
      </div>
      {/* Request Initial Assignments or Waiting for Users */}
      {(!assignments || assignments.length === 0) &&
      stats &&
      stats.totalLinks < 10 &&
      (stats.totalLinksInDepartment ?? 0) < 2 ? (
        <div
          id="assignments-section"
          className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center shadow-md"
        >
          <h2 className="mb-4 text-2xl font-semibold text-yellow-800">
            Waiting for More Participants
          </h2>
          <p className="mb-4 text-yellow-700">
            There aren&apos;t enough wishlists or participants yet to get
            started. Please check back later when more people have joined and
            set up their profiles!
          </p>
          <div className="mb-2 text-sm text-yellow-700">
            Help spread the word:
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <a
              href={`mailto:?subject=Join%20our%20Secret%20Santa!&body=Sign%20up%20for%20Secret%20Santa%20here:%20${encodeURIComponent(window.location.origin)}`}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              Invite by Email
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Join our Secret Santa! Sign up here: " + window.location.origin)}`}
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on WhatsApp
            </a>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(window.location.origin);
                toast.success("Link copied!");
              }}
              className="rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700"
            >
              Copy Signup Link
            </button>
          </div>
        </div>
      ) : (
        (!assignments || assignments.length === 0) && (
          <div className="rounded-lg bg-gradient-to-r from-red-50 to-green-50 p-6 text-center shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              🎁 Get Started!
            </h2>
            <p className="mb-6 text-gray-600">
              Request your first 3 wishlist assignments to start shopping for
              others!
            </p>
            <button
              onClick={() => requestInitial.mutate()}
              disabled={requestInitial.isPending}
              className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-gray-400"
            >
              {requestInitial.isPending
                ? "Finding wishlists..."
                : "Get My 3 Wishlist Assignments"}
            </button>
          </div>
        )
      )}
      {/* Current Assignments */}
      {assignments && assignments.length > 0 && (
        <div
          id="assignments-section"
          className="rounded-lg bg-white p-6 shadow-md"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              Your Wishlist Assignments ({assignments.length})
            </h2>
            {/* Show 'Try for More Assignments' if <3, else 'Request More' */}
            {assignments.length < 3 ? (
              <button
                onClick={() => requestInitial.mutate()}
                disabled={requestInitial.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-400"
              >
                {requestInitial.isPending
                  ? "Finding..."
                  : "Try for More Assignments"}
              </button>
            ) : (
              <button
                onClick={() => requestAdditional.mutate({ count: 1 })}
                disabled={requestAdditional.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
              >
                {requestAdditional.isPending ? "Finding..." : "Request More"}
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment: WishlistAssignment) => {
              const hasPurchase = !!assignment.purchases;
              const hasReport = assignment.reports.length > 0;
              // Fix: Only treat as stranger if wishlistDomain is defined and different from userDomain, or if either is missing (but not both missing)
              const wishlistDomain = (
                assignment.wishlistOwner as { domain?: string }
              ).domain;
              const wishlistDeptId = assignment.wishlistOwner.department?.id;
              const userDomain = userProfile?.domain;
              const userDeptId = userProfile?.departmentId;
              // Only tag as stranger if both domains are defined and different, or if wishlistDomain is defined and userDomain is missing
              const isStranger =
                (wishlistDomain &&
                  userDomain &&
                  wishlistDomain !== userDomain) ??
                (!userDomain && wishlistDomain);
              const isCrossDept =
                !isStranger &&
                wishlistDomain &&
                userDomain &&
                wishlistDomain === userDomain &&
                wishlistDeptId &&
                userDeptId &&
                wishlistDeptId !== userDeptId;

              return (
                <div
                  key={assignment.id}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    hasPurchase
                      ? "border-green-200 bg-green-50"
                      : hasReport
                        ? "border-yellow-200 bg-yellow-50"
                        : isStranger
                          ? "border-pink-200 bg-pink-50 hover:border-pink-300"
                          : isCrossDept
                            ? "border-purple-200 bg-purple-50 hover:border-purple-300"
                            : "border-gray-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      {isStranger ? (
                        <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-600">
                          🎁 Stranger
                        </span>
                      ) : isCrossDept &&
                        assignment.wishlistOwner.department?.name ? (
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600">
                          📍 {assignment.wishlistOwner.department.name}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hasPurchase && (
                        <span className="text-sm font-medium text-green-600">
                          ✅ Purchased
                        </span>
                      )}
                      {hasReport && !hasPurchase && (
                        <span className="text-sm font-medium text-yellow-600">
                          ⚠️ Reported
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <a
                      href={assignment.wishlistOwner.amazonWishlistUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-lg bg-orange-500 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-orange-600"
                    >
                      🛒 View Wishlist
                    </a>

                    {!hasPurchase && !hasReport && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment.id);
                            setModalType("purchase");
                          }}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-5 w-5"
                          >
                            <path
                              fillRule="evenodd"
                              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Gifted
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment.id);
                            setModalType("report");
                          }}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                          >
                            <path d="M12 2c.38 0 .73.21.9.55l9 16A1 1 0 0 1 21 20H3a1 1 0 0 1-.9-1.45l9-16A1 1 0 0 1 12 2zm0 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-1-6v4a1 1 0 1 0 2 0V9a1 1 0 1 0-2 0z" />
                          </svg>
                          Issue
                        </button>
                      </div>
                    )}

                    {hasPurchase && assignment.purchases && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div>
                            Purchased:{" "}
                            {new Date(
                              assignment.purchases.purchasedAt,
                            ).toLocaleDateString()}
                          </div>
                          {assignment.purchases.notes && (
                            <div className="mt-1 italic">
                              &quot;{assignment.purchases.notes}&quot;
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Using toast with a custom confirmation
                            toast((t) => (
                              <div className="flex flex-col gap-3">
                                <span>Are you sure you want to undo this purchase? This will remove the purchase record.</span>
                                <div className="flex gap-2">
                                  <button
                                    className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                                    onClick={() => {
                                      toast.dismiss(t.id);
                                      undoPurchase.mutate({
                                        assignmentId: assignment.id,
                                      });
                                    }}
                                  >
                                    Yes, Undo
                                  </button>
                                  <button
                                    className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
                                    onClick={() => toast.dismiss(t.id)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ), { duration: Infinity });
                          }}
                          disabled={undoPurchase.isPending}
                          className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:bg-gray-400"
                        >
                          {undoPurchase.isPending
                            ? "Undoing..."
                            : "Undo Purchased"}
                        </button>
                      </div>
                    )}

                    {hasReport && !hasPurchase && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div>
                            Reported:{" "}
                            {formatReportType(
                              assignment.reports[0]!.reportType,
                            )}
                          </div>
                          {assignment.reports[0]?.description && (
                            <div className="mt-1 italic">
                              &quot;{assignment.reports[0].description}&quot;
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Using toast with a custom confirmation
                            toast((t) => (
                              <div className="flex flex-col gap-3">
                                <span>Mark this issue as fixed? This will remove the report.</span>
                                <div className="flex gap-2">
                                  <button
                                    className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                                    onClick={() => {
                                      toast.dismiss(t.id);
                                      clearReport.mutate({
                                        assignmentId: assignment.id,
                                      });
                                    }}
                                  >
                                    Yes, Mark Fixed
                                  </button>
                                  <button
                                    className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
                                    onClick={() => toast.dismiss(t.id)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ), { duration: Infinity });
                          }}
                          disabled={clearReport.isPending}
                          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {clearReport.isPending
                            ? "Clearing..."
                            : "It&apos;s Fixed"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}{" "}
      {/* Purchase Modal */}
      {selectedAssignment && modalType === "purchase" && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Mark Purchase Complete
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="What did you buy? Any special notes..."
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    markPurchase.mutate({
                      assignmentId: selectedAssignment,
                      notes: purchaseNotes || undefined,
                    });
                  }}
                  disabled={markPurchase.isPending}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
                >
                  {markPurchase.isPending ? "Saving..." : "Confirm Purchase"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setModalType(null);
                  }}
                  className="flex-1 rounded-lg bg-gray-500 px-4 py-2 font-medium text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Report Issue Modal */}
      {selectedAssignment && modalType === "report" && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Report Wishlist Issue
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Issue Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as typeof reportType)
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                >
                  <option value="NO_ITEMS">Wishlist has no items</option>
                  <option value="DOESNT_EXIST">
                    Wishlist link doesn&apos;t work
                  </option>
                  <option value="NO_ADDRESS">No shipping address</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Additional details about the issue..."
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    reportIssue.mutate({
                      assignmentId: selectedAssignment,
                      reportType,
                      description: reportDescription || undefined,
                    });
                  }}
                  disabled={reportIssue.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:bg-gray-400"
                >
                  {reportIssue.isPending ? "Reporting..." : "Submit Report"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setModalType(null);
                  }}
                  className="flex-1 rounded-lg bg-gray-500 px-4 py-2 font-medium text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>{" "}
          </div>
        </div>
      )}
      {/* No Assignments Available Modal */}
      {modalType === "no-assignments" && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              No More Wishlists Available
            </h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                We couldn&apos;t find any more wishlists from your department to
                assign to you. This might be because:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>
                  All colleagues in your department already have assignments
                </li>
                <li>
                  Some colleagues haven&apos;t completed their profiles yet
                </li>
                <li>
                  You&apos;ve already been assigned all available wishlists
                </li>
              </ul>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="mb-3 text-sm text-blue-800">
                  <strong>
                    Would you like to get a wishlist from another department in
                    your company?
                  </strong>
                </p>
                <p className="text-xs text-blue-600">
                  This will be highlighted differently to show it&apos;s from a
                  different department.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCrossDepartment}
                  disabled={requestCrossDepartment.isPending}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {requestCrossDepartment.isPending
                    ? "Finding..."
                    : "Get Cross-Department Link"}
                </button>
                <button
                  onClick={() => setModalType(null)}
                  className="flex-1 rounded-lg bg-gray-500 px-4 py-2 font-medium text-white hover:bg-gray-600"
                >
                  Try Again Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Stranger (cross-domain) fallback modal */}
      {strangerModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              No More Wishlists in Your Company
            </h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                There are no more wishlists available in your company or
                department.
                <br />
                Would you like to help a{" "}
                <span className="font-bold text-pink-600">stranger</span> from
                another company/domain?
              </p>
              <div className="rounded-lg border border-pink-200 bg-pink-50 p-4">
                <p className="mb-3 text-sm text-pink-800">
                  <strong>
                    This wishlist will be from a random participant outside your
                    company. Their identity and department will not be shown.
                  </strong>
                </p>
                <p className="text-xs text-pink-600">
                  These are rare! Thank you for spreading extra holiday cheer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => requestCrossDomain?.mutate({ count: 1 })}
                  disabled={requestCrossDomain?.isPending}
                  className="flex-1 rounded-lg bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-700 disabled:bg-gray-400"
                >
                  {requestCrossDomain?.isPending
                    ? "Finding..."
                    : "Get a Stranger&apos;s Wishlist"}
                </button>
                <button
                  onClick={() => setStrangerModal(false)}
                  className="flex-1 rounded-lg bg-gray-500 px-4 py-2 font-medium text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/*
        REMINDER: Ensure your Kudos section container has id="kudos-section" for smooth scroll navigation.
        Example:
        <div id="kudos-section"> ...kudos content... </div>
      */}
    </div>
  );
}
