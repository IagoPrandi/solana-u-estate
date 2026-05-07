import anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";

const PROGRAM_ID = "7L4m3nKBzAprH6L18nXHngA1djPAmYYt1XZVu7RqW8V1";
const BUYER_KEYPAIR_PATH = path.join("target", "deploy", "devnet-buyer.json");
const BUYER_MIN_BALANCE_LAMPORTS = 100_000_000;

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

function loadKeypair(filePath) {
  return anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(filePath, "utf8"))),
  );
}

function loadOrCreateBuyer() {
  if (fs.existsSync(BUYER_KEYPAIR_PATH)) {
    return loadKeypair(BUYER_KEYPAIR_PATH);
  }

  const buyer = anchor.web3.Keypair.generate();
  fs.mkdirSync(path.dirname(BUYER_KEYPAIR_PATH), { recursive: true });
  fs.writeFileSync(
    BUYER_KEYPAIR_PATH,
    JSON.stringify(Array.from(buyer.secretKey)),
    { mode: 0o600 },
  );
  return buyer;
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

async function topUpBuyer(connection, seller, buyer) {
  const buyerBalance = await connection.getBalance(buyer.publicKey, "confirmed");
  if (buyerBalance >= BUYER_MIN_BALANCE_LAMPORTS) return null;

  const delta = BUYER_MIN_BALANCE_LAMPORTS - buyerBalance;
  const sellerBalance = await connection.getBalance(seller.publicKey, "confirmed");
  if (sellerBalance <= delta + 20_000_000) {
    throw new Error("Seller wallet has insufficient SOL to fund buyer smoke account");
  }

  const tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: seller.publicKey,
      toPubkey: buyer.publicKey,
      lamports: delta,
    }),
  );
  return anchor.web3.sendAndConfirmTransaction(connection, tx, [seller], {
    commitment: "confirmed",
  });
}

async function main() {
  if (env("USUFRUCT_PROGRAM_ID") !== PROGRAM_ID) {
    throw new Error(`Unexpected USUFRUCT_PROGRAM_ID: ${env("USUFRUCT_PROGRAM_ID")}`);
  }

  const seller = loadKeypair(env("ANCHOR_WALLET"));
  const buyer = loadOrCreateBuyer();
  const connection = new anchor.web3.Connection(env("ANCHOR_PROVIDER_URL"), "confirmed");
  const wallet = new anchor.Wallet(seller);
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

  await program.methods
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

  const fundingSignature = await topUpBuyer(connection, seller, buyer);
  const buyerTokenAccount = await createAssociatedTokenAccount(
    connection,
    buyer,
    valueMint.publicKey,
    buyer.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const sellerBeforeBuy = await connection.getBalance(wallet.publicKey, "confirmed");

  const purchaseSignature = await program.methods
    .buyPrimarySaleListing(new anchor.BN(300_000), new anchor.BN(60_000_000))
    .accounts({
      listing,
      property,
      buyer: buyer.publicKey,
      seller: wallet.publicKey,
      valueMint: valueMint.publicKey,
      escrowAuthority,
      escrowTokenAccount,
      buyerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([buyer])
    .rpc();

  const listingAccount = await program.account.listingAccount.fetch(listing);
  const propertyAccount = await program.account.propertyAccount.fetch(property);
  const buyerToken = await getAccount(connection, buyerTokenAccount);
  const escrowInfo = await connection.getAccountInfo(escrowTokenAccount, "confirmed");
  const sellerAfterBuy = await connection.getBalance(wallet.publicKey, "confirmed");

  if (
    listingAccount.status.filled === undefined ||
    propertyAccount.status.tokenized === undefined ||
    propertyAccount.activeListingsCount.toString() !== "0" ||
    propertyAccount.activeEscrowedAmount.toString() !== "0" ||
    propertyAccount.totalFreeValueSold.toString() !== "300000" ||
    buyerToken.amount !== 300_000n ||
    escrowInfo !== null ||
    sellerAfterBuy <= sellerBeforeBuy + 60_000_000
  ) {
    throw new Error("MS6 purchase invariants failed");
  }

  console.log(`purchased property=${property.toBase58()} propertyId=${propertyId}`);
  console.log(`listing=${listing.toBase58()} listingId=${listingId}`);
  console.log(`buyer=${buyer.publicKey.toBase58()}`);
  if (fundingSignature) console.log(`fundingSignature=${fundingSignature}`);
  console.log(`purchaseSignature=${purchaseSignature}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
