import { setUser as TracingSetUser } from "@scheduling/lib/observability";
import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import Shell from "~/shell/Shell";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.id) TracingSetUser({ id: session.user.id });

  return (
    <>
      <Shell withoutMain={true}>{children}</Shell>
    </>
  );
};

export default Layout;
