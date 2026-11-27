import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";

export const metadata: Metadata = { title: "로그인 · Webhacking CTF" };

// Same screen as the front page; kept so existing /login?next=... links keep working.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return <LoginView searchParams={searchParams} />;
}
