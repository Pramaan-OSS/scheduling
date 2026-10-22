import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { GET as handler } from "@scheduling/features/tasker/api/cleanup";

export const GET = defaultResponderForAppDir(handler);
