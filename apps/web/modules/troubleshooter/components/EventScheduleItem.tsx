import { EventScheduleItemComponent } from "@scheduling/features/troubleshooter/components/EventScheduleItemComponent";
import { useTroubleshooterStore } from "@scheduling/features/troubleshooter/store";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { trpc } from "@scheduling/trpc/react";
import { Badge } from "@scheduling/ui/components/badge";
import Link from "next/link";

export { EventScheduleItemComponent };

export function EventScheduleItem(): JSX.Element {
  const { t } = useLocale();
  const selectedEventType = useTroubleshooterStore((state) => state.event);

  const { data: schedule } = trpc.viewer.availability.schedule.getScheduleByEventSlug.useQuery(
    {
      eventSlug: selectedEventType?.slug as string,
    },
    {
      enabled: !!selectedEventType?.slug,
    }
  );

  return (
    <EventScheduleItemComponent
      schedule={schedule ?? null}
      suffixSlot={
        schedule && (
          <Link href={`/availability/${schedule.id}`} className="inline-flex">
            <Badge color="orange" size="sm" className="invisible hover:cursor-pointer group-hover:visible">
              {t("edit")}
            </Badge>
          </Link>
        )
      }
    />
  );
}
