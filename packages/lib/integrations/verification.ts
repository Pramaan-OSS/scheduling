import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";
export async function verifyChallenge(input: { token: string; remoteIp?: string }, client?: Pramaan) {
  try {
    const result = await (client || requirePramaan()).call(Cap.authBotCheckVerify, input) as { passed?: boolean };
    if (result.passed !== true) throw new Error("The challenge could not be verified.");
    return { success: true, checked: true };
  } catch (error) { throw new Error(unavailableMessage(error)); }
}
export async function verifyPhone(phone: string, client?: Pramaan) {
  try {
    return await (client || requirePramaan()).call(Cap.peoplePhoneVerify, { phone }) as { valid: boolean; e164?: string };
  } catch (error) { throw new Error(unavailableMessage(error)); }
}
