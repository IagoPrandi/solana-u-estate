import { NextResponse } from "next/server";
import { getFiatRates } from "@/server/fiat-rates";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await getFiatRates();

  return NextResponse.json(response.body, {
    status: response.status,
  });
}
