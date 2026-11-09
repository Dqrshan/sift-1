import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-sans-ui",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIFT·1 — The AI sorting companion for the modern home",
  description:
    "A concept domestic smart dustbin with onboard AI vision that identifies waste, sorts it into sealed compartments, quarantines hazards and tracks household impact. Explore the interactive 3D model.",
  keywords: [
    "smart dustbin",
    "AI waste sorting",
    "domestic waste management",
    "three.js",
    "smart home",
    "recycling",
  ],
  authors: [{ name: "SIFT Labs (concept)" }],
};

export const viewport: Viewport = {
  themeColor: "#0d110d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
