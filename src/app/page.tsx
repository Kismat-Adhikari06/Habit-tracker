import { Dashboard } from "@/components/dashboard";
import { getHabits } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const habits = await getHabits("yearly");
  return <Dashboard initialHabits={habits} initialMode="yearly" />;
}
