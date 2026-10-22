import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

import { sessionStorage } from "@scheduling/lib/webstorage";

const STORAGE_KEY = "showWelcomeToSchedulingModal";
const ORG_MODAL_STORAGE_KEY = "showNewOrgModal";

export function useWelcomeToSchedulingModal() {
  const [welcomeToSchedulingModal, setWelcomeToSchedulingModal] = useQueryState(
    "welcomeToSchedulingModal",
    parseAsBoolean.withDefault(false)
  );

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Don't show personal modal if org modal flag is set (org modal takes precedence)
    const hasOrgModalFlag = sessionStorage.getItem(ORG_MODAL_STORAGE_KEY) === "true";
    if (hasOrgModalFlag) {
      setIsOpen(false);
      return;
    }

    if (welcomeToSchedulingModal) {
      setIsOpen(true);
      return;
    }

    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setIsOpen(true);
    }
  }, [welcomeToSchedulingModal]);

  const closeModal = () => {
    setIsOpen(false);
    // Remove the query param from URL
    setWelcomeToSchedulingModal(null);
    // Also clear sessionStorage
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return {
    isOpen,
    closeModal,
  };
}

export function setShowWelcomeToSchedulingModalFlag() {
  sessionStorage.setItem(STORAGE_KEY, "true");
}
