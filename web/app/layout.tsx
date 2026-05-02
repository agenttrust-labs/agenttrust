import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentTrust — Completes the Solana Foundation's ERC-8004 trust stack",
  description:
    "Three Anchor programs that turn Quantu's IdentityRegistry + ReputationRegistry primitives into a full agent-payment trust system: programmable spending policies, x402 facilitator integration, and capability attestation. Five Kani-proven invariants. Built for Solana Frontier 2026.",
  metadataBase: new URL("https://agenttrust.dev"),
  openGraph: {
    title: "AgentTrust — Completes the ERC-8004 trust stack on Solana",
    description:
      "PolicyVault + TrustGate + ValidationRegistry. Five Kani-proven invariants. Drop-in @agenttrust-sdk/trustgate npm package.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
