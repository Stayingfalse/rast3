"use client";

import { useState } from "react";

import { SignInModal } from "~/app/_components/sign-in-modal";

/** Opens the usual sign-in window, so a dead link isn't a dead end (24 Nov). */
export function SignInAgain({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-post w-full" onClick={() => setOpen(true)}>
        {label}
      </button>
      <SignInModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
