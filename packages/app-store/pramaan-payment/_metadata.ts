import type { AppMeta } from "@scheduling/types/App";
export const metadata = {
  name: "Booking payments",
  title: "Booking payments",
  description: "Collect a booking payment through your connected account.",
  installed: true, url: "/settings/my-account", email: "",
  slug: "pramaan-payment",
  dirName: "pramaan-payment",
  type: "pramaan_payment",
  variant: "payment",
  category: "payment",
  categories: ["payment"],
  extendsFeature: "EventType",
  publisher: "Scheduling",
  logo: "icon.svg",
} as AppMeta;
export default metadata;
