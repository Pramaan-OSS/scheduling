import { getValidRhfFieldName } from "@scheduling/lib/getValidRhfFieldName";

export const getFieldIdentifier = (name: string) => {
  return getValidRhfFieldName(name);
};
