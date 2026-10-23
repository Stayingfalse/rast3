"use client";

import { useState } from "react";

import { SignInModal } from "../sign-in-modal";

type JoinButtonProps = {
  label?: string;
  /** post: red button; quiet: outline; link: inline text on navy */
  variant?: "post" | "quiet" | "link";
  className?: string;
  /** passed to the sign-in modal */
  only?: string;
  workDomain?: string;
};

/** Opens the sign-in modal. Sign-up and sign-in are the same flow. */
export function JoinButton({
  label = "Join Santa",
  variant = "post",
  className = "",
  only,
  workDomain,
}: JoinButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${
          variant === "post"
            ? "btn-post"
            : variant === "quiet"
              ? "btn-quiet"
              : "text-frost font-semibold underline underline-offset-4"
        } ${className}`}
      >
        {label}
      </button>
      <SignInModal isOpen={open} onClose={() => setOpen(false)} only={only} workDomain={workDomain} />
    </>
  );
}
