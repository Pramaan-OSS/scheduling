import { NextResponse } from "next/server";
export const GET = async () => NextResponse.json({ message: "Referrals are not available." }, { status: 410 });
