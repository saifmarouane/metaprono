"use client";

import { useEffect } from "react";

export default function ExplorerSlotError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Explorer slot error:", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-white/70">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        Try again
      </button>
    </div>
  );
}
