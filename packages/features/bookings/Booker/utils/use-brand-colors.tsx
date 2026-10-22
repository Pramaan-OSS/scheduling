import useGetBrandingColours from "@scheduling/lib/getBrandColours";
import useTheme from "@scheduling/lib/hooks/useTheme";
import { useSchedulingTheme } from "@scheduling/ui/styles";

export const useBrandColors = ({
  brandColor,
  darkBrandColor,
  theme,
}: {
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string | null;
}) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });

  useSchedulingTheme(brandTheme);
  useTheme(theme);
};
