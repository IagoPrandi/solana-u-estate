import { NextResponse } from "next/server";
import {
  listPropertyDrafts,
  saveValidatorApproval,
  saveValidatorRejection,
} from "@/offchain/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await listPropertyDrafts();
  const visible = all.filter((p) => {
    if (!p.onchainRegistration) return true;
    const s = p.onchainRegistration.status;
    return s === "PendingMockVerification" || s === "Rejected";
  });
  return NextResponse.json({ properties: visible });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      localPropertyId?: string;
      action?: "approve" | "reject";
      reason?: string;
    };
    if (!body.localPropertyId) {
      return NextResponse.json(
        { error: "localPropertyId is required." },
        { status: 400 },
      );
    }
    const action = body.action ?? "approve";
    if (action === "reject") {
      const reason = (body.reason ?? "").trim();
      if (!reason) {
        return NextResponse.json(
          { error: "Justificativa é obrigatória para reprovar." },
          { status: 400 },
        );
      }
      const record = await saveValidatorRejection(
        body.localPropertyId,
        reason,
      );
      return NextResponse.json({ record });
    }
    const record = await saveValidatorApproval(body.localPropertyId);
    return NextResponse.json({ record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    const status = message === "Property draft not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
