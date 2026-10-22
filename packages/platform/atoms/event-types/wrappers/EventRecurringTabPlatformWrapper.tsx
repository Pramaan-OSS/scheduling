import type { EventRecurringTabProps } from "@scheduling/features/eventtypes/components/tabs/recurring/EventRecurringTab";
import { EventRecurringTab } from "@scheduling/features/eventtypes/components/tabs/recurring/EventRecurringTab";

const EventRecurringTabPlatformWrapper = (props: EventRecurringTabProps) => {
  return <EventRecurringTab {...props} />;
};

export default EventRecurringTabPlatformWrapper;
