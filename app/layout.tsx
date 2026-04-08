import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLAZER STUDIO MIS",
  description: "Internal task and reporting system for team operations."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
