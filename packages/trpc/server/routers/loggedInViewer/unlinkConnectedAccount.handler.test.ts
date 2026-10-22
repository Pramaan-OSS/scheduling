import { prisma } from "@scheduling/prisma/__mocks__/prisma";

import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@scheduling/prisma/client";
import { IdentityProvider } from "@scheduling/prisma/enums";

import unlinkConnectedAccountHandler from "./unlinkConnectedAccount.handler";

vi.mock("@scheduling/prisma", () => ({
  prisma,
}));

describe("unlinkConnectedAccount.handler", () => {
  it("Should response with a success message when unlinking an Google account", async () => {
    const user = { id: 1, identityProvider: IdentityProvider.GOOGLE, identityProviderId: null };
    const args: Prisma.UserUpdateArgs = {
      where: {
        id: 1,
        identityProvider: IdentityProvider.GOOGLE,
        identityProviderId: { not: null },
      },
      data: {
        identityProvider: IdentityProvider.CAL,
        identityProviderId: null,
      },
      select: { id: true },
    };

    prisma.user.update.mockResolvedValue({
      id: 1,
    } as Prisma.UserGetPayload<typeof args>);

    const response = await unlinkConnectedAccountHandler({ ctx: { user } });
    expect(prisma.user.update).toHaveBeenCalledWith(args);
    expect(response).toMatchInlineSnapshot(`
      {
        "message": "account_unlinked_success",
      }
    `);
  });
  it("Should respond with an error message if unlink was unsuccessful", async () => {
    const user = { id: 1, identityProvider: IdentityProvider.CAL, identityProviderId: null };
    const response = await unlinkConnectedAccountHandler({ ctx: { user } });
    expect(response).toMatchInlineSnapshot(`
      {
        "message": "account_unlinked_error",
      }
    `);
  });
});

it("keeps a managed identity bound when a disconnect request reaches the server", async () => {
  prisma.user.update.mockClear();
  await expect(unlinkConnectedAccountHandler({ ctx: { user: { id: 1, identityProvider: IdentityProvider.SAML, identityProviderId: "managed:fixture:person" } } })).rejects.toThrow("Managed sign-in stays connected");
  expect(prisma.user.update).not.toHaveBeenCalled();
});
