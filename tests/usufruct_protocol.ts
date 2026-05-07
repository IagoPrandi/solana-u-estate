import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import assert from "node:assert/strict";

describe("usufruct_protocol", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.UsufructProtocol as Program;

  it("loads the Anchor program workspace", () => {
    assert.equal(
      program.programId.toBase58(),
      "7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1",
    );
  });
});
