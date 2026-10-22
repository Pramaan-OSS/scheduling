import { createHash } from "node:crypto";
import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";
export async function changeManagedRecord(action: "set" | "delete", input: { ref: string; name: string; value: string }, client?: Pramaan) {
  try {
    const record = { type: "CNAME", name: input.name, value: input.value, ttl: 300 };
    const result = await (client || requirePramaan()).call(Cap.domainsDnsRecordsApply, { ref: input.ref, [action]: [record] }, {
      idempotencyKey: `dns-${createHash("sha256").update(JSON.stringify({ action, input })).digest("hex")}`,
    }) as { results?: { status: string }[] };
    const accepted = action === "set" ? ["created", "updated", "unchanged"] : ["deleted", "absent"];
    if (result.results?.length !== 1 || !accepted.includes(result.results[0]!.status)) throw new Error("Domain change was not confirmed.");
    return true;
  } catch (error) { throw new Error(unavailableMessage(error)); }
}
