"use client";

import React, { useEffect, useState } from "react";
import { Horizon, Asset } from "@stellar/stellar-sdk";

const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

interface OrderBookEdge {
    price: string;
    amount: string;
}

export function Orderbook() {
    const [bids, setBids] = useState<OrderBookEdge[]>([]);
    const [asks, setAsks] = useState<OrderBookEdge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We will poll the horizon API for orderbook connecting XLM against USDC (using our mock testnet assets or generic XLM/USDC)
        // For visual purposes, if orderbook is empty on testnet, we generate aesthetic mock data
        const fetchOrderbook = async () => {
            try {
                const xlmusdc = await horizonServer.orderbook(
                    new Asset("native"),
                    new Asset("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN") // mock asset just to fetch
                ).call();

                if (xlmusdc.bids.length > 0) {
                    setBids(xlmusdc.bids.slice(0, 8));
                    setAsks(xlmusdc.asks.slice(0, 8));
                } else {
                    generateMockData();
                }
            } catch (e) {
                generateMockData();
            } finally {
                setLoading(false);
            }
        };

        const generateMockData = () => {
            // Aesthetic mock data for testnet UI if no trades exist
            const basePrice = 0.1250;
            const _bids = Array.from({ length: 8 }).map((_, i) => ({
                price: (basePrice - (i * 0.0005)).toFixed(4),
                amount: (Math.random() * 5000 + 1000).toFixed(2)
            }));
            const _asks = Array.from({ length: 8 }).map((_, i) => ({
                price: (basePrice + (i * 0.0005) + 0.0002).toFixed(4),
                amount: (Math.random() * 5000 + 1000).toFixed(2)
            })).reverse();
            setBids(_bids);
            setAsks(_asks);
        };

        fetchOrderbook();

        // Poll every 5s
        const interval = setInterval(fetchOrderbook, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 w-full h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 w-full shadow-2xl flex flex-col font-mono text-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-900 font-sans">
                <h2 className="text-lg font-semibold text-white">Orderbook</h2>
                <div className="flex gap-2 text-xs">
                    <span className="text-zinc-500">XLM / USDC</span>
                </div>
            </div>

            <div className="flex text-zinc-500 text-xs mb-2 px-2 uppercase tracking-wider font-semibold">
                <div className="flex-1">Price (USDC)</div>
                <div className="flex-1 text-right">Amount (XLM)</div>
            </div>

            {/* Asks (Sell Orders - Red) */}
            <div className="flex flex-col gap-1 mb-4">
                {asks.map((ask, i) => {
                    const depth = (parseInt(ask.amount) / 8000) * 100; // mock depth calculation
                    return (
                        <div key={`ask-${i}`} className="flex relative items-center px-2 py-0.5 group hover:bg-zinc-900 transition rounded cursor-pointer">
                            <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 z-0" style={{ width: `${Math.min(depth, 100)}%` }} />
                            <div className="flex-1 text-red-500 z-10">{ask.price}</div>
                            <div className="flex-1 text-right text-zinc-300 z-10">{ask.amount}</div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-center py-2 text-lg text-primary font-bold bg-primary/5 rounded-lg mb-4 cursor-pointer hover:bg-primary/10 transition">
                0.1250 <span className="text-xs text-zinc-500 ml-2 font-sans font-medium">$0.12</span>
            </div>

            {/* Bids (Buy Orders - Green) */}
            <div className="flex flex-col gap-1">
                {bids.map((bid, i) => {
                    const depth = (parseInt(bid.amount) / 8000) * 100;
                    return (
                        <div key={`bid-${i}`} className="flex relative items-center px-2 py-0.5 group hover:bg-zinc-900 transition rounded cursor-pointer">
                            <div className="absolute right-0 top-0 bottom-0 bg-green-500/10 z-0" style={{ width: `${Math.min(depth, 100)}%` }} />
                            <div className="flex-1 text-green-500 z-10">{bid.price}</div>
                            <div className="flex-1 text-right text-zinc-300 z-10">{bid.amount}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
