import { useMemo, useEffect } from "react";

import dayjs from "@scheduling/dayjs";
import { useBookerStoreContext } from "@scheduling/features/bookings/Booker/BookerStoreProvider";
import { useAvailableTimeSlots } from "@scheduling/features/bookings/Booker/hooks/useAvailableTimeSlots";
import { useBookerTime } from "@scheduling/features/bookings/Booker/hooks/useBookerTime";
import type { BookerEvent } from "@scheduling/features/bookings/types";
import { Calendar } from "@scheduling/web/modules/calendars/weeklyview/components/Calendar";
import type { CalendarEvent } from "@scheduling/features/calendars/weeklyview/types/events";
import { localStorage } from "@scheduling/lib/webstorage";

import type { useScheduleForEventReturnType } from "@scheduling/web/modules/schedules/hooks/useEvent";
import { getQueryParam } from "@scheduling/features/bookings/Booker/utils/query-param";
import { useOverlayCalendarStore } from "@scheduling/features/bookings/Booker/components/OverlayCalendar/store";

export const LargeCalendar = ({
  extraDays,
  schedule,
  isLoading,
  event,
}: {
  extraDays: number;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  event: {
    data?: Pick<BookerEvent, "length"> | null;
  };
}) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStoreContext((state) => state.setSelectedTimeslot);
  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const overlayEvents = useOverlayCalendarStore((state) => state.overlayBusyDates);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");
  const { timezone } = useBookerTime();

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useAvailableTimeSlots({ schedule, eventDuration });

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  // HACK: force rerender when overlay events change
  // Sine we dont use react router here we need to force rerender (ATOM SUPPORT)
  useEffect(() => {}, [displayOverlay]);

  const overlayEventsForDate = useMemo(() => {
    if (!overlayEvents || !displayOverlay) return [];
    return overlayEvents.map((event, id) => {
      return {
        id,
        start: dayjs(event.start).toDate(),
        end: dayjs(event.end).toDate(),
        title: "Busy",
        options: {
          status: "ACCEPTED",
          borderOnly: true,
        },
      } as CalendarEvent;
    });
  }, [overlayEvents, displayOverlay]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isPending={isLoading}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={overlayEventsForDate}
        startDate={startDate}
        endDate={endDate}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toISOString())}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
        timezone={timezone}
      />
    </div>
  );
};
