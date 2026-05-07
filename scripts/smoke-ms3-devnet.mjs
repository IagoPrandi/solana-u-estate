import anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import path from "node:path";

const PROGRAM_ID = "7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function u64Le(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function findPda(...seeds) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    new anchor.web3.PublicKey(PROGRAM_ID),
  )[0];
}

async function fetchNullable(fetcher, address) {
  try {
    return await fetcher.fetch(address);
  } catch (error) {
    const message = String(error);
    if (
      message.includes("Account does not exist") ||
      message.includes("AccountNotInitialized") ||
      message.includes("Could not find")
    ) {
      return null;
    }
    throw error;
  }
}

async function main() {
  const walletPath = requireEnv("ANCHOR_WALLET");
  const rpcUrl = requireEnv("ANCHOR_PROVIDER_URL");
  const envProgramId = requireEnv("USUFRUCT_PROGRAM_ID");

  if (envProgramId !== PROGRAM_ID) {
    throw new Error(`Unexpected USUFRUCT_PROGRAM_ID: ${envProgramId}`);
  }
  if (!fs.existsSync(walletPath)) {
    throw new Error(`ANCHOR_WALLET file not found: ${walletPath}`);
  }

  const keypair = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8"))),
  );
  const connection = new anchor.web3.Connection(rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idlPath = path.join(process.cwd(), "target", "idl", "usufruct_protocol.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, provider);
  const protocolState = findPda(Buffer.from("protocol_state"));

  let state = await fetchNullable(program.account.protocolState, protocolState);
  if (!state) {
    const initSignature = await program.methods
      .initializeProtocol(wallet.publicKey)
      .accounts({
        protocolState,
        admin: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log(`initialized protocolState=${protocolState.toBase58()} signature=${initSignature}`);
    state = await program.account.protocolState.fetch(protocolState);
  }

  const propertyId = BigInt(state.nextPropertyId.toString());
  const property = findPda(Buffer.from("property"), u64Le(propertyId));
  const existingProperty = await fetchNullable(program.account.propertyAccount, property);
  if (existingProperty) {
    throw new Error(`Refusing to overwrite existing property PDA ${property.toBase58()}`);
  }

  const registerSignature = await program.methods
    .registerProperty(
      new anchor.BN(200_000_000),
      2_000,
      Array.from(Buffer.alloc(32, 1)),
      Array.from(Buffer.alloc(32, 2)),
      Array.from(Buffer.alloc(32, 3)),
    )
    .accounts({
      protocolState,
      property,
      owner: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const registered = await program.account.propertyAccount.fetch(property);
  if (registered.status.pendingMockVerification === undefined) {
    throw new Error("Property did not start as PendingMockVerification");
  }

  const verifySignature = await program.methods
    .mockVerifyProperty()
    .accounts({
      protocolState,
      property,
      verifier: wallet.publicKey,
    })
    .rpc();

  const verified = await program.account.propertyAccount.fetch(property);
  if (verified.status.mockVerified === undefined) {
    throw new Error("Property did not move to MockVerified");
  }

  console.log(`registered property=${property.toBase58()} propertyId=${propertyId}`);
  console.log(`registerSignature=${registerSignature}`);
  console.log(`verifySignature=${verifySignature}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
