"use client";

import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { Alert } from "@scheduling/ui/components/alert";

export default function Error() {
  const { t } = useLocale();
  return <Alert severity="error" title={t("something_went_wrong")} />;
}
