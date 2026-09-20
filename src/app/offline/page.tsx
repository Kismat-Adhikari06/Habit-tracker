export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-900 ring-1 ring-neutral-800">
        <span className="text-2xl">📡</span>
      </div>
      <h1 className="text-lg font-semibold text-neutral-100">You're offline</h1>
      <p className="max-w-xs text-sm text-neutral-500">
        Habit Activity needs a connection to load your data. Check your network
        and try again.
      </p>
    </div>
  );
}
