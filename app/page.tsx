"use client";

import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { SwapCard } from "@/components/SwapCard";
import { PriceChart } from "@/components/PriceChart";
import { useStellarWallet } from "@/context/StellarWalletProvider";
import { LiquidityPool } from "@/components/LiquidityPool";
import { Droplets, ArrowRightLeft, LineChart } from "lucide-react";

type Tab = "pool" | "swap" | "chart";

export default function Home() {
  const { address } = useStellarWallet();
  const [activeTab, setActiveTab] = useState<Tab>("swap");

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
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 pt-24 sm:pt-32 relative z-10 min-h-[80vh]">
        {/* Mobile Tab Navigation */}
        <div className="flex xl:hidden w-full max-w-[480px] bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800/50 rounded-2xl p-1.5 mb-6 shadow-xl">
          <button
            onClick={() => setActiveTab("pool")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "pool"
                ? "bg-zinc-800 text-white shadow-md shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200"
              }`}
          >
            <Droplets className="w-4 h-4" />
            Pool
          </button>
          <button
            onClick={() => setActiveTab("swap")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "swap"
                ? "bg-zinc-800 text-white shadow-md shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200"
              }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "chart"
                ? "bg-zinc-800 text-white shadow-md shadow-black/20"
                : "text-zinc-400 hover:text-zinc-200"
              }`}
          >
            <LineChart className="w-4 h-4" />
            Chart
          </button>
        </div>

        {/* Content Area */}
        <div className="w-full justify-center items-center xl:items-start flex flex-col xl:flex-row gap-6 p-4 sm:p-6 mb-16">
          <div className={`${activeTab === "pool" ? "flex" : "hidden"} xl:flex order-2 xl:order-1 w-full justify-center xl:justify-end`}>
            <LiquidityPool />
          </div>
          <div className={`${activeTab === "swap" ? "flex" : "hidden"} xl:flex order-1 xl:order-2 w-full justify-center`}>
            <SwapCard />
          </div>
          <div className={`${activeTab === "chart" ? "flex" : "hidden"} xl:flex order-3 xl:order-3 w-full justify-center xl:justify-start`}>
            <PriceChart />
          </div>
        </div>
      </main>
    </div>
  );
}
