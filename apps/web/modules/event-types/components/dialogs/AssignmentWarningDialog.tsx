import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import type { MutableRefObject } from "react";

import { Dialog } from "@scheduling/features/components/controlled-dialog";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { Button } from "@scheduling/ui/components/button";
import { DialogContent, DialogFooter } from "@scheduling/ui/components/dialog";

interface AssignmentWarningDialogProps {
  isOpenAssignmentWarnDialog: boolean;
  setIsOpenAssignmentWarnDialog: Dispatch<SetStateAction<boolean>>;
  pendingRoute: string;
  leaveWithoutAssigningHosts: MutableRefObject<boolean>;
  id: number;
}

const AssignmentWarningDialog = (props: AssignmentWarningDialogProps) => {
  const { t } = useLocale();
  const {
    isOpenAssignmentWarnDialog,
    setIsOpenAssignmentWarnDialog,
    pendingRoute,
    leaveWithoutAssigningHosts,
    id,
  } = props;
  const router = useRouter();
  return (
    <Dialog open={isOpenAssignmentWarnDialog} onOpenChange={setIsOpenAssignmentWarnDialog}>
      <DialogContent
        title={t("leave_without_assigning_anyone")}
        description={`${t("leave_without_adding_attendees")} ${t("no_availability_shown_to_bookers")}`}
        Icon="circle-alert"
        enableOverflow
        type="confirmation">
        <DialogFooter className="mt-6">
          <Button
            onClick={(e) => {
              e.preventDefault();
              setIsOpenAssignmentWarnDialog(false);
              router.replace(`/event-types/${id}?tabName=team`);
            }}
            color="minimal">
            {t("go_back_and_assign")}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              setIsOpenAssignmentWarnDialog(false);
              leaveWithoutAssigningHosts.current = true;
              router.replace(pendingRoute);
            }}>
            {t("leave_without_assigning")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AssignmentWarningDialog;
