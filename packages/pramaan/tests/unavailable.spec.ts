import { expect, test } from "bun:test";
import { createMeeting, getRecordingsOfCalVideoByRoomName } from "../../features/conferencing/lib/videoClient";
import unavailableCall from "../../lib/callingAIFetcher";
test("retired room, recording and browser-call surfaces fail in plain words", async () => {
  for (const action of [createMeeting, getRecordingsOfCalVideoByRoomName, unavailableCall]) await expect(action("fixture")).rejects.toThrow("not available yet");
});
