import type { GetServerSidePropsContext } from "next";
export async function getServerSideProps(_context: GetServerSidePropsContext) { return { notFound: true } as const; }
