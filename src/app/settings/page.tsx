import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, GitBranch, ShieldCheck } from "lucide-react";
import { GitHubSettings } from "@/components/github-settings";
import { getGitHubStatus } from "@/app/github-actions";
import { getSessionUser } from "@/lib/auth";
import { getLanAppUrl } from "@/app/app-url";
import { AccountSection } from "@/components/account-section";
import { OpenOnPhone, OpenOnPhoneHeader } from "@/components/open-on-phone";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [status, lanUrl] = await Promise.all([getGitHubStatus(), Promise.resolve(getLanAppUrl())]);
  const qrDataUrl = lanUrl
    ? await QRCode.toDataURL(lanUrl, { margin: 1, width: 264, color: { dark: "#0a0a0a", light: "#ffffff" } })
    : null;

  return (
    <div className="safe-top mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <ArrowLeft className="size-3.5" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your account, integrations, and preferences.</p>
      </header>

      <div className="flex flex-col gap-4">
        {/* Account */}
        <section className="rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-100">Account</h2>
          <AccountSection email={user.email} />
        </section>

        {/* GitHub Integration */}
        <section className="rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-5">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <GitBranch className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-neutral-100">GitHub Integration</h2>
          </div>
          <p className="mb-5 text-xs text-neutral-500">
            Connect with a Personal Access Token to sync your contribution activity. The connection
            follows your account, so it works on every device you sign in from.
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

        {/* Open on Phone */}
        <section className="rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-5">
          <OpenOnPhoneHeader />
          <p className="mb-5 text-xs text-neutral-500">
            Scan with your phone to open Habit Activity on the same Wi-Fi network. The QR code
            contains only the app URL — you sign in with your account as usual.
          </p>
          {lanUrl && qrDataUrl ? (
            <OpenOnPhone qrDataUrl={qrDataUrl} appUrl={lanUrl} />
          ) : (
            <p className="text-xs text-neutral-500">
              Could not detect a LAN address on this machine. Run the app with{" "}
              <code className="rounded bg-neutral-950 px-1 py-0.5 text-[11px]">npm run dev:mobile</code>{" "}
              and check the printed phone URL instead.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
