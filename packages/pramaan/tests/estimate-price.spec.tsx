import {expect,test} from "bun:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {PramaanClient} from "../src/sdk/client";
import {EstimatePrice} from "../../../apps/web/modules/bookings/estimate-price";
for(const typical of [undefined,0,50]) test(`estimate display with typical ${typical}`,async()=>{
 const client = new PramaanClient({apiKey:"fake",fetch:async()=>Response.json({price_max_micro:100,...(typical===undefined?{}:{price_typical_micro:typical}),ready:true,can_run:true,steps:[]})});
 for(const estimate of [await client.capabilities.estimate("apps.action.execute",{}),await client.outcomes.estimate("meeting.brief",{})]) {
 expect(estimate.priceMaxMicro).toBe(100);expect(estimate.priceTypicalMicro).toBe(typical);
 const html=renderToStaticMarkup(createElement(EstimatePrice,{estimate,money:micro=>`$${(micro/1_000_000).toFixed(6)}`,fallback:"Previous estimate"}));
 if(typical===undefined)expect(html).toBe("Previous estimate");
 else {expect(html).toContain(`<strong>usually about $${(typical/1_000_000).toFixed(6)}</strong>`);expect(html).toContain('<small class="block">at most $0.000100</small>');}
 }
});
