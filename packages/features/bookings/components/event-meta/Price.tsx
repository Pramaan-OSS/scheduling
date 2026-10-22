import { formatPrice } from "@scheduling/lib/currencyConversions";
import type { EventPrice } from "@scheduling/features/bookings/types";
export const Price = ({ price, currency }: EventPrice) => price === 0 ? null : <>{formatPrice(price, currency)}</>;
