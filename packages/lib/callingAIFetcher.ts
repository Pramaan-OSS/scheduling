export default async function unavailableCall(..._args: unknown[]): Promise<never> { throw new Error("Browser calling is not available yet."); }
