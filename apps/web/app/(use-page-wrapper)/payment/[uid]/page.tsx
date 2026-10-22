import prisma from "@scheduling/prisma";
import { notFound } from "next/navigation";
import PaymentPage from "./PaymentPage";
export const metadata = { title: "Booking payment · Scheduling" };
export default async function Page({ params }: { params: Promise<{ uid: string }> }) {
  const payment = await prisma.payment.findUnique({ where: { uid: (await params).uid }, include: { booking: true } });
  if (!payment?.booking || payment.appId !== "pramaan-payment") notFound();
  return <PaymentPage uid={payment.uid} title={payment.booking.title} amount={payment.amount} currency={payment.currency} paid={payment.booking.paid} />;
}
