import type { GetServerSidePropsContext } from "next";
export const AppSetupPageMap = {};
export const getServerSideProps = async (_ctx: GetServerSidePropsContext) => ({ notFound: true } as const);
