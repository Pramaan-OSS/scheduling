import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import type { App } from "@scheduling/types/App";

type CustomUseMutationOptions =
  | Omit<UseMutationOptions<unknown, unknown, unknown, unknown>, "mutationKey" | "mutationFn" | "onSuccess">
  | undefined;

type AddAppMutationData = { setupPending: boolean; message?: string } | void;
export type UseAddAppMutationOptions = CustomUseMutationOptions & {
  onSuccess?: (data: AddAppMutationData) => void;
  returnTo?: string;
};

function useAddAppMutation(_type: App["type"] | null, options?: UseAddAppMutationOptions) {

  const mutation = useMutation<
    AddAppMutationData,
    Error,
    | {
        type?: App["type"];
        variant?: string;
        slug?: string;
        teamId?: number;
        returnTo?: string;
        defaultInstall?: boolean;
      }
    | ""
  >({
    ...options,
    mutationFn: async (variables) => {
      const type = variables === "" ? _type : variables.type || _type;
      const target = type === "pramaan_calendar" ? "/settings/my-account/calendars"
        : type === "pramaan_payment" ? "/settings/my-account/payments"
        : type === "weather_in_your_calendar_other" ? "/apps/weather_in_your_calendar/setup" : null;
      if (!target) throw new Error("This connection is not available yet. Use your connected calendar or payment settings.");
      window.location.assign(target);
      return { setupPending: true };
    },
  });

  return mutation;
}

export default useAddAppMutation;
