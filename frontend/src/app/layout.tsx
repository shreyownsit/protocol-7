import type { Metadata } from "next";
import { Bricolage_Grotesque, Josefin_Slab } from "next/font/google";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
  display: "swap",
});

const josefinSlab = Josefin_Slab({
  variable: "--font-josefin-slab",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Protocol 7",
  description: "Protocol 7 AI contract simulation and negotiation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${josefinSlab.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
