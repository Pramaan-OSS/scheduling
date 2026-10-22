import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { ContactCatalogue, usableContactAction, contactInput, connectContactAction, estimateContact, startContact, contactResult } from "../../features/bookings/contacts/service";
const description = { app: "connected_fixture", action: "CONTACT_CREATE", inputSchema: { type: "object", properties: { email: { type: "string" }, name: { type: "string" } }, required: ["email"] } };
const action = usableContactAction(description)!;
test("contact discovery loads one page on demand and caches previous pages", async () => {
 const fake = new FakePramaan({ [Cap.appsCatalogSearch]: (input:any) => ({ results: [description], ...(input.cursor ? {} : { nextCursor:"next" }) }) });
 const catalogue = new ContactCatalogue();
 expect((await catalogue.page(fake)).choices).toHaveLength(1);await catalogue.page(fake);expect(fake.calls).toHaveLength(1);
 await catalogue.page(fake,"next");expect(fake.calls).toHaveLength(2);expect(fake.calls[1]!.input).toMatchObject({cursor:"next"});
 await expect(catalogue.page(fake,"guessed")).rejects.toThrow("fresh contact search");expect(fake.calls).toHaveLength(2);
});
test("unknown required fields and unsupported schemas are skipped instead of guessed", () => {
 expect(usableContactAction({...description,inputSchema:{...description.inputSchema,required:["accountId"]}})).toBeNull();
 expect(usableContactAction({...description,inputSchema:{type:"object",properties:{email:{type:"string",pattern:".*"}},required:["email"]}})).toBeNull();
 expect(contactInput(action,{email:"person@example.test",name:"A Person",accountId:"foreign"})).toEqual({email:"person@example.test",name:"A Person"});
 expect(()=>contactInput(action,{name:"A Person"})).toThrow("Enter email");
});
test("connection and estimate use the actor's reference, then run the reviewed input once", async () => {
 const fake = new FakePramaan({ [Cap.appsConnectionStart]:()=>({connectUrl:"https://connect.example.test/fixture"}), [Cap.appsConnectionsList]:()=>({results:[{app:description.app,status:"active",access:"read-write",accessConfirmed:true}]}), [Cap.appsActionExecute]:()=>({status:"succeeded",output:{}}) });
 fake.routeEstimate(()=>({priceMaxMicro:1500,balanceMicro:10000,canRun:true}));
 expect(await connectContactAction(fake,42,action,"https://booking.example.test/booking/fixture")).toBe("https://connect.example.test/fixture");
 expect(fake.calls[0].input).not.toHaveProperty("access");
 expect(fake.calls[0].opts?.idempotencyKey).toBeTruthy();
 const quote=await estimateContact(fake,42,action,{email:"person@example.test"});
 expect(quote.input).toMatchObject({endUserRef:"booking-user-42",action:"CONTACT_CREATE"});
 expect(fake.calls.some(call=>call.id===Cap.appsActionExecute)).toBe(false);
 await startContact(fake,quote.input,quote.estimate,"review");
 const call=fake.calls.find(call=>call.id===Cap.appsActionExecute)!;expect(call.input).toEqual(quote.input);expect(call.opts).toMatchObject({idempotencyKey:"contact-review",maxPriceMicro:1500});
});
test("an unconfirmed or read-only connection cannot create a contact", async () => {
 const fake=new FakePramaan({[Cap.appsConnectionsList]:()=>({results:[{app:description.app,status:"active",access:"read"}]})});
 await expect(estimateContact(fake,42,action,{email:"person@example.test"})).rejects.toThrow("confirm its access");expect(fake.estimateCalls).toHaveLength(0);
});
test("unavailable contact discovery never retries and uncertain results stay uncertain", async () => {
 const fake=new FakePramaan({[Cap.appsCatalogSearch]:()=>{throw new PramaanError("upstream_unavailable","hidden")}});
 await expect(new ContactCatalogue().page(fake)).rejects.toThrow();expect(fake.calls).toHaveLength(1);
 expect(contactResult({})).toMatchObject({status:"unknown"});expect(contactResult({status:"failed",error:"hidden"}).message).not.toContain("hidden");
});
