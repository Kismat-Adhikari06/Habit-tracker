"use client";

import { useState } from "react";
import { CheckCircle2, GitBranch, Loader2, RefreshCw, Unplug, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  connectGitHubAction,
  disconnectGitHubAction,
  getGitHubStatus,
  syncGitHubContributionsAction,
  type GitHubStatus,
} from "@/app/github-actions";

type Props = {
  initialStatus: GitHubStatus;
};

export function GitHubSettings({ initialStatus }: Props) {
  const [status, setStatus] = useState<GitHubStatus>(initialStatus);
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"connect" | "disconnect" | "sync" | null>(null);

  async function handleConnect() {
    if (busy) return;
    setError(null);
    setBusy("connect");
    const result = await connectGitHubAction(username, token);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setToken("");
    setUsername("");
    setStatus(await getGitHubStatus());
  }

  async function handleDisconnect() {
    if (busy) return;
    setBusy("disconnect");
    const result = await disconnectGitHubAction();
    setBusy(null);
    if (result.ok) setStatus({ connected: false });
  }

  async function handleSync() {
    if (busy) return;
    setError(null);
    setBusy("sync");
    const result = await syncGitHubContributionsAction();
    setBusy(null);
    if (!result.ok) setError(result.error);
  }

  if (status.connected) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border border-emerald-900/50 bg-emerald-500/[0.06] px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-neutral-200">
            <CheckCircle2 className="size-4 text-emerald-500" />
            Connected as <span className="font-semibold">@{status.username}</span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDisconnect}
            disabled={busy !== null}
            className="h-8 gap-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
          >
            {busy === "disconnect" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Unplug className="size-3.5" />
            )}
            Disconnect
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            Last synced:{" "}
            {status.lastSyncedAt
              ? new Date(status.lastSyncedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "never"}
          </span>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={busy !== null}
            className="h-8 gap-1.5 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25"
          >
            {busy === "sync" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Sync contributions
          </Button>
        </div>

        {error && <FormError message={error} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Username">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="octocat"
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
        />
      </Field>

      <Field label="Personal Access Token">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="••••••••••••••••••••"
          autoComplete="new-password"
          className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
        />
      </Field>

      {error && <FormError message={error} />}

      <Button
        onClick={handleConnect}
        disabled={!username.trim() || !token.trim() || busy !== null}
        className="h-10 w-full gap-2 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/25"
      >
        {busy === "connect" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GitBranch className="size-4" />
        )}
        {busy === "connect" ? "Connecting…" : "Connect GitHub"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-500/[0.06] px-3 py-2.5 text-xs text-red-300">
      <XCircle className="size-3.5 shrink-0" />
      {message}
    </div>
  );
}
