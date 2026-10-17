"use client";

import { useState } from "react";

import { SignInModal } from "../sign-in-modal";

type JoinButtonProps = {
  label?: string;
  variant?: "post" | "quiet";
  className?: string;
};

/** Opens the sign-in modal. Sign-up and sign-in are the same flow. */
export function JoinButton({
  label = "Join Santa",
  variant = "post",
  className = "",
}: JoinButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${variant === "post" ? "btn-post" : "btn-quiet"} ${className}`}
      >
        {label}
      </button>
      <SignInModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
