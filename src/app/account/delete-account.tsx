"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

/** Type "delete", then the account goes (Day 30). */
export function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const ready = confirm.trim().toLowerCase() === "delete";
  const remove = api.profile.deleteAccount.useMutation({
    // the session went with the account: a full reload leaves you signed out
    onSuccess: () => window.location.assign("/?deleted=1"),
  });

  return (
    <form
      className="mt-5 flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) remove.mutate({ confirm });
      }}
    >
      <Field data-invalid={!!remove.error || undefined}>
        <FieldLabel htmlFor="confirm-delete">Type delete to confirm</FieldLabel>
        <Input
          id="confirm-delete"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={!!remove.error}
        />
        {remove.error ? (
          <FieldError>{remove.error.message}</FieldError>
        ) : (
          <FieldDescription>Download your data first if you want a copy.</FieldDescription>
        )}
      </Field>
      <Button
        type="submit"
        variant="destructive"
        disabled={!ready || remove.isPending || remove.isSuccess}
        className="self-start"
      >
        {remove.isPending || remove.isSuccess ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  );
}
