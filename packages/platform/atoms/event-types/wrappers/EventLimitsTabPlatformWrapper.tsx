import { EventLimitsTab } from "@scheduling/features/eventtypes/components/tabs/limits/EventLimitsTab";
import type { EventLimitsTabProps } from "@scheduling/features/eventtypes/components/tabs/limits/EventLimitsTab";

const EventLimitsTabPlatformWrapper = (props: EventLimitsTabProps) => {
  return <EventLimitsTab {...props} />;
};

export default EventLimitsTabPlatformWrapper;
