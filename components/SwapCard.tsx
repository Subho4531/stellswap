"use client";

import React, { useState, useEffect } from "react";
import { ArrowDown, Settings, Info, Loader2 } from "lucide-react";
import { useStellarWallet } from "@/context/StellarWalletProvider";
import { TokenSelectorModal } from "./TokenSelectorModal";
import { TOKENS } from "@/config/tokens";
import { toast } from "sonner";

export function SwapCard() {
    const { address } = useStellarWallet();
    const [payAmount, setPayAmount] = useState("");
    const [receiveAmount, setReceiveAmount] = useState("");
    const [payToken, setPayToken] = useState(TOKENS[0]);
    const [receiveToken, setReceiveToken] = useState(TOKENS[1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"pay" | "receive">("pay");

    const [loadingFee, setLoadingFee] = useState(false);
    const [simulatedFeeStroops, setSimulatedFeeStroops] = useState<string | null>(null);

    const [isPending, setIsPending] = useState(false);

    const [mockBalance, setMockBalance] = useState<number>(10000);
    const [mockReceiveBalance, setMockReceiveBalance] = useState<number>(0);

    const tokenPrices: Record<string, number> = {
        XLM: 0.12, USDC: 1.0, USDT: 1.0, SOL: 150, EURC: 1.08, ETH: 3500,
    };

    const getExchangeRate = () => {
        const p1 = tokenPrices[payToken.symbol] || 1;
        const p2 = tokenPrices[receiveToken.symbol] || 1;
        return p1 / p2;
    };

    useEffect(() => {
        if (!payAmount || parseFloat(payAmount) === 0) {
            setReceiveAmount("");
            return;
        }
        const rate = getExchangeRate();
        const amt = parseFloat(payAmount) * rate;
        setReceiveAmount(amt.toFixed(6).replace(/\.?0+$/, ""));
    }, [payAmount, payToken, receiveToken]);

    useEffect(() => {
        if (!payAmount || parseFloat(payAmount) <= 0) {
            setSimulatedFeeStroops(null);
            return;
        }

        const simulateGas = async () => {
            setLoadingFee(true);
            await new Promise(r => setTimeout(r, 600));
            setSimulatedFeeStroops("457000");
            setLoadingFee(false);
        };

        const timer = setTimeout(() => simulateGas(), 500);
        return () => clearTimeout(timer);
    }, [payAmount, payToken, address]);

    const handleSwap = async () => {
        if (!address) {
            toast.error("Please connect your wallet first.");
            return;
        }
        const payAmtNum = parseFloat(payAmount);
        if (payAmtNum > mockBalance) {
            toast.error(`Insufficient ${payToken.symbol} Balance`);
            return;
        }

        setIsPending(true);
        try {
            toast.loading("Simulating transaction...", { id: "swap" });
            await new Promise(r => setTimeout(r, 1200));

            toast.loading("Please sign the transaction...", { id: "swap" });
            await new Promise(r => setTimeout(r, 1500));

            toast.loading("Submitting to network...", { id: "swap" });
            await new Promise(r => setTimeout(r, 2000));

            toast.dismiss("swap");
            toast.success(
                <div className="flex flex-col gap-1">
                    <span>Swap Executed Successfully!</span>
                    <span className="text-primary text-xs">Demo Mode — No real transaction</span>
                </div>,
                { id: "swap_success", duration: 5000 }
            );

            const receiveAmtNum = parseFloat(receiveAmount);
            setPayAmount("");
            setReceiveAmount("");
            setMockBalance(mockBalance - payAmtNum);
            setMockReceiveBalance(mockReceiveBalance + receiveAmtNum);

        } catch (e: any) {
            toast.dismiss("swap");
            toast.error(e.message || "An error occurred during swap execution");
        } finally {
            setIsPending(false);
        }
    };

    const isInsufficient = parseFloat(payAmount) > mockBalance;

    return (
        <>
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-4 sm:p-6 w-full max-w-[480px] shadow-2xl relative">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="text-lg font-semibold text-white">Swap</h2>
                    <button className="text-zinc-500 hover:text-white transition">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* You Pay Section */}
                <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 focus-within:border-primary/50 transition relative">
                    <label className="text-xs text-zinc-400 font-medium mb-2 block">You Pay</label>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            placeholder="0.0"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="bg-transparent text-3xl font-medium text-white outline-none w-full mr-4 placeholder-zinc-700"
                        />
                        <button
                            onClick={() => {
                                setModalType("pay");
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-full px-3 py-1.5 transition whitespace-nowrap"
                        >
                            <img src={payToken.icon} alt={payToken.symbol} className="w-5 h-5 rounded-full" onError={(e) => { e.currentTarget.src = "https://cryptologos.cc/logos/stellar-xlm-logo.png"; }} />
                            <span className="text-white font-medium">{payToken.symbol}</span>
                            <ArrowDown className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                    <div className="text-xs text-zinc-500 mt-3 font-medium">
                        Balance: {mockBalance.toLocaleString()} {payToken.symbol}
                        {address && (
                            <button
                                onClick={() => setPayAmount(mockBalance.toString())}
                                className="ml-2 text-primary/80 hover:text-primary transition uppercase text-[10px] tracking-wider font-bold bg-primary/10 px-2 py-0.5 rounded"
                            >
                                Max
                            </button>
                        )}
                    </div>
                </div>

                {/* Swap Direction Arrow */}
                <div className="flex justify-center -my-3 relative z-10">
                    <button
                        onClick={() => {
                            const temp = payToken;
                            setPayToken(receiveToken);
                            setReceiveToken(temp);
                            setPayAmount(receiveAmount);
                            setReceiveAmount(payAmount);
                        }}
                        className="bg-zinc-900 border-4 border-zinc-950 rounded-xl p-2 text-zinc-400 hover:text-primary transition group"
                    >
                        <ArrowDown className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                    </button>
                </div>

                {/* You Receive Section */}
                <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 focus-within:border-primary/50 transition">
                    <label className="text-xs text-zinc-400 font-medium mb-2 block">You Receive</label>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            placeholder="0.0"
                            value={receiveAmount}
                            onChange={(e) => {
                                const val = e.target.value;
                                setReceiveAmount(val);
                                if (!val || parseFloat(val) === 0) {
                                    setPayAmount("");
                                    return;
                                }
                                const rate = getExchangeRate();
                                const amt = parseFloat(val) / rate;
                                setPayAmount(amt.toFixed(6).replace(/\.?0+$/, ""));
                            }}
                            className="bg-transparent text-3xl font-medium text-white outline-none w-full mr-4 placeholder-zinc-700"
                        />
                        <button
                            onClick={() => {
                                setModalType("receive");
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-full px-3 py-1.5 transition whitespace-nowrap"
                        >
                            <img src={receiveToken.icon} alt={receiveToken.symbol} className="w-5 h-5 rounded-full" onError={(e) => { e.currentTarget.src = "https://cryptologos.cc/logos/stellar-xlm-logo.png"; }} />
                            <span className="text-white font-medium">{receiveToken.symbol}</span>
                            <ArrowDown className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                    <div className="text-xs text-zinc-500 mt-3 font-medium text-right">
                        Balance: {mockReceiveBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {receiveToken.symbol}
                    </div>
                </div>

                {/* Exchange Rate Info */}
                {payToken && receiveToken && (
                    <div className="flex justify-between items-center text-sm px-2 mt-4 text-zinc-400 font-medium">
                        <span>Exchange Rate</span>
                        <span className="text-zinc-300">
                            1 {payToken.symbol} = {getExchangeRate().toLocaleString(undefined, { maximumFractionDigits: 6 })} {receiveToken.symbol}
                        </span>
                    </div>
                )}

                {/* Estimated Network Fee Accordion */}
                {parseFloat(payAmount) > 0 && (
                    <div className="mt-4 px-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400 flex items-center gap-1 cursor-help group relative">
                                Estimated Network Fee
                                <Info className="w-3.5 h-3.5" />
                                <div className="absolute bottom-full mb-2 left-0 w-48 bg-zinc-800 text-xs text-zinc-300 p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                    Soroban Multidimensional Fee (Resource + Inclusion)
                                </div>
                            </span>
                            <span className="text-zinc-200">
                                {loadingFee ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                                ) : simulatedFeeStroops ? (
                                    `~ ${(parseInt(simulatedFeeStroops) / 10000000).toFixed(5)} XLM`
                                ) : (
                                    "--"
                                )}
                            </span>
                        </div>
                        {simulatedFeeStroops && !loadingFee && (
                            <div className="flex items-center justify-between text-xs mt-1 text-zinc-500">
                                <span>Fee in Stroops</span>
                                <span>{simulatedFeeStroops} strps</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Button */}
                <button
                    disabled={!payAmount || isPending || isInsufficient}
                    onClick={handleSwap}
                    className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${isPending
                        ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                        : isInsufficient
                            ? "bg-red-500/20 text-red-500 cursor-not-allowed"
                            : !payAmount
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
                        }`}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Confirming...
                        </>
                    ) : isInsufficient ? (
                        `Insufficient ${payToken.symbol} Balance`
                    ) : !payAmount ? (
                        "Enter an amount"
                    ) : (
                        "Swap"
                    )}
                </button>
            </div>

            <TokenSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedTokenSymbol={modalType === "pay" ? payToken.symbol : receiveToken.symbol}
                onSelect={(token) => {
                    if (modalType === "pay") setPayToken(token);
                    else setReceiveToken(token);
                }}
            />
        </>
    );
}
