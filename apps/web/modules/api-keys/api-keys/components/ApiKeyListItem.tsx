import { useState } from "react";

import dayjs from "@scheduling/dayjs";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import type { RouterOutputs } from "@scheduling/trpc/react";
import { trpc } from "@scheduling/trpc/react";
import classNames from "@scheduling/ui/classNames";
import { Badge } from "@scheduling/ui/components/badge";
import { Button } from "@scheduling/ui/components/button";
import { Dialog } from "@scheduling/ui/components/dialog";
import { ConfirmationDialogContent } from "@scheduling/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@scheduling/ui/components/dropdown";
import { showToast } from "@scheduling/ui/components/toast";
import { revalidateApiKeysList } from "@scheduling/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/api-keys/actions";

export type TApiKeys = RouterOutputs["viewer"]["apiKeys"]["list"][number];

const ApiKeyListItem = ({
  apiKey,
  lastItem,
  onEditClick,
}: {
  apiKey: TApiKeys;
  lastItem: boolean;
  onEditClick: () => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isExpired = apiKey?.expiresAt ? apiKey.expiresAt < new Date() : null;
  const neverExpires = apiKey?.expiresAt === null;

  const deleteApiKey = trpc.viewer.apiKeys.delete.useMutation({
    async onSuccess() {
      await utils.viewer.apiKeys.list.invalidate();
      await revalidateApiKeysList();
      showToast(t("api_key_deleted"), "success");
    },
    onError(err) {
      console.error(err);
      showToast(t("something_went_wrong"), "error");
    },
  });

  return (
    <div
      key={apiKey.id}
      className={classNames(
        "flex w-full justify-between px-4 py-4 sm:px-6",
        lastItem ? "" : "border-subtle border-b"
      )}>
      <div>
        <div className="flex gap-1">
          <p className="text-sm font-semibold"> {apiKey?.note ? apiKey.note : t("api_key_no_note")}</p>
          {!neverExpires && isExpired && <Badge variant="red">{t("expired")}</Badge>}
          {!isExpired && <Badge variant="green">{t("active")}</Badge>}
        </div>
        <div className="mt-1 flex items-center space-x-3.5">
          <p className="text-default text-sm">
            {neverExpires ? (
              <div className="flex flex-row space-x-3">{t("api_key_never_expires")}</div>
            ) : (
              `${isExpired ? t("expired") : t("expires")} ${dayjs(apiKey?.expiresAt?.toString()).fromNow()}`
            )}
          </p>
        </div>
      </div>
      <div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem>
              <DropdownItem type="button" onClick={onEditClick} StartIcon="pencil">
                {t("edit") as string}
              </DropdownItem>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DropdownItem
                type="button"
                color="destructive"
                disabled={deleteApiKey.isPending}
                onClick={() => setDeleteDialogOpen(true)}
                StartIcon="trash"
                className="rounded-t-none">
                {t("delete") as string}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_api_key_confirm_title")}
          confirmBtnText={t("confirm_delete_api_key")}
          loadingText={t("confirm_delete_api_key")}
          isPending={deleteApiKey.isPending}
          onConfirm={() => {
            deleteApiKey.mutate({
              id: apiKey.id,
            });
            setDeleteDialogOpen(false);
          }}>
          <div className="mt-2">
            <p className="text-subtle text-sm">{t("delete_api_key_warning")}</p>
          </div>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeyListItem;
