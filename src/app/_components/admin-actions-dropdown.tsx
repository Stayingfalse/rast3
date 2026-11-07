"use client";
import { EyeIcon, EyeOffIcon, MoreVerticalIcon, Trash2Icon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { clientLogger } from "~/utils/client-logger";

interface AdminActionsDropdownProps {
  kudosId: string;
  isHidden?: boolean;
  /** from the feed: what you can do to this thank-you, if anything */
  moderation: { hide: boolean; remove: boolean; as: "SITE" | "ORGANISER" | "GROUP" } | null;
  onActionComplete?: () => void;
}

/**
 * Moderating a thank-you: hide or unhide it, and (site admins and workplace
 * organisers) delete it. A menu that opens above the page (7 Nov: the old
 * one opened inside the card and was cut off at its edge), with a
 * confirmation before deleting.
 */
export const AdminActionsDropdown: React.FC<AdminActionsDropdownProps> = ({
  kudosId,
  isHidden = false,
  moderation,
  onActionComplete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const utils = api.useUtils();

  const hide = api.kudos.adminHideKudos.useMutation({
    onSuccess: async (_r, v) => {
      toast.success(v.hidden ? "Hidden" : "Shown again");
      await utils.kudos.getFeed.invalidate();
      onActionComplete?.();
    },
    onError: (error) => {
      clientLogger.error(error.message, "Error hiding/unhiding kudos", { kudosId, action: "toggle_visibility" });
      toast.error(error.message);
    },
  });
  const remove = api.kudos.adminDeleteKudos.useMutation({
    onSuccess: async () => {
      toast.success("Deleted");
      setConfirmDelete(false);
      await utils.kudos.getFeed.invalidate();
      onActionComplete?.();
    },
    onError: (error) => {
      clientLogger.error(error.message, "Error deleting kudos", { kudosId, action: "delete" });
      toast.error(error.message);
    },
  });

  if (!moderation?.hide) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Moderate this thank-you"
            className="text-ink-soft hover:text-ink hover:bg-label-shade flex size-9 items-center justify-center rounded-full transition-colors"
          >
            <MoreVerticalIcon className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            {moderation.as === "SITE"
              ? "Site admin"
              : moderation.as === "GROUP"
                ? "Your group's organiser"
                : "Organiser"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={hide.isPending}
              onSelect={() => hide.mutate({ kudosId, hidden: !isHidden })}
            >
              {isHidden ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
              {isHidden ? "Unhide Post" : "Hide Post"}
            </DropdownMenuItem>
            {moderation.remove && (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2Icon aria-hidden />
                Delete Post
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this thank-you?</AlertDialogTitle>
            <AlertDialogDescription>
              It and its photos are removed for good. Hiding it instead can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={remove.isPending} onClick={() => remove.mutate({ kudosId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
