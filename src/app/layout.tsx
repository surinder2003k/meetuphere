import type { Metadata, Viewport } from "next";
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
  title: "VibeLink — Random Video Chat",
  description: "Connect with random people instantly. Video chat with strangers. Fast, smooth, and addictive.",
  applicationName: "VibeLink",
  metadataBase: new URL("https://meetuphere.vercel.app"),
  openGraph: {
    title: "VibeLink",
    description: "Random video chat. Connect instantly.",
    type: "website",
    siteName: "VibeLink",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeLink",
    description: "Random video chat. Connect instantly.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VibeLink",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
