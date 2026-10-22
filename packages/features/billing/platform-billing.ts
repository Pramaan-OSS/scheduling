import { Cap, type Pramaan } from "@scheduling/pramaan";
import { paymentCall } from "@scheduling/app-store/pramaan-payment/lib/gateway";
const operations = {
  customer: Cap.billingCustomerCreate,
  plan: Cap.billingPlanGet,
  start: Cap.billingSubscriptionCreate,
  status: Cap.billingSubscriptionGet,
  cancel: Cap.billingSubscriptionCancel,
  portal: Cap.billingPortalCreate,
  transactions: Cap.billingTransactionsList,
  refund: Cap.billingRefundCreate,
} as const;
export async function billingAction(
  action: keyof typeof operations,
  input: Record<string, unknown>,
  account: string,
  client?: Pramaan
) {
  const read = ["plan", "status", "transactions"].includes(action);
  return paymentCall(
    operations[action],
    input,
    account,
    read ? undefined : JSON.stringify({ action, input }),
    client
  );
}
