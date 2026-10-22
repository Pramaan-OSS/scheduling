"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { Loader } from "@scheduling/ui/components/skeleton";

const TroubleshooterClientOnly = dynamic(
  () =>
    import("@scheduling/web/modules/troubleshooter/components/Troubleshooter").then((mod) => mod.Troubleshooter),
  {
    ssr: false,
  }
);

function TroubleshooterPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Loader />
          </div>
        }>
        <TroubleshooterClientOnly month={null} />
      </Suspense>
    </>
  );
}

export default TroubleshooterPage;
