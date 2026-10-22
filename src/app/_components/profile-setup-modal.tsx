"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { IDEAS_HINT, ideaLines, ideasProblem, MAX_IDEAS } from "~/lib/gift-ideas";
import { api } from "~/trpc/react";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose?: () => void;
  existingProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    amazonWishlistUrl?: string | null;
    giftIdeas?: string | null;
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
 * Day 15: built on shadcn/ui Dialog + Field (first real use).
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
  const [ideas, setIdeas] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fill the form when the window opens, not on every profile refetch:
  // a background refetch must never wipe what someone is typing.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setFirstName(existingProfile?.firstName ?? "");
      setLastName(existingProfile?.lastName ?? "");
      setWishlist(existingProfile?.amazonWishlistUrl ?? "");
      setIdeas(existingProfile?.giftIdeas ?? "");
      setErrors({});
    }
    wasOpen.current = isOpen;
  }, [isOpen, existingProfile]);

  const save = api.profile.saveProfile.useMutation({
    onSuccess: () => {
      onComplete();
      // First time: on to joining or starting a group
      if (!isEditing) router.push("/groups?welcome=1");
    },
    onError: (error) => setErrors({ submit: error.message }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Add your first name";
    if (!lastName.trim()) next.lastName = "Add your last name";
    const url = cleanWishlistUrl(wishlist);
    if (url && !AMAZON_WISHLIST.test(url)) {
      next.wishlist = "That doesn't look like an Amazon UK wishlist link";
    }
    const giftIdeas = ideaLines(ideas);
    const ideasError = ideasProblem(giftIdeas);
    if (ideasError) next.ideas = ideasError;
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate({ firstName, lastName, amazonWishlistUrl: url, giftIdeas });
  };

  return (
    <Dialog
      open={isOpen}
      // A first-time profile can't be dismissed; edits can
      onOpenChange={(open) => !open && isEditing && onClose?.()}
    >
      <DialogContent
        showCloseButton={isEditing}
        className="overflow-hidden pt-8 sm:max-w-md"
        onEscapeKeyDown={(e) => !isEditing && e.preventDefault()}
        onInteractOutside={(e) => !isEditing && e.preventDefault()}
      >
        <div className="airmail absolute inset-x-0 top-0 h-2.5" aria-hidden />
        <DialogHeader>
          <DialogTitle className="font-expanded text-2xl font-extrabold">
            {isEditing ? "Edit your profile" : "Complete Your Profile"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Your name, your Amazon wishlist and a few gift ideas."
              : "Your name and your Amazon wishlist. Next you'll join your workplace, a friends group or a community."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.firstName || undefined}>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.lastName || undefined}>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
              </Field>
            </div>
            <Field data-invalid={!!errors.wishlist || undefined}>
              <FieldLabel htmlFor="amazonWishlist">
                Amazon UK wishlist link
              </FieldLabel>
              <Input
                id="amazonWishlist"
                type="url"
                inputMode="url"
                value={wishlist}
                onChange={(e) => setWishlist(e.target.value)}
                aria-invalid={!!errors.wishlist}
                placeholder="https://www.amazon.co.uk/hz/wishlist/ls/…"
              />
              {errors.wishlist ? (
                <FieldError>{errors.wishlist}</FieldError>
              ) : (
                <FieldDescription>
                  You can add it later, but you&apos;ll need it before you pick
                  up anyone else&apos;s. Make the list public or shared so
                  Santas can open it.
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={!!errors.ideas || undefined}>
              <FieldLabel htmlFor="giftIdeas">
                Gift ideas <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <Textarea
                id="giftIdeas"
                rows={MAX_IDEAS}
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                aria-invalid={!!errors.ideas}
                placeholder={"Good coffee beans\nAnything for the garden\nT-shirts: size M"}
              />
              {errors.ideas ? (
                <FieldError>{errors.ideas}</FieldError>
              ) : (
                <FieldDescription>{IDEAS_HINT}</FieldDescription>
              )}
            </Field>
          </FieldGroup>

          {errors.submit && (
            <p role="alert" className="text-destructive text-sm">
              {errors.submit}
            </p>
          )}

          <DialogFooter>
            {isEditing && onClose && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={save.isPending} className="flex-1">
              {save.isPending
                ? "Saving…"
                : isEditing
                  ? "Save profile"
                  : "Save and choose a group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
