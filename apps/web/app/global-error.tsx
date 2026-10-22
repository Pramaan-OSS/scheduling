"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <html lang="en"><body><main><h1>This page could not be loaded.</h1><p>Please try again.</p><button onClick={reset}>Reload page</button></main></body></html>;
}
