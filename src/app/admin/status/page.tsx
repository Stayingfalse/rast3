"use client";

import { api } from "~/trpc/react";
import { StatusView } from "../_components/status-view";

/** Admin › Status (2 Nov): launch status, refreshed every minute. */
export default function AdminStatusPage() {
  const { data, error, isLoading, refetch, isFetching } = api.admin.status.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (error) return <p className="text-frost">{error.message}</p>;
  if (isLoading || !data) return <p className="text-frost-soft">Loading…</p>;
  return <StatusView data={data} onRefresh={() => void refetch()} refreshing={isFetching} />;
}
