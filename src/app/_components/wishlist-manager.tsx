"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api, type RouterOutputs } from "~/trpc/react";

type WishlistAssignment = RouterOutputs["wishlist"]["getMyAssignments"][number];

export function WishlistManager() {
  const { data: sessionData } = useSession();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"purchase" | "report" | "no-assignments" | null>(null);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [reportType, setReportType] = useState<"NO_ITEMS" | "DOESNT_EXIST" | "NO_ADDRESS" | "OTHER">("NO_ITEMS");
  const [reportDescription, setReportDescription] = useState("");
  const [strangerModal, setStrangerModal] = useState(false);

  // Check if user has completed profile - only run when authenticated
  const { data: userProfile } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  );

  // Only show queries if user is authenticated and has completed profile
  const shouldShowWishlist = !!sessionData?.user && userProfile?.profileCompleted;

  // Queries - only run if user should see wishlist
  const { data: assignments, isLoading, refetch } = api.wishlist.getMyAssignments.useQuery(
    undefined,
    { enabled: shouldShowWishlist }
  );
  const { data: stats, refetch: refetchStats } = api.wishlist.getAssignmentStats.useQuery(
    undefined,
    { enabled: shouldShowWishlist }
  );

  // Mutations - must be called before any conditional returns
  const requestInitial = api.wishlist.requestInitialAssignments.useMutation({
    onSuccess: () => {
      refetch();
      refetchStats();
    },
    onError: (error) => {
      if (error.message.includes("No eligible wishlists available")) {
        setModalType("no-assignments");
      }
    },
  });
  const requestAdditional = api.wishlist.requestAdditionalAssignments.useMutation({
    onSuccess: () => {
      refetch();
      refetchStats();
    },
    onError: (error) => {
      if (error.message.includes("No additional wishlists available")) {
        setModalType("no-assignments");
      }
    },
  });

  const requestCrossDepartment = api.wishlist.requestCrossDepartmentAssignments.useMutation({
    onSuccess: () => {
      refetch();
      refetchStats();
      setModalType(null);
    },
  });
  const markPurchase = api.wishlist.markPurchase.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAssignment(null);
      setModalType(null);
      setPurchaseNotes("");
    },
  });

  const reportIssue = api.wishlist.reportIssue.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAssignment(null);
      setModalType(null);
      setReportDescription("");
    },
  });

  const clearReport = api.wishlist.clearReport.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const undoPurchase = api.wishlist.undoPurchase.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Add cross-domain assignment mutation (must be implemented in backend)
  const requestCrossDomain = api.wishlist.requestCrossDomainAssignments?.useMutation({
    onSuccess: () => {
      refetch();
      refetchStats();
      setStrangerModal(false);
      setModalType(null);
    },
  });

  // Early return if user is not authenticated - after all hooks
  if (!sessionData?.user) {
    return null; // Don't show anything if not authenticated
  }

  const getDisplayName = (owner: WishlistAssignment["wishlistOwner"]) => {
    if (owner.firstName && owner.lastName) {
      return `${owner.firstName} ${owner.lastName}`;
    }
    return owner.name || "Anonymous";
  };

  const isCrossDepartmentAssignment = (assignment: WishlistAssignment) => {
    // We'll determine this by comparing the assignment owner's department with the current user's department
    return assignment.wishlistOwner.department?.id !== userProfile?.departmentId;
  };
  const formatReportType = (type: string) => {
    switch (type) {
      case "NO_ITEMS": return "No Items";
      case "DOESNT_EXIST": return "Link Doesn't Work";
      case "NO_ADDRESS": return "No Shipping Address";
      case "OTHER": return "Other Issue";
      default: return type;
    }
  };

  if (!userProfile?.profileCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Complete Your Profile First</h2>
          <p className="text-yellow-700">
            Please complete your profile setup to access the Secret Santa wishlist system.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 mt-8">
        <div className="text-lg text-white">Loading your wishlist assignments...</div>
      </div>
    );
  }

  // Patch: handle cross-department fallback
  const handleCrossDepartment = () => {
    requestCrossDepartment.mutate({ count: 1 }, {
      onError: (error) => {
        if (error.message.includes('No cross-department wishlists available')) {
          setStrangerModal(true);
        }
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🎄 Secret Santa Wishlist Manager</h1>
        <p className="text-gray-600 mb-4">
          Shop from other people's wishlists and spread the holiday joy!
        </p>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-green-50 p-3 rounded-lg z-50">
              <div className="text-2xl font-bold text-green-600">{stats.totalLinks ?? "-"}</div>
              <div className="text-sm text-green-700">Total Links</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg z-50">
              <div className="text-2xl font-bold text-blue-600">{stats.departmentLinks ?? "-"}</div>
              <div className="text-sm text-blue-700">Links in Your Department</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg z-50">
              <div className="text-2xl font-bold text-orange-600">{stats.unallocatedLinks ?? "-"}</div>
              <div className="text-sm text-orange-700">Unallocated Links</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg z-50">
              <div className="text-2xl font-bold text-purple-600">{stats.unallocatedDepartmentLinks ?? "-"}</div>
              <div className="text-sm text-purple-700">Unallocated in Your Dept</div>
            </div>
          </div>
        )}
      </div>      {/* Request Initial Assignments */}
      {(!assignments || assignments.length === 0) && (
        <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🎁 Get Started!</h2>
          <p className="text-gray-600 mb-6">
            Request your first 3 wishlist assignments to start shopping for others!
          </p>
          <button
            onClick={() => requestInitial.mutate()}
            disabled={requestInitial.isPending}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {requestInitial.isPending ? "Finding wishlists..." : "Get My 3 Wishlist Assignments"}
          </button>
        </div>
      )}

      {/* Current Assignments */}
      {assignments && assignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Your Wishlist Assignments ({assignments.length})</h2>
            {/* Show 'Try for More Assignments' if <3, else 'Request More' */}
            {assignments.length < 3 ? (
              <button
                onClick={() => requestInitial.mutate()}
                disabled={requestInitial.isPending}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                {requestInitial.isPending ? "Finding..." : "Try for More Assignments"}
              </button>
            ) : (
              <button
                onClick={() => requestAdditional.mutate({ count: 1 })}
                disabled={requestAdditional.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                {requestAdditional.isPending ? "Finding..." : "Request More"}
              </button>
            )}
          </div>          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">            {assignments?.map((assignment: WishlistAssignment) => {
              const hasPurchase = !!assignment.purchases;
              const hasReport = assignment.reports.length > 0;
              // Robust logic: isStranger = wishlistDomain is defined and userDomain is defined and different, or wishlistDomain is defined and userDomain is undefined/null
              // isCrossDept = both domains defined and equal, but departments differ
              const wishlistDomain = (assignment.wishlistOwner as any).domain;
              const wishlistDeptId = assignment.wishlistOwner.department?.id;
              const userDomain = userProfile?.domain;
              const userDeptId = userProfile?.departmentId;
              const isStranger = Boolean(wishlistDomain && ((userDomain && wishlistDomain !== userDomain) || !userDomain));
              const isCrossDept = Boolean(!isStranger && wishlistDomain && userDomain && wishlistDomain === userDomain && wishlistDeptId && userDeptId && wishlistDeptId !== userDeptId);

              return (
                <div
                  key={assignment.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
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
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {isStranger ? (
                        <span className="text-pink-600 text-xs font-medium bg-pink-100 px-2 py-1 rounded-full">
                          🎁 Stranger
                        </span>
                      ) : (isCrossDept && assignment.wishlistOwner.department && assignment.wishlistOwner.department.name) ? (
                        <span className="text-purple-600 text-xs font-medium bg-purple-100 px-2 py-1 rounded-full">
                          📍 {assignment.wishlistOwner.department.name}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hasPurchase && <span className="text-green-600 text-sm font-medium">✅ Purchased</span>}
                      {hasReport && !hasPurchase && <span className="text-yellow-600 text-sm font-medium">⚠️ Reported</span>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <a
                      href={assignment.wishlistOwner.amazonWishlistUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      🛒 View Wishlist
                    </a>                    {!hasPurchase && !hasReport && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment.id);
                            setModalType("purchase");
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          Mark Purchased
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment.id);
                            setModalType("report");
                          }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          Report Issue
                        </button>
                      </div>
                    )}                    {hasPurchase && assignment.purchases && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div>Purchased: {new Date(assignment.purchases.purchasedAt).toLocaleDateString()}</div>
                          {assignment.purchases.notes && (
                            <div className="mt-1 italic">"{assignment.purchases.notes}"</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to undo this purchase? This will remove the purchase record.")) {
                              undoPurchase.mutate({ assignmentId: assignment.id });
                            }
                          }}
                          disabled={undoPurchase.isPending}
                          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          {undoPurchase.isPending ? "Undoing..." : "Undo Purchased"}
                        </button>
                      </div>
                    )}

                    {hasReport && !hasPurchase && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div>Reported: {formatReportType(assignment.reports[0]!.reportType)}</div>
                          {assignment.reports[0]!.description && (
                            <div className="mt-1 italic">"{assignment.reports[0]!.description}"</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Mark this issue as fixed? This will remove the report.")) {
                              clearReport.mutate({ assignmentId: assignment.id });
                            }
                          }}
                          disabled={clearReport.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          {clearReport.isPending ? "Clearing..." : "It's Fixed"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}      {/* Purchase Modal */}
      {selectedAssignment && modalType === "purchase" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Mark Purchase Complete</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="What did you buy? Any special notes..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  }}                  disabled={markPurchase.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                >
                  {markPurchase.isPending ? "Saving..." : "Confirm Purchase"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setModalType(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Report Wishlist Issue</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as typeof reportType)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="NO_ITEMS">Wishlist has no items</option>
                  <option value="DOESNT_EXIST">Wishlist link doesn't work</option>
                  <option value="NO_ADDRESS">No shipping address</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Additional details about the issue..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  }}                  disabled={reportIssue.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                >
                  {reportIssue.isPending ? "Reporting..." : "Submit Report"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setModalType(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>          </div>
        </div>
      )}

      {/* No Assignments Available Modal */}
      {modalType === "no-assignments" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">No More Wishlists Available</h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                We couldn't find any more wishlists from your department to assign to you. 
                This might be because:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>All colleagues in your department already have assignments</li>
                <li>Some colleagues haven't completed their profiles yet</li>
                <li>You've already been assigned all available wishlists</li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-3">
                  <strong>Would you like to get a wishlist from another department in your company?</strong>
                </p>
                <p className="text-xs text-blue-600">
                  This will be highlighted differently to show it's from a different department.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCrossDepartment}
                  disabled={requestCrossDepartment.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                >
                  {requestCrossDepartment.isPending ? "Finding..." : "Get Cross-Department Link"}
                </button>
                <button
                  onClick={() => setModalType(null)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">No More Wishlists in Your Company</h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                There are no more wishlists available in your company or department.<br />
                Would you like to help a <span className="font-bold text-pink-600">stranger</span> from another company/domain?
              </p>
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <p className="text-sm text-pink-800 mb-3">
                  <strong>This wishlist will be from a random participant outside your company. Their identity and department will not be shown.</strong>
                </p>
                <p className="text-xs text-pink-600">
                  These are rare! Thank you for spreading extra holiday cheer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => requestCrossDomain?.mutate({ count: 1 })}
                  disabled={requestCrossDomain?.isPending}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                >
                  {requestCrossDomain?.isPending ? "Finding..." : "Get a Stranger's Wishlist"}
                </button>
                <button
                  onClick={() => setStrangerModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
