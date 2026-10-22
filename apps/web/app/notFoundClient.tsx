"use client";

import { useLocale } from "@scheduling/lib/hooks/useLocale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export function NotFound(_props: { host: string }) {
  const { t } = useLocale();
  const isBooking = (usePathname() ?? "").startsWith("/booking");
  useLayoutEffect(() => { window.SchedulingPageStatus = "404"; }, []);
  return (
    <div className="min-h-screen bg-default px-4" data-testid="404-page">
      <main className="mx-auto max-w-xl pt-16 pb-6 text-center sm:pt-24">
        <p className="font-semibold text-emphasis text-sm uppercase tracking-wide">{t("error_404")}</p>
        <h1 className="mt-2 font-cal font-extrabold text-4xl text-emphasis sm:text-5xl">
          {isBooking ? "Booking not found" : t("page_doesnt_exist")}
        </h1>
        <p className="mt-2 text-lg">{t("check_spelling_mistakes_or_go_back")}</p>
        <Link href="/event-types" className="mt-8 inline-block font-medium text-emphasis hover:text-subtle">
          {t("or_go_back_home")} <span aria-hidden="true">&rarr;</span>
        </Link>
      </main>
    </div>
  );
}
