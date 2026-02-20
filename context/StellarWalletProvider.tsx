"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import { toast } from "sonner";

interface StellarWalletContextType {
    address: string | null;
    kit: StellarWalletsKit | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    signTransaction: (xdr: string) => Promise<string | null>;
}

const StellarWalletContext = createContext<StellarWalletContextType | undefined>(undefined);

export const StellarWalletProvider = ({ children }: { children: ReactNode }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [kit, setKit] = useState<StellarWalletsKit | null>(null);

    useEffect(() => {
        // Initialize the kit only on the client side to avoid SSR issues
        const kitInstance = new StellarWalletsKit({
            network: WalletNetwork.TESTNET,
            selectedWalletId: FREIGHTER_ID,
            modules: allowAllModules(),
        });
        setKit(kitInstance);
    }, []);

    const connect = async () => {
        if (!kit) return;
        try {
            await kit.openModal({
                onWalletSelected: async (option) => {
                    try {
                        kit.setWallet(option.id);
                        const { address } = await kit.getAddress();
                        setAddress(address);
                        toast.success("Wallet connected!");
                    } catch (e: any) {
                        console.error(e);
                        if (e.message?.includes("not detected") || e.message?.includes("extension")) {
                            toast.error(`${option.name} not detected. Please install the extension.`);
                        } else {
                            toast.error("Failed to connect wallet.");
                        }
                    }
                },
            });
        } catch (error: any) {
            console.error(error);
        }
    };

    const disconnect = () => {
        setAddress(null);
        toast.info("Wallet disconnected");
    };

    const signTransaction = async (xdr: string) => {
        if (!kit || !address) {
            toast.error("Wallet not connected");
            return null;
        }
        try {
            const result = await kit.signTransaction(xdr, {
                networkPassphrase: WalletNetwork.TESTNET,
            });
            return result.signedTxXdr;
        } catch (e: any) {
            console.error("Sign Error:", e);
            if (e?.message?.toLowerCase().includes("reject") || e?.message?.includes("User declined")) {
                toast.error("Transaction rejected by user.");
            } else {
                toast.error("Failed to sign transaction.");
            }
            return null;
        }
    };

    return (
        <StellarWalletContext.Provider value={{ address, kit, connect, disconnect, signTransaction }}>
            {children}
        </StellarWalletContext.Provider>
    );
};

export const useStellarWallet = () => {
    const context = useContext(StellarWalletContext);
    if (context === undefined) {
        throw new Error("useStellarWallet must be used within a StellarWalletProvider");
    }
    return context;
};
