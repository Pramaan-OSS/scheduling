import { expect, test, vi } from "vitest";
import type { Payment } from "@scheduling/prisma/client";
import { processNoShowFeeOnCancellation } from "./processNoShowFeeOnCancellation";
import { handleNoShowFee } from "./handleNoShowFee";
vi.mock("./handleNoShowFee", () => ({ handleNoShowFee: vi.fn() }));
test("cannot charge a saved card hold during cancellation", async () => { await expect(processNoShowFeeOnCancellation({ booking: { id: 1 } as never, payments: [{ paymentOption: "HOLD", success: false }] as Payment[] })).rejects.toThrow("not available yet"); expect(handleNoShowFee).not.toHaveBeenCalled(); });
