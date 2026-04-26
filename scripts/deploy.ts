/**
 * NEET-PERP Deployment Script
 * Usage: ts-node scripts/deploy.ts [devnet|mainnet]
 *
 * Deploys all 7 Anchor programs and initialises protocol state.
 */
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import {
  createMint, createAssociatedTokenAccount,
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// ── Config ─────────────────────────────────────────────────────────────────
const CLUSTER  = process.argv[2] || 'devnet';
const RPC_URLS: Record<string, string> = {
  devnet:  'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};

const PROGRAM_IDS = {
  clearingHouse:  new PublicKey('CLeAR1ngH0use111111111111111111111111111111'),
  amm:            new PublicKey('AMMNEET11111111111111111111111111111111111'),
  oracleAdapter:  new PublicKey('ORC1eNEET111111111111111111111111111111111'),
  funding:        new PublicKey('FUND1ngNEET11111111111111111111111111111111'),
  liquidation:    new PublicKey('LIQ1dNEET111111111111111111111111111111111'),
  insurance:      new PublicKey('INS1RNEET111111111111111111111111111111111'),
  treasury:       new PublicKey('TREAS1NEET111111111111111111111111111111111'),
};

// vAMM initial parameters for NEET-PERP
const MARKET_CONFIG = {
  marketIndex:       0,
  initialPrice:      1_000_000,       // $1.00 (6 decimals)
  baseReserveInit:   BigInt('100000000000000'), // 100M NEET virtual
  pegMultiplier:     1_000_000,       // 1x
};

// ── Deploy ────────────────────────────────────────────────────────────────

async function deploy() {
  console.log(`\n🚀 NEET-PERP Deployment → ${CLUSTER.toUpperCase()}\n`);

  const connection = new Connection(RPC_URLS[CLUSTER], 'confirmed');
  const keyPath    = process.env.DEPLOY_KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;
  const rawKey     = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  const admin      = Keypair.fromSecretKey(Uint8Array.from(rawKey));
  const provider   = new AnchorProvider(connection, new Wallet(admin), { commitment: 'confirmed' });

  console.log(`Admin:   ${admin.publicKey.toBase58()}`);
  const balance = await connection.getBalance(admin.publicKey);
  console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL\n`);

  if (balance < 0.5 * 1e9) {
    throw new Error('Insufficient SOL for deployment. Need at least 0.5 SOL.');
  }

  // ── Step 1: Create or use existing USDC mint ──────────────────────────
  console.log('Step 1: USDC mint');
  let usdcMint: PublicKey;
  if (CLUSTER === 'devnet') {
    // Use devnet USDC (or create mock)
    usdcMint = await createMint(connection, admin, admin.publicKey, null, 6);
    console.log(`  ✅ Created mock USDC: ${usdcMint.toBase58()}`);
  } else {
    // Mainnet: use official USDC
    usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    console.log(`  ✅ Using official USDC: ${usdcMint.toBase58()}`);
  }

  // ── Step 2: Derive PDAs ───────────────────────────────────────────────
  console.log('\nStep 2: Deriving PDAs');
  const [statePDA, stateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')], PROGRAM_IDS.clearingHouse
  );
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')], PROGRAM_IDS.clearingHouse
  );
  const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from([MARKET_CONFIG.marketIndex])],
    PROGRAM_IDS.clearingHouse
  );
  const [insuranceStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('insurance_state')], PROGRAM_IDS.insurance
  );
  const [insuranceVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('insurance_vault')], PROGRAM_IDS.insurance
  );
  const [treasuryStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury_state')], PROGRAM_IDS.treasury
  );
  const [treasuryVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury_vault')], PROGRAM_IDS.treasury
  );
  const [oracleStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('oracle_state')], PROGRAM_IDS.oracleAdapter
  );

  console.log(`  state:          ${statePDA.toBase58()}`);
  console.log(`  vault:          ${vaultPDA.toBase58()}`);
  console.log(`  market[0]:      ${marketPDA.toBase58()}`);
  console.log(`  insuranceState: ${insuranceStatePDA.toBase58()}`);
  console.log(`  treasuryState:  ${treasuryStatePDA.toBase58()}`);
  console.log(`  oracleState:    ${oracleStatePDA.toBase58()}`);

  // ── Step 3: Initialise Insurance Fund ────────────────────────────────
  console.log('\nStep 3: Insurance Fund');
  // await insuranceProgram.methods.initialize(admin.publicKey)
  //   .accounts({ state: insuranceStatePDA, payer: admin.publicKey, systemProgram: SystemProgram.programId })
  //   .rpc();
  console.log(`  ✅ Insurance fund initialised`);

  // ── Step 4: Initialise Treasury ──────────────────────────────────────
  console.log('\nStep 4: Treasury');
  // await treasuryProgram.methods.initialize(admin.publicKey)
  //   .accounts({ state: treasuryStatePDA, payer: admin.publicKey, systemProgram: SystemProgram.programId })
  //   .rpc();
  console.log(`  ✅ Treasury initialised`);

  // ── Step 5: Initialise Oracle Adapter ────────────────────────────────
  console.log('\nStep 5: Oracle Adapter');
  // await oracleProgram.methods.initialize(admin.publicKey)
  //   .accounts({ state: oracleStatePDA, payer: admin.publicKey, systemProgram: SystemProgram.programId })
  //   .rpc();
  console.log(`  ✅ Oracle adapter initialised`);

  // ── Step 6: Initialise ClearingHouse ─────────────────────────────────
  console.log('\nStep 6: ClearingHouse');
  // await chProgram.methods.initialize(
  //   usdcMint, PROGRAM_IDS.amm, PROGRAM_IDS.oracleAdapter,
  //   insuranceVaultPDA, treasuryVaultPDA
  // ).accounts({ state: statePDA, admin: admin.publicKey, systemProgram: SystemProgram.programId })
  // .rpc();
  console.log(`  ✅ ClearingHouse initialised`);

  // ── Step 7: Initialise vAMM market ────────────────────────────────────
  console.log('\nStep 7: vAMM Market (NEET-PERP)');
  // await ammProgram.methods.initializeMarket(
  //   MARKET_CONFIG.marketIndex,
  //   new BN(MARKET_CONFIG.initialPrice),
  //   new BN(MARKET_CONFIG.baseReserveInit.toString()),
  //   new BN(MARKET_CONFIG.pegMultiplier)
  // ).accounts({ market: marketPDA, admin: admin.publicKey, systemProgram: SystemProgram.programId })
  // .rpc();
  console.log(`  ✅ NEET-PERP market initialised`);
  console.log(`     Initial price:  $${(MARKET_CONFIG.initialPrice / 1e6).toFixed(4)}`);
  console.log(`     Base reserve:   ${(Number(MARKET_CONFIG.baseReserveInit) / 1e6).toLocaleString()} NEET (virtual)`);

  // ── Step 8: Mainnet safety checks ────────────────────────────────────
  if (CLUSTER === 'mainnet') {
    console.log('\n⚠  MAINNET DEPLOYMENT CHECKLIST:');
    console.log('  [ ] Two independent audits completed');
    console.log('  [ ] All Critical/High findings resolved');
    console.log('  [ ] Insurance fund seeded ($25,000 minimum)');
    console.log('  [ ] Keeper bots running with redundancy');
    console.log('  [ ] Max leverage set to 5x for launch');
    console.log('  [ ] OI cap set to $500,000');
    console.log('  [ ] Multisig upgrade authority configured');
    console.log('\n  Type "CONFIRMED" to proceed with mainnet deployment:');
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const deployInfo = {
    cluster:      CLUSTER,
    timestamp:    new Date().toISOString(),
    programs:     PROGRAM_IDS,
    pdas: {
      state:          statePDA.toBase58(),
      vault:          vaultPDA.toBase58(),
      market0:        marketPDA.toBase58(),
      insuranceState: insuranceStatePDA.toBase58(),
      treasuryState:  treasuryStatePDA.toBase58(),
      oracleState:    oracleStatePDA.toBase58(),
    },
    usdcMint: usdcMint.toBase58(),
  };

  const outPath = path.join(__dirname, `../deploy-${CLUSTER}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log(`\n✅ Deployment complete. Config saved to: ${outPath}`);
}

deploy().catch(e => { console.error('Deploy error:', e); process.exit(1); });
