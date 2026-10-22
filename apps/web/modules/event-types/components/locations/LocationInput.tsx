import { useFormContext, Controller } from "react-hook-form";

import type { EventLocationType } from "@scheduling/app-store/locations";
import PhoneInput from "@scheduling/web/components/phone-input";
import type { FormValues } from "@scheduling/features/eventtypes/lib/types";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import classNames from "@scheduling/ui/classNames";
import { TextField } from "@scheduling/ui/components/form";

import type { LocationInputCustomClassNames } from "@scheduling/features/eventtypes/components/locations/types";

const LocationInput = (props: {
  eventLocationType: EventLocationType;
  defaultValue?: string;
  index: number;
  customClassNames?: LocationInputCustomClassNames;
  disableLocationProp?: boolean;
  label?: string | null;
}) => {
  const { t } = useLocale();
  const { eventLocationType, index, customClassNames, disableLocationProp, label, ...remainingProps } = props;
  const formMethods = useFormContext<FormValues>();

  if (eventLocationType?.organizerInputType === "text") {
    const { defaultValue, ...rest } = remainingProps;

    return (
      <Controller
        name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => {
          return (
            <TextField
              label={label ? t(label) : null}
              name={`locations[${index}].${eventLocationType.defaultValueVariable}`}
              placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
              type="text"
              required
              onChange={onChange}
              value={value}
              {...(disableLocationProp ? { disabled: true } : {})}
              className={classNames("my-0", customClassNames?.addressInput)}
              {...rest}
            />
          );
        }}
      />
    );
  } else if (eventLocationType?.organizerInputType === "phone") {
    const { defaultValue, ...rest } = remainingProps;

    return (
      <Controller
        name={`locations.${index}.${eventLocationType.defaultValueVariable}`}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => {
          return (
            <PhoneInput
              required
              disabled={disableLocationProp}
              placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
              name={`locations[${index}].${eventLocationType.defaultValueVariable}`}
              className={customClassNames?.phoneInput}
              value={value}
              onChange={onChange}
              {...rest}
            />
          );
        }}
      />
    );
  }
  return null;
};

export default LocationInput;
