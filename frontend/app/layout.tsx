import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
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
  title: "SatRoad Mask Studio - Optical Satellite & OSM Road Extraction",
  description: "Interactive studio for high-resolution satellite optical imagery and OpenStreetMap road network extraction & raster mask generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full m-0 p-0 overflow-hidden bg-slate-950 text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
