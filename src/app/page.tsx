import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { getHabits } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const habits = await getHabits("yearly");
  return <Dashboard initialHabits={habits} initialMode="yearly" />;
}
