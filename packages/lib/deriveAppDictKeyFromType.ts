export function deriveAppDictKeyFromType(appType: string, dict: Record<string, unknown>) {
  let handlers = dict[appType];

  if (handlers) {
    return appType;
  }

  // Transforms resize_video to resize
  // Apps creates through cli would also meet this condition as their type would always be in the format {slug}_{category} and app dir name would be {slug}
  const appTypeVariant1 = appType.substring(0, appType.lastIndexOf("_"));
  handlers = dict[appTypeVariant1];
  if (handlers) {
    return appTypeVariant1;
  }

  // Transform `resize_video` to `resizevideo`;
  const appTypeVariant2 =
    appType.substring(0, appType.lastIndexOf("_")) + appType.substring(appType.lastIndexOf("_") + 1);
  handlers = dict[appTypeVariant2];
  if (handlers) {
    return appTypeVariant2;
  }

  // TODO: Deprecated?
  // Transform as last resort removing all underscores, applies to `contactArchive_other_calendar` to be `hubsporothercalendar`
  // and `closecom_other_calendar` to be `closecomothercalendar`
  const appTypeVariant3 = appType.replace(/_/g, "");
  handlers = dict[appTypeVariant3];
  if (handlers) {
    return appTypeVariant3;
  }

  return appType;

  // const categories = ["video", "other", "calendar", "payment", "messaging"];

  // // Instead of doing a blind split at _ and using the first part, apply this hack only on strings that match legacy type.
  // // Transform resizevideo to resize
  // categories.some((type) => {
  //   const matcher = new RegExp(`(.+)${type}$`);
  //   if (appType.match(matcher)) {
  //     appType = appType.replace(matcher, "$1");
  //     return true;
  //   }
  //   return appType;
  // });
}
