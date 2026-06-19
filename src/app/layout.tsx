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

import AppShell from "@/components/AppShell";
import { getActiveAccount, listAccounts } from "@/lib/accountScope";
import { canImportData } from "@/lib/demoMode";

export const metadata: Metadata = {
  title: "Trading Journal AI",
  description: "Local-first trading journal for review, recaps, charts, and performance analysis.",
  icons: {
    icon: [{ url: "/brand/trading-journal-ai-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/trading-journal-ai-icon.png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accounts = await listAccounts();
  const activeAccount = await getActiveAccount(accounts);
  const showImport = canImportData();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=localStorage.getItem("theme");document.documentElement.dataset.theme=theme==="light"?"light":"dark"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell accounts={accounts} activeAccountId={activeAccount.id} showImport={showImport}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
