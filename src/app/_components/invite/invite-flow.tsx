"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { ProfileSetupModal } from "../profile-setup-modal";
import { JoinButton } from "../post/join-button";

/**
 * Invite routes (owner, 23 Oct 2026): each kind of group has its own way in,
 * and the invite is carried through sign-in and the profile.
 * - Workplace (raosanta.uk/<domain>): the work email (and join code, if the
 *   organisation asks for one) comes first, then sign-in, then the profile.
 * - Discord community: Discord sign-in only; joined automatically when you're
 *   in the server, then other communities on your servers are suggested.
 * - Friends and family: joined automatically from the code.
 */
export type InviteGroup = {
  id: string;
  name: string;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  members: number;
};

type Props =
  | { kind: "workplace"; group: InviteGroup; domain: string; codeRequired: boolean; code?: string; signedIn: boolean; sessionEmail?: string | null; alreadyIn: boolean }
  | { kind: "discord" | "friends"; group: InviteGroup; code: string; signedIn: boolean; alreadyIn: boolean };

type Step = "start" | "joining" | "profile" | "done" | "connectDiscord" | "notInServer" | "error";

const PENDING_KEY = (domain: string) => `raosanta-invite-${domain}`;

export function InviteFlow(props: Props) {
  const { group, signedIn } = props;
  const [step, setStep] = useState<Step>(props.alreadyIn ? "profile" : "start");
  const [error, setError] = useState<string | null>(null);
  const profile = api.profile.getCurrentProfile.useQuery(undefined, { enabled: signedIn });

  // after joining: the profile if it isn't done yet, then the welcome
  const joined = () => setStep("profile");
  useEffect(() => {
    if (step === "profile" && profile.data?.profileCompleted) setStep("done");
  }, [step, profile.data]);

  const joinByCode = api.groups.join.useMutation({
    onSuccess: joined,
    onError: (e) => {
      setError(e.message);
      setStep("error");
    },
  });
  const joinViaDiscord = api.groups.joinViaDiscord.useMutation({
    onSuccess: joined,
    onError: (e) => {
      if (e.data?.code === "PRECONDITION_FAILED") setStep("connectDiscord");
      else if (e.data?.code === "FORBIDDEN") setStep("notInServer");
      else {
        setError(e.message);
        setStep("error");
      }
    },
  });

  // signed in on a Discord invite: join straight away (the server check
  // decides). Friends invites wait for a tap (owner, 26 Oct): opening a link
  // shouldn't put you in a group.
  const started = useRef(false);
  useEffect(() => {
    if (!signedIn || props.alreadyIn || started.current || props.kind !== "discord") return;
    started.current = true;
    setStep("joining");
    joinViaDiscord.mutate({ groupId: group.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, [signedIn]);

  const welcome = (
    <div className="flex flex-col gap-4">
      <p className="font-expanded text-ink text-2xl leading-tight font-extrabold">
        You&apos;re in {group.name}.
      </p>
      {group.status === "PENDING" && (
        <p className="bg-gold-soft/40 border-gold rounded-label border px-3 py-2 text-sm">
          The group is new and waiting for our approval. Gifting opens once it&apos;s approved.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="btn-post">
          Start gifting
        </Link>
        <Link href="/groups" className="btn-quiet text-ink">
          Your groups
        </Link>
      </div>
      {props.kind === "discord" ? <OtherServers exclude={group.id} /> : <OtherGroups kind={props.kind} />}
    </div>
  );

  let body: React.ReactNode;
  if (props.kind === "workplace" && (step === "start" || step === "error")) {
    body = <WorkplaceStep {...props} onJoined={joined} />;
  } else if (step === "done") {
    body = welcome;
  } else if (step === "profile") {
    body = (
      <>
        <p className="text-ink-soft">Nearly there: your name and your Amazon wishlist.</p>
        <ProfileSetupModal
          isOpen={!!profile.data && !profile.data.profileCompleted}
          onComplete={() => {
            void profile.refetch();
            setStep("done");
          }}
          next={null}
          existingProfile={profile.data}
        />
      </>
    );
  } else if (step === "joining") {
    body = <p className="text-ink-soft" role="status">Joining {group.name}…</p>;
  } else if (step === "connectDiscord") {
    body = (
      <div className="flex flex-col items-start gap-3">
        <p>{group.name} joins through its Discord server. Connect your Discord account to carry on.</p>
        <button type="button" className="btn-post" onClick={() => void signIn("discord")}>
          Connect Discord
        </button>
      </div>
    );
  } else if (step === "notInServer") {
    body = (
      <div className="flex flex-col items-start gap-3">
        <p>
          Your Discord account isn&apos;t in {group.name}&apos;s server yet. Join the server on Discord
          (ask whoever invited you for the link), then come back here.
        </p>
        <button
          type="button"
          className="btn-post"
          onClick={() => {
            setStep("joining");
            joinViaDiscord.mutate({ groupId: group.id });
          }}
        >
          I&apos;ve joined, try again
        </button>
      </div>
    );
  } else if (step === "error") {
    body = (
      <p role="alert" className="text-destructive">
        {error ?? "Something went wrong joining this group."}
      </p>
    );
  } else if (signedIn && props.kind === "friends") {
    body = (
      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          className="btn-post"
          onClick={() => {
            setStep("joining");
            joinByCode.mutate({ code: props.code });
          }}
        >
          Join {group.name}
        </button>
        <p className="text-ink-soft text-sm">
          The organiser sees your name. Your email stays private.
        </p>
      </div>
    );
  } else {
    // signed out on a Discord or friends invite
    body = (
      <div className="flex flex-col items-start gap-3">
        {props.kind === "discord" ? (
          <>
            <JoinButton label="Continue with Discord" only="discord" />
            <p className="text-ink-soft text-sm">
              We check you&apos;re in the server, then add you to the group. New here? This creates your
              account.
            </p>
          </>
        ) : (
          <>
            <JoinButton label="Sign in to join" />
            <p className="text-ink-soft text-sm">New here? Signing in creates your account. You join {group.name} on the next step.</p>
          </>
        )}
      </div>
    );
  }

  return <div className="flex flex-col gap-5">{body}</div>;
}

/** Workplace: the work email (and join code) first, kept through sign-in. */
function WorkplaceStep({
  group,
  domain,
  codeRequired,
  code: linkCode,
  signedIn,
  sessionEmail,
  onJoined,
}: Extract<Props, { kind: "workplace" }> & { onJoined: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(linkCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const join = api.groups.joinOrganisation.useMutation({
    onSuccess: (r) => {
      try {
        sessionStorage.removeItem(PENDING_KEY(domain));
      } catch {}
      if (r.result === "joined") return onJoined();
      setError(
        r.result === "needsCode"
          ? `${group.name} asks for a join code. Ask your organiser for it.`
          : r.result === "wrongCode"
            ? "That join code isn't right. Check it with your organiser."
            : `Use your @${domain} email address.`,
      );
    },
    onError: (e) => setError(e.message),
  });

  // back from sign-in: pick up what they typed, or the address they signed in with
  useEffect(() => {
    let saved: { email?: string; code?: string } = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(PENDING_KEY(domain)) ?? "{}") as typeof saved;
    } catch {}
    const start = saved.email ?? (sessionEmail?.toLowerCase().endsWith(`@${domain}`) ? sessionEmail : "");
    if (start) setEmail(start);
    if (saved.code) setCode(saved.code);
    if (signedIn && start && !tried.current && (!codeRequired || saved.code || linkCode)) {
      tried.current = true;
      join.mutate({ workEmail: start, joinCode: saved.code ?? linkCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  const valid = email.trim().toLowerCase().endsWith(`@${domain}`) && (!codeRequired || code.trim().length >= 8);
  const remember = () => {
    try {
      sessionStorage.setItem(PENDING_KEY(domain), JSON.stringify({ email: email.trim(), code: code.trim() }));
    } catch {}
  };

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) {
          setError(`Use your @${domain} email address${codeRequired ? " and the join code" : ""}.`);
          return;
        }
        setError(null);
        if (signedIn) join.mutate({ workEmail: email.trim(), joinCode: code.trim() || undefined });
      }}
    >
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor="work-email" className="font-expanded text-lg">
          Your @{domain} email
        </FieldLabel>
        <Input
          id="work-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`you@${domain}`}
          aria-invalid={!!error}
          className="h-14 text-lg"
        />
        <FieldDescription>
          It shows you work at {group.name}. We don&apos;t email it; colleagues never see it.
        </FieldDescription>
      </Field>
      {codeRequired && (
        <Field>
          <FieldLabel htmlFor="join-code">Join code</FieldLabel>
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-EFGH"
            autoCapitalize="characters"
          />
          <FieldDescription>Your organiser shared it with the invite.</FieldDescription>
        </Field>
      )}
      {error && <FieldError>{error}</FieldError>}
      {signedIn ? (
        <button type="submit" className="btn-post self-start" disabled={join.isPending}>
          {join.isPending ? "Joining…" : `Join ${group.name}`}
        </button>
      ) : (
        <div className="flex flex-col items-start gap-2" onClickCapture={remember}>
          {valid ? (
            <JoinButton label="Continue" workDomain={domain} />
          ) : (
            <button type="submit" className="btn-post">
              Continue
            </button>
          )}
          <p className="text-ink-soft text-sm">
            Next, sign in with your personal email or a social account (company mail often blocks
            ours), and you&apos;re added.
          </p>
        </div>
      )}
    </form>
  );
}

/** After a Discord invite: other communities on servers you're in. */
function OtherServers({ exclude }: { exclude: string }) {
  const utils = api.useUtils();
  const matches = api.groups.discordMatches.useMutation();
  const join = api.groups.joinViaDiscord.useMutation({
    onSuccess: () => matches.mutate(),
  });
  useEffect(() => {
    matches.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);
  const others = (matches.data?.groups ?? []).filter((g) => g.id !== exclude && !g.alreadyMember);
  if (others.length === 0) return null;
  return (
    <div className="border-rule flex flex-col gap-3 border-t pt-4">
      <p className="text-ink font-semibold">More communities on your Discord servers</p>
      <ul className="divide-rule flex flex-col divide-y">
        {others.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="text-ink font-semibold">{g.name}</span>{" "}
              <span className="text-ink-soft text-sm">· {g.server}</span>
            </span>
            <button
              type="button"
              className="btn-quiet text-ink"
              disabled={join.isPending}
              onClick={() => join.mutate({ groupId: g.id }, { onSuccess: () => void utils.groups.mine.invalidate() })}
            >
              Join
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** After a workplace or friends invite: the other ways in. */
function OtherGroups({ kind }: { kind: "workplace" | "friends" }) {
  return (
    <p className="text-ink-soft border-rule border-t pt-4">
      {kind === "workplace"
        ? "Also gifting with friends, family or a Discord community? "
        : "Also gifting at work or in a Discord community? "}
      <Link href="/groups" className="text-post underline underline-offset-4">
        Join or start another group
      </Link>
      .
    </p>
  );
}
