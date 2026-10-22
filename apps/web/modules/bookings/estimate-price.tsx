import type { ReactNode } from "react";
export function EstimatePrice({estimate, fallback, money}: {estimate:{priceMaxMicro:number;priceTypicalMicro?:number};fallback:ReactNode;money:(micro:number)=>string}) {
 return estimate.priceTypicalMicro !== undefined ? <><strong>usually about {money(estimate.priceTypicalMicro)}</strong><small className="block">at most {money(estimate.priceMaxMicro)}</small></> : <>{fallback}</>;
}
