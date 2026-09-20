import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");
  return <AuthForm mode="signup" />;
}
