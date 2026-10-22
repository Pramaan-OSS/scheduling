import prisma from "@scheduling/prisma";

export const outOfOfficeReasonList = async () => {
  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
    },
  });

  return outOfOfficeReasons;
};
