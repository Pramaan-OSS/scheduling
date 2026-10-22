import type { ITaskerDependencies } from "@scheduling/lib/tasker/types";

import { IBookingEmailAndSmsTasker } from "./types";

export class BookingEmailAndSmsWorkerTasker implements IBookingEmailAndSmsTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async request(payload: Parameters<IBookingEmailAndSmsTasker["request"]>[0]): Promise<never> {
    throw new Error("Use the application worker for background jobs.");
  }

  async confirm(payload: Parameters<IBookingEmailAndSmsTasker["confirm"]>[0]): Promise<never> {
    throw new Error("Use the application worker for background jobs.");
  }

  async reschedule(payload: Parameters<IBookingEmailAndSmsTasker["reschedule"]>[0]): Promise<never> {
    throw new Error("Use the application worker for background jobs.");
  }

  async rrReschedule(payload: Parameters<IBookingEmailAndSmsTasker["rrReschedule"]>[0]): Promise<never> {
    throw new Error("Use the application worker for background jobs.");
  }
}
