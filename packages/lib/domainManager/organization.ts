import { changeManagedRecord } from "./managed-dns";
function record(slug: string) {
  const ref = process.env.SCHEDULING_DOMAIN_REF;
  const suffix = process.env.SCHEDULING_DOMAIN_SUFFIX;
  const value = process.env.SCHEDULING_DOMAIN_TARGET;
  if (!ref || !suffix || !value) throw new Error("Custom domains are not available yet. Configure a platform-managed domain first.");
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) throw new Error("Choose a valid domain name.");
  return { ref, name: `${slug}.${suffix}`, value };
}
export const createDomain = (slug: string) => changeManagedRecord("set", record(slug));
export const deleteDomain = (slug: string) => changeManagedRecord("delete", record(slug));
export const renameDomain = async (oldSlug: string | null, newSlug: string) => {
  await createDomain(newSlug);
  if (oldSlug) await deleteDomain(oldSlug);
};
