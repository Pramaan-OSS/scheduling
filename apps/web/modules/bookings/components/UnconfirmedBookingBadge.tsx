"use client";

import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { trpc } from "@scheduling/trpc/react";
import { Badge } from "@scheduling/ui/components/badge";

export default function UnconfirmedBookingBadge() {
  const { t } = useLocale();
  const { data: unconfirmedBookingCount } = trpc.viewer.me.bookingUnconfirmedCount.useQuery();
  if (!unconfirmedBookingCount) return null;
  return (
      <Badge
        rounded
        title={t("unconfirmed_bookings_tooltip")}
        variant="orange"
        className="hover:bg-orange-800 hover:text-orange-100">
        {unconfirmedBookingCount}
      </Badge>
  );
}
