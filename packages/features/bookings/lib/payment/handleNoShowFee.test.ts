import { expect, test } from "vitest";
import { handleNoShowFee } from "./handleNoShowFee";
test("cannot turn a legacy card hold into an automatic charge", async () => { await expect(handleNoShowFee({ booking: {}, payment: {} as never })).rejects.toThrow("not available yet"); });
