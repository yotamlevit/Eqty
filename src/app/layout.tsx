import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "EQTY",
  description:
    "High-density portfolio and FIRE terminal: active asset tracking bridged with long-term predictive compounding forecasts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the persisted theme before first paint to avoid a flash.
            Dark is the default; only a stored "light" removes the class. */}
        <Script id="eqty-theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("eqty-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
