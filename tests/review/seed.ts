import prisma from "../../packages/prisma";
import { hashPassword } from "../../packages/lib/auth/hashPassword";
const database = new URL(process.env.DATABASE_URL || "");
if (!["127.0.0.1", "localhost"].includes(database.hostname) || !database.pathname.endsWith("_fixture"))
  throw new Error("Use a local disposable fixture database.");
const email = "host@example.test";
const password = "Fixture-Booking-Password-42!";
const hash = await hashPassword(password);
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: {
    username: "fixture-host",
    email,
    name: "Fixture Host",
    emailVerified: new Date(),
    completedOnboarding: true,
    password: { create: { hash } },
    timeZone: "UTC",
    locale: "en",
    role: "USER",
  },
});
const schedule = await prisma.schedule.create({
  data: {
    userId: user.id,
    name: "Working hours",
    timeZone: "UTC",
    availability: {
      create: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:00:00Z"),
          endTime: new Date("1970-01-01T17:00:00Z"),
        },
      ],
    },
  },
});
await prisma.user.update({ where: { id: user.id }, data: { defaultScheduleId: schedule.id } });
const event = await prisma.eventType.upsert({
  where: { userId_slug: { userId: user.id, slug: "conversation" } },
  update: { scheduleId: schedule.id },
  create: {
    userId: user.id,
    users: { connect: { id: user.id } },
    title: "A short conversation",
    slug: "conversation",
    length: 30,
    scheduleId: schedule.id,
    locations: [{ type: "link", link: "https://meet.example.test/conversation" }],
  },
});
await Bun.write(
  ".runtime/browser-fixture.json",
  JSON.stringify({ userId: user.id, eventTypeId: event.id, email, password })
);
const startTime = new Date(Date.now() + 86400000 * 3);
startTime.setUTCHours(14, 0, 0, 0);
await prisma.booking.upsert({
  where: { uid: "fixture-booking" },
  update: { startTime, endTime: new Date(startTime.getTime() + 1800000) },
  create: {
    uid: "fixture-booking",
    title: "A short conversation",
    userId: user.id,
    eventTypeId: event.id,
    userPrimaryEmail: email,
    startTime,
    endTime: new Date(startTime.getTime() + 1800000),
    location: "https://meet.example.test/conversation",
    status: "ACCEPTED",
    attendees: { create: { name: "Fixture Guest", email: "guest@example.test", timeZone: "UTC" } },
  },
});
await prisma.$disconnect();
