import "@scheduling/testing/lib/__mocks__/prisma";
import prisma from "@scheduling/prisma";
import { expect, test } from "vitest";
import { PrismaApiKeyRepository } from "./PrismaApiKeyRepository";

test("personal key lists exclude retired app-owned keys and another owner's keys", async () => {
  const host = await prisma.user.create({ data: { email: "host@example.test" } });
  const other = await prisma.user.create({ data: { email: "other@example.test" } });
  await prisma.app.create({ data: { slug: "retired_app", dirName: "retired_app", categories: ["automation"] } });
  const native = await prisma.apiKey.create({ data: { userId: host.id, hashedKey: "fixture-native", note: "Personal key", appId: null } });
  await prisma.apiKey.create({ data: { userId: host.id, hashedKey: "fixture-retired", appId: "retired_app" } });
  await prisma.apiKey.create({ data: { userId: other.id, hashedKey: "fixture-other", appId: null } });
  const result = await new PrismaApiKeyRepository(prisma).findApiKeysFromUserId({ userId: host.id });
  expect(result.map(row => row.id)).toEqual([native.id]);
});
