import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Test Case Tracker",
  description: "Shared workspace for tracking test case status, authorship, and automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
