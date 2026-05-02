import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { ProgramStatus } from "@/components/ProgramStatus";

export const metadata = {
  title: "Dashboard — AgentTrust",
  description: "Live on-chain status of the three AgentTrust programs on Solana devnet.",
};

export default function Dashboard() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
              Live · solana-devnet
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              On-chain deployment status
            </h1>
            <p className="mt-4 max-w-2xl text-fg-muted">
              Real-time status of the three AgentTrust programs on Solana
              devnet. Pulled directly from{" "}
              <code className="font-mono text-xs">api.devnet.solana.com</code>{" "}
              via <code className="font-mono text-xs">getAccountInfo</code> on
              page load. Click any program ID to open Solana Explorer.
            </p>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <ProgramStatus />
          </div>
        </section>

        <section className="border-b border-border bg-bg-subtle/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
                  Verify yourself
                </p>
                <h2 className="mt-3 text-2xl font-medium tracking-tight text-fg">
                  Don&rsquo;t trust this dashboard.
                </h2>
                <p className="mt-4 text-fg-muted leading-relaxed">
                  Every claim on this page is independently verifiable. Run
                  these from your terminal — no client-side caching, no
                  intermediaries. The same RPC the dashboard uses.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated">
                <div className="border-b border-border bg-bg-subtle/60 px-5 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                    terminal
                  </span>
                </div>
                <pre className="overflow-x-auto px-5 py-5 font-mono text-[12px] leading-relaxed text-fg">
{`# verify all 3 programs are executable
$ for p in 8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR \\
           HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N \\
           Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv; do
    solana program show "$p" --url devnet | grep Executable
  done

# install the SDK
$ pnpm add @agenttrust-sdk/trustgate

# run the Kani proofs locally
$ git clone https://github.com/mohit-1710/agenttrust && cd agenttrust
$ cargo kani --manifest-path programs/policy-vault/Cargo.toml`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
