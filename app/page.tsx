import Image from "next/image";

import { TopNav } from "@/components/TopNav";
import { SwapCard } from "@/components/SwapCard";
import { Orderbook } from "@/components/Orderbook";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <TopNav />
      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center">
            <SwapCard />
          </div>
          <div className="lg:col-span-6 xl:col-span-7 w-full">
            <Orderbook />
          </div>
        </div>
      </main>
    </div>
  );
}
