"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function PasswordPage() {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(false)

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            })

            const data = await res.json()

            if (data.success) {
                // Redirect to where they wanted to go, or home
                const next = searchParams.get("from") || "/"
                router.push(next)
                router.refresh() // Force middleware re-run
            } else {
                setError(true)
            }
        } catch (e) {
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black/40 border border-white/10 p-8 rounded-xl backdrop-blur-sm">
                <h1 className="text-2xl font-bold mb-2">Restricted Access 🔒</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    This project is currently private. Please enter the access password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            className={`w-full px-4 py-3 bg-black/60 border rounded-lg focus:outline-none transition-colors ${error
                                    ? "border-red-500/50 focus:border-red-500"
                                    : "border-white/10 focus:border-primary/50"
                                }`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-500 mt-2">Incorrect password. Please try again.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Enter Site"}
                    </button>
                </form>
            </div>
        </div>
    )
}
