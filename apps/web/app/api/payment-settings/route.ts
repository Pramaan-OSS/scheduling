import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import { Cap, requirePramaan, unavailableMessage } from "@scheduling/pramaan";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
async function administrator() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  return session?.user?.role === "ADMIN" ? session.user.id : null;
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin)
    return Response.json({ message: "This request could not be verified." }, { status: 403 });
  const userId = await administrator();
  if (!userId)
    return Response.json(
      { message: "Ask your administrator to connect a payment account." },
      { status: 403 }
    );
  try {
    const input = await request.json();
    const client = requirePramaan();
    const accounts = (await client.accounts.list()).results.filter(
      (row) => row.family === "payments" && row.origin === "own" && row.status === "connected"
    );
    if (input.action === "list")
      return Response.json({
        results: accounts.map((row, index) => ({ id: row.id, name: `Payment account ${index + 1}` })),
      });
    if (input.action === "onboard" && input.confirmed === true) {
      const result = (await client.call(
        Cap.paymentsAccountConnect,
        {
          returnUrl: `${WEBAPP_URL}/settings/my-account/payments`,
          refreshUrl: `${WEBAPP_URL}/settings/my-account/payments`,
        },
        { idempotencyKey: `payment-account-${userId}` }
      )) as { onboardingUrl?: string };
      return Response.json({ url: result.onboardingUrl });
    }
    if (
      input.action !== "connect" ||
      input.confirmed !== true ||
      !accounts.some((row) => row.id === input.account)
    )
      return Response.json({ message: "Review and choose an owned payment account." }, { status: 400 });
    await prisma.$transaction(async (database) => {
      await database.app.upsert({
        where: { slug: "pramaan-payment" },
        create: {
          slug: "pramaan-payment",
          dirName: "pramaan-payment",
          categories: ["payment"],
          enabled: true,
        },
        update: { enabled: true },
      });
      const existing = await database.credential.findFirst({ where: { userId, type: "pramaan_payment" } });
      if (existing)
        await database.credential.update({
          where: { id: existing.id },
          data: { key: { account: input.account } },
        });
      else
        await database.credential.create({
          data: {
            userId,
            type: "pramaan_payment",
            appId: "pramaan-payment",
            key: { account: input.account },
          },
        });
    });
    return Response.json({ message: "Payment account connected." });
  } catch (error) {
    return Response.json({ message: unavailableMessage(error) }, { status: 422 });
  }
}
