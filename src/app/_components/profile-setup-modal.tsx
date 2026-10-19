"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "~/trpc/react";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose?: () => void;
  existingProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    amazonWishlistUrl?: string | null;
    profileCompleted?: boolean;
  } | null;
}

const AMAZON_WISHLIST =
  /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:[?#].*)?$/i;

/** Drops tracking query strings and fragments from a pasted wishlist link. */
const cleanWishlistUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    return u.origin + u.pathname;
  } catch {
    return trimmed;
  }
};

/**
 * Day 12: your profile is just you and your wishlist. Joining a workplace,
 * a friends group or a community happens next, on "Your groups".
 */
export function ProfileSetupModal({
  isOpen,
  onComplete,
  onClose,
  existingProfile,
}: ProfileSetupModalProps) {
  const router = useRouter();
  const isEditing = existingProfile?.profileCompleted ?? false;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [wishlist, setWishlist] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFirstName(existingProfile?.firstName ?? "");
    setLastName(existingProfile?.lastName ?? "");
    setWishlist(existingProfile?.amazonWishlistUrl ?? "");
    setErrors({});
    firstField.current?.focus();
  }, [isOpen, existingProfile]);

  useEffect(() => {
    if (!isOpen || !isEditing || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isEditing, onClose]);

  const save = api.profile.saveProfile.useMutation({
    onSuccess: () => {
      onComplete();
      // First time: on to joining or starting a group
      if (!isEditing) router.push("/groups?welcome=1");
    },
    onError: (error) => setErrors({ submit: error.message }),
  });

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Add your first name";
    if (!lastName.trim()) next.lastName = "Add your last name";
    const url = cleanWishlistUrl(wishlist);
    if (url && !AMAZON_WISHLIST.test(url)) {
      next.wishlist = "That doesn't look like an Amazon UK wishlist link";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate({ firstName, lastName, amazonWishlistUrl: url });
  };

  const field = (hasError: boolean) =>
    `border-rule text-ink rounded-label mt-1 block min-h-11 w-full border bg-white px-3 py-2 ${
      hasError ? "border-post" : ""
    }`;

  return (
    <div className="bg-night-deep/75 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="label-stock w-full max-w-md overflow-hidden"
      >
        <div className="airmail h-2.5" aria-hidden />
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2
                id="profile-title"
                className="font-expanded text-ink text-2xl font-extrabold"
              >
                {isEditing ? "Edit your profile" : "Complete Your Profile"}
              </h2>
              <p className="text-ink-soft mt-2 text-sm">
                {isEditing
                  ? "Your name and your Amazon wishlist."
                  : "Just your name and your Amazon wishlist. Next you'll join your workplace, a friends group or a community."}
              </p>
            </div>
            {isEditing && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-ink-soft hover:text-ink -mt-1 text-2xl font-bold"
              >
                ×
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="label-caps text-ink-soft">
                  First name
                </label>
                <input
                  ref={firstField}
                  id="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={!!errors.firstName}
                  className={field(!!errors.firstName)}
                />
                {errors.firstName && (
                  <p className="text-post mt-1 text-sm">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="label-caps text-ink-soft">
                  Last name
                </label>
                <input
                  id="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={!!errors.lastName}
                  className={field(!!errors.lastName)}
                />
                {errors.lastName && (
                  <p className="text-post mt-1 text-sm">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="amazonWishlist" className="label-caps text-ink-soft">
                Amazon UK wishlist link
              </label>
              <input
                id="amazonWishlist"
                type="url"
                inputMode="url"
                value={wishlist}
                onChange={(e) => setWishlist(e.target.value)}
                aria-invalid={!!errors.wishlist}
                aria-describedby="wishlist-hint"
                placeholder="https://www.amazon.co.uk/hz/wishlist/ls/…"
                className={field(!!errors.wishlist)}
              />
              {errors.wishlist ? (
                <p className="text-post mt-1 text-sm">{errors.wishlist}</p>
              ) : (
                <p id="wishlist-hint" className="text-ink-soft mt-1 text-sm">
                  You can add it later, but you&apos;ll need it before you pick
                  up anyone else&apos;s. Make the list public or shared so
                  Santas can open it.
                </p>
              )}
            </div>

            {errors.submit && (
              <p role="alert" className="bg-post-tint text-post rounded-label p-3 text-sm">
                {errors.submit}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              {isEditing && onClose && (
                <button type="button" onClick={onClose} className="btn-quiet text-ink">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={save.isPending} className="btn-post flex-1">
                {save.isPending
                  ? "Saving…"
                  : isEditing
                    ? "Save profile"
                    : "Save and choose a group"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
