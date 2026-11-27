import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth-buttons";
import { getUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Webhacking CTF",
  description: "참가자별 실습 환경을 제공하는 웹해킹 CTF",
};

// Reads the session at request time, so it streams in behind a Suspense boundary.
async function UserMenu() {
  const user = await getUser();
  if (!user) {
    return (
      <Link href="/login" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500">
        로그인
      </Link>
    );
  }
  return (
    <>
      <span className="text-sm text-zinc-700">{user.name}</span>
      <SignOutButton />
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-mono font-bold text-emerald-700">
              WH&#123;ctf&#125;
            </Link>
            <Link href="/challenges" className="text-sm text-zinc-700 hover:text-zinc-900">
              문제
            </Link>
            <Link href="/scoreboard" className="text-sm text-zinc-700 hover:text-zinc-900">
              스코어보드
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <Suspense fallback={null}>
                <UserMenu />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
