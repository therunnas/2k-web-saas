import { AppLoadingState } from "@/components/states/AppStates";

export default function Loading() {
  return (
    <main className="dashboard-ui min-h-screen bg-[#070b13] text-white">
      <AppLoadingState />
    </main>
  );
}