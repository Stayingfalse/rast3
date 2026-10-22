"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { api, type RouterOutputs } from "~/trpc/react";
import { Postmark } from "./post/postmark";
import { ShareSheet, type ShareRequest } from "./share/share-sheet";
import { Preloader } from "./preloader";
import { ParcelHints } from "./parcel-hints";
import { ProfileSetupModal } from "./profile-setup-modal";

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
  const { data: userProfile, refetch: refetchProfile } =
    api.profile.getCurrentProfile.useQuery(undefined, {
      enabled: !!sessionData?.user,
    });

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
      // No eligible wishlists -> show modal
      if (error.message.includes("No eligible wishlists available")) {
        setModalType("no-assignments");
        return;
      }

      // If profile is incomplete, open profile setup modal and mark pending request
      if (!userProfile?.profileCompleted) {
        setPendingRequest({ type: "initial" });
        setShowProfileModal(true);
        return;
      }

      // If profile is complete but wishlist URL is missing, offer inline add-wishlist prompt
      if (userProfile.profileCompleted && !userProfile.amazonWishlistUrl) {
        setPendingRequest({ type: "initial" });
        setShowAddWishlistPrompt(true);
        return;
      }

      console.error("requestInitialAssignments error:", error);
      toast.error(error.message || "Could not get initial assignments");
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
          return;
        }

        if (!userProfile?.profileCompleted) {
          setPendingRequest({ type: "additional", count: 1 });
          setShowProfileModal(true);
          return;
        }

        if (userProfile.profileCompleted && !userProfile.amazonWishlistUrl) {
          setPendingRequest({ type: "additional", count: 1 });
          setShowAddWishlistPrompt(true);
          return;
        }

        console.error("requestAdditionalAssignments error:", error);
        toast.error(error.message || "Could not get additional assignments");
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
  const utils = api.useUtils();
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null);
  const markPurchase = api.wishlist.markPurchase.useMutation({
    onSuccess: (purchase) => {
      setShareRequest({ kind: "sent", purchaseId: purchase.id });
      void refetch();
      void utils.stamps.getMyAlbum.invalidate();
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
      void utils.stamps.getMyAlbum.invalidate();
      void refetch();
    },
  });

  const archiveAssignment = api.wishlist.archiveAssignment.useMutation({
    onSuccess: () => {
      void refetch();
      toast.success("Updated archive status");
    },
    onError: (err) => {
      toast.error(err.message || "Could not update archive status");
    },
  });

  const unassignAssignment = api.wishlist.unassignAssignment.useMutation({
    onSuccess: () => {
      void refetch();
      void refetchStats();
      toast.success("Assignment released");
    },
    onError: (err) => {
      toast.error(err.message || "Could not unassign wishlist");
    },
  });

  const [showArchived, setShowArchived] = useState(false);

  // Profile modal / add-wishlist prompt states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddWishlistPrompt, setShowAddWishlistPrompt] = useState(false);
  const [newWishlistUrl, setNewWishlistUrl] = useState("");
  const [addWishlistError, setAddWishlistError] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<null | {
    type: "initial" | "additional";
    count?: number;
  }>(null);

  const updateProfileForWishlist = api.profile.saveProfile.useMutation({
    onSuccess: async () => {
      // Refresh profile and close prompt, then retry pending request
      await refetchProfile();
      setShowAddWishlistPrompt(false);
      setAddWishlistError(null);
      toast.success("Wishlist URL saved");
      if (pendingRequest?.type === "initial") {
        requestInitial.mutate();
      } else if (pendingRequest?.type === "additional") {
        requestAdditional.mutate({ count: pendingRequest.count ?? 1 });
      }
      setPendingRequest(null);
    },
    onError: (err) => {
      setAddWishlistError(err.message || "Could not save wishlist URL");
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
        return "Link Doesn't Work";
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
      <div className="label-stock w-full max-w-2xl p-6">
        <h2 className="font-expanded text-ink text-xl font-extrabold">
          Finish your profile first
        </h2>
        <p className="text-ink-soft mt-2">
          Add your name and wishlist, then join your workplace or a group to
          start picking up wishlists.
        </p>
      </div>
    );
  }

  // Day 12: gifting happens inside a group. No live organisation yet?
  const orgStatus = (userProfile as { orgStatus?: string | null }).orgStatus;
  if (orgStatus !== "ACTIVE") {
    return (
      <section className="label-stock w-full overflow-hidden" aria-labelledby="join-a-group">
        <div className="airmail h-2.5" aria-hidden />
        <div className="flex flex-col gap-3 p-6 sm:p-8">
          <h2 id="join-a-group" className="font-expanded text-ink text-2xl font-extrabold">
            {orgStatus === "PENDING"
              ? "Your organisation is waiting for approval"
              : "Join a group to start gifting"}
          </h2>
          <p className="text-ink-soft max-w-xl">
            {orgStatus === "PENDING"
              ? "We check every new organisation before it goes live. You'll be able to pick up wishlists as soon as it's approved; meanwhile, invite colleagues so there are lists waiting."
              : "Wishlists are shared inside groups: your workplace, a group of friends, or a community such as a Discord server. Join one with your work email or an invite code, or start your own."}
          </p>
          <div>
            <a href="/groups" className="btn-post">
              {orgStatus === "PENDING" ? "Your groups" : "Join or start a group"}
            </a>
          </div>
        </div>
      </section>
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

  const confirmToast = (
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) =>
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span>{message}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-post min-h-9 px-3 py-1 text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="btn-quiet min-h-9 px-3 py-1 text-sm"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );

  const confirmUnassign = (assignmentId: string) =>
    confirmToast(
      "Unassigning will release this wishlist for others to pick up. Continue?",
      "Yes, unassign",
      () => unassignAssignment.mutate({ assignmentId }),
    );

  const renderAssignment = (assignment: WishlistAssignment, index: number) => {
    const hasPurchase = !!assignment.purchases;
    const hasReport = assignment.reports.length > 0;
    const archived = assignment.archived;
    const route = archived
      ? "Archived"
      : assignment.from === "elsewhere"
        ? "Another organisation"
        : assignment.from === "otherTeam" && assignment.fromTeam
          ? assignment.fromTeam
          : "Your team";

    return (
      <article
        key={assignment.id}
        className={`label-stock relative flex flex-col overflow-hidden ${archived ? "opacity-80" : ""}`}
      >
        <div
          className={hasPurchase ? "bg-pine h-2.5" : "airmail h-2.5"}
          aria-hidden
        />
        <header className="border-rule flex items-start justify-between gap-3 border-b px-4 pt-3 pb-2">
          <div>
            <p className="label-caps text-ink-soft">
              Wishlist{" "}
              <span className="tabular">
                No. {String(index + 1).padStart(2, "0")}
              </span>
            </p>
            <p className="text-ink mt-0.5 text-sm font-semibold">{route}</p>
          </div>
          {hasPurchase ? (
            <span className="label-caps bg-pine-tint text-pine rounded-sm px-2 py-1">
              Gift sent
            </span>
          ) : hasReport ? (
            <span className="label-caps bg-post-tint text-post-deep rounded-sm px-2 py-1">
              Issue reported
            </span>
          ) : null}
        </header>

        {hasPurchase && !archived && (
          <Postmark
            centre="SENT"
            sub="2026 SEASON"
            animate
            className="text-pine pointer-events-none absolute top-10 right-3 w-20 opacity-90"
          />
        )}

        <div className="flex flex-1 flex-col gap-3 p-4">
          {hasPurchase && assignment.purchases && (
            <div className="text-ink-soft text-sm">
              <p>
                Purchased:{" "}
                <span className="tabular">
                  {new Date(
                    assignment.purchases.purchasedAt,
                  ).toLocaleDateString("en-GB")}
                </span>
              </p>
              {assignment.purchases.notes && (
                <p className="text-ink mt-1 italic">
                  &quot;{assignment.purchases.notes}&quot;
                </p>
              )}
            </div>
          )}
          {hasReport && !hasPurchase && (
            <div className="text-ink-soft text-sm">
              <p>
                Reported: {formatReportType(assignment.reports[0]!.reportType)}
              </p>
              {assignment.reports[0]?.description && (
                <p className="text-ink mt-1 italic">
                  &quot;{assignment.reports[0].description}&quot;
                </p>
              )}
            </div>
          )}

          {!archived && !hasPurchase && (
            <ParcelHints budget={assignment.budget} ideas={assignment.ideas} />
          )}

          <div className="mt-auto flex flex-col gap-2">
            <a
              href={assignment.link ?? "#"}
              {...(assignment.viaGiftPage
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className={
                hasPurchase || archived ? "btn-quiet text-ink" : "btn-post"
              }
            >
              View Wishlist{assignment.viaGiftPage ? "" : " on Amazon"}
            </a>

            {!archived && !hasPurchase && !hasReport && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssignment(assignment.id);
                    setModalType("purchase");
                  }}
                  className="btn-quiet text-pine"
                >
                  Gifted
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssignment(assignment.id);
                    setModalType("report");
                  }}
                  className="btn-quiet text-ink-soft"
                >
                  Report issue
                </button>
              </div>
            )}

            {!archived && hasPurchase && assignment.purchases && (
              <button
                type="button"
                onClick={() =>
                  setShareRequest({
                    kind: "sent",
                    purchaseId: assignment.purchases!.id,
                  })
                }
                className="btn-quiet text-ink"
              >
                Share this act
              </button>
            )}

            {!archived && hasPurchase && (
              <button
                type="button"
                onClick={() =>
                  confirmToast(
                    "Undo this purchase? This removes the purchase record.",
                    "Yes, undo",
                    () => undoPurchase.mutate({ assignmentId: assignment.id }),
                  )
                }
                disabled={undoPurchase.isPending}
                className="btn-quiet text-ink-soft"
              >
                {undoPurchase.isPending ? "Undoing..." : "Undo purchase"}
              </button>
            )}

            {!archived && hasReport && !hasPurchase && (
              <button
                type="button"
                onClick={() =>
                  confirmToast(
                    "Mark this issue as fixed? This removes the report.",
                    "Yes, it's fixed",
                    () => clearReport.mutate({ assignmentId: assignment.id }),
                  )
                }
                disabled={clearReport.isPending}
                className="btn-quiet text-ink"
              >
                {clearReport.isPending ? "Clearing..." : "It's fixed"}
              </button>
            )}
          </div>

          <div className="border-rule flex justify-between gap-3 border-t pt-3 text-sm">
            <button
              type="button"
              onClick={() =>
                archiveAssignment.mutate({
                  assignmentId: assignment.id,
                  archive: !archived,
                })
              }
              disabled={archiveAssignment.isPending}
              className="text-ink-soft hover:text-ink min-h-9 font-semibold underline-offset-4 hover:underline"
            >
              {archiveAssignment.isPending
                ? "Updating..."
                : archived
                  ? "Unarchive"
                  : "Archive"}
            </button>
            {!hasPurchase && !hasReport && (
              <button
                type="button"
                onClick={() => confirmUnassign(assignment.id)}
                className="text-post min-h-9 font-semibold underline-offset-4 hover:underline"
              >
                Unassign
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const statItems = [
    { value: stats?.totalUsers, label: "members" },
    { value: stats?.totalLinks, label: "wishlists" },
    { value: stats?.totalGiftsSent, label: "gifts sent" },
    { value: stats?.totalLinksInWorkplace, label: "in your organisation" },
    { value: stats?.totalLinksInTeam, label: "in your team" },
    { value: stats?.totalUnallocatedLinks, label: "not yet picked up" },
  ].filter((s): s is { value: number; label: string } => s.value !== undefined);

  const activeAssignments =
    assignments?.filter((a: WishlistAssignment) => !a.archived) ?? [];
  const archivedAssignments =
    assignments?.filter((a: WishlistAssignment) => a.archived) ?? [];
  const waitingForPeople =
    (!assignments || assignments.length === 0) &&
    stats &&
    stats.totalLinks < 10 &&
    (stats.totalLinksInTeam ?? 0) < 2;

  return (
    <div className="w-full space-y-10">
      {statItems.length > 0 && (
        <dl className="border-frost/25 grid grid-cols-2 border-y sm:grid-cols-3 lg:grid-cols-6">
          {statItems.map((s) => (
            <div
              key={s.label}
              className="border-frost/15 px-1 py-4 lg:border-l lg:px-4 lg:first:border-l-0"
            >
              <dt className="text-frost-soft text-sm">{s.label}</dt>
              <dd className="tabular font-expanded text-frost text-2xl font-extrabold">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {waitingForPeople ? (
        <section
          id="assignments-section"
          className="label-stock overflow-hidden"
        >
          <div className="airmail h-2.5" aria-hidden />
          <div className="p-6 sm:p-8">
            <h2 className="font-expanded text-ink text-2xl font-extrabold">
              Waiting for more people
            </h2>
            <p className="text-ink-soft mt-2 max-w-xl">
              There aren&apos;t enough wishlists to pick from yet. Invite a few
              colleagues and check back once they&apos;ve set up their profiles.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={`mailto:?subject=Join%20Random%20Acts%20of%20Santa&body=Share%20your%20wishlist%20and%20send%20a%20colleague%20a%20gift%3A%20${encodeURIComponent(window.location.origin)}`}
                className="btn-post"
                target="_blank"
                rel="noopener noreferrer"
              >
                Invite by email
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.origin);
                  toast.success("Link copied!");
                }}
                className="btn-quiet text-ink"
              >
                Copy sign-up link
              </button>
            </div>
          </div>
        </section>
      ) : (
        (!assignments || assignments.length === 0) && (
          <section
            id="assignments-section"
            className="label-stock overflow-hidden"
          >
            <div className="airmail h-2.5" aria-hidden />
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 className="font-expanded text-ink text-2xl font-extrabold">
                  Pick up your first three
                </h2>
                <p className="text-ink-soft mt-2 max-w-xl">
                  We&apos;ll hand you three random wishlists, starting with
                  people nobody has picked up yet. Gift as many or as few as you
                  like.
                </p>
              </div>
              <button
                type="button"
                onClick={() => requestInitial.mutate()}
                disabled={requestInitial.isPending}
                className="btn-post shrink-0"
              >
                {requestInitial.isPending
                  ? "Finding wishlists..."
                  : "Get My 3 Wishlist Assignments"}
              </button>
            </div>
          </section>
        )
      )}

      {assignments && assignments.length > 0 && (
        <section id="assignments-section" aria-labelledby="assignments-heading">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="assignments-heading"
                className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase"
              >
                <span className="sr-only">
                  Your Wishlist Assignments ({assignments.length})
                </span>
                <span aria-hidden>
                  Your parcels{" "}
                  <span className="tabular text-gold-soft">
                    ({assignments.length})
                  </span>
                </span>
              </h2>
              <p className="text-frost-soft mt-2">
                Open a wishlist, buy something that suits your budget, then mark
                it Gifted.
              </p>
            </div>
            {assignments.length < 3 ? (
              <button
                type="button"
                onClick={() => requestInitial.mutate()}
                disabled={requestInitial.isPending}
                className="btn-quiet text-frost shrink-0"
              >
                {requestInitial.isPending
                  ? "Finding..."
                  : "Try for more wishlists"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requestAdditional.mutate({ count: 1 })}
                disabled={requestAdditional.isPending}
                className="btn-quiet text-frost shrink-0"
              >
                {requestAdditional.isPending ? "Finding..." : "Pick up another"}
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeAssignments.map((a, i) => renderAssignment(a, i))}
          </div>

          {archivedAssignments.length > 0 && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className="btn-quiet text-frost-soft"
              >
                {showArchived ? "Hide" : "Show"} archived (
                {archivedAssignments.length})
              </button>
              {showArchived && (
                <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {archivedAssignments.map((a, i) =>
                    renderAssignment(a, activeAssignments.length + i),
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {/* Purchase Modal */}
      {selectedAssignment && modalType === "purchase" && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">
              Mark Purchase Complete
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label-caps text-ink-soft mb-2 block">
                  Notes (optional)
                </label>
                <textarea
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="What did you buy? Any special notes..."
                  className="rounded-label border-rule text-ink w-full border bg-white p-3"
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
                  className="btn-post flex-1"
                >
                  {markPurchase.isPending ? "Saving..." : "Confirm Purchase"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setModalType(null);
                  }}
                  className="btn-quiet text-ink flex-1"
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
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">
              Report Wishlist Issue
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label-caps text-ink-soft mb-2 block">
                  Issue Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as typeof reportType)
                  }
                  className="rounded-label border-rule text-ink w-full border bg-white p-3"
                >
                  <option value="NO_ITEMS">Wishlist has no items</option>
                  <option value="DOESNT_EXIST">
                    Wishlist link {"doesn't"} work
                  </option>
                  <option value="NO_ADDRESS">No shipping address</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>
              <div>
                <label className="label-caps text-ink-soft mb-2 block">
                  Description (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Additional details about the issue..."
                  className="rounded-label border-rule text-ink w-full border bg-white p-3"
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
                  className="btn-post flex-1"
                >
                  {reportIssue.isPending ? "Reporting..." : "Submit Report"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setModalType(null);
                  }}
                  className="btn-quiet text-ink flex-1"
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
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">
              No More Wishlists Available
            </h3>
            <div className="space-y-4">
              <p className="text-ink-soft">
                We {"couldn't"} find any more wishlists from your department to
                assign to you. This might be because:
              </p>
              <ul className="text-ink-soft list-inside list-disc space-y-1 text-sm">
                <li>
                  All colleagues in your department already have assignments
                </li>
                <li>
                  Some colleagues {"haven't"} completed their profiles yet
                </li>
                <li>
                  {"You've"} already been assigned all available wishlists
                </li>
              </ul>
              <div className="rounded-label border-rule bg-label-shade border p-4">
                <p className="text-ink mb-2 text-sm">
                  <strong>
                    Would you like to get a wishlist from another department in
                    your company?
                  </strong>
                </p>
                <p className="text-ink-soft text-xs">
                  This will be highlighted differently to show {"it's"} from a
                  different department.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCrossDepartment}
                  disabled={requestCrossDepartment.isPending}
                  className="btn-post flex-1"
                >
                  {requestCrossDepartment.isPending
                    ? "Finding..."
                    : "Get Cross-Department Link"}
                </button>
                <button
                  onClick={() => setModalType(null)}
                  className="btn-quiet text-ink flex-1"
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
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">
              No More Wishlists in Your Company
            </h3>
            <div className="space-y-4">
              <p className="text-ink-soft">
                There are no more wishlists available in your company or
                department.
                <br />
                Would you like to help a{" "}
                <span className="text-post font-bold">stranger</span> from
                another company/domain?
              </p>
              <div className="rounded-label border-rule bg-label-shade border p-4">
                <p className="text-ink mb-2 text-sm">
                  <strong>
                    This wishlist will be from a random participant outside your
                    company. Their identity and department will not be shown.
                  </strong>
                </p>
                <p className="text-ink-soft text-xs">
                  These are rare! Thank you for spreading extra holiday cheer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => requestCrossDomain?.mutate({ count: 1 })}
                  disabled={requestCrossDomain?.isPending}
                  className="btn-post flex-1"
                >
                  {requestCrossDomain?.isPending
                    ? "Finding..."
                    : "Get a Stranger's Wishlist"}
                </button>
                <button
                  onClick={() => setStrangerModal(false)}
                  className="btn-quiet text-ink flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Profile Setup Modal (open when user needs to complete profile) */}
      <ShareSheet
        request={shareRequest}
        onClose={() => setShareRequest(null)}
      />

      <ProfileSetupModal
        isOpen={showProfileModal}
        existingProfile={userProfile ?? null}
        onComplete={() => {
          setShowProfileModal(false);
          // Retry pending request after profile completion
          if (pendingRequest?.type === "initial") {
            requestInitial.mutate();
          } else if (pendingRequest?.type === "additional") {
            requestAdditional.mutate({ count: pendingRequest.count ?? 1 });
          }
          setPendingRequest(null);
        }}
        onClose={() => {
          setShowProfileModal(false);
          setPendingRequest(null);
        }}
      />

      {/* Inline Add Wishlist Prompt */}
      {showAddWishlistPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">
              Add your Amazon UK wishlist
            </h3>
            <p className="text-ink-soft mb-3 text-sm">
              You need to add your Amazon UK wishlist URL before you can receive
              assignments. You can add it now or cancel to do this later.
            </p>
            <input
              type="url"
              value={newWishlistUrl}
              onChange={(e) => setNewWishlistUrl(e.target.value)}
              placeholder="https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX"
              className="rounded-label border-rule text-ink mb-3 block w-full border bg-white px-3 py-2"
            />
            {addWishlistError && (
              <p className="text-post mb-3 text-sm">{addWishlistError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Submit updateProfile with existing profile values and new wishlist
                  if (!userProfile) return;
                  updateProfileForWishlist.mutate({
                    firstName: userProfile.firstName ?? "",
                    lastName: userProfile.lastName ?? "",
                    amazonWishlistUrl: newWishlistUrl ?? undefined,
                  });
                }}
                className="btn-post"
              >
                Save & Continue
              </button>
              <button
                onClick={() => {
                  setShowAddWishlistPrompt(false);
                  setAddWishlistError(null);
                  setPendingRequest(null);
                  toast("You can add your wishlist later from your profile.");
                }}
                className="btn-quiet text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
