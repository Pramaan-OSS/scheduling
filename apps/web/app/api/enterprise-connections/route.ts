import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { enterpriseConnections } from "@scheduling/features/auth/lib/enterprise-connections";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin)
    return Response.json({ message: "This request could not be verified." }, { status: 403 });
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.role !== "ADMIN")
    return Response.json({ message: "Administrator access is required." }, { status: 403 });
  try {
    const { action, input } = await request.json();
    if (!["list", "create", "delete"].includes(action) || !input || typeof input !== "object")
      return Response.json({ message: "Check the connection details." }, { status: 400 });
    return Response.json(await enterpriseConnections(action, input));
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Sign-in is not available yet." },
      { status: 422 }
    );
  }
}
