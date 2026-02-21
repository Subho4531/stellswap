"use client";

import React, { useState, useEffect } from "react";
import { ArrowDown, Settings, Info, Loader2 } from "lucide-react";
import { useStellarWallet } from "@/context/StellarWalletProvider";
import { TokenSelectorModal } from "./TokenSelectorModal";
import { TOKENS } from "@/config/tokens";
import { toast } from "sonner";
import { Horizon, Contract, nativeToScVal, scValToNative, TransactionBuilder, Networks, rpc } from "@stellar/stellar-sdk";

export function SwapCard() {
    const { address, signTransaction } = useStellarWallet();
    const [payAmount, setPayAmount] = useState("");
    const [receiveAmount, setReceiveAmount] = useState("");
    const [payToken, setPayToken] = useState(TOKENS[0]);
    const [receiveToken, setReceiveToken] = useState(TOKENS[1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"pay" | "receive">("pay");

    const [loadingFee, setLoadingFee] = useState(false);
    const [simulatedFeeStroops, setSimulatedFeeStroops] = useState<string | null>(null);

    const [isPending, setIsPending] = useState(false);

    const [balances, setBalances] = useState<Record<string, number>>({});
    const [isFetchingBalances, setIsFetchingBalances] = useState(false);

    useEffect(() => {
        if (!address) {
            setBalances({});
            return;
        }
        const fetchBalances = async () => {
            setIsFetchingBalances(true);
            try {
                const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
                const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");
                const account = await horizonServer.loadAccount(address);

                // Token contract addresses (XLM SAC for testnet + USDC/ETH from env)
                const tokenContracts: Record<string, string> = {
                    XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                    USDC: process.env.NEXT_PUBLIC_USDC_TOKEN_ID || "",
                    ETH: process.env.NEXT_PUBLIC_ETH_TOKEN_ID || "",
                };

                const newBalances: Record<string, number> = {};

                for (const [symbol, contractId] of Object.entries(tokenContracts)) {
                    if (!contractId) continue;
                    try {
                        const contract = new Contract(contractId);
                        const op = contract.call("balance", nativeToScVal(address, { type: "address" }));
                        const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: Networks.TESTNET })
                            .addOperation(op)
                            .setTimeout(30)
                            .build();
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const sim = await rpcServer.simulateTransaction(tx as any);
                        if (rpc.Api.isSimulationSuccess(sim)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const raw = scValToNative((sim.result as any).retval);
                            newBalances[symbol] = Number(raw) / 1e7;
                        }
                    } catch {
                        newBalances[symbol] = 0;
                    }
                }

                setBalances(newBalances);
            } catch (e) {
                console.error("Failed to fetch balances", e);
            } finally {
                setIsFetchingBalances(false);
            }
        };
        fetchBalances();
    }, [address, isPending]);

    const payBalance = balances[payToken.symbol] || 0;
    const receiveBalance = balances[receiveToken.symbol] || 0;

    // Fetch exchange rates from the contract once on load and after swaps
    const [rates, setRates] = useState<{ xlmPerUsdc: number; xlmPerEth: number } | null>(null);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const server = new Horizon.Server("https://horizon-testnet.stellar.org");
                const defaultAddress = "GBV2VSXKD6CY3XNZOVKIWAEXBHYU3XDQWOGOZSFI27SDCA6SGST73ZBQ";
                const account = await server.loadAccount(address || defaultAddress).catch(() => null);
                if (!account) return;

                const contractId = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
                if (!contractId) return;

                const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
                const contract = new Contract(contractId);

                const operation = contract.call("get_rates");
                const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: Networks.TESTNET })
                    .addOperation(operation)
                    .setTimeout(30)
                    .build();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sim = await rpcServer.simulateTransaction(tx as any);
                if (rpc.Api.isSimulationSuccess(sim)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const result = scValToNative((sim.result as any).retval);
                    // result is [xlm_per_usdc, xlm_per_eth] — raw integer ratios
                    const xlmPerUsdc = Number(result[0]); // e.g. 6
                    const xlmPerEth = Number(result[1]);  // e.g. 12120
                    setRates({ xlmPerUsdc, xlmPerEth });
                }
            } catch (e) {
                console.error("Failed to fetch rates", e);
            }
        };
        fetchRates();
    }, [address]);

    // Compute exchange rate between any two tokens using XLM as the base
    const getExchangeRate = (from: string, to: string): number => {
        if (!rates || from === to) return from === to ? 1 : 0;
        // XLM value of 1 unit of each token
        const xlmValue: Record<string, number> = {
            XLM: 1,
            USDC: rates.xlmPerUsdc,
            ETH: rates.xlmPerEth,
        };
        const fromXlm = xlmValue[from] ?? 1;
        const toXlm = xlmValue[to] ?? 1;
        return fromXlm / toXlm;
    };

    useEffect(() => {
        if (!payAmount || parseFloat(payAmount) <= 0 || !rates) {
            setReceiveAmount("");
            return;
        }
        const rate = getExchangeRate(payToken.symbol, receiveToken.symbol);
        const amt = parseFloat(payAmount) * rate;
        setReceiveAmount(amt.toFixed(7).replace(/\.?0+$/, ""));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payAmount, payToken, receiveToken, rates]);

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
        if (payAmtNum > payBalance) {
            toast.error(`Insufficient ${payToken.symbol} Balance`);
            return;
        }

        setIsPending(true);
        try {
            toast.loading("Simulating transaction...", { id: "swap" });

            const server = new Horizon.Server("https://horizon-testnet.stellar.org");
            const account = await server.loadAccount(address);

            const contractId = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
            if (!contractId) throw new Error("Contract address not configured in .env");

            const contract = new Contract(contractId);
            const amountIn = BigInt(Math.floor(payAmtNum * 1e7));
            const minOut = BigInt(1);

            const methodName = `swap_${payToken.symbol.toLowerCase()}_for_${receiveToken.symbol.toLowerCase()}`;

            const operation = contract.call(
                methodName,
                nativeToScVal(address, { type: "address" }),
                nativeToScVal(amountIn, { type: "i128" }),
                nativeToScVal(minOut, { type: "i128" })
            );

            const tx = new TransactionBuilder(account, {
                fee: "100000",
                networkPassphrase: Networks.TESTNET,
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();

            const sorobanRpc = new rpc.Server("https://soroban-testnet.stellar.org");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const preparedTx = await sorobanRpc.prepareTransaction(tx as any);
            const xdr = preparedTx.toXDR();

            toast.loading("Please sign the transaction in your wallet...", { id: "swap" });

            const signedXdr = await signTransaction(xdr).catch(() => null);
            if (!signedXdr) {
                toast.dismiss("swap");
                toast.warning("Transaction was canceled", { duration: 3000 });
                setIsPending(false);
                return;
            }

            toast.loading("Submitting to network...", { id: "swap" });

            const submitTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sendResponse = await sorobanRpc.sendTransaction(submitTx as any);

            // sendTransaction returns PENDING initially — poll for confirmation
            if (sendResponse.status === "ERROR") {
                throw new Error("Transaction submission failed");
            }

            toast.loading("Waiting for confirmation...", { id: "swap" });

            // Poll getTransaction until confirmed or failed (max ~30s)
            let txResult;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 1000));
                txResult = await sorobanRpc.getTransaction(sendResponse.hash);
                if (txResult.status !== "NOT_FOUND") break;
            }

            if (txResult && txResult.status === "SUCCESS") {
                toast.dismiss("swap");
                toast.success(
                    <div className="flex flex-col gap-1">
                        <span>Swap Executed Successfully!</span>
                        <a
                            href={`https://stellar.expert/explorer/testnet/tx/${sendResponse.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs underline cursor-pointer"
                        >
                            View on Stellar Expert ↗
                        </a>
                    </div>,
                    { duration: 7000 }
                );
                setPayAmount("");
                setReceiveAmount("");
            } else {
                throw new Error(`Transaction failed: ${txResult?.status || "timeout"}`);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast.dismiss("swap");
            toast.error(e.message || "An error occurred during swap execution");
        } finally {
            setIsPending(false);
        }
    };

    const isInsufficient = parseFloat(payAmount) > payBalance;

    return (
        <>
            <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800/50 rounded-3xl p-4 sm:p-6 w-full max-w-[480px] shadow-2xl relative">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="text-lg font-semibold text-white">Swap</h2>
                    <button className="text-zinc-500 hover:text-white transition">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* You Pay Section */}
                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 focus-within:border-zinc-700 transition relative">
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
                        Balance: {isFetchingBalances ? <Loader2 className="w-3 h-3 animate-spin inline ml-1 mr-1" /> : payBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {payToken.symbol}
                        {address && payBalance > 0 && (
                            <button
                                onClick={() => setPayAmount(payBalance.toString())}
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
                        className="bg-zinc-900 border-4 border-zinc-950 rounded-xl p-2 text-zinc-400 hover:text-white transition group z-20"
                    >
                        <ArrowDown className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                    </button>
                </div>

                {/* You Receive Section */}
                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 focus-within:border-zinc-700 transition relative mt-2">
                    <label className="text-xs text-zinc-400 font-medium mb-2 block">You Receive</label>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            placeholder="0.0"
                            value={receiveAmount}
                            readOnly
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
                        Balance: {isFetchingBalances ? <Loader2 className="w-3 h-3 animate-spin inline ml-1 mr-1" /> : receiveBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {receiveToken.symbol}
                    </div>
                </div>

                {/* Exchange Rate Info */}
                {payToken && receiveToken && rates && (
                    <div className="flex justify-between items-center text-sm px-2 mt-4 text-zinc-400 font-medium">
                        <span>Exchange Rate</span>
                        <span className="text-white">
                            1 {payToken.symbol} = {getExchangeRate(payToken.symbol, receiveToken.symbol).toLocaleString(undefined, { maximumFractionDigits: 7 })} {receiveToken.symbol}
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
                                <div className="absolute bottom-full mb-2 left-0 w-48 bg-zinc-800 text-xs text-zinc-300 p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                                    Soroban Multidimensional Fee (Resource + Inclusion)
                                </div>
                            </span>
                            <span className="text-zinc-300">
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
            </div >

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
