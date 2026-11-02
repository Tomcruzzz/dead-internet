import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dead Internet",
  description: "The web forgets. We don't. — Resurrect the past internet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
