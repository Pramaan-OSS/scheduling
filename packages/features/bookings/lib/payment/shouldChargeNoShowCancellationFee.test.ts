import { expect, test } from "vitest";
import { shouldChargeNoShowCancellationFee } from "./shouldChargeNoShowCancellationFee";
test("saved legacy fee settings cannot make cancellation charge a card", () => { expect(shouldChargeNoShowCancellationFee({ eventTypeMetadata: { apps: { legacy: { autoChargeNoShowFeeIfCancelled: true, paymentOption: "HOLD" } } }, booking: {}, payment: { appId: "legacy" } })).toBe(false); });
