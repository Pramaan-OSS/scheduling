import { useFlagMap } from "@scheduling/features/flags/context/provider";
import { isKeyInObject } from "@scheduling/lib/isKeyInObject";

import type { NavigationItemType } from "./NavigationItem";

export function useShouldDisplayNavigationItem(item: NavigationItemType) {
  const flags = useFlagMap();
  if (isKeyInObject(item.name, flags)) return flags[item.name];
  return true;
}
