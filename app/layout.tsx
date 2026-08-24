import type { Metadata, Viewport } from "next";
import { Poppins, Archivo, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

// The original build used two licensed brand faces loaded from app/fonts.
// Those files are not redistributable, so this public version substitutes the
// open-licensed faces the stylesheet already named as fallbacks: Archivo (OFL)
// for display and Permanent Marker (Apache-2.0) for accents.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-ss-headline",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-atomic-marker",
});

export const metadata: Metadata = {
  title: "VMP Gear",
  description: "Vision Maker Productions gear inventory",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VMP Gear",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#040707",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${archivo.variable} ${permanentMarker.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
