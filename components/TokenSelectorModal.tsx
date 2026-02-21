"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { TOKENS, Token } from "@/config/tokens";

interface TokenSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (token: Token) => void;
    selectedTokenSymbol?: string;
}

export function TokenSelectorModal({ isOpen, onClose, onSelect, selectedTokenSymbol }: TokenSelectorModalProps) {
    const [search, setSearch] = useState("");

    const filteredTokens = TOKENS.filter(
        (t) =>
            t.symbol.toLowerCase().includes(search.toLowerCase()) ||
            t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", duration: 0.4 }}
                        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
                    >
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white">Select a token</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-zinc-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search name or symbol"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 custom-scrollbar">
                            {filteredTokens.length === 0 ? (
                                <div className="py-8 text-center text-zinc-500 text-sm">
                                    No tokens found.
                                </div>
                            ) : (
                                filteredTokens.map((token) => (
                                    <button
                                        key={token.symbol}
                                        onClick={() => {
                                            onSelect(token);
                                            onClose();
                                            setSearch("");
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedTokenSymbol === token.symbol
                                            ? "bg-white/10 border border-white/20 pointer-events-none opacity-50"
                                            : "hover:bg-zinc-800/50 border border-transparent"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Note: since Next.js Image component needs domain configurations, using standard img tag with nice error fallback is safer for third party logos unconfigured */}
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                                                <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "https://cryptologos.cc/logos/stellar-xlm-logo.png"; }} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-medium">{token.symbol}</div>
                                                <div className="text-zinc-500 text-xs">{token.name}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
