"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { api } from "~/trpc/react";

export function JoinGroupButton({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const router = useRouter();
  const join = api.groups.join.useMutation({
    onSuccess: () => {
      toast.success(`You've joined ${name}`);
      router.push("/groups");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <button
      type="button"
      disabled={join.isPending}
      onClick={() => join.mutate({ code })}
      className="btn-post"
    >
      {join.isPending ? "Joining…" : `Join ${name}`}
    </button>
  );
}
