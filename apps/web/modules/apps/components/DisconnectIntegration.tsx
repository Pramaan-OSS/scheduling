"use client";

import { useState } from "react";

import { isDelegationCredential } from "@scheduling/lib/delegationCredential";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { trpc } from "@scheduling/trpc/react";
import type { ButtonProps } from "@scheduling/ui/components/button";
import { DisconnectIntegrationComponent } from "@scheduling/ui/components/disconnect-calendar-integration";
import { showToast } from "@scheduling/ui/components/toast";

export default function DisconnectIntegration(props: {
  credentialId: number;
  teamId?: number | null;
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
}) {
  const { t } = useLocale();
  const { onSuccess, credentialId, teamId } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      setModalOpen(false);
      onSuccess && onSuccess();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setModalOpen(false);
    },
    async onSettled() {
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.integrations.invalidate();
    },
  });

  // Such a credential is added in-memory and removed when Delegation credential is disabled.
  const disableDisconnect = isDelegationCredential({ credentialId });
  return (
    <DisconnectIntegrationComponent
      onDeletionConfirmation={() => mutation.mutate({ id: credentialId, ...(teamId ? { teamId } : {}) })}
      isModalOpen={modalOpen}
      onModalOpen={() => setModalOpen((prevValue) => !prevValue)}
      disabled={disableDisconnect}
      {...props}
    />
  );
}
