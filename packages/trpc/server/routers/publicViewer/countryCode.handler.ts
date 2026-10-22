import type { CreateInnerContextOptions } from "../../createContext";

type CountryCodeOptions = {
  ctx: CreateInnerContextOptions;
};

export const countryCodeHandler = async ({ ctx }: CountryCodeOptions) => {
  const { req } = ctx;

  const countryCode: string | string[] = req?.headers?.["x-hosting-ip-country"] ?? "";
  return { countryCode: Array.isArray(countryCode) ? countryCode[0] : countryCode };
};

export default countryCodeHandler;
