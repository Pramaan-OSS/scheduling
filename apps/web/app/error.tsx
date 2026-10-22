"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="mx-auto max-w-lg p-8"><h1>This page could not be loaded.</h1><p>Please try again.</p><button className="mt-4 rounded-xl border p-2" onClick={reset}>Reload page</button></main>;
}
