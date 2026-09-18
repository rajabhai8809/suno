import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(appUrl),

  title: {
    default: "Suno — Listen together.",
    template: "%s | Suno",
  },

  description:
    "Suno is a shared listening platform where people can discover music, create rooms, and listen together in realtime.",

  applicationName: "Suno",

  generator: "Next.js",

  referrer: "origin-when-cross-origin",

  keywords: [
    "Suno",
    "music",
    "listen together",
    "shared listening",
    "music rooms",
    "synchronized music",
    "realtime music",
    "online music player",
  ],

  authors: [
    {
      name: "Suno",
    },
  ],

  creator: "Suno",
  publisher: "Suno",

  category: "music",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Suno",
    title: "Suno — Listen together.",
    description:
      "Create a room, invite your people, and listen to music together in realtime.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Suno — Listen together.",
    description:
      "Create a room, invite your people, and listen to music together in realtime.",
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
    ],
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#07070a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#07070a] font-sans text-white antialiased">
        <div id="app-root" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
} 