"use client";

import { useLocale } from "@scheduling/lib/hooks/useLocale";
import type { ButtonProps } from "@scheduling/ui/components/button";
import { Button } from "@scheduling/ui/components/button";

const CreateNewOutOfOfficeEntryButton = ({
  size,
  onClick,
  ...rest
}: {
  size?: ButtonProps["size"];
  onClick: () => void;
  "data-testid"?: string;
}) => {
  const { t } = useLocale();

  return (
    <Button
      color="primary"
      size={size ?? "base"}
      className="flex items-center justify-between px-2 md:px-4"
      StartIcon="plus"
      onClick={onClick}
      data-testid={rest["data-testid"]}>
      <span className="sr-only md:not-sr-only md:inline">{t("add")}</span>
    </Button>
  );
};

export default CreateNewOutOfOfficeEntryButton;
