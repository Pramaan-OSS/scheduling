import type { ITaskerDependencies } from "@scheduling/lib/tasker/types";

import type { WebhookTaskPayload } from "../types/webhookTask";
import type { IWebhookTasker, WebhookDeliveryResult } from "./types";

/**
 * the application worker Webhook Tasker
 *
 * Queues webhook delivery tasks to the application worker for background processing.
 * Used in production environments where ENABLE_ASYNC_TASKER is true and
 * the application worker is configured.
 *
 * This follows the same pattern as BookingEmailAndSmsWorkerTasker and
 * PlatformOrganizationBillingTriggerTasker.
 */
export class WebhookTriggerTasker implements IWebhookTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult> {
    throw new Error("Use the application worker for background jobs.");
  }
}
