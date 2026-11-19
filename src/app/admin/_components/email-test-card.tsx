"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";

const STEP: Record<string, string> = {
  settings: "Reading the email settings",
  connect: "Connecting and signing in to the mail server",
  send: "Sending the email",
};

/**
 * "Send test email" (owner, 19 Nov): one email to you, sent the way
 * sign-in links go. Shows which step failed and what the mail server said.
 */
export function EmailTestCard() {
  const test = api.admin.sendTestEmail.useMutation();
  const r = test.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send test email</CardTitle>
        <CardDescription>
          Sends one email to your own address, the way sign-in links and reminders go. If it fails,
          you&apos;ll see the step and the mail server&apos;s reply.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" className="self-start" disabled={test.isPending} onClick={() => test.mutate()}>
          {test.isPending ? "Sending…" : "Send test email"}
        </Button>
        {test.error && <p role="alert" className="text-destructive text-sm">{test.error.message}</p>}
        {r && (
          <div role="status" className="flex flex-col gap-3">
            {r.ok ? (
              <p className="font-semibold">Sent to {r.to}. Check that inbox (and spam).</p>
            ) : (
              <p className="text-destructive font-semibold">
                Failed at: {STEP[r.step ?? ""] ?? r.step}
              </p>
            )}
            <details open={!r.ok}>
              <summary className="cursor-pointer text-sm font-semibold">What we checked and what the server said</summary>
              <pre className="bg-muted mt-2 max-h-96 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify({ settings: r.settings, reply: r.detail }, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
