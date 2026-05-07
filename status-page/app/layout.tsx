import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "AgentTrust — Status",
  description: "Live health for AgentTrust hosted surfaces (MCP, facilitator API, demo, npm SDK).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
