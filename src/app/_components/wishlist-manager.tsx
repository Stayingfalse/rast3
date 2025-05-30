"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

interface WishlistAssignment {
  id: string;
  assignedAt: Date;
  wishlistOwner: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    amazonWishlistUrl: string | null;
  };
  purchases: Array<{
    id: string;
    purchasedAt: Date;
    notes: string | null;
  }>;
  reports: Array<{
    id: string;
    reportType: string;
    description: string | null;
    reportedAt: Date;
  }>;
}

export function WishlistManager() {
  const { data: sessionData } = useSession();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"purchase" | "report" | null>(null);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [reportType, setReportType] = useState<"NO_ITEMS" | "DOESNT_EXIST" | "NO_ADDRESS" | "OTHER">("NO_ITEMS");
  const [reportDescription, setReportDescription] = useState("");

  // Check if user has completed profile
  const { data: userProfile } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  );

  // Only show queries if user is authenticated and has completed profile
  const shouldShowWishlist = sessionData?.user && userProfile?.profileCompleted;

  // Queries - only run if user should see wishlist
  const { data: assignments, isLoading, refetch } = api.wishlist.getMyAssignments.useQuery(
    undefined,
    { enabled: shouldShowWishlist }
  );
  const { data: stats } = api.wishlist.getAssignmentStats.useQuery(
    undefined,
    { enabled: shouldShowWishlist }
  );

  // Mutations
  const requestInitial = api.wishlist.requestInitialAssignments.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const requestAdditional = api.wishlist.requestAdditionalAssignments.useMutation({
    onSuccess: () => {
      refetch();
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

  const getDisplayName = (owner: WishlistAssignment["wishlistOwner"]) => {
    if (owner.firstName && owner.lastName) {
      return `${owner.firstName} ${owner.lastName}`;
    }
    return owner.name || "Anonymous";
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
  if (!sessionData?.user) {
    return null; // Don't show anything if not authenticated
  }

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
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
              <div className="text-sm text-green-700">Total Participants</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalAssignments}</div>
              <div className="text-sm text-blue-700">Active Assignments</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.usersWithAssignments}</div>
              <div className="text-sm text-purple-700">Users with Lists</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.averageAssignments.toFixed(1)}</div>
              <div className="text-sm text-orange-700">Avg per User</div>
            </div>
          </div>
        )}
      </div>

      {/* Request Initial Assignments */}
      {(!assignments || assignments.length === 0) && (
        <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🎁 Get Started!</h2>
          <p className="text-gray-600 mb-6">
            Request your first 3 wishlist assignments to start shopping for others!
          </p>          <button
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
            {assignments.length >= 3 && (            <button
                onClick={() => requestAdditional.mutate({ count: 1 })}
                disabled={requestAdditional.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                {requestAdditional.isPending ? "Finding..." : "Request More"}
              </button>
            )}
          </div>          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment: any) => {
              const hasPurchase = assignment.purchases.length > 0;
              const hasReport = assignment.reports.length > 0;

              return (
                <div
                  key={assignment.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    hasPurchase
                      ? "border-green-200 bg-green-50"
                      : hasReport
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-gray-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {getDisplayName(assignment.wishlistOwner)}
                    </h3>
                    {hasPurchase && <span className="text-green-600 text-sm font-medium">✅ Purchased</span>}
                    {hasReport && !hasPurchase && <span className="text-yellow-600 text-sm font-medium">⚠️ Reported</span>}
                  </div>

                  <div className="space-y-3">
                    <a
                      href={assignment.wishlistOwner.amazonWishlistUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      🛒 View Amazon Wishlist
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
                    )}

                    {hasPurchase && (
                      <div className="text-sm text-gray-600">
                        <div>Purchased: {new Date(assignment.purchases[0]!.purchasedAt).toLocaleDateString()}</div>
                        {assignment.purchases[0]!.notes && (
                          <div className="mt-1 italic">"{assignment.purchases[0]!.notes}"</div>
                        )}
                      </div>
                    )}

                    {hasReport && (
                      <div className="text-sm text-gray-600">
                        <div>Reported: {formatReportType(assignment.reports[0]!.reportType)}</div>
                        {assignment.reports[0]!.description && (
                          <div className="mt-1 italic">"{assignment.reports[0]!.description}"</div>
                        )}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
