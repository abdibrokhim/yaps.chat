import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { LayoutClient } from "./layout-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export const metadata: Metadata = {
  title: "yaps[dot]chat - one-time end-to-end encrypted anonymous chats",
  description: "yaps[dot]chat is a new kind of messenger. You can easily chat, send files and images to anyone without middle man. all the messages and shared information end-to-end encrypted and never stored on the server.",
  metadataBase: new URL("https://yaps.chat"),
  keywords: ["ai builder", "youtube creator", "open-source builder", "open-source"],
  
  alternates: {
    canonical: "/",
  },

  authors: [
    {
      name: "Ibrohim Abdivokhidov",
      url: "https://github.com/abdibrokhim",
    },
  ],

  openGraph: {
    title: "yaps[dot]chat - one-time end-to-end encrypted anonymous chats",
    description: "yaps[dot]chat is a new kind of messenger. You can easily chat, send files and images to anyone without middle man. all the messages and shared information end-to-end encrypted and never stored on the server.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/yapsdotchat.png",
        width: 1200,
        height: 630,
        alt: "Yaps Official Logo",
      },
    ],
  },
  
  icons: {
    icon: '/favicon.ico',
  },

  twitter: {
    card: 'summary_large_image',
    title: "yaps[dot]chat - one-time end-to-end encrypted anonymous chats",
    description: "yaps[dot]chat is a new kind of messenger. You can easily chat, send files and images to anyone without middle man. all the messages and shared information end-to-end encrypted and never stored on the server.",
    images: ['/yapsdotchat.png'],
    site: '@abdibrokhim',
    creator: '@abdibrokhim',
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
    },
  },

  appleWebApp: {
    title: 'abee',
    statusBarStyle: 'black-translucent',
  },
  
  appLinks: {
    web: {
      url: 'https://yaps.chat',
      should_fallback: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
      <Analytics />
    </html>
  );
}
