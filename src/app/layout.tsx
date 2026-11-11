import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "TinyWins", template: "%s | TinyWins" },
  description: "A day planner built for ADHD: five tasks a day, reminders until they're done, and real progress you can see.",
  manifest: "/manifest.webmanifest",
  authors: [{ name: "MaskedOps" }],
  creator: "MaskedOps",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "TinyWins", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#3b82f6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={`${manrope.className} antialiased`}>{children}</body>
    </html>
  );
}
