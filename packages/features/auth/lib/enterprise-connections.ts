import { createHash } from "node:crypto";
import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";

export async function enterpriseConnections(
  action: "list" | "create" | "delete",
  input: Record<string, unknown>,
  client?: Pramaan
) {
  const id =
    action === "list"
      ? Cap.authEnterpriseConnectionsList
      : action === "create"
        ? Cap.authEnterpriseConnectionCreate
        : Cap.authEnterpriseConnectionDelete;
  try {
    return await (client || requirePramaan()).call(
      id,
      input,
      action === "list"
        ? undefined
        : {
            idempotencyKey: `signin-${createHash("sha256").update(JSON.stringify({ action, input })).digest("hex")}`,
          }
    );
  } catch (error) {
    throw new Error(unavailableMessage(error));
  }
}
