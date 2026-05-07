import anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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

  const verifySignature = await program.methods
    .mockVerifyProperty()
    .accounts({
      protocolState,
      property,
      verifier: wallet.publicKey,
    })
    .rpc();

  const valueMint = anchor.web3.Keypair.generate();
  const usufructPosition = findPda(
    Buffer.from("usufruct_position"),
    property.toBuffer(),
  );
  const valueMintAuthority = findPda(
    Buffer.from("value_mint_authority"),
    property.toBuffer(),
  );
  const ownerTokenAccount = getAssociatedTokenAddressSync(
    valueMint.publicKey,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const tokenizeSignature = await program.methods
    .tokenizeProperty()
    .accounts({
      property,
      usufructPosition,
      valueMint: valueMint.publicKey,
      valueMintAuthority,
      ownerTokenAccount,
      owner: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([valueMint])
    .rpc();

  const propertyAccount = await program.account.propertyAccount.fetch(property);
  if (propertyAccount.status.tokenized === undefined) {
    throw new Error("Property did not move to Tokenized");
  }

  const mint = await getMint(connection, valueMint.publicKey);
  if (
    mint.decimals !== 0 ||
    mint.supply !== 800_000n ||
    mint.mintAuthority !== null ||
    mint.freezeAuthority !== null
  ) {
    throw new Error("Mint invariants failed");
  }

  const tokenAccount = await getAccount(connection, ownerTokenAccount);
  if (tokenAccount.amount !== 800_000n) {
    throw new Error("Owner ATA did not receive free value units");
  }

  const usufruct = await program.account.usufructPosition.fetch(usufructPosition);
  if (!usufruct.active || usufruct.linkedValueUnits.toString() !== "200000") {
    throw new Error("Usufruct position invariants failed");
  }

  console.log(`tokenized property=${property.toBase58()} propertyId=${propertyId}`);
  console.log(`valueMint=${valueMint.publicKey.toBase58()}`);
  console.log(`ownerTokenAccount=${ownerTokenAccount.toBase58()}`);
  console.log(`usufructPosition=${usufructPosition.toBase58()}`);
  console.log(`registerSignature=${registerSignature}`);
  console.log(`verifySignature=${verifySignature}`);
  console.log(`tokenizeSignature=${tokenizeSignature}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
