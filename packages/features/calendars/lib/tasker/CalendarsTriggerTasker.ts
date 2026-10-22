import type { ITaskerDependencies } from "@scheduling/lib/tasker/types";
type TriggerOptions = Record<string, unknown>;
import type { ICalendarsTasker } from "./types";

export class CalendarsTriggerTasker implements ICalendarsTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async ensureDefaultCalendars(
    payload: Parameters<ICalendarsTasker["ensureDefaultCalendars"]>[0],
    options?: TriggerOptions
  ): Promise<{ runId: string }> {
    throw new Error("Use the application worker for background jobs.");
  }
}
