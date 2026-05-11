import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://live.agenttrust.tech"),
  title: "AgentTrust · Live decisions",
  description:
    "Every gate_payment decision PolicyVault emits, as it lands on Solana devnet. Real chain. Real time.",
  alternates: {
    canonical: "https://live.agenttrust.tech",
  },
  openGraph: {
    description:
      "Every gate_payment decision PolicyVault emits, as it lands on Solana devnet. Real chain. Real time.",
    siteName: "AgentTrust",
    title: "AgentTrust · Live decisions",
    type: "website",
    url: "https://live.agenttrust.tech",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Every gate_payment decision PolicyVault emits, as it lands on Solana devnet. Real chain. Real time.",
    title: "AgentTrust · Live decisions",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
