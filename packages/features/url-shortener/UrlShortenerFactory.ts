import type { IUrlShortenerProvider } from "./IUrlShortenerProvider";
import { NoopShortener } from "./providers/NoopShortener";
export class UrlShortenerFactory {
  static async create(options: { userId?: number | null; teamId?: number | null } = {}): Promise<IUrlShortenerProvider> {
    if (!options.userId || options.teamId) return new NoopShortener();
    const owner = options.userId;
    return { async shortenMany(urls) { const { shortenBookingUrl } = await import("./server"); const rows = []; for (const url of urls.slice(0, 10)) rows.push(await shortenBookingUrl(owner, url)); return [...rows, ...urls.slice(10).map(shortLink => ({ shortLink }))]; } };
  }
}
