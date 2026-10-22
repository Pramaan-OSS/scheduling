import { writeFileSync, chmodSync, statSync, chownSync } from "node:fs";
import { dirname } from "node:path";
export function privateFile(path: string) {
  chmodSync(path, 0o600);
  const owner = statSync(dirname(path)), file = statSync(path);
  if (file.uid !== owner.uid || file.gid !== owner.gid) chownSync(path, owner.uid, owner.gid);
}
export function savePrivateState(path: string, state: unknown) {
  writeFileSync(path, JSON.stringify(state), { mode: 0o600 }); privateFile(path);
}
