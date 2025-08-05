import { PasswordRedirect } from '@/components/PasswordRedirect';
import { UserMenu } from '@/components/UserMenu';
import Link from 'next/link';
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

export const metadata = {
  title: "Waldheim App",
  description: "Alles rund ums Waldheim",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-gray-50 min-h-screen flex flex-col`}
      >
        {/* Neuer schöner Header */}
        <header className="w-full flex items-center justify-between py-4 px-4 md:px-8 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Waldheim Logo" className="h-10 w-10 rounded-full" />
          <span className="text-2xl font-bold text-emerald-700"></span>
        </Link>
          <div>
            <UserMenu />
          </div>
        </header>

        {/* Passwortredirect (wichtig!) */}
        <PasswordRedirect />

        {/* Hauptinhalt */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
