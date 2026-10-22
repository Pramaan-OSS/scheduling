import { useAppContextWithSchema } from "@scheduling/app-store/EventTypeAppContext";
import AppCard from "@scheduling/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@scheduling/app-store/types";
import useIsAppEnabled from "../../_utils/useIsAppEnabled";
import type { appDataSchema } from "../zod";
const Card: EventTypeAppCardComponent = ({ app, eventType, onAppInstallSuccess }) => {
  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  return (
    <AppCard
      app={app}
      switchChecked={enabled}
      switchOnClick={updateEnabled}
      onAppInstallSuccess={onAppInstallSuccess}
      teamId={eventType.team?.id}>
      <label>
        Price in the currency’s smallest unit
        <input
          type="number"
          min="1"
          disabled={disabled}
          value={getAppData("price") || ""}
          onChange={(event) => {
            setAppData("price", Number(event.target.value));
            setAppData("paymentOption", "ON_BOOKING");
          }}
        />
      </label>
      <label>
        Currency
        <input
          maxLength={3}
          disabled={disabled}
          value={getAppData("currency") || "usd"}
          onChange={(event) => setAppData("currency", event.target.value.toLowerCase())}
        />
      </label>
      <p>Saving cards and automatic no-show charges are off. Paid-booking refunds require host approval and a captured payment reference.</p>
    </AppCard>
  );
};
export default Card;
