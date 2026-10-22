import prisma from "@scheduling/prisma";
async function main() {
  for (const [slug, category] of [["pramaan-calendar", "calendar"], ["pramaan-payment", "payment"], ["weather_in_your_calendar", "other"]] as const)
    await prisma.app.upsert({ where: { slug }, update: {}, create: { slug, dirName: slug, categories: [category], enabled: true } });
}
main().catch(() => { console.error("Built-in connection setup did not finish."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
