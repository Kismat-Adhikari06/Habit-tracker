"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, UserRound } from "lucide-react";

type Props = {
  email: string;
};

export function AccountSection({ email }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    const { logOutAction } = await import("@/app/auth-actions");
    await logOutAction();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-800/80 text-neutral-300">
          <UserRound className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-100">{email}</p>
          <p className="text-[11px] text-neutral-500">Signed in · data synced across devices</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={pending}
        className="flex h-9 items-center gap-2 rounded-lg border border-neutral-800 px-3 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-neutral-100 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
        Log out
      </button>
    </div>
  );
}
