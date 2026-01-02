"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { FuseSDK } from "@/sdk/fuse-sdk";
import * as anchor from "@coral-xyz/anchor";

interface ReferralContextType {
    referrerAddress: string | null;
    isRegistered: boolean;
    isLoading: boolean;
    registerAndLinkReferrer: () => Promise<boolean>;
    getReferralLink: () => string;
    clearReferrer: () => void;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

const STORAGE_KEY_REFERRER = "fusefun_referrer";
const STORAGE_KEY_REGISTERED = "fusefun_registered_wallets";

export function ReferralProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const { connection } = useConnection();
    const wallet = useWallet();

    const [referrerAddress, setReferrerAddress] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Capture referral code from URL on mount
    useEffect(() => {
        const refParam = searchParams.get("ref");
        if (refParam) {
            // Validate it's a valid Solana address
            try {
                new PublicKey(refParam);
                // Store in localStorage
                localStorage.setItem(STORAGE_KEY_REFERRER, refParam);
                setReferrerAddress(refParam);
                console.log("Referrer captured:", refParam);
            } catch (e) {
                console.error("Invalid referral address:", refParam);
            }
        } else {
            // Check localStorage for existing referrer
            const storedReferrer = localStorage.getItem(STORAGE_KEY_REFERRER);
            if (storedReferrer) {
                setReferrerAddress(storedReferrer);
            }
        }
    }, [searchParams]);

    // Check if current wallet is already registered
    useEffect(() => {
        if (!wallet.publicKey) {
            setIsRegistered(false);
            return;
        }

        const registeredWallets = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTERED) || "{}");
        setIsRegistered(!!registeredWallets[wallet.publicKey.toBase58()]);
    }, [wallet.publicKey]);

    // Register user and link referrer
    const registerAndLinkReferrer = useCallback(async (): Promise<boolean> => {
        if (!wallet.publicKey || !wallet.signTransaction || isRegistered) {
            return false;
        }

        setIsLoading(true);
        try {
            const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet);

            // Generate a username from wallet address
            const username = wallet.publicKey.toBase58().slice(0, 8);

            // Build register user transaction
            const registerTx = await sdk.buildRegisterUserTx(wallet.publicKey, username);

            // If we have a referrer, also set them
            if (referrerAddress) {
                try {
                    const setReferrerTx = await sdk.buildSetReferrerTx(wallet.publicKey, referrerAddress);
                    // Add instructions from setReferrer to register transaction
                    registerTx.add(...setReferrerTx.instructions);
                } catch (e) {
                    console.error("Error building set referrer tx:", e);
                    // Continue without referrer if it fails
                }
            }

            // Send the transaction
            const signature = await wallet.sendTransaction(registerTx, connection);
            await connection.confirmTransaction(signature, "confirmed");

            // Mark as registered in localStorage
            const registeredWallets = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTERED) || "{}");
            registeredWallets[wallet.publicKey.toBase58()] = true;
            localStorage.setItem(STORAGE_KEY_REGISTERED, JSON.stringify(registeredWallets));

            setIsRegistered(true);
            console.log("User registered successfully:", signature);

            // Clear referrer from storage after linking
            if (referrerAddress) {
                localStorage.removeItem(STORAGE_KEY_REFERRER);
                setReferrerAddress(null);
            }

            return true;
        } catch (error: any) {
            console.error("Registration error:", error);
            // If account already exists, mark as registered anyway
            if (error.message?.includes("already in use") || error.message?.includes("already initialized")) {
                const registeredWallets = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTERED) || "{}");
                registeredWallets[wallet.publicKey!.toBase58()] = true;
                localStorage.setItem(STORAGE_KEY_REGISTERED, JSON.stringify(registeredWallets));
                setIsRegistered(true);
                return true;
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [wallet, connection, referrerAddress, isRegistered]);

    // Generate referral link for current user
    const getReferralLink = useCallback((): string => {
        if (!wallet.publicKey) {
            return "Connect wallet to get referral link";
        }
        // Use full wallet address for referral link
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://fuse.fun";
        return `${baseUrl}/?ref=${wallet.publicKey.toBase58()}`;
    }, [wallet.publicKey]);

    // Clear referrer from storage
    const clearReferrer = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY_REFERRER);
        setReferrerAddress(null);
    }, []);

    return (
        <ReferralContext.Provider
            value={{
                referrerAddress,
                isRegistered,
                isLoading,
                registerAndLinkReferrer,
                getReferralLink,
                clearReferrer,
            }}
        >
            {children}
        </ReferralContext.Provider>
    );
}

export function useReferral() {
    const context = useContext(ReferralContext);
    if (context === undefined) {
        throw new Error("useReferral must be used within a ReferralProvider");
    }
    return context;
}
