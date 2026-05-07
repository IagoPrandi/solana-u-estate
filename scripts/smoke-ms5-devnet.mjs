import anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";

const PROGRAM_ID = "7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1";

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function u64Le(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function pda(...seeds) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    new anchor.web3.PublicKey(PROGRAM_ID),
  )[0];
}

async function maybe(fetcher, address) {
  try {
    return await fetcher.fetch(address);
  } catch (error) {
    const msg = String(error);
    if (
      msg.includes("Account does not exist") ||
      msg.includes("AccountNotInitialized") ||
      msg.includes("Could not find")
    ) return null;
    throw error;
  }
}

async function main() {
  if (env("USUFRUCT_PROGRAM_ID") !== PROGRAM_ID) {
    throw new Error(`Unexpected USUFRUCT_PROGRAM_ID: ${env("USUFRUCT_PROGRAM_ID")}`);
  }
  const walletPath = env("ANCHOR_WALLET");
  const keypair = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8"))),
  );
  const connection = new anchor.web3.Connection(env("ANCHOR_PROVIDER_URL"), "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "target", "idl", "usufruct_protocol.json"), "utf8"),
  );
  const program = new anchor.Program(idl, provider);
  const protocolState = pda(Buffer.from("protocol_state"));

  let state = await maybe(program.account.protocolState, protocolState);
  if (!state) {
    await program.methods
      .initializeProtocol(wallet.publicKey)
      .accounts({
        protocolState,
        admin: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    state = await program.account.protocolState.fetch(protocolState);
  }

  const propertyId = BigInt(state.nextPropertyId.toString());
  const property = pda(Buffer.from("property"), u64Le(propertyId));
  if (await maybe(program.account.propertyAccount, property)) {
    throw new Error(`Refusing existing property PDA ${property.toBase58()}`);
  }

  await program.methods
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

  await program.methods
    .mockVerifyProperty()
    .accounts({ protocolState, property, verifier: wallet.publicKey })
    .rpc();

  const valueMint = anchor.web3.Keypair.generate();
  const usufructPosition = pda(Buffer.from("usufruct_position"), property.toBuffer());
  const valueMintAuthority = pda(Buffer.from("value_mint_authority"), property.toBuffer());
  const ownerTokenAccount = getAssociatedTokenAddressSync(
    valueMint.publicKey,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  await program.methods
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

  state = await program.account.protocolState.fetch(protocolState);
  const listingId = BigInt(state.nextListingId.toString());
  const listing = pda(Buffer.from("listing"), property.toBuffer(), u64Le(listingId));
  const escrowAuthority = pda(Buffer.from("escrow_authority"), listing.toBuffer());
  const escrowTokenAccount = getAssociatedTokenAddressSync(
    valueMint.publicKey,
    escrowAuthority,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const listingSig = await program.methods
    .createPrimarySaleListing(new anchor.BN(300_000))
    .accounts({
      protocolState,
      property,
      listing,
      valueMint: valueMint.publicKey,
      ownerTokenAccount,
      escrowAuthority,
      escrowTokenAccount,
      owner: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const listingAccount = await program.account.listingAccount.fetch(listing);
  const ownerToken = await getAccount(connection, ownerTokenAccount);
  const escrowToken = await getAccount(connection, escrowTokenAccount);
  const propertyAccount = await program.account.propertyAccount.fetch(property);

  if (
    listingAccount.priceLamports.toString() !== "60000000" ||
    ownerToken.amount !== 500_000n ||
    escrowToken.amount !== 300_000n ||
    propertyAccount.status.activeSale === undefined
  ) {
    throw new Error("MS5 listing invariants failed");
  }

  console.log(`listed property=${property.toBase58()} propertyId=${propertyId}`);
  console.log(`listing=${listing.toBase58()} listingId=${listingId}`);
  console.log(`escrowTokenAccount=${escrowTokenAccount.toBase58()}`);
  console.log(`listingSignature=${listingSig}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
