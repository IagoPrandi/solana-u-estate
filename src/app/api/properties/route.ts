import { NextResponse } from "next/server";
import {
  createPropertyDraft,
  listPropertyDrafts,
  savePropertyMockVerification,
  saveOnchainPropertyRegistration,
  savePropertyPrimarySaleCancellation,
  savePropertyPrimarySaleListing,
  savePropertyPrimarySalePurchase,
  savePropertyTokenization,
} from "@/offchain/repository";
import {
  propertyIntakeSchema,
  propertyOnchainSyncSchema,
} from "@/offchain/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const properties = await listPropertyDrafts();

  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsedPayload = propertyIntakeSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: "Invalid property payload.",
          details: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const record = await createPropertyDraft(parsedPayload.data);

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json();
    const parsedPayload = propertyOnchainSyncSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: "Invalid on-chain sync payload.",
          details: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const record =
      parsedPayload.data.kind === "registration"
        ? await saveOnchainPropertyRegistration(parsedPayload.data)
        : parsedPayload.data.kind === "mockVerification"
          ? await savePropertyMockVerification(parsedPayload.data)
          : parsedPayload.data.kind === "tokenization"
            ? await savePropertyTokenization(parsedPayload.data)
            : parsedPayload.data.kind === "primarySaleListing"
              ? await savePropertyPrimarySaleListing(parsedPayload.data)
              : parsedPayload.data.kind === "primarySalePurchase"
                ? await savePropertyPrimarySalePurchase(parsedPayload.data)
                : await savePropertyPrimarySaleCancellation(parsedPayload.data);

    return NextResponse.json({ record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const status =
      message === "Property draft not found."
        ? 404
        : message === "Property draft already linked to an on-chain property." ||
            message === "Property draft is already mock-verified." ||
            message === "Property draft is already tokenized." ||
            message === "Property draft is not registered on-chain." ||
            message === "Property draft must be mock-verified before tokenization." ||
            message === "Property draft must be tokenized before primary sale." ||
            message === "Primary sale listing already saved locally." ||
            message === "Primary sale listing is not saved locally." ||
            message === "Primary sale listing is not active locally." ||
            message === "Primary sale purchase does not match the saved listing." ||
            message === "Primary sale cancellation does not match the saved listing." ||
            message === "On-chain property id does not match the saved draft."
          ? 409
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
