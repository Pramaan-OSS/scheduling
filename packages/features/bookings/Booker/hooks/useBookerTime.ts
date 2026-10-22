import { useBookerStoreContext } from "@scheduling/features/bookings/Booker/BookerStoreProvider";
import { getBookerTimezone } from "@scheduling/features/bookings/Booker/utils/getBookerTimezone";
import { useTimePreferences } from "@scheduling/features/bookings/lib/timePreferences";
import { shallow } from "zustand/shallow";

export const useBookerTime = () => {
  const [timezoneFromBookerStore] = useBookerStoreContext((state) => [state.timezone], shallow);
  const { timezone: timezoneFromTimePreferences, timeFormat } = useTimePreferences();
  const timezone = getBookerTimezone({
    storeTimezone: timezoneFromBookerStore,
    bookerUserPreferredTimezone: timezoneFromTimePreferences,
  });

  return {
    timezone,
    timeFormat,
    timezoneFromBookerStore,
    timezoneFromTimePreferences,
  };
};
