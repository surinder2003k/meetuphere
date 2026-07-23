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
  title: "VibeLink.live — Random Video Chat",
  description: "Connect with random people instantly. Video chat with strangers. Fast, smooth, and addictive.",
  openGraph: {
    title: "VibeLink.live",
    description: "Random video chat. Connect instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="h-screen w-screen overflow-hidden">{children}</body>
    </html>
  );
}