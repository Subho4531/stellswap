"use client";

import { TopNav } from "@/components/TopNav";
import { SwapCard } from "@/components/SwapCard";
import { PriceChart } from "@/components/PriceChart";
import { useStellarWallet } from "@/context/StellarWalletProvider";

export default function Home() {
  const { address } = useStellarWallet();

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Blue gradient glow when wallet is connected */}
      {address && (
        <>
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[160px] pointer-events-none animate-pulse" />
          <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      <TopNav />
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10 min-h-[80vh]">
        <div className="w-full max-w-lg flex flex-col gap-6 mb-16">
          <SwapCard />
          <PriceChart />
        </div>
      </main>
    </div>
  );
}
