#!/usr/bin/env node
/**
 * Derive expected PDAs from the freshly-minted agent identity and verify
 * each one's existence + owner on devnet.
 */
const { PublicKey, Connection } = require('@solana/web3.js');

const AGENT_ASSET = new PublicKey('Hy4E7VRyP8DyThY3NB3Sxak7KvsG4fv3B1CMvVqi3vUx');
const SIGNER = new PublicKey('GCoJB3pVSeSwrky3FkHQcXxEj61XyeBWxpFWYtXTFp5o');
const POLICY_ID_1 = 1;
const POLICY_ID_2 = 2;

const PROG_AGENT_REGISTRY = new PublicKey('8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C');
const PROG_ATOM_ENGINE = new PublicKey('AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF');
const PROG_TRUSTGATE = new PublicKey('HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N');
const PROG_POLICY_VAULT = new PublicKey('8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR');

function pda(seeds, programId) {
  const [addr, bump] = PublicKey.findProgramAddressSync(seeds, programId);
  return { addr: addr.toBase58(), bump };
}

function u32LeBytes(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

const agentAccount = pda([Buffer.from('agent'), AGENT_ASSET.toBuffer()], PROG_AGENT_REGISTRY);
const atomStats = pda([Buffer.from('atom_stats'), AGENT_ASSET.toBuffer()], PROG_ATOM_ENGINE);
const trustgateAuthority = pda([Buffer.from('trustgate_auth'), SIGNER.toBuffer()], PROG_TRUSTGATE);
const policyAuthority = pda([Buffer.from('policy_authority'), AGENT_ASSET.toBuffer()], PROG_POLICY_VAULT);
const policyAccount1 = pda(
  [Buffer.from('policy'), AGENT_ASSET.toBuffer(), u32LeBytes(POLICY_ID_1)],
  PROG_POLICY_VAULT
);
const policyAccount2 = pda(
  [Buffer.from('policy'), AGENT_ASSET.toBuffer(), u32LeBytes(POLICY_ID_2)],
  PROG_POLICY_VAULT
);
const velocity1 = pda(
  [Buffer.from('velocity'), AGENT_ASSET.toBuffer(), u32LeBytes(POLICY_ID_1)],
  PROG_POLICY_VAULT
);
const velocity2 = pda(
  [Buffer.from('velocity'), AGENT_ASSET.toBuffer(), u32LeBytes(POLICY_ID_2)],
  PROG_POLICY_VAULT
);

const expected = {
  agentAccount,
  atomStats,
  trustgateAuthority,
  policyAuthority,
  policyAccount1,
  policyAccount2,
  velocity1,
  velocity2,
};

(async () => {
  console.error('Derived PDAs:');
  console.error(JSON.stringify(expected, null, 2));

  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Reported by the tool:
  const reportedPolicyPda1 = '5UXuJctkSSiTdYPzMjZEZ7G3qyAkPHkpkc2r6AhYUC9';
  const reportedPolicyPda2 = 'BA8Qr8fYgAZ3UVBLb1k4ebuBTVoWoAf3bZTLUbGpHovM';
  const reportedVelocity1 = 'G5fRDhbtzvYm1cEtwzbuVFaLM2tfoRNGUiGDG6CPn4k5';
  const reportedVelocity2 = 'Bs4iMEDBDeC4ThHdN1PRjXRusrBaqGvntGP1infLLVu7';

  const policyMatch1 = expected.policyAccount1.addr === reportedPolicyPda1;
  const policyMatch2 = expected.policyAccount2.addr === reportedPolicyPda2;
  const velocityMatch1 = expected.velocity1.addr === reportedVelocity1;
  const velocityMatch2 = expected.velocity2.addr === reportedVelocity2;

  console.error('\nReported vs derived:');
  console.error(`policy1: reported=${reportedPolicyPda1}  derived=${expected.policyAccount1.addr}  match=${policyMatch1}`);
  console.error(`policy2: reported=${reportedPolicyPda2}  derived=${expected.policyAccount2.addr}  match=${policyMatch2}`);
  console.error(`velocity1: reported=${reportedVelocity1}  derived=${expected.velocity1.addr}  match=${velocityMatch1}`);
  console.error(`velocity2: reported=${reportedVelocity2}  derived=${expected.velocity2.addr}  match=${velocityMatch2}`);

  const accountsToFetch = [
    { name: 'agent_account', addr: expected.agentAccount.addr, expectedOwner: PROG_AGENT_REGISTRY.toBase58() },
    { name: 'atom_stats', addr: expected.atomStats.addr, expectedOwner: PROG_ATOM_ENGINE.toBase58() },
    { name: 'trustgate_authority', addr: expected.trustgateAuthority.addr, expectedOwner: PROG_TRUSTGATE.toBase58() },
    { name: 'policy_authority', addr: expected.policyAuthority.addr, expectedOwner: PROG_POLICY_VAULT.toBase58() },
    { name: 'policy_account_1', addr: expected.policyAccount1.addr, expectedOwner: PROG_POLICY_VAULT.toBase58() },
    { name: 'policy_account_2', addr: expected.policyAccount2.addr, expectedOwner: PROG_POLICY_VAULT.toBase58() },
    { name: 'velocity_1', addr: expected.velocity1.addr, expectedOwner: PROG_POLICY_VAULT.toBase58() },
    { name: 'velocity_2', addr: expected.velocity2.addr, expectedOwner: PROG_POLICY_VAULT.toBase58() },
  ];

  const results = [];
  for (const a of accountsToFetch) {
    const acct = await conn.getAccountInfo(new PublicKey(a.addr), 'confirmed');
    const exists = !!acct;
    const owner = acct ? acct.owner.toBase58() : null;
    const lamports = acct ? acct.lamports : 0;
    const dataLen = acct ? acct.data.length : 0;
    const ownerOk = owner === a.expectedOwner;
    const status = exists && ownerOk ? 'PASS' : exists ? 'FAIL-OWNER' : 'FAIL-MISSING';
    results.push({ ...a, exists, owner, lamports, dataLen, status });
  }

  console.error('\nOn-chain account inventory:');
  console.error(JSON.stringify(results, null, 2));

  const out = { agentAsset: AGENT_ASSET.toBase58(), signer: SIGNER.toBase58(), expected, results };
  require('fs').writeFileSync(require('path').join(__dirname, 'pda-verification.json'), JSON.stringify(out, null, 2));
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
