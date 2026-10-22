import type { TFunction } from "i18next";

type LearnMoreLinkProps = {
  t: TFunction;
  i18nKey: string;
};

export const LearnMoreLink = ({ t, i18nKey }: LearnMoreLinkProps) => {
  const text = t(i18nKey).replace(/<0>[\s\S]*?<\/0>/g, "").trim();
  return <>{text}</>;
};
