import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";

export const metadata: Metadata = { title: "회원가입 · Webhacking CTF" };

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return <LoginView searchParams={searchParams} mode="signup" />;
}
