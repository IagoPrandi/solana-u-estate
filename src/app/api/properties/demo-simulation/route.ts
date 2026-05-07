import { NextResponse } from "next/server";
import { seedSection32DemoScenario } from "@/offchain/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const record = await seedSection32DemoScenario();

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
