import Link from "next/link";
import { ArrowLeft, GitBranch, ShieldCheck } from "lucide-react";
import { GitHubSettings } from "@/components/github-settings";
import { getGitHubStatus } from "@/app/github-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const status = await getGitHubStatus();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <ArrowLeft className="size-3.5" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage integrations and preferences.</p>
      </header>

      <section className="rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <GitBranch className="size-4" />
          </span>
          <h2 className="text-sm font-semibold text-neutral-100">GitHub Integration</h2>
        </div>
        <p className="mb-5 text-xs text-neutral-500">
          Connect with a Personal Access Token to sync your contribution activity.
        </p>

        <GitHubSettings initialStatus={status} />

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
          <p className="text-[11px] leading-relaxed text-neutral-500">
            Your token is validated against GitHub&apos;s GraphQL API, then encrypted with
            AES-256-GCM before being stored. It is never sent back to your browser, cached,
            or logged. Create a token at{" "}
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-400 underline underline-offset-2 hover:text-neutral-200"
            >
              github.com/settings/tokens
            </a>{" "}
            — no scopes are needed to read your contribution calendar.
          </p>
        </div>
      </section>
    </div>
  );
}
