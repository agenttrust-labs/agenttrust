/**
 * AgentTrust TrustGate — Express x402 facilitator server.
 *
 * Reference implementation. Composes the four x402 endpoints over the
 * deployed `policy_vault` + `trustgate` programs. Phase 6 ships /verify
 * and /receipt fully working; /settle and /dispute are 501 stubs that
 * Phase 7's `@agenttrust/trustgate` SDK fills via mountTrustGate.
 */

import express, { Request, Response } from "express";
import { Keypair } from "@solana/web3.js";

import { loadPolicyVault, loadTrustGate, makeProvider } from "./chain";
import { makeDisputeRoute } from "./routes/dispute";
import { makeReceiptRoute } from "./routes/receipt";
import { makeSettleRoute } from "./routes/settle";
import { makeVerifyRoute } from "./routes/verify";

export interface ServerConfig {
  rpcUrl:             string;
  facilitatorKeypair: Keypair;
  port?:              number;
}

export async function startServer(cfg: ServerConfig): Promise<{
  app:    express.Application;
  close:  () => Promise<void>;
}> {
  const app      = express();
  const provider = makeProvider({
    rpcUrl:             cfg.rpcUrl,
    facilitatorKeypair: cfg.facilitatorKeypair,
  });

  app.use(express.json());

  // Health.
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status:      "ok",
      facilitator: cfg.facilitatorKeypair.publicKey.toBase58(),
      rpc:         cfg.rpcUrl,
    });
  });

  // Routes wired against on-chain programs.
  const policyVault = await loadPolicyVault(provider);
  const trustgate   = await loadTrustGate(provider);

  app.use(makeVerifyRoute({
    policyVault,
    caller: cfg.facilitatorKeypair.publicKey,
  }));
  app.use(makeReceiptRoute({ trustgate }));
  app.use(makeSettleRoute());
  app.use(makeDisputeRoute());

  const port = cfg.port ?? 3000;
  const httpServer = app.listen(port);

  return {
    app,
    close: () => new Promise((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    }),
  };
}

// Boot when invoked as `node dist/index.js` directly.
if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  const rpc  = process.env.RPC_URL ?? "https://api.devnet.solana.com";

  // For the reference server we generate an ephemeral facilitator keypair if
  // one isn't supplied via FACILITATOR_KEYPAIR_JSON env. Production deployments
  // should always provide a stable keypair.
  const keypairJson = process.env.FACILITATOR_KEYPAIR_JSON;
  const kp = keypairJson
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairJson)))
    : Keypair.generate();

  startServer({ rpcUrl: rpc, facilitatorKeypair: kp, port })
    .then(() => {
      // eslint-disable-next-line no-console
      console.log(`TrustGate server listening on :${port} (facilitator=${kp.publicKey.toBase58()})`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("startup failed:", err);
      process.exit(1);
    });
}
