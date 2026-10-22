import type { NumberFilterOperator, TextFilterOperator } from "@scheduling/features/data-table/lib/types";

export type NumberFilterOperatorOption = {
  label: string;
  value: NumberFilterOperator;
};

export type TextFilterOperatorOption = {
  label: string;
  value: TextFilterOperator;
  requiresOperand: boolean;
};
