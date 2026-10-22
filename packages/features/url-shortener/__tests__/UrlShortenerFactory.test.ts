import { expect, test } from "vitest";
import { UrlShortenerFactory } from "../UrlShortenerFactory";
test("keeps the application URL without contacting a shortener", async () => { const service = await UrlShortenerFactory.create(); expect(await service.shortenMany(["https://booking.example.test/booking/fixture"])).toEqual([{ shortLink: "https://booking.example.test/booking/fixture" }]); });
