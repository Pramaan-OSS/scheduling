import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import type { SchedulingSessionUser } from "next-auth";

import type prisma from "@scheduling/prisma";

export type AppUser = SchedulingSessionUser | undefined;
export type AppPrisma = typeof prisma;
export type AppGetServerSidePropsContext = GetServerSidePropsContext<{
  pages: string[];
}>;

export type AppGetServerSideProps = (
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser
) => GetServerSidePropsResult;
