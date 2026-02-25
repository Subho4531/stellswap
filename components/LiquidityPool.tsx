"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Droplets } from "lucide-react";
import {
    Horizon,
    Contract,
    nativeToScVal,
    scValToNative,
    TransactionBuilder,
    Networks,
    rpc,
} from "@stellar/stellar-sdk";

interface PoolReserves {
    xlm: number;
    usdc: number;
    eth: number;
}

export function LiquidityPool() {
    const [reserves, setReserves] = useState<PoolReserves | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReserves = async () => {
            setLoading(true);
            try {
                const contractId = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
                if (!contractId) return;

                const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");
                const defaultAddress = "GBV2VSXKD6CY3XNZOVKIWAEXBHYU3XDQWOGOZSFI27SDCA6SGST73ZBQ";
                const account = await horizonServer.loadAccount(defaultAddress);

                const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
                const contract = new Contract(contractId);

                const op = contract.call("get_reserves");
                const tx = new TransactionBuilder(account, {
                    fee: "1000",
                    networkPassphrase: Networks.TESTNET,
                })
                    .addOperation(op)
                    .setTimeout(30)
                    .build();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sim = await rpcServer.simulateTransaction(tx as any);
                if (rpc.Api.isSimulationSuccess(sim)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const result = scValToNative((sim.result as any).retval);
                    setReserves({
                        xlm: Number(result[0]) / 1e7,
                        usdc: Number(result[1]) / 1e7,
                        eth: Number(result[2]) / 1e7,
                    });
                }
            } catch (e) {
                console.error("Failed to fetch reserves", e);
            } finally {
                setLoading(false);
            }
        };

        fetchReserves();
        const interval = setInterval(fetchReserves, 60000);
        return () => clearInterval(interval);
    }, []);

    const tokens = [
        {
            symbol: "XLM",
            name: "Stellar Lumens",
            icon: "https://cryptologos.cc/logos/stellar-xlm-logo.png",
            color: "from-blue-500/20 to-blue-600/5",
            amount: reserves?.xlm,
        },
        {
            symbol: "USDC",
            name: "USD Coin",
            icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
            color: "from-emerald-500/20 to-emerald-600/5",
            amount: reserves?.usdc,
        },
        {
            symbol: "ETH",
            name: "Ethereum",
            icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
            color: "from-violet-500/20 to-violet-600/5",
            amount: reserves?.eth,
        },
    ];

    const totalValueUsd =
        reserves
            ? reserves.xlm * 0.1 + reserves.usdc * 1 + reserves.eth * 2000
            : null;

    return (
        <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800/50 rounded-3xl p-4 sm:p-6 w-full max-w-[480px] xl:max-w-[400px] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm">Liquidity Pool</h3>
                        <span className="text-zinc-500 text-xs">Live Reserves</span>
                    </div>
                </div>
                {totalValueUsd !== null && !loading && (
                    <div className="text-right">
                        <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-medium">
                            Est. TVL
                        </p>
                        <p className="text-white font-semibold text-base">
                            ${totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                )}
            </div>

            {/* Token Reserves */}
            <div className="space-y-2.5">
                {tokens.map((token) => (
                    <div
                        key={token.symbol}
                        className={`flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r ${token.color} border border-zinc-800/30`}
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={token.icon}
                                alt={token.symbol}
                                className="w-8 h-8 rounded-full"
                                onError={(e) => {
                                    e.currentTarget.src =
                                        "https://cryptologos.cc/logos/stellar-xlm-logo.png";
                                }}
                            />
                            <div>
                                <p className="text-white font-medium text-sm">{token.symbol}</p>
                                <p className="text-zinc-500 text-xs">{token.name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                            ) : (
                                <p className="text-white font-semibold text-sm tabular-nums">
                                    {token.amount !== undefined
                                        ? token.amount.toLocaleString(undefined, {
                                            maximumFractionDigits: 2,
                                        })
                                        : "—"}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                <span></span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                </span>
            </div>
        </div>
    );
}
