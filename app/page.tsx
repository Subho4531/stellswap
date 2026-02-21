import { TopNav } from "@/components/TopNav";
import { SwapCard } from "@/components/SwapCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <TopNav />
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10 min-h-[80vh]">
        <div className="w-full max-w-lg mb-16">
          <SwapCard />
        </div>
      </main>
    </div>
  );
}
