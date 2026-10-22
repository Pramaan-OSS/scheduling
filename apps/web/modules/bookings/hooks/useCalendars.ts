import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

import { useOverlayCalendarStore } from "@scheduling/features/bookings/Booker/components/OverlayCalendar/store";
import { useBookerStore } from "@scheduling/features/bookings/Booker/store";
import type { ToggledConnectedCalendars } from "@scheduling/features/bookings/Booker/types";
import { useTimePreferences } from "@scheduling/features/bookings/lib";
import { localStorage } from "@scheduling/lib/webstorage";
import { trpc } from "@scheduling/trpc/react";

type UseCalendarsProps = {
  hasSession: boolean;
};

export const useCalendars = ({ hasSession }: UseCalendarsProps) => {
  const searchParams = useSearchParams();
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const { timezone } = useTimePreferences();
  const switchEnabled =
    searchParams?.get("overlayCalendar") === "true" ||
    localStorage?.getItem("overlayCalendarSwitchDefault") === "true";

  const [set, setSet] = useState<Set<ToggledConnectedCalendars>>(() => {
    const storedValue = localStorage.getItem("toggledConnectedCalendars");
    return storedValue ? new Set(JSON.parse(storedValue)) : new Set([]);
  });

  const [calendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );

  const { data: overlayBusyDates, isError } = trpc.viewer.availability.calendarOverlay.useQuery(
    {
      loggedInUsersTz: timezone || "Europe/London",
      dateFrom: selectedDate,
      dateTo: selectedDate,
      calendarsToLoad: Array.from(set).map((item) => ({
        credentialId: item.credentialId,
        externalId: item.externalId,
      })),
    },
    {
      enabled: hasSession && set.size > 0 && switchEnabled,
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (!isError) return;
      setSet(new Set([]));
    },
    [isError]
  );

  const { data, isPending } = trpc.viewer.calendars.connectedCalendars.useQuery(
    {
      skipSync: true,
    },
    {
      enabled: !!calendarSettingsOverlay || Boolean(searchParams?.get("overlayCalendar")),
    }
  );

  return {
    overlayBusyDates,
    isOverlayCalendarEnabled: switchEnabled,
    connectedCalendars: data?.connectedCalendars || [],
    loadingConnectedCalendar: isPending,
    onToggleCalendar: setSet,
  };
};
