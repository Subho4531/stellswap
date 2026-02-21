"use client";

import React from "react";
import { useStellarWallet } from "@/context/StellarWalletProvider";
import { Activity, Power, Wallet } from "lucide-react";

export function TopNav() {
    const { address, connect, disconnect } = useStellarWallet();

    const truncateAddress = (addr: string) =>
        `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;

    return (
        <nav className="w-full flex items-center justify-between py-6 px-8 absolute top-0 z-50 bg-transparent">
            {/* Brand & Logo */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Activity className="text-primary w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">StellSwap</span>
            </div>

            {/* Testnet Badge & Connect Wallet */}
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 focus:outline-none text-xs font-semibold text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Testnet
                </div>

                {address ? (
                    <div className="flex items-center gap-2">
                        <div className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold shadow-xl border border-white/20 flex items-center gap-2 transition hover:bg-zinc-200">
                            <Wallet className="w-4 h-4 text-black" />
                            {truncateAddress(address)}
                        </div>
                        <button
                            onClick={disconnect}
                            className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition hover:bg-zinc-800"
                            title="Disconnect"
                        >
                            <Power className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connect}
                        className="px-5 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-md shadow-primary/20 flex items-center gap-2 active:scale-95"
                    >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
}
