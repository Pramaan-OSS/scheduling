import type { AppMeta } from "@scheduling/types/App";
export const metadata = {
  name: "Primary calendar", title: "Primary calendar", description: "Check selected calendars for conflicts and write booking events to the primary calendar.",
  installed: true, url: "/settings/my-account", email: "", type: "pramaan_calendar", variant: "calendar", category: "calendar", categories: ["calendar"],
  logo: "icon.svg", publisher: "Scheduling", slug: "pramaan-calendar", dirName: "pramaan-calendar",
} as AppMeta;
export default metadata;
