import prisma from "@scheduling/prisma";
import type { User } from "@scheduling/prisma/client";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  // If 2FA is disabled or totpCode is valid then delete the user from legacyPayment and database
  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
}
