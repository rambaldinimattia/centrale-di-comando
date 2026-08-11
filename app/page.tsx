import { Dashboard } from "@/components/Dashboard";
import { getDashboardData } from "@/lib/data";

// Rigenerazione automatica ogni 5 minuti (revalidate 300s).
// Il bottone "Aggiorna" forza comunque un re-fetch via router.refresh().
export const revalidate = 300;

export default async function Page() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
