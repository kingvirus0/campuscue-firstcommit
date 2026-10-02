import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusCue — From Notice to Action",
  description:
    "CampusCue turns confusing university notices into clear actions, deadlines, and reminders. Built for Beginner's Paradise · FirstCommit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
