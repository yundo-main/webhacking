import { LoginView } from "@/components/login-view";

// The front page is the sign-in screen; signed-in users are sent to the challenge list.
export default function Home({ searchParams }: PageProps<"/">) {
  return <LoginView searchParams={searchParams} />;
}
