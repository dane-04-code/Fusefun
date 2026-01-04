"use client";

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";

// Error type mapping for user-friendly messages
const ERROR_MESSAGES: Record<string, { title: string; message: string; suggestion?: string }> = {
    // Wallet errors
    "User rejected": {
        title: "Transaction Cancelled",
        message: "You cancelled the transaction in your wallet.",
        suggestion: "Click 'Launch Token' again when you're ready to approve."
    },
    "cancelled": {
        title: "Transaction Cancelled",
        message: "The transaction was cancelled.",
        suggestion: "Try again when you're ready."
    },
    "Wallet not connected": {
        title: "Wallet Not Connected",
        message: "Please connect your wallet to continue.",
        suggestion: "Click the 'Connect Wallet' button in the top right."
    },
    "insufficient funds": {
        title: "Insufficient Balance",
        message: "You don't have enough SOL to complete this transaction.",
        suggestion: "Add more SOL to your wallet and try again."
    },
    "Insufficient funds": {
        title: "Insufficient Balance",
        message: "You don't have enough SOL to complete this transaction.",
        suggestion: "You need at least 0.1 SOL for the launch fee and gas."
    },

    // Network errors
    "Blockhash not found": {
        title: "Network Timeout",
        message: "The transaction took too long to process.",
        suggestion: "The Solana network might be congested. Try again in a moment."
    },
    "block height exceeded": {
        title: "Transaction Expired",
        message: "The transaction expired before it could be confirmed.",
        suggestion: "This can happen during network congestion. Please try again."
    },
    "Confirmation timeout": {
        title: "Confirmation Timeout",
        message: "The transaction was sent but confirmation timed out.",
        suggestion: "Check your wallet for the transaction status, or try again."
    },
    "Transaction simulation failed": {
        title: "Transaction Failed",
        message: "The transaction couldn't be processed by the network.",
        suggestion: "This might be a temporary issue. Please try again."
    },
    "failed to send transaction": {
        title: "Send Failed",
        message: "Failed to send the transaction to the network.",
        suggestion: "Check your internet connection and try again."
    },

    // Upload errors
    "Image upload failed": {
        title: "Image Upload Failed",
        message: "We couldn't upload your token image.",
        suggestion: "Check your image file and try again. Max size is 5MB."
    },
    "Metadata upload failed": {
        title: "Metadata Upload Failed",
        message: "We couldn't save your token information.",
        suggestion: "Please try again. If the issue persists, contact support."
    },
    "Pinata not configured": {
        title: "Service Unavailable",
        message: "The image upload service is temporarily unavailable.",
        suggestion: "Please try again later or contact support."
    },
    "Pinata API error": {
        title: "Upload Service Error",
        message: "There was an error with the image upload service.",
        suggestion: "Please try again in a few moments."
    },

    // Validation errors
    "required fields": {
        title: "Missing Information",
        message: "Please fill in all required fields.",
        suggestion: "Name, Ticker, and Image are required to launch a token."
    },

    // Program errors
    "custom program error": {
        title: "Contract Error",
        message: "The smart contract encountered an error.",
        suggestion: "This might be a temporary issue. Please try again."
    },
    "Account not found": {
        title: "Account Error",
        message: "Required account not found on the blockchain.",
        suggestion: "Please refresh the page and try again."
    },

    // Generic fallback
    "Failed after 3 attempts": {
        title: "Multiple Failures",
        message: "The transaction failed after multiple attempts.",
        suggestion: "The network might be experiencing issues. Try again later."
    }
};

// Parse error and get user-friendly message
function parseError(error: string | Error): { title: string; message: string; suggestion?: string; technical?: string } {
    const errorStr = error instanceof Error ? error.message : error;

    // Check for matching error patterns
    for (const [pattern, info] of Object.entries(ERROR_MESSAGES)) {
        if (errorStr.toLowerCase().includes(pattern.toLowerCase())) {
            return {
                ...info,
                technical: errorStr
            };
        }
    }

    // Default fallback
    return {
        title: "Something Went Wrong",
        message: "An unexpected error occurred.",
        suggestion: "Please try again. If the issue persists, contact support.",
        technical: errorStr
    };
}

// Toast types
type ToastType = "error" | "success" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    suggestion?: string;
    technical?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, "id">) => void;
    showError: (error: string | Error) => void;
    showSuccess: (title: string, message?: string) => void;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...toast, id }]);

        // Auto-hide after duration (default 8s for errors, 5s for others)
        const duration = toast.duration ?? (toast.type === "error" ? 8000 : 5000);
        if (duration > 0) {
            setTimeout(() => hideToast(id), duration);
        }
    }, [hideToast]);

    const showError = useCallback((error: string | Error) => {
        const parsed = parseError(error);
        showToast({
            type: "error",
            ...parsed
        });
    }, [showToast]);

    const showSuccess = useCallback((title: string, message?: string) => {
        showToast({
            type: "success",
            title,
            message: message || "",
        });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess, hideToast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={hideToast} />
        </ToastContext.Provider>
    );
}

// Toast Container
function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
            ))}
        </div>
    );
}

// Individual Toast
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 200);
    };

    const bgColors = {
        error: "bg-red-500/10 border-red-500/30",
        success: "bg-green-500/10 border-green-500/30",
        warning: "bg-yellow-500/10 border-yellow-500/30",
        info: "bg-blue-500/10 border-blue-500/30"
    };

    const iconColors = {
        error: "text-red-400",
        success: "text-green-400",
        warning: "text-yellow-400",
        info: "text-blue-400"
    };

    const titleColors = {
        error: "text-red-400",
        success: "text-green-400",
        warning: "text-yellow-400",
        info: "text-blue-400"
    };

    return (
        <div
            className={`pointer-events-auto border backdrop-blur-xl p-4 shadow-2xl transition-all duration-200 ${bgColors[toast.type]} ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
                }`}
        >
            <div className="flex gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`}>
                    {toast.type === "error" && <ErrorIcon className="w-5 h-5" />}
                    {toast.type === "success" && <SuccessIcon className="w-5 h-5" />}
                    {toast.type === "warning" && <WarningIcon className="w-5 h-5" />}
                    {toast.type === "info" && <InfoIcon className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold text-sm ${titleColors[toast.type]}`}>
                            {toast.title}
                        </h4>
                        <button
                            onClick={handleClose}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-sm text-foreground/80 mt-1">
                        {toast.message}
                    </p>

                    {toast.suggestion && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                            <span className="text-primary">→</span>
                            {toast.suggestion}
                        </p>
                    )}

                    {/* Technical details (expandable) */}
                    {toast.technical && toast.type === "error" && (
                        <div className="mt-3">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider flex items-center gap-1"
                            >
                                <ChevronIcon className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                Technical Details
                            </button>
                            {isExpanded && (
                                <div className="mt-2 p-2 bg-black/40 border border-white/10 text-[10px] font-mono text-muted-foreground break-all max-h-20 overflow-auto">
                                    {toast.technical}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Icons
function ErrorIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}

function SuccessIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function WarningIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function ChevronIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}
