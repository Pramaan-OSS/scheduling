"use client";

import getBrandColours from "@scheduling/lib/getBrandColours";
import useTheme from "@scheduling/lib/hooks/useTheme";
import useMeQuery from "@scheduling/trpc/react/hooks/useMeQuery";
import { useSchedulingTheme } from "@scheduling/ui/styles";

export const useAppTheme = () => {
  const { data: user } = useMeQuery();
  const brandTheme = getBrandColours({
    lightVal: user?.brandColor,
    darkVal: user?.darkBrandColor,
  });
  useSchedulingTheme(brandTheme);
  useTheme(user?.appTheme);
};
