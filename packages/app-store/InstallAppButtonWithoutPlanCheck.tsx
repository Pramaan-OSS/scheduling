"use client";

import type { UseAddAppMutationOptions } from "@scheduling/app-store/_utils/useAddAppMutation";
import useAddAppMutation from "@scheduling/app-store/_utils/useAddAppMutation";
import { deriveAppDictKeyFromType } from "@scheduling/lib/deriveAppDictKeyFromType";
import type { App } from "@scheduling/types/App";

import { InstallAppButtonMap } from "./apps.browser.generated";
import type { InstallAppButtonProps } from "./types";

export const InstallAppButtonWithoutPlanCheck = (
  props: {
    type: App["type"];
    options?: UseAddAppMutationOptions;
  } & InstallAppButtonProps
) => {
  const mutation = useAddAppMutation(null, props.options);
  return (
      <>
        {props.render({
          useDefaultComponent: true,
          disabled: props.disableInstall,
          onClick: () => {
            mutation.mutate({ type: props.type });
          },
          loading: mutation.data?.setupPending,
        })}
      </>
    );

};
