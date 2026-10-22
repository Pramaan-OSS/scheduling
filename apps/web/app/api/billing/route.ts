import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { billingAction } from "@scheduling/features/billing/platform-billing";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import { requirePramaan, unavailableMessage } from "@scheduling/pramaan";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin)
    return Response.json({ message: "This request could not be verified." }, { status: 403 });
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.role !== "ADMIN")
    return Response.json({ message: "Administrator access is required." }, { status: 403 });
  try {
    const person = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const requestData = await request.json();
    const client = requirePramaan();
    const data = (person.metadata || {}) as Record<string, any>;
    if (requestData.action === "accounts") {
      const results = (await client.accounts.list()).results.filter(
        (row) => row.family === "billing" && row.origin === "own" && row.status === "connected"
      );
      return Response.json({
        results: results.map((row, index) => ({ id: row.id, name: `Billing account ${index + 1}` })),
      });
    }
    if (requestData.action === "connect") {
      if (
        requestData.confirmed !== true ||
        !(await client.accounts.list()).results.some(
          (row) =>
            row.id === requestData.account &&
            row.family === "billing" &&
            row.origin === "own" &&
            row.status === "connected"
        )
      )
        return Response.json({ message: "Review and choose an owned billing account." }, { status: 400 });
      const customer = (await billingAction(
        "customer",
        { email: person.email, ...(person.name ? { name: person.name } : {}) },
        requestData.account,
        client
      )) as { customerId?: string };
      if (!customer.customerId)
        return Response.json({ message: "Billing setup could not be confirmed." }, { status: 422 });
      await prisma.user.update({
        where: { id: person.id },
        data: {
          metadata: { ...data, billingAccount: requestData.account, billingCustomerId: customer.customerId },
        },
      });
      return Response.json({ message: "Billing account connected." });
    }
    if (!data.billingAccount || !data.billingCustomerId)
      return Response.json({ message: "Connect a billing account first." }, { status: 422 });
    const action = requestData.action;
    if (["plan", "start"].includes(action)) {
      const planId = process.env.SCHEDULING_BILLING_PLAN_ID;
      if (!planId)
        return Response.json(
          { message: "Ask your administrator to configure a billing plan." },
          { status: 422 }
        );
      const plan = (await billingAction("plan", { planId }, data.billingAccount, client)) as {
        recurringAmount?: { amount: number; currency: string };
        interval?: string;
        intervalCount?: number;
      };
      const review = {
        amount: plan.recurringAmount,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
      };
      const hash = createHash("sha256").update(JSON.stringify({ planId, review })).digest("hex");
      if (action === "plan") return Response.json({ plan: review, hash });
      if (requestData.confirmed !== true || requestData.hash !== hash)
        return Response.json({ message: "The plan changed. Review it again." }, { status: 409 });
      if (data.billingSubscriptionId)
        return Response.json(
          { message: "A subscription already exists. Check its status before starting again." },
          { status: 409 }
        );
      const subscriptionId = `subscription_${person.id}_${hash.slice(0, 16)}`;
      await prisma.user.update({
        where: { id: person.id },
        data: { metadata: { ...data, billingSubscriptionId: subscriptionId } },
      });
      const result = (await billingAction(
        "start",
        {
          subscriptionId,
          planId,
          customerEmail: person.email,
          ...(person.name ? { customerName: person.name } : {}),
        },
        data.billingAccount,
        client
      )) as { status?: string };
      return Response.json({
        message:
          result.status === "active"
            ? "Subscription confirmed active."
            : "Subscription requested. Check its status; authorization may still be needed.",
      });
    }
    if (["status", "cancel"].includes(action)) {
      if (!data.billingSubscriptionId)
        return Response.json({ message: "No subscription has been started here." }, { status: 422 });
      if (action === "cancel" && requestData.confirmed !== true)
        return Response.json({ message: "Review cancellation first." }, { status: 400 });
      const result = (await billingAction(
        action,
        {
          subscriptionId: data.billingSubscriptionId,
          ...(action === "cancel" ? { when: "period_end" } : {}),
        },
        data.billingAccount,
        client
      )) as { status?: string; cancelAtPeriodEnd?: boolean };
      return Response.json({
        message: result.cancelAtPeriodEnd
          ? "Cancellation scheduled for the end of the paid period."
          : result.status === "active"
            ? "Subscription is active."
            : result.status === "canceled"
              ? "Subscription is canceled."
              : "Subscription is not confirmed active. Check the billing account before retrying.",
      });
    }
    if (action === "portal") {
      if (requestData.confirmed !== true)
        return Response.json({ message: "Confirm opening the billing portal." }, { status: 400 });
      const result = (await billingAction(
        "portal",
        { customerId: data.billingCustomerId, returnUrl: `${WEBAPP_URL}/settings/my-account/payments` },
        data.billingAccount,
        client
      )) as { portalUrl?: string };
      return Response.json({ url: result.portalUrl });
    }
    if (action === "transactions") {
      const result = (await billingAction(
        "transactions",
        {
          customerId: data.billingCustomerId,
          limit: 20,
          ...(requestData.cursor ? { cursor: requestData.cursor } : {}),
        },
        data.billingAccount,
        client
      )) as { results?: { transactionId: string; status: string; amount?: unknown }[]; nextCursor?: string };
      return Response.json({
        results: result.results?.map((row, index) => ({
          id: row.transactionId,
          name: `Charge ${index + 1}`,
          status: ["pending", "succeeded", "failed", "refunded"].includes(row.status)
            ? row.status
            : "unknown",
          amount: row.amount,
        })),
        nextCursor: result.nextCursor,
      });
    }
    if (action === "refund" && requestData.confirmed === true) {
      const charges = (await billingAction(
        "transactions",
        { customerId: data.billingCustomerId, limit: 50 },
        data.billingAccount,
        client
      )) as { results?: { transactionId: string }[] };
      if (!charges.results?.some((row) => row.transactionId === requestData.transactionId))
        return Response.json({ message: "Choose a charge from this billing account." }, { status: 400 });
      const result = (await billingAction(
        "refund",
        { transactionId: requestData.transactionId },
        data.billingAccount,
        client
      )) as { status?: string };
      return Response.json({
        message:
          result.status === "succeeded"
            ? "Refund confirmed."
            : result.status === "pending"
              ? "Refund requested. Completion is pending."
              : "Refund could not be confirmed. Check before retrying.",
      });
    }
    return Response.json({ message: "This billing action is not available yet." }, { status: 422 });
  } catch (error) {
    return Response.json({ message: unavailableMessage(error) }, { status: 422 });
  }
}
