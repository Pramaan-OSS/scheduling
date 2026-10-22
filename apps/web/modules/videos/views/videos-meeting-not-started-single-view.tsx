"use client";

import dayjs from "@scheduling/dayjs";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { detectBrowserTimeFormat } from "@scheduling/lib/timeFormat";
import type { inferSSRProps } from "@scheduling/types/inferSSRProps";
import { Button } from "@scheduling/ui/components/button";
import { CalendarIcon } from "@coss/ui/icons";
import { EmptyScreen } from "@scheduling/ui/components/empty-screen";

import type { getServerSideProps } from "@lib/video/meeting-not-started/[uid]/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function MeetingNotStarted(props: PageProps) {
  const { t } = useLocale();
  return (
    <>
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon="clock"
          headline={t("this_meeting_has_not_started_yet")}
          description={
            <>
              <h2 className="mb-2 text-center font-medium">{props.booking.title}</h2>
              <p className="text-subtle text-center">
                <CalendarIcon className="-mt-1 mr-1 inline-block h-4 w-4" />
                {dayjs(props.booking.startTime).format(`${detectBrowserTimeFormat}, dddd DD MMMM YYYY`)}
              </p>
            </>
          }
          buttonRaw={
            <Button data-testid="return-home" href="/event-types" EndIcon="arrow-right">
              {t("go_back")}
            </Button>
          }
        />
      </main>
    </>
  );
}
