import { EventLimitsTab } from "@scheduling/features/eventtypes/components/tabs/limits/EventLimitsTab";
import type { EventLimitsTabProps } from "@scheduling/features/eventtypes/components/tabs/limits/EventLimitsTab";

const EventLimitsTabWebWrapper = (props: EventLimitsTabProps) => {
  return <EventLimitsTab {...props} />;
};

export default EventLimitsTabWebWrapper;
