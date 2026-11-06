import { Badge } from "~/components/ui/badge";
import {
  DISCORD_FEATURES,
  DISCORD_ROLES,
  type DiscordSummary,
} from "~/lib/discord-server";

const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
const monthYear = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Europe/London" });
const count = (n: number) => n.toLocaleString("en-GB");
const daysAgo = (d: Date | string) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/**
 * What Discord told us about a community's linked server (owner, 6 Nov):
 * name and icon, rough size, how old it is, notable features, and how the
 * organiser runs it. A server made in the last month is flagged.
 */
export function DiscordServer({ server, compact = false }: { server: DiscordSummary; compact?: boolean }) {
  const size = [
    server.members != null && `about ${count(server.members)} ${server.members === 1 ? "member" : "members"}`,
    server.online != null && `${count(server.online)} online`,
  ]
    .filter(Boolean)
    .join(" · ");
  const about = [
    server.createdAt && `Server created ${compact ? monthYear(server.createdAt) : day(server.createdAt)}`,
    server.linkedBy && `linked by ${DISCORD_ROLES[server.linkedBy]}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex min-w-0 items-start gap-3">
      {server.icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- Discord CDN icon
        <img
          src={server.icon}
          alt=""
          width={compact ? 28 : 36}
          height={compact ? 28 : 36}
          className="mt-0.5 shrink-0 rounded-full"
        />
      ) : (
        <span
          aria-hidden
          className={`bg-ink text-frost mt-0.5 flex shrink-0 items-center justify-center rounded-full font-bold ${
            compact ? "size-7 text-xs" : "size-9 text-sm"
          }`}
        >
          {(server.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-ink font-semibold break-words">
          {server.name ?? "Name not recorded yet"}
        </p>
        {size && <p className="text-ink-soft text-xs tabular-nums">{size}</p>}
        {about && <p className="text-ink-soft text-xs">{about}</p>}
        {(server.isNew || server.features.length > 0) && (
          <ul className="flex flex-wrap gap-1" aria-label="About the server">
            {server.isNew && server.createdAt && (
              <li>
                <Badge variant="destructive">New server: made {daysAgo(server.createdAt)}</Badge>
              </li>
            )}
            {server.features.map((f) => (
              <li key={f}>
                <Badge variant="outline">{DISCORD_FEATURES[f]}</Badge>
              </li>
            ))}
          </ul>
        )}
        {!compact && (
          <p className="text-ink-soft text-xs">
            {server.name
              ? `Checked with Discord ${server.checkedAt ? day(server.checkedAt) : "when linked"}.`
              : "Details show once the organiser next opens their console."}{" "}
            <span className="tabular-nums">Server id {server.id}</span>
          </p>
        )}
      </div>
    </div>
  );
}
